import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Battery,
  Bug,
  CheckCircle2,
  ChevronRight,
  Clock,
  ClipboardList,
  MapPin,
  Radio,
  Signal,
  Smartphone,
  Timer,
  XCircle,
} from 'lucide-react'

import { DataTable, type DataTableColumn, ProgressBar, StatusBadge } from '@/components/ui'
import {
  mockCollectionSessions,
  mockIssueReports,
  mockTaskScripts,
  mockTasks,
  type CollectionSession,
  type IssueReport,
  type Task,
  type TaskScript,
} from '@/data/mock'
import { usePlatformProps } from '@/data/propStore'
import { scriptEstimatedMinutes } from '@/lib/scriptWorkflow'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// 常量与工具
// ---------------------------------------------------------------------------

const COLLECTOR = { id: 'per-009', name: '蒋心怡' }

/** 演示加速：台本 1 分钟预估 ≈ 2 秒实机，便于原型里触发超时提醒 */
const DEMO_MS_PER_ESTIMATED_MINUTE = 2000

type PhoneTab = 'pending' | 'active'
type PhoneRoute =
  | { kind: 'tabs' }
  | { kind: 'task'; taskId: string }
  | { kind: 'collect'; taskId: string }
  | { kind: 'report' }

type PlatformEvent = {
  id: string
  at: string
  tone: 'info' | 'warn' | 'success' | 'danger'
  title: string
  detail: string
  taskId?: string
}

type CollectRuntime = {
  taskId: string
  startedAt: number
  currentStepIndex: number
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function scriptForTask(task: Task, scripts: TaskScript[]): TaskScript | undefined {
  if (!task.scriptId) return undefined
  return scripts.find((s) => s.taskId === task.scriptId)
}

function isScriptConfirmed(task: Task, scripts: TaskScript[]): boolean {
  const s = scriptForTask(task, scripts)
  return s?.status === 'confirmed'
}

function collectionStatusLabel(status: CollectionSession['status']): string {
  switch (status) {
    case 'idle':
      return '空闲'
    case 'collecting':
      return '采集中'
    case 'paused':
      return '暂停'
    case 'completed':
      return '已完成'
    case 'failed':
      return '失败'
    default:
      return status
  }
}

function issueSeverityClass(level: IssueReport['severity']): string {
  if (level === 'critical') return 'bg-rose-100 text-rose-900 ring-rose-300'
  if (level === 'high') return 'bg-rose-50 text-rose-800 ring-rose-200'
  if (level === 'medium') return 'bg-amber-50 text-amber-900 ring-amber-200'
  return 'bg-slate-100 text-slate-700 ring-slate-200'
}

const ISSUE_SEVERITY_LABEL: Record<IssueReport['severity'], string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '紧急',
}

function pushEvent(
  setter: React.Dispatch<React.SetStateAction<PlatformEvent[]>>,
  event: Omit<PlatformEvent, 'id' | 'at'>,
): void {
  setter((prev) => [
    {
      ...event,
      id: `evt-${Date.now()}-${prev.length}`,
      at: new Date().toISOString(),
    },
    ...prev,
  ])
}

function claimTask(
  setter: React.Dispatch<React.SetStateAction<Task[]>>,
  taskId: string,
): void {
  setter((prev) =>
    prev.map((t) => (t.id === taskId ? { ...t, status: 'in_progress' as const } : t)),
  )
}

function reportPropMismatch(
  setter: React.Dispatch<React.SetStateAction<Task[]>>,
  task: Task,
  reporter: string,
): void {
  setter((prev) =>
    prev.map((t) =>
      t.id === task.id
        ? {
            ...t,
            scriptException: {
              reportedAt: new Date().toISOString(),
              reporter,
              reason: '现场道具与台本描述不符（采集员打标）',
              status: 'open',
            },
          }
        : t,
    ),
  )
}

// ---------------------------------------------------------------------------
// 手机外壳
// ---------------------------------------------------------------------------

