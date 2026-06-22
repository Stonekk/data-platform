import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Link2,
  XCircle,
} from 'lucide-react'

import {
  DataTable,
  type DataTableColumn,
  Modal,
  SearchFilter,
  type SearchFilterDef,
  StatusBadge,
} from '@/components/ui'
import { mockDevices, mockPersonnel, mockScenes, type Requirement, type Task, type TaskPriority, type TaskStatus } from '@/data/mock'
import { getPlatformRequirements, updatePlatformRequirements, usePlatformRequirements } from '@/data/requirementStore'
import {
  setPlatformTaskScriptsState,
  setPlatformTasksState,
  usePlatformTaskScripts,
  usePlatformTasks,
} from '@/data/taskStore'
import { ScheduleBoard } from '@/components/tasks/ScheduleBoard'
import { ScriptFirstDecomposition } from '@/components/tasks/ScriptFirstDecomposition'
import {
  ScriptConfigPanel,
  type ScriptWizardStep,
} from '@/components/tasks/ScriptConfigPanel'
import { ScriptContentCard } from '@/components/tasks/ScriptContentCard'
import { usePlatformProps } from '@/data/propStore'
import { usePlatformVenues } from '@/data/venueStore'
import { runAutoSchedule } from '@/lib/autoSchedule'
import { syncRequirementsByTasks } from '@/lib/requirementSync'
import { generateDemoScheduleTasks } from '@/lib/scheduleBoard'
import {
  allScriptsSchedulable,
  scriptCountLabel,
  scriptsForTask,
  taskScriptIds,
  totalTargetCount,
} from '@/lib/taskScriptAccess'
import { applyOpsScriptFix, isScriptSchedulable } from '@/lib/scriptWorkflow'
import { cn } from '@/lib/utils'
import {
  computeReadiness,
  DIMENSION_LABEL,
  READINESS_DIMENSIONS,
  type ReadinessCheck,
  type ReadinessDimension,
  type ReadinessState,
  type TaskReadiness,
} from '@/lib/taskReadiness'

// ---------------------------------------------------------------------------
// 常量与工具
// ---------------------------------------------------------------------------

const TASK_TABS = ['list', 'decomposition', 'schedule'] as const
type TaskTab = (typeof TASK_TABS)[number]

const TASK_TAB_META: Record<TaskTab, { title: string; description: string }> = {
  list: {
    title: '任务列表',
    description: '查看已拆解任务单元的状态、就绪校验与台本预警',
  },
  decomposition: {
    title: '任务拆解',
    description: '台本确认 → 人工分组 → 生成任务单元；资源编排在任务列表完成后再调度',
  },
  schedule: {
    title: '任务调度',
    description: '支持手动排期与自动化调度；调度区按场地/人员泳道呈现大规模并行任务，快速定位阻塞与异常',
  },
}

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending_resources: '待配资源',
  to_schedule: '待调度',
  scheduled: '已排期',
  ready: '待执行',
  in_progress: '执行中',
  completed: '已完成',
  closed: '已关闭',
}

const ALL_STATUSES: TaskStatus[] = [
  'pending_resources',
  'to_schedule',
  'scheduled',
  'ready',
  'in_progress',
  'completed',
  'closed',
]

const MAINLINE_NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  pending_resources: 'to_schedule',
  to_schedule: 'scheduled',
  scheduled: 'ready',
  ready: 'in_progress',
  in_progress: 'completed',
  completed: 'closed',
}

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

const DECOMPOSABLE_REQ_STATUSES: Requirement['status'][] = ['approved']

const TASK_UNIT_REQUIREMENT_STATUSES: Requirement['status'][] = [
  'decomposed',
  'executing',
  'blocked',
  'completed',
  'closed',
]

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function priorityPillClass(p: TaskPriority | undefined): string {
  switch (p) {
    case 'high':
      return 'bg-rose-50 text-rose-800 ring-rose-200'
    case 'medium':
      return 'bg-amber-50 text-amber-900 ring-amber-200'
    case 'low':
      return 'bg-sky-50 text-sky-800 ring-sky-200'
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200'
  }
}

function readinessPillClass(s: ReadinessState): string {
  switch (s) {
    case 'ready':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200'
    case 'warn':
      return 'bg-amber-50 text-amber-900 ring-amber-200'
    case 'missing':
      return 'bg-rose-50 text-rose-800 ring-rose-200'
  }
}

function readinessIcon(s: ReadinessState): string {
  if (s === 'ready') return '✓'
  if (s === 'warn') return '△'
  return '✗'
}

function overallBadge(overall: TaskReadiness['overall']): {
  label: string
  icon: ReactNode
  cls: string
} {
  if (overall === 'ready')
    return {
      label: '资源就绪',
      icon: <CheckCircle2 className="size-4" strokeWidth={1.75} aria-hidden />,
      cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    }
  if (overall === 'warn')
    return {
      label: '注意事项',
      icon: <AlertTriangle className="size-4" strokeWidth={1.75} aria-hidden />,
      cls: 'bg-amber-50 text-amber-900 ring-amber-200',
    }
  return {
    label: '资源阻塞',
    icon: <XCircle className="size-4" strokeWidth={1.75} aria-hidden />,
    cls: 'bg-rose-50 text-rose-800 ring-rose-200',
  }
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

function ReadinessPills({
  readiness,
  size = 'md',
}: {
  readiness: TaskReadiness
  size?: 'sm' | 'md'
}): ReactElement {
  return (
    <div className={cn('flex flex-wrap gap-1', size === 'sm' && 'gap-0.5')}>
      {READINESS_DIMENSIONS.map((dim) => {
        const check: ReadinessCheck = readiness[dim]
        return (
          <span
            key={dim}
            title={check.reason ?? DIMENSION_LABEL[dim]}
            className={cn(
              'inline-flex items-center gap-0.5 rounded-md ring-1 ring-inset',
              readinessPillClass(check.state),
              size === 'sm' ? 'px-1 py-0 text-[10px]' : 'px-1.5 py-0.5 text-xs',
            )}
          >
            <span className="font-mono">{readinessIcon(check.state)}</span>
            {DIMENSION_LABEL[dim]}
          </span>
        )
      })}
    </div>
  )
}

function ReadinessOverallBadge({
  readiness,
}: {
  readiness: TaskReadiness
}): ReactElement {
  const b = overallBadge(readiness.overall)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        b.cls,
      )}
    >
      {b.icon}
      {b.label}
    </span>
  )
}