function PhoneFrame({ children }: { children: ReactNode }): ReactElement {
  const now = new Date()
  const clock = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="mx-auto w-[300px] shrink-0">
      <div className="rounded-[2.75rem] border-[11px] border-slate-900 bg-slate-900 p-1.5 shadow-2xl ring-1 ring-slate-700">
        <div className="relative flex h-[620px] flex-col overflow-hidden rounded-[2.25rem] bg-[#f2f2f7] font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif]">
          <div className="absolute left-1/2 top-2 z-20 h-[22px] w-[100px] -translate-x-1/2 rounded-full bg-slate-900" />
          <div className="relative z-10 flex h-11 shrink-0 items-end justify-between px-6 pb-0.5 text-[11px] font-semibold text-slate-900">
            <span>{clock}</span>
            <div className="flex items-center gap-1 text-slate-800">
              <Signal className="size-3" />
              <span className="text-[10px]">5G</span>
              <Battery className="size-3.5" />
            </div>
          </div>
          {children}
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-text-secondary">采集员端 · 原型模拟</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 页面
// ---------------------------------------------------------------------------

export default function CollectionApp(): ReactElement {
  const [platformProps] = usePlatformProps()
  const [demoTasks, setDemoTasks] = useState<Task[]>(() =>
    mockTasks.map((t) => ({
      ...t,
      scriptException: t.scriptException ? { ...t.scriptException } : undefined,
    })),
  )
  const [demoScripts] = useState<TaskScript[]>(() =>
    mockTaskScripts.map((s) => ({
      ...s,
      propIds: [...s.propIds],
      atomicActionIds: [...(s.atomicActionIds ?? [])],
      steps: s.steps.map((step) => ({ ...step })),
    })),
  )

  const [phoneTab, setPhoneTab] = useState<PhoneTab>('pending')
  const [phoneRoute, setPhoneRoute] = useState<PhoneRoute>({ kind: 'tabs' })
  const [collectRuntimes, setCollectRuntimes] = useState<Record<string, CollectRuntime>>({})
  const [tick, setTick] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [platformEvents, setPlatformEvents] = useState<PlatformEvent[]>([])
  const [issueReports, setIssueReports] = useState<IssueReport[]>(() =>
    mockIssueReports.filter((i) => i.source === 'collection-app').map((i) => ({ ...i })),
  )
  const [reportDraft, setReportDraft] = useState({
    title: '',
    description: '',
    severity: 'medium' as IssueReport['severity'],
  })

  const appSessions = useMemo(
    () =>
      mockCollectionSessions.filter(
        (s) => s.status === 'collecting' || s.status === 'paused' || s.status === 'failed',
      ),
    [],
  )

  const myPendingTasks = useMemo(
    () =>
      demoTasks.filter(
        (t) =>
          t.personnelId === COLLECTOR.id &&
          (t.status === 'scheduled' || t.status === 'ready') &&
          isScriptConfirmed(t, demoScripts),
      ),
    [demoTasks, demoScripts],
  )

  const myActiveTasks = useMemo(
    () => demoTasks.filter((t) => t.personnelId === COLLECTOR.id && t.status === 'in_progress'),
    [demoTasks],
  )

  const exceptionTasks = useMemo(
    () => demoTasks.filter((t) => t.scriptException?.status === 'open'),
    [demoTasks],
  )

  const selectedTask = useMemo(() => {
    if (phoneRoute.kind === 'tabs') return null
    if (phoneRoute.kind === 'report') return null
    return demoTasks.find((t) => t.id === phoneRoute.taskId) ?? null
  }, [phoneRoute, demoTasks])

  const selectedScript = useMemo(
    () => (selectedTask ? scriptForTask(selectedTask, demoScripts) : undefined),
    [selectedTask, demoScripts],
  )

  const collectRuntime =
    phoneRoute.kind === 'collect' ? collectRuntimes[phoneRoute.taskId] : undefined

  useEffect(() => {
    if (phoneRoute.kind !== 'collect') return
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [phoneRoute])

  function showToast(msg: string): void {
    setToast(msg)
    window.setTimeout(() => setToast(null), 3200)
  }

  function startCollect(taskId: string): void {
    setCollectRuntimes((prev) => {
      if (prev[taskId]) return prev
      return {
        ...prev,
        [taskId]: { taskId, startedAt: Date.now(), currentStepIndex: 0 },
      }
    })
    setPhoneRoute({ kind: 'collect', taskId })
  }

  function claimAndGoActive(task: Task, message: string): void {
    claimTask(setDemoTasks, task.id)
    setPhoneRoute({ kind: 'tabs' })
    setPhoneTab('active')
    showToast(message)
  }

  function handlePropMatch(task: Task): void {
    pushEvent(setPlatformEvents, {
      tone: 'success',
      title: '道具确认通过 · 任务已领取',
      detail: `${task.id} 已由 ${COLLECTOR.name} 领取，可进入采集`,
      taskId: task.id,
    })
    claimAndGoActive(task, '任务已领取')
  }

  function handlePropMismatch(task: Task, continueCollect = false): void {
    if (!task.scriptException || task.scriptException.status !== 'open') {
      reportPropMismatch(setDemoTasks, task, COLLECTOR.name)
    }
    pushEvent(setPlatformEvents, {
      tone: 'warn',
      title: '台本道具异常上报',
      detail: `${task.id} 道具不符已同步平台，采集员继续按台本执行（不阻塞）`,
      taskId: task.id,
    })
    if (task.status === 'scheduled' || task.status === 'ready') {
      claimTask(setDemoTasks, task.id)
      setPhoneTab('active')
    }
    showToast('已上报运营，请继续按台本执行')
    if (continueCollect) {
      startCollect(task.id)
    } else if (task.status !== 'in_progress') {
      setPhoneRoute({ kind: 'tabs' })
      setPhoneTab('active')
    }
  }

  function submitPhoneReport(): void {
    if (!reportDraft.title.trim() || !reportDraft.description.trim()) return
    const nextId = `issue-${String(issueReports.length + 1).padStart(3, '0')}`
    const issue: IssueReport = {
      id: nextId,
      source: 'collection-app',
      status: 'open',
      severity: reportDraft.severity,
      title: reportDraft.title.trim(),
      description: reportDraft.description.trim(),
      sessionId: appSessions[0]?.id,
      reporter: COLLECTOR.name,
      reportedAt: new Date().toISOString(),
    }
    setIssueReports((prev) => [issue, ...prev])
    pushEvent(setPlatformEvents, {
      tone: 'warn',
      title: '采集问题提报',
      detail: issue.title,
    })
    setPhoneRoute({ kind: 'tabs' })
    setReportDraft({ title: '', description: '', severity: 'medium' })
    showToast('问题已提交至平台')
  }

  function advanceStep(taskId: string, maxIndex: number): void {
    setCollectRuntimes((prev) => {
      const rt = prev[taskId]
      if (!rt) return prev
      const next = Math.min(rt.currentStepIndex + 1, maxIndex)
      return { ...prev, [taskId]: { ...rt, currentStepIndex: next } }
    })
  }

  const issueColumns: DataTableColumn<IssueReport>[] = [
    { key: 'id', title: 'ID' },
    {
      key: 'severity',
      title: '级别',
      render: (row) => (
        <span
          className={cn(
            'inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset',
            issueSeverityClass(row.severity),
          )}
        >
          {ISSUE_SEVERITY_LABEL[row.severity]}
        </span>
      ),
    },
    { key: 'title', title: '标题' },
    {
      key: 'reportedAt',
      title: '时间',
      render: (row) => formatTime(row.reportedAt),
    },
  ]

  const elapsedMs =
    collectRuntime && phoneRoute.kind === 'collect'
      ? Date.now() - collectRuntime.startedAt
      : 0
  void tick

  const collectEstimatedMin =
    selectedScript && phoneRoute.kind === 'collect'
      ? scriptEstimatedMinutes(selectedScript)
      : 0
  const collectBudgetMs = collectEstimatedMin * DEMO_MS_PER_ESTIMATED_MINUTE
  const isOvertime = elapsedMs > collectBudgetMs && collectBudgetMs > 0
  const isNearTimeout = !isOvertime && elapsedMs > collectBudgetMs * 0.85 && collectBudgetMs > 0

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-text">
            <Smartphone className="size-5 text-primary" strokeWidth={1.75} />
            采集 App 演示
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            采集员快速执行；道具异常仅上报平台，不阻塞 App 端流程
          </p>
        </div>
        <Link
          to="/collection"
          className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-slate-50"
        >
          返回采集总览
        </Link>
      </header>

      <div className="grid items-start gap-8 xl:grid-cols-[320px_minmax(0,1fr)]">
        <PhoneFrame>
          {phoneRoute.kind === 'report' ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center gap-2 border-b border-black/5 bg-white/80 px-4 py-3 backdrop-blur">
                <button
                  type="button"
                  onClick={() => setPhoneRoute({ kind: 'tabs' })}
                  className="rounded-full p-1 text-slate-600"
                >
                  <ArrowLeft className="size-5" />
                </button>
                <h2 className="text-[15px] font-semibold text-slate-900">问题提报</h2>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                <input
                  value={reportDraft.title}
                  onChange={(e) => setReportDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="问题标题"
                  className="w-full rounded-xl border-0 bg-white px-3 py-3 text-[15px] shadow-sm ring-1 ring-black/5"
                />
                <textarea
                  rows={4}
                  value={reportDraft.description}
                  onChange={(e) => setReportDraft((d) => ({ ...d, description: e.target.value }))}
                  placeholder="描述现场情况…"
                  className="w-full resize-none rounded-xl border-0 bg-white px-3 py-3 text-[15px] shadow-sm ring-1 ring-black/5"
                />
                <button
                  type="button"
                  onClick={submitPhoneReport}
                  className="w-full rounded-2xl bg-[#007aff] py-3.5 text-[15px] font-semibold text-white active:opacity-80"
                >
                  提交至平台
                </button>
              </div>
            </div>
          ) : phoneRoute.kind === 'collect' && selectedTask && selectedScript && collectRuntime ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center gap-2 border-b border-black/5 bg-white/80 px-4 py-3 backdrop-blur">
                <button
                  type="button"
                  onClick={() => setPhoneRoute({ kind: 'tabs' })}
                  className="rounded-full p-1 text-slate-600"
                >
                  <ArrowLeft className="size-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[15px] font-semibold text-slate-900">采集中</h2>
                  <p className="font-mono text-[11px] text-[#007aff]">{selectedTask.id}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3">
                {(isOvertime || isNearTimeout) && (
                  <div
                    className={cn(
                      'mb-3 rounded-2xl px-3 py-2.5 text-[12px] font-medium',
                      isOvertime
                        ? 'bg-[#ff3b30]/10 text-[#ff3b30]'
                        : 'bg-[#ff9500]/10 text-[#ff9500]',
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <Timer className="size-3.5 shrink-0" />
                      {isOvertime
                        ? '已超过台本预估时长，请尽快收尾或联系运营'
                        : '接近日程预估上限，请注意节奏'}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-slate-400">已用 / 预估</span>
                    <span className="font-semibold tabular-nums text-slate-800">
                      {formatElapsed(elapsedMs)} / {collectEstimatedMin} 分钟
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        isOvertime ? 'bg-[#ff3b30]' : 'bg-[#007aff]',
                      )}
                      style={{
                        width: `${Math.min(100, collectBudgetMs > 0 ? (elapsedMs / collectBudgetMs) * 100 : 0)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-400">
                    演示加速计时（1 分钟预估 ≈ 2 秒）
                  </p>
                </div>

                <p className="mt-3 text-[13px] leading-relaxed text-slate-600">
                  {selectedScript.instruction}
                </p>

                <div className="mt-3 space-y-2">
                  {selectedScript.steps.map((step, idx) => {
                    const isCurrent = idx === collectRuntime.currentStepIndex
                    const isDone = idx < collectRuntime.currentStepIndex
                    return (
                      <div
                        key={step.order}
                        className={cn(
                          'rounded-2xl p-3 ring-1',
                          isCurrent
                            ? 'bg-[#007aff]/8 ring-[#007aff]/30'
                            : isDone
                              ? 'bg-white/60 ring-black/5 opacity-70'
                              : 'bg-white ring-black/5',
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={cn(
                              'flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold',
                              isCurrent
                                ? 'bg-[#007aff] text-white'
                                : isDone
                                  ? 'bg-[#34c759] text-white'
                                  : 'bg-slate-200 text-slate-600',
                            )}
                          >
                            {isDone ? <CheckCircle2 className="size-4" /> : step.order}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium text-slate-400">
                              步骤 {step.order}
                              {isCurrent && (
                                <span className="ml-1.5 text-[#007aff]">进行中</span>
                              )}
                            </p>
                            <p className="mt-0.5 text-[14px] font-medium leading-snug text-slate-900">
                              {step.operation}
                            </p>
                            <p className="mt-1 flex items-center gap-1 text-[12px] text-slate-500">
                              <Clock className="size-3" />
                              预估 {step.durationMinutes} 分钟
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="shrink-0 space-y-2 border-t border-black/5 bg-white/90 px-4 py-3 pb-6 backdrop-blur">
                {collectRuntime.currentStepIndex < selectedScript.steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      advanceStep(selectedTask.id, selectedScript.steps.length - 1)
                    }
                    className="w-full rounded-2xl bg-[#007aff] py-3 text-[15px] font-semibold text-white"
                  >
                    完成当前步骤
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => showToast('本步为最后一步，可结束采集会话')}
                    className="w-full rounded-2xl bg-[#34c759] py-3 text-[15px] font-semibold text-white"
                  >
                    全部步骤已完成
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handlePropMismatch(selectedTask, true)}
                  className="w-full py-2 text-[12px] font-medium text-[#ff9500]"
                >
                  道具与现场不符？上报运营（不中断采集）
                </button>
              </div>
            </div>
          ) : phoneRoute.kind === 'task' && selectedTask && selectedScript ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center gap-2 border-b border-black/5 bg-white/80 px-4 py-3 backdrop-blur">
                <button
                  type="button"
                  onClick={() => setPhoneRoute({ kind: 'tabs' })}
                  className="rounded-full p-1 text-slate-600"
                >
                  <ArrowLeft className="size-5" />
                </button>
                <h2 className="truncate text-[15px] font-semibold text-slate-900">领取任务</h2>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <p className="font-mono text-[13px] font-semibold text-[#007aff]">{selectedTask.id}</p>
                <p className="mt-1 text-[17px] font-semibold leading-snug text-slate-900">
                  {selectedTask.type}
                </p>
                <p className="mt-2 flex items-center gap-1 text-[13px] text-slate-500">
                  <MapPin className="size-3.5 shrink-0" />
                  {selectedTask.scene}
                </p>
                <p className="mt-3 flex items-center gap-1 text-[12px] text-slate-500">
                  <Timer className="size-3.5" />
                  台本预估 {scriptEstimatedMinutes(selectedScript)} 分钟 ·{' '}
                  {selectedScript.steps.length} 个步骤
                </p>

                <div className="mt-4 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-black/5">
                  <p className="text-[12px] font-medium text-slate-400">台本说明</p>
                  <p className="mt-2 text-[14px] leading-relaxed text-slate-800">
                    {selectedScript.instruction}
                  </p>
                </div>

                <div className="mt-3 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-black/5">
                  <p className="text-[12px] font-medium text-slate-400">核对现场道具（可边执行边上报）</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedScript.propIds.map((pid) => {
                      const prop = platformProps.find((p) => p.id === pid)
                      return (
                        <span
                          key={pid}
                          className="rounded-full bg-[#007aff]/10 px-2.5 py-1 text-[13px] font-medium text-[#007aff]"
                        >
                          {prop?.name ?? pid}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="shrink-0 space-y-2 border-t border-black/5 bg-white/90 px-4 py-4 pb-6 backdrop-blur">
                <button
                  type="button"
                  onClick={() => {
                    handlePropMatch(selectedTask)
                    startCollect(selectedTask.id)
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#34c759] py-3.5 text-[15px] font-semibold text-white active:opacity-90"
                >
                  <CheckCircle2 className="size-5" />
                  道具符合，领取并进入采集
                </button>
                <button
                  type="button"
                  onClick={() => handlePropMismatch(selectedTask, true)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-[15px] font-semibold text-[#ff9500] ring-1 ring-[#ff9500]/30 active:bg-orange-50"
                >
                  <XCircle className="size-5" />
                  道具不符，上报并继续采集
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-black/5 bg-white/80 px-4 py-3 backdrop-blur">
                <div>
                  <p className="text-[11px] text-slate-400">采集员</p>
                  <p className="text-[15px] font-semibold text-slate-900">{COLLECTOR.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPhoneRoute({ kind: 'report' })}
                  className="flex size-9 items-center justify-center rounded-full bg-[#ff9500]/15 text-[#ff9500]"
                >
                  <Bug className="size-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                {phoneTab === 'pending' && (
                  <div className="space-y-2">
                    {myPendingTasks.length === 0 ? (
                      <div className="rounded-2xl bg-white px-4 py-10 text-center text-[14px] text-slate-400 shadow-sm">
                        暂无待执行任务
                      </div>
                    ) : (
                      myPendingTasks.map((task) => {
                        const script = scriptForTask(task, demoScripts)
                        return (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => setPhoneRoute({ kind: 'task', taskId: task.id })}
                            className="w-full rounded-2xl bg-white p-3.5 text-left shadow-sm ring-1 ring-black/5 active:scale-[0.98]"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-mono text-[12px] font-semibold text-[#007aff]">
                                  {task.id}
                                </p>
                                <p className="mt-0.5 text-[16px] font-semibold text-slate-900">
                                  {task.type}
                                </p>
                                <p className="mt-1 truncate text-[13px] text-slate-500">
                                  {task.scene}
                                </p>
                                {script && (
                                  <p className="mt-1 text-[11px] text-slate-400">
                                    预估 {scriptEstimatedMinutes(script)} 分钟
                                  </p>
                                )}
                              </div>
                              <ChevronRight className="mt-1 size-5 shrink-0 text-slate-300" />
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                )}

                {phoneTab === 'active' && (
                  <div className="space-y-2">
                    {myActiveTasks.length === 0 ? (
                      <div className="rounded-2xl bg-white px-4 py-10 text-center text-[14px] text-slate-400 shadow-sm">
                        暂无进行中任务
                      </div>
                    ) : (
                      myActiveTasks.map((task) => {
                        const script = scriptForTask(task, demoScripts)
                        const hasException = task.scriptException?.status === 'open'
                        return (
                          <div
                            key={task.id}
                            className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-black/5"
                          >
                            <div className="flex items-center gap-2">
                              <span className="size-2 rounded-full bg-[#34c759] motion-safe:animate-pulse" />
                              <p className="font-mono text-[12px] font-semibold text-slate-900">
                                {task.id}
                              </p>
                              {hasException && (
                                <span className="rounded-full bg-[#ff9500]/15 px-2 py-0.5 text-[10px] font-medium text-[#ff9500]">
                                  已上报
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-[16px] font-semibold text-slate-900">
                              {task.type}
                            </p>
                            <p className="mt-1 text-[13px] text-slate-500">{task.scene}</p>
                            {script && (
                              <p className="mt-1 text-[11px] text-slate-400">
                                {script.steps.length} 步 · 预估{' '}
                                {scriptEstimatedMinutes(script)} 分钟
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => startCollect(task.id)}
                              className="mt-3 w-full rounded-xl bg-[#007aff] py-2.5 text-[14px] font-semibold text-white"
                            >
                              进入采集
                            </button>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 border-t border-black/5 bg-white/95 px-6 pb-5 pt-1 backdrop-blur">
                {([
                  ['pending', '待执行', myPendingTasks.length],
                  ['active', '进行中', myActiveTasks.length],
                ] as const).map(([tab, label, count]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setPhoneTab(tab)}
                    className={cn(
                      'relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium',
                      phoneTab === tab ? 'text-[#007aff]' : 'text-slate-400',
                    )}
                  >
                    <ClipboardList className="size-5" strokeWidth={phoneTab === tab ? 2.25 : 1.75} />
                    {label}
                    {count > 0 && (
                      <span className="absolute right-6 top-1 flex min-w-[16px] items-center justify-center rounded-full bg-[#007aff] px-1 text-[9px] font-bold text-white">
                        {count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {toast && (
            <div className="pointer-events-none absolute bottom-24 left-1/2 z-30 max-w-[90%] -translate-x-1/2 rounded-full bg-slate-900/90 px-4 py-2 text-center text-[12px] font-medium text-white shadow-lg">
              {toast}
            </div>
          )}
        </PhoneFrame>

        <div className="min-w-0 space-y-4">
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
              <Radio className="size-4 text-primary" />
              实时同步（App → 平台）
            </h3>
            {platformEvents.length === 0 ? (
              <p className="text-sm text-text-secondary">
                道具异常上报、领取与采集进度将同步至此；运营在任务管理处理，不阻塞采集员执行。
              </p>
            ) : (
              <ul className="max-h-48 space-y-2 overflow-y-auto">
                {platformEvents.map((evt) => (
                  <li
                    key={evt.id}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-xs',
                      evt.tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
                      evt.tone === 'danger' && 'border-rose-200 bg-rose-50 text-rose-900',
                      evt.tone === 'warn' && 'border-amber-200 bg-amber-50 text-amber-900',
                      evt.tone === 'info' && 'border-sky-200 bg-sky-50 text-sky-900',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{evt.title}</span>
                      <span className="shrink-0 text-[10px] opacity-70">
                        {formatTime(evt.at)}
                      </span>
                    </div>
                    <p className="mt-0.5 opacity-90">{evt.detail}</p>
                    {evt.taskId && (
                      <p className="mt-1 font-mono text-[10px] opacity-75">{evt.taskId}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-rose-200/80 bg-rose-50/30 p-4 shadow-sm">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-950">
              <AlertTriangle className="size-4 text-rose-600" />
              异常通知（运营处理）
            </h3>
            {exceptionTasks.length === 0 ? (
              <p className="text-sm text-rose-800/80">当前无待运营处理的台本道具异常。</p>
            ) : (
              <ul className="space-y-2">
                {exceptionTasks.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-rose-950"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-semibold text-rose-700">{t.id}</span>
                      <span className="text-rose-300">·</span>
                      <span>{t.personnel}</span>
                      {t.status === 'in_progress' && (
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                          采集员执行中
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-rose-800">{t.scriptException?.reason}</p>
                    <p className="mt-1 text-[11px] text-rose-600">
                      → 请运营在任务详情修订台本；采集员 App 端不阻塞，按最新台本继续即可
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-text">活跃采集会话</h3>
            <div className="space-y-2">
              {appSessions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg border border-border bg-white px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold">{s.id}</span>
                    <StatusBadge status={collectionStatusLabel(s.status)} size="sm" />
                  </div>
                  <p className="mt-1 text-text-secondary">{s.device}</p>
                  <ProgressBar value={s.progress} color="green" size="sm" className="mt-2" />
                  {s.anomalies.length > 0 && (
                    <p className="mt-1 text-amber-800">{s.anomalies.join('；')}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-text">问题提报列表</h3>
            <DataTable columns={issueColumns} data={issueReports} />
          </section>
        </div>
      </div>
    </div>
  )
}