function ReadinessDetailCard({
  readiness,
}: {
  readiness: TaskReadiness
}): ReactElement {
  return (
    <div className="rounded-lg border border-border bg-white/60 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            四要素就绪校验
          </span>
          <span className="text-[11px] text-text-secondary">
            画板要求：任务 = 人 + 设备 + 事 + 场地
          </span>
        </div>
        <ReadinessOverallBadge readiness={readiness} />
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {READINESS_DIMENSIONS.map((dim: ReadinessDimension) => {
          const check = readiness[dim]
          return (
            <li
              key={dim}
              className={cn(
                'flex items-start gap-2 rounded-md px-3 py-2 ring-1 ring-inset',
                readinessPillClass(check.state),
              )}
            >
              <span className="mt-0.5 font-mono text-sm font-semibold">
                {readinessIcon(check.state)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{DIMENSION_LABEL[dim]}</p>
                <p className="text-xs">{check.reason ?? '就绪'}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 主页面
// ---------------------------------------------------------------------------

export default function Tasks(): ReactElement {
  const { tab: tabParam } = useParams<{ tab: string }>()
  const activeTab: TaskTab = TASK_TABS.includes(tabParam as TaskTab)
    ? (tabParam as TaskTab)
    : 'list'
  const tabMeta = TASK_TAB_META[activeTab]
  const invalidTab = tabParam !== undefined && !TASK_TABS.includes(tabParam as TaskTab)
  const [tasks] = usePlatformTasks()
  const [taskScripts] = usePlatformTaskScripts()
  const setTasks = setPlatformTasksState
  const setTaskScripts = setPlatformTaskScriptsState
  const [platformProps, setPlatformProps] = usePlatformProps()
  const [requirements] = usePlatformRequirements()

  const [search, setSearch] = useState<string>('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    status: 'all',
    readiness: 'all',
  })
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [resourceDraft, setResourceDraft] = useState({
    personnelId: '',
    deviceId: '',
    sceneId: '',
  })
  const [detailScriptWizard, setDetailScriptWizard] = useState<ScriptWizardStep>('configure')
  const [exceptionFixDraft, setExceptionFixDraft] = useState<string>('')
  const [transitionMessage, setTransitionMessage] = useState<string | null>(null)
  // 任务拆解 Tab
  const [selectedReqId, setSelectedReqId] = useState<string>(
    () =>
      getPlatformRequirements().find((r) =>
        DECOMPOSABLE_REQ_STATUSES.includes(r.status),
      )?.id ?? '',
  )
  // 任务调度 Tab（手动：仅排时间窗，人/设备/场已在拆解阶段绑定）
  const [scheduleSelectedIds, setScheduleSelectedIds] = useState<string[]>([])
  const [scheduleFormStart, setScheduleFormStart] = useState<string>('2025-04-02T09:00')
  const [scheduleFormEnd, setScheduleFormEnd] = useState<string>('2025-04-02T12:00')
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null)
  const [autoScheduleEnabled, setAutoScheduleEnabled] = useState(false)
  const [autoScheduleLastRun, setAutoScheduleLastRun] = useState<string | null>(null)
  const [autoScheduleLog, setAutoScheduleLog] = useState<string[]>([])
  const [scheduleDemoScale, setScheduleDemoScale] = useState(true)
  const venues = usePlatformVenues()

  // ---------- 派生数据 ----------

  const taskReadiness = useMemo(() => {
    const m = new Map<string, TaskReadiness>()
    for (const t of tasks) m.set(t.id, computeReadiness(t, taskScripts))
    return m
  }, [tasks, taskScripts])

  const requirementById = useMemo(() => {
    const m = new Map<string, Requirement>()
    for (const r of requirements) m.set(r.id, r)
    return m
  }, [requirements])

  const taskUnits = useMemo(() => {
    return tasks.filter((task) => {
      if (task.requirementId === undefined || task.requirementId === '') return false
      const req = requirementById.get(task.requirementId)
      if (!req) return false
      return TASK_UNIT_REQUIREMENT_STATUSES.includes(req.status)
    })
  }, [tasks, requirementById])

  const decomposableRequirements = useMemo(() => {
    return requirements.filter((r) =>
      DECOMPOSABLE_REQ_STATUSES.includes(r.status),
    )
  }, [requirements])

  useEffect(() => {
    if (decomposableRequirements.length === 0) {
      if (selectedReqId !== '') setSelectedReqId('')
      return
    }
    if (!selectedReqId || !decomposableRequirements.some((r) => r.id === selectedReqId)) {
      setSelectedReqId(decomposableRequirements[0]!.id)
    }
  }, [decomposableRequirements, selectedReqId])

  const selectedRequirement = useMemo(() => {
    if (selectedReqId === '') return null
    return requirementById.get(selectedReqId) ?? null
  }, [selectedReqId, requirementById])

  const selectedReqTasks = useMemo(() => {
    if (selectedRequirement === null) return [] as Task[]
    const ids = new Set(selectedRequirement.linkedTaskIds)
    return tasks.filter((t) => ids.has(t.id))
  }, [selectedRequirement, tasks])

  /** 拆解后的任务单元中，尚待排期（手动调度入口） */
  const tasksPendingSchedule = useMemo(() => {
    return taskUnits.filter((t) => t.status === 'to_schedule')
  }, [taskUnits])

  const scheduleBoardTasks = useMemo(() => {
    if (!scheduleDemoScale) return taskUnits
    return [...taskUnits, ...generateDemoScheduleTasks(taskUnits, 72)]
  }, [taskUnits, scheduleDemoScale])

  const statusFilterDef: SearchFilterDef = useMemo(
    () => ({
      key: 'status',
      label: '状态',
      options: [
        { value: 'all', label: '全部状态' },
        ...ALL_STATUSES.map((s) => ({
          value: s,
          label: TASK_STATUS_LABEL[s],
        })),
      ],
    }),
    [],
  )

  const readinessFilterDef: SearchFilterDef = useMemo(
    () => ({
      key: 'readiness',
      label: '就绪态',
      options: [
        { value: 'all', label: '全部就绪态' },
        { value: 'ready', label: '资源就绪' },
        { value: 'warn', label: '注意事项' },
        { value: 'blocked', label: '资源阻塞' },
      ],
    }),
    [],
  )

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase()
    const st = activeFilters.status ?? 'all'
    const rd = activeFilters.readiness ?? 'all'
    return taskUnits.filter((t) => {
      if (st !== 'all' && t.status !== st) return false
      if (rd !== 'all' && (taskReadiness.get(t.id)?.overall ?? 'blocked') !== rd) return false
      if (!q) return true
      return (
        t.id.toLowerCase().includes(q) ||
        t.device.toLowerCase().includes(q) ||
        t.personnel.toLowerCase().includes(q) ||
        (t.requirementId ?? '').toLowerCase().includes(q)
      )
    })
  }, [search, activeFilters.status, activeFilters.readiness, taskReadiness, taskUnits])

  const tableColumns: DataTableColumn<Task>[] = useMemo(
    () => [
      { key: 'id', title: '任务ID' },
      {
        key: 'requirementId',
        title: '关联需求',
        render: (row) => (
          <span className="inline-flex items-center gap-1 text-xs font-mono text-primary">
            <Link2 className="size-3" strokeWidth={1.75} aria-hidden />
            {row.requirementId ?? '—'}
          </span>
        ),
      },
      { key: 'type', title: '类型' },
      {
        key: 'priority',
        title: '优先级',
        render: (row) => (
          <span
            className={cn(
              'inline-flex rounded-md px-1.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
              priorityPillClass(row.priority),
            )}
          >
            {row.priority !== undefined ? PRIORITY_LABEL[row.priority] : '—'}
          </span>
        ),
      },
      {
        key: 'status',
        title: '状态',
        render: (row) => (
          <StatusBadge status={TASK_STATUS_LABEL[row.status]} size="sm" />
        ),
      },
      {
        key: 'readiness',
        title: '4要素就绪',
        render: (row) => {
          const r = taskReadiness.get(row.id)
          if (r === undefined) return '—'
          return <ReadinessPills readiness={r} size="sm" />
        },
      },
      {
        key: 'scriptPackage',
        title: '台本包',
        render: (row) => {
          const ids = taskScriptIds(row)
          const total = totalTargetCount(row, taskScripts)
          return (
            <span className="text-xs text-text-secondary">
              {scriptCountLabel(row)}
              {ids.length > 0 && (
                <span className="ml-1 tabular-nums text-text">· {total} 条</span>
              )}
            </span>
          )
        },
      },
      {
        key: 'scriptAlert',
        title: '台本预警',
        render: (row) => {
          if (row.scriptException?.status === 'open') {
            return (
              <span className="inline-flex rounded-md bg-rose-50 px-1.5 py-0.5 text-[11px] font-medium text-rose-800 ring-1 ring-inset ring-rose-200">
                道具异常
              </span>
            )
          }
          const bound = scriptsForTask(row, taskScripts)
          if (bound.length === 0) return '—'
          const drafts = bound.filter((s) => s.status === 'draft')
          if (drafts.length > 0) {
            return (
              <span className="inline-flex rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-900 ring-1 ring-inset ring-amber-200">
                {drafts.length > 1 ? `${drafts.length} 台本待确认` : '待确认'}
              </span>
            )
          }
          return (
            <span className="inline-flex rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
              已绑定
            </span>
          )
        },
      },
      {
        key: 'startTime',
        title: '计划时间',
        render: (row) => (
          <span className="font-mono text-xs text-text-secondary">
            {formatDateTime(row.startTime)} → {formatDateTime(row.endTime)}
          </span>
        ),
      },
    ],
    [taskReadiness, taskScripts],
  )

  function toggleScheduleTaskSelect(taskId: string): void {
    setScheduleSelectedIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId],
    )
  }

  function runAutoScheduleNow(): void {
    const result = runAutoSchedule(tasks, taskScripts)
    setTasks(result.nextTasks)
    updatePlatformRequirements((prev) => syncRequirementsByTasks(prev, result.nextTasks))
    setAutoScheduleLastRun(new Date().toISOString())
    setAutoScheduleLog(result.logLines)
    const msg =
      result.scheduledIds.length > 0
        ? `自动调度完成：${result.scheduledIds.length} 条已排期${
            result.skipped.length > 0 ? `，${result.skipped.length} 条跳过` : ''
          }`
        : '无满足条件的待调度任务可自动排期'
    setScheduleMessage(msg)
  }

  function submitManualSchedule(): void {
    const targets = scheduleSelectedIds.filter((id) => {
      const task = tasks.find((t) => t.id === id)
      return task !== undefined && task.status === 'to_schedule'
    })
    if (targets.length === 0) {
      setScheduleMessage('请勾选至少一条「待调度」任务单元后再提交。')
      return
    }
    const start = new Date(scheduleFormStart)
    const end = new Date(scheduleFormEnd)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setScheduleMessage('计划开始/结束时间格式不正确。')
      return
    }
    if (end.getTime() <= start.getTime()) {
      setScheduleMessage('计划结束时间必须晚于开始时间。')
      return
    }
    const unconfirmed = targets.filter((id) => {
      const task = tasks.find((t) => t.id === id)
      if (!task?.scriptId) return true
      const script = taskScripts.find((s) => s.taskId === task.scriptId)
      return !isScriptSchedulable(script)
    })
    if (unconfirmed.length > 0) {
      setScheduleMessage(
        `闸口未通过：${unconfirmed.join('、')} 台本未确认绑定，不可进入调度。`,
      )
      return
    }
    const startIso = start.toISOString()
    const endIso = end.toISOString()
    const targetSet = new Set(targets)
    const nextTasks = tasks.map((t) =>
      targetSet.has(t.id) && t.status === 'to_schedule'
        ? { ...t, status: 'scheduled' as const, startTime: startIso, endTime: endIso }
        : t,
    )
    setTasks(nextTasks)
    updatePlatformRequirements((prev) => syncRequirementsByTasks(prev, nextTasks))
    setScheduleSelectedIds([])
    setScheduleMessage(
      `已提交手动调度：${targets.length} 条任务单元 待调度 → 已排期（${formatDateTime(startIso)} → ${formatDateTime(endIso)}）`,
    )
  }

  function applyExceptionScriptFix(taskId: string): void {
    const task = tasks.find((t) => t.id === taskId)
    if (!task?.scriptId || !task.scriptException) return
    const script = taskScripts.find((s) => s.taskId === task.scriptId)
    if (!script) return

    const instruction =
      exceptionFixDraft.trim() ||
      script.instruction ||
      '运营已根据现场道具更新台本说明。'

    const fixed = applyOpsScriptFix(
      script,
      {
        instruction,
        propIds: script.propIds,
        atomicActionIds: script.atomicActionIds ?? [],
      },
      '运营-张敏',
    )

    setTaskScripts((prev) =>
      prev.map((s) => (s.taskId === fixed.taskId ? fixed : s)),
    )
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId && t.scriptException
          ? {
              ...t,
              scriptException: { ...t.scriptException, status: 'resolved' },
            }
          : t,
      ),
    )
    setDetailTask((prev) =>
      prev?.id === taskId && prev.scriptException
        ? { ...prev, scriptException: { ...prev.scriptException, status: 'resolved' } }
        : prev,
    )
    setTransitionMessage(
      '台本已现场更新并放行：采集员可直接在异常任务上继续执行，无需重新确认道具。',
    )
  }

  function taskNeedsScriptBinding(task: Task): boolean {
    if (task.sceneId === undefined || task.sceneId === '') return false
    if (task.scriptId === undefined || task.scriptId === '') return true
    const script = taskScripts.find((s) => s.taskId === task.scriptId)
    return !isScriptSchedulable(script)
  }

  function bindScriptToTask(taskId: string, scriptTaskId: string): void {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, scriptId: scriptTaskId } : t)),
    )
    setDetailTask((prev) =>
      prev?.id === taskId ? { ...prev, scriptId: scriptTaskId } : prev,
    )
    setDetailScriptWizard('configure')
    setTransitionMessage('台本已确认绑定，「事」要素就绪，可继续推进调度。')
  }

  function openTaskDetail(task: Task): void {
    setDetailTask(task)
    setTransitionMessage(null)
    setDetailScriptWizard('configure')
    setResourceDraft({
      personnelId: task.personnelId ?? '',
      deviceId: task.deviceId ?? '',
      sceneId: task.sceneId ?? '',
    })
    const script = task.scriptId
      ? taskScripts.find((s) => s.taskId === task.scriptId)
      : undefined
    setExceptionFixDraft(script?.instruction ?? '')
  }

  function saveTaskResources(taskId: string): void {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    const person = mockPersonnel.find((p) => p.id === resourceDraft.personnelId)
    const device = mockDevices.find((d) => d.id === resourceDraft.deviceId)
    const scene = mockScenes.find((s) => s.id === resourceDraft.sceneId)
    const hasAll =
      resourceDraft.personnelId !== '' &&
      resourceDraft.deviceId !== '' &&
      resourceDraft.sceneId !== ''
    const patch: Task = {
      ...task,
      personnelId: resourceDraft.personnelId || undefined,
      deviceId: resourceDraft.deviceId || undefined,
      sceneId: resourceDraft.sceneId || undefined,
      personnel: person?.name ?? '待指派',
      device: device?.name ?? '待指派',
      scene: scene?.name ?? task.scene,
      status: hasAll && task.status === 'pending_resources' ? 'to_schedule' : task.status,
    }
    const nextTasks = tasks.map((t) => (t.id === taskId ? patch : t))
    setTasks(nextTasks)
    updatePlatformRequirements((prev) => syncRequirementsByTasks(prev, nextTasks))
    setDetailTask(patch)
    setTransitionMessage(
      hasAll
        ? '资源编排已保存，任务已进入「待调度」'
        : '已保存部分资源，请补全人 / 设备 / 场地后再调度',
    )
  }

  function taskNeedsResourceAssignment(task: Task): boolean {
    return (
      task.status === 'pending_resources' ||
      !task.personnelId ||
      !task.deviceId ||
      !task.sceneId
    )
  }

  function validateMainlineGate(task: Task, nextStatus: TaskStatus): string | null {
    if (nextStatus === 'to_schedule') {
      if (!task.personnelId || !task.deviceId || !task.sceneId) {
        return '闸口未通过：请先完成人 / 设备 / 场地资源编排。'
      }
      if (!allScriptsSchedulable(task, taskScripts)) {
        return '闸口未通过：台本未全部确认，不可进入待调度。'
      }
    }
    if (nextStatus === 'scheduled') {
      const start = new Date(task.startTime).getTime()
      const end = new Date(task.endTime).getTime()
      if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
        return '闸口未通过：开始/结束时间非法，无法进入已排期。'
      }
      const script = task.scriptId
        ? taskScripts.find((s) => s.taskId === task.scriptId)
        : undefined
      if (!isScriptSchedulable(script) && !allScriptsSchedulable(task, taskScripts)) {
        return '闸口未通过：台本未确认绑定，不可进入调度。'
      }
    }
    if (nextStatus === 'ready' && (task.requirementId === undefined || task.requirementId === '')) {
      return '闸口未通过：进入待执行前需关联需求（requirementId）。'
    }
    if (nextStatus === 'in_progress') {
      const readiness = computeReadiness(task)
      if (readiness.overall === 'blocked') {
        return '闸口未通过：四要素就绪存在缺失（blocked）。允许 warn，但不允许 blocked。'
      }
    }
    return null
  }

  function advanceTaskMainline(taskId: string): void {
    const current = tasks.find((task) => task.id === taskId)
    if (!current) return
    const nextStatus = MAINLINE_NEXT_STATUS[current.status]
    if (!nextStatus) {
      setTransitionMessage(`当前状态「${TASK_STATUS_LABEL[current.status]}」已是主线终点。`)
      return
    }
    const gateError = validateMainlineGate(current, nextStatus)
    if (gateError) {
      setTransitionMessage(gateError)
      return
    }

    const nextTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, status: nextStatus } : task,
    )
    setTasks(nextTasks)
    updatePlatformRequirements((prev) => syncRequirementsByTasks(prev, nextTasks))
    setDetailTask((prev) => (prev && prev.id === taskId ? { ...prev, status: nextStatus } : prev))
    setTransitionMessage(`已推进：${TASK_STATUS_LABEL[current.status]} -> ${TASK_STATUS_LABEL[nextStatus]}`)
  }

  // ---------- 任务拆解 Tab（V2.3.0 台本优先）----------

  function renderDecompositionTab(): ReactElement {
    function linkRequirementTasks(
      requirementId: string,
      newTaskIds: string[],
      allTasks: Task[],
    ): void {
      updatePlatformRequirements((prev) => {
        const linked = prev.map((r) =>
          r.id === requirementId
            ? {
                ...r,
                linkedTaskIds: [...new Set([...r.linkedTaskIds, ...newTaskIds])],
                status: r.status === 'approved' ? ('decomposed' as const) : r.status,
              }
            : r,
        )
        return syncRequirementsByTasks(linked, allTasks)
      })
    }

    return (
      <ScriptFirstDecomposition
        decomposableRequirements={decomposableRequirements}
        selectedReqId={selectedReqId}
        onSelectRequirement={setSelectedReqId}
        selectedRequirement={selectedRequirement}
        taskScripts={taskScripts}
        onTaskScriptsChange={setTaskScripts}
        tasks={tasks}
        onTasksChange={setTasks}
        onRequirementsLinked={linkRequirementTasks}
        selectedReqTasks={selectedReqTasks}
      />
    )
  }

  // ---------- 渲染 ----------

  if (invalidTab) {
    return <Navigate to="/tasks/list" replace />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-text">{tabMeta.title}</h1>
        <p className="mt-1 text-sm text-text-secondary">{tabMeta.description}</p>
        <p className="mt-1 text-xs text-text-secondary">
          任务与台本数据保存在浏览器本地，与数据需求页共享；刷新后仍保留。
        </p>
      </div>

      {activeTab === 'list' && (
        <div className="space-y-4">
          <SearchFilter
            searchValue={search}
            onSearchChange={setSearch}
            filters={[statusFilterDef, readinessFilterDef]}
            activeFilters={activeFilters}
            onFilterChange={(key, value) =>
              setActiveFilters((prev) => ({ ...prev, [key]: value }))
            }
            searchPlaceholder="搜索任务 ID、设备、人员或需求 ID…"
          />
          <DataTable
            columns={tableColumns}
            data={filteredTasks}
            onRowClick={(row) => openTaskDetail(row)}
          />
        </div>
      )}

      {activeTab === 'decomposition' && renderDecompositionTab()}

      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-text">调度模式</h3>
                <p className="mt-1 text-xs text-text-secondary">
                  人 / 设备 / 场地在任务列表「资源编排」中绑定。仅资源就绪的任务可排期；开启自动化后将基于空闲状态生成排期建议。
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-slate-50 px-3 py-2">
                <span className="text-xs font-medium text-text">自动化调度</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoScheduleEnabled}
                  onClick={() => setAutoScheduleEnabled((v) => !v)}
                  className={cn(
                    'relative h-6 w-11 rounded-full transition-colors',
                    autoScheduleEnabled ? 'bg-primary' : 'bg-slate-300',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform',
                      autoScheduleEnabled ? 'left-[22px]' : 'left-0.5',
                    )}
                  />
                </button>
              </label>
            </div>

            {autoScheduleEnabled && (
              <div className="mt-3 rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-3 text-xs">
                <p className="font-medium text-text">自动调度策略（规划）</p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-text-secondary">
                  <li>优先匹配空闲的人员、设备、室级场地与场景库</li>
                  <li>避开维护窗口与已占用时段，高优先级任务优先占槽</li>
                  <li>生成排期后写入调度区；阻塞任务保留在「需介入」队列待人工处理</li>
                </ul>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={runAutoScheduleNow}
                    className="rounded-lg bg-primary px-3 py-1.5 font-medium text-white hover:bg-primary/90"
                  >
                    立即运行自动调度
                  </button>
                  {autoScheduleLastRun && (
                    <span className="text-text-secondary">
                      上次运行 {formatDateTime(autoScheduleLastRun)}
                    </span>
                  )}
                </div>
                {autoScheduleLog.length > 0 && (
                  <ul className="mt-2 max-h-24 space-y-0.5 overflow-y-auto font-mono text-[11px] text-emerald-800">
                    {autoScheduleLog.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <label className="mt-3 inline-flex items-center gap-2 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={scheduleDemoScale}
                onChange={(e) => setScheduleDemoScale(e.target.checked)}
                className="size-3.5"
              />
              调度区加载大规模演示数据（模拟多场地并行采集，不影响真实任务数据）
            </label>
          </section>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
                  <Clock className="size-4 text-primary" strokeWidth={1.75} aria-hidden />
                  待调度任务单元
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-normal text-text-secondary">
                    {tasksPendingSchedule.length}
                  </span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setScheduleSelectedIds(tasksPendingSchedule.map((t) => t.id))
                    }
                    className="rounded-md border border-border bg-white px-2.5 py-1 text-xs text-text hover:bg-slate-50"
                  >
                    全选待调度
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleSelectedIds([])}
                    className="rounded-md border border-border bg-white px-2.5 py-1 text-xs text-text hover:bg-slate-50"
                  >
                    清空选择
                  </button>
                </div>
              </div>
              {tasksPendingSchedule.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  暂无待调度任务单元。请先在「任务拆解」生成任务并确保状态为待调度。
                </p>
              ) : (
                <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {tasksPendingSchedule.map((t) => {
                    const checked = scheduleSelectedIds.includes(t.id)
                    const r = taskReadiness.get(t.id)
                    return (
                      <li
                        key={t.id}
                        className={cn(
                          'flex gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                          checked ? 'border-primary bg-primary/[0.04]' : 'border-border bg-white',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleScheduleTaskSelect(t.id)}
                          className="mt-1 size-3.5 shrink-0"
                        />
                        <button
                          type="button"
                          onClick={() => openTaskDetail(t)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-primary">{t.id}</span>
                            <StatusBadge status={TASK_STATUS_LABEL[t.status]} size="sm" />
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">{t.type}</p>
                          <p className="mt-1 text-[11px] text-text-secondary">
                            {t.personnel} · {t.device} · {t.scene}
                          </p>
                          {r && (
                            <div className="mt-1.5">
                              <ReadinessPills readiness={r} size="sm" />
                            </div>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-text">
                {autoScheduleEnabled ? '人工覆盖 · 计划时间窗' : '手动调度 · 计划时间窗'}
              </h3>
              <p className="text-xs text-text-secondary">
                将应用于勾选的「待调度」任务；与自动调度并存，用于运营人工介入重排。
              </p>
              <label className="block text-xs text-text-secondary">
                计划开始
                <input
                  type="datetime-local"
                  value={scheduleFormStart}
                  onChange={(e) => setScheduleFormStart(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-border bg-white px-2 text-sm"
                />
              </label>
              <label className="block text-xs text-text-secondary">
                计划结束
                <input
                  type="datetime-local"
                  value={scheduleFormEnd}
                  onChange={(e) => setScheduleFormEnd(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-border bg-white px-2 text-sm"
                />
              </label>
              <button
                type="button"
                onClick={submitManualSchedule}
                className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90"
              >
                提交调度（待调度 → 已排期）
              </button>
              {scheduleMessage && (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs text-emerald-900">
                  {scheduleMessage}
                </p>
              )}
            </section>
          </div>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-text">调度区</h2>
            <p className="mb-4 text-xs text-text-secondary">
              按场地或人员泳道查看并行任务；顶部 KPI 与「需介入」队列帮助在大规模采集中快速定位阻塞与异常。
            </p>
            <ScheduleBoard
              tasks={scheduleBoardTasks}
              venues={venues}
              readinessMap={taskReadiness}
              demoScale={scheduleDemoScale}
              onTaskClick={openTaskDetail}
            />
          </section>
        </div>
      )}

      <Modal
        isOpen={detailTask !== null}
        onClose={() => {
          setDetailTask(null)
          setTransitionMessage(null)
        }}
        title={detailTask ? `任务详情 · ${detailTask.id}` : '任务详情'}
        size={detailTask && taskNeedsScriptBinding(detailTask) ? 'xl' : 'lg'}
      >
        {detailTask && (
          <div className="space-y-4">
            {(() => {
              const nextStatus = MAINLINE_NEXT_STATUS[detailTask.status]
              return (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-slate-50/70 px-3 py-2">
                  <p className="text-xs text-text-secondary">
                    主线状态机：待调度 → 已排期 → 待执行 → 执行中 → 已完成 → 已关闭
                  </p>
                  <button
                    type="button"
                    onClick={() => advanceTaskMainline(detailTask.id)}
                    disabled={nextStatus === undefined}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    推进到下一状态
                    {nextStatus ? `（${TASK_STATUS_LABEL[nextStatus]}）` : ''}
                  </button>
                </div>
              )
            })()}
            {transitionMessage && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
                {transitionMessage}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex rounded-md px-1.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
                  priorityPillClass(detailTask.priority),
                )}
              >
                {detailTask.priority !== undefined
                  ? `优先级 ${PRIORITY_LABEL[detailTask.priority]}`
                  : '优先级 —'}
              </span>
              <StatusBadge status={TASK_STATUS_LABEL[detailTask.status]} size="sm" />
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/5 px-2 py-0.5 text-xs text-primary ring-1 ring-inset ring-primary/20">
                <Link2 className="size-3" strokeWidth={1.75} aria-hidden />
                关联需求 {detailTask.requirementId ?? '—'}
              </span>
            </div>

            {detailTask.requirementId !== undefined && detailTask.requirementId !== '' && (
              <div className="rounded-lg border border-primary/20 bg-primary/[0.03] px-3 py-2 text-xs text-text-secondary">
                {(() => {
                  const r = requirementById.get(detailTask.requirementId)
                  if (r === undefined) return '关联需求未找到'
                  return (
                    <span>
                      <span className="font-medium text-text">{r.title}</span>
                      <span className="mx-2">·</span>
                      {r.requirementGroup} · 需求方 {r.owner} · 目标{' '}
                      {r.targetValue}
                    </span>
                  )
                })()}
              </div>
            )}

            <ReadinessDetailCard readiness={computeReadiness(detailTask, taskScripts)} />

            {taskNeedsResourceAssignment(detailTask) && (
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
                <div>
                  <h4 className="text-sm font-semibold text-text">资源编排</h4>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    任务内容（台本包）已确定。请指派人员、设备与场地，保存后可进入调度。
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-xs">
                    场地 / 场景
                    <select
                      value={resourceDraft.sceneId}
                      onChange={(e) =>
                        setResourceDraft((d) => ({ ...d, sceneId: e.target.value }))
                      }
                      className="mt-1 block w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm"
                    >
                      <option value="">请选择</option>
                      {mockScenes.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs">
                    采集员
                    <select
                      value={resourceDraft.personnelId}
                      onChange={(e) =>
                        setResourceDraft((d) => ({ ...d, personnelId: e.target.value }))
                      }
                      className="mt-1 block w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm"
                    >
                      <option value="">请选择</option>
                      {mockPersonnel.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs">
                    设备
                    <select
                      value={resourceDraft.deviceId}
                      onChange={(e) =>
                        setResourceDraft((d) => ({ ...d, deviceId: e.target.value }))
                      }
                      className="mt-1 block w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm"
                    >
                      <option value="">请选择</option>
                      {mockDevices.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => saveTaskResources(detailTask.id)}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  保存资源编排
                </button>
              </div>
            )}

            {detailTask.sceneId === undefined || detailTask.sceneId === '' ? (
              !taskNeedsResourceAssignment(detailTask) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                「事」要素需先指派场景库后才能配置台本。请完成上方资源编排。
              </div>
              )
            ) : taskNeedsScriptBinding(detailTask) ? (
              <div className="space-y-3 rounded-lg border border-primary/25 bg-primary/[0.03] p-3">
                <div>
                  <h4 className="text-sm font-semibold text-text">台本配置（任务详情补绑）</h4>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    此任务台本未确认绑定，无法推进至已排期。可在此直接配置并确认，无需返回拆解页。
                  </p>
                </div>
                <div className="flex gap-1 rounded-md bg-slate-200/60 p-0.5">
                  {([
                    ['configure', '① 配置台本'],
                    ['confirm', '② 确认绑定'],
                  ] as const).map(([step, label]) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setDetailScriptWizard(step)}
                      className={cn(
                        'flex-1 rounded px-2 py-1 text-[11px] font-medium',
                        detailScriptWizard === step
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-text-secondary',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <ScriptConfigPanel
                  taskId={detailTask.id}
                  taskType={detailTask.type}
                  sceneId={detailTask.sceneId}
                  scripts={taskScripts}
                  props={platformProps}
                  wizardStep={detailScriptWizard}
                  onPropsChange={setPlatformProps}
                  onScriptsChange={setTaskScripts}
                  boundScriptId={detailTask.scriptId || detailTask.id}
                  onBindScript={(scriptTaskId) => bindScriptToTask(detailTask.id, scriptTaskId)}
                  onConfigureComplete={() => setDetailScriptWizard('confirm')}
                  onGoBack={() => setDetailScriptWizard('configure')}
                />
              </div>
            ) : null}

            {detailTask.scriptException?.status === 'open' && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-950">
                <p className="font-medium">台本道具异常（采集员打标）</p>
                <p className="mt-1 text-xs">{detailTask.scriptException.reason}</p>
                <p className="mt-1 text-[11px] text-rose-800">
                  提报人 {detailTask.scriptException.reporter} ·{' '}
                  {formatDateTime(detailTask.scriptException.reportedAt)}
                </p>
                <label className="mt-3 block text-xs font-medium">
                  运营现场修改台本说明（已知真实道具，直接更新）
                  <textarea
                    value={exceptionFixDraft}
                    onChange={(e) => setExceptionFixDraft(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-rose-200 bg-white px-2 py-1.5 text-xs text-text"
                    placeholder="例：现场使用 12cm 可调门槛，更新演示步骤…"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => applyExceptionScriptFix(detailTask.id)}
                  className="mt-2 rounded-md bg-rose-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-800"
                >
                  保存台本修改并放行采集
                </button>
                <p className="mt-2 text-[11px] text-rose-800">
                  采集员无需重新确认道具，可直接在已报异常的任务台本上继续执行。
                </p>
              </div>
            )}

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(
                [
                  ['类型', detailTask.type],
                  [
                    '人员',
                    <span key="p">
                      {detailTask.personnel}{' '}
                      <span className="ml-1 font-mono text-[11px] text-text-secondary">
                        {detailTask.personnelId ?? '—'}
                      </span>
                    </span>,
                  ],
                  [
                    '设备',
                    <span key="d">
                      {detailTask.device}{' '}
                      <span className="ml-1 font-mono text-[11px] text-text-secondary">
                        {detailTask.deviceId ?? '—'}
                      </span>
                    </span>,
                  ],
                  [
                    '场景',
                    <span key="s">
                      {detailTask.scene}{' '}
                      <span className="ml-1 font-mono text-[11px] text-text-secondary">
                        {detailTask.sceneId ?? '—'}
                      </span>
                    </span>,
                  ],
                  [
                    '台本',
                    detailTask.scriptId !== undefined && detailTask.scriptId !== '' ? (
                      <span key="sc" className="font-mono text-xs">
                        {detailTask.scriptId}
                        {(() => {
                          const script = taskScripts.find((s) => s.taskId === detailTask.scriptId)
                          if (!script) return null
                          return (
                            <span className="ml-2 text-[11px] text-text-secondary">
                              · {script.status === 'confirmed' ? '已确认绑定' : '待确认'}
                            </span>
                          )
                        })()}
                      </span>
                    ) : (
                      <span key="sc" className="text-xs text-rose-700">未绑定</span>
                    ),
                  ],
                  ['开始时间', formatDateTime(detailTask.startTime)],
                  ['结束时间', formatDateTime(detailTask.endTime)],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm text-text">{value}</dd>
                </div>
              ))}
            </dl>

            {(() => {
              const script =
                detailTask.scriptId !== undefined && detailTask.scriptId !== ''
                  ? taskScripts.find((s) => s.taskId === detailTask.scriptId)
                  : undefined
              if (!script) return null
              return (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                    台本内容
                  </h4>
                  <ScriptContentCard script={script} props={platformProps} />
                </div>
              )
            })()}

            {detailTask.blockReason !== undefined && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-900">
                <AlertTriangle
                  className="mt-0.5 size-4 shrink-0 text-amber-700"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <div>
                  <span className="font-medium">备注：</span>
                  {detailTask.blockReason}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
