import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Cpu,
  GitBranch,
  Link2,
  Pause,
  Play,
  Plus,
  User,
  X,
  XCircle,
} from 'lucide-react'

import {
  DataTable,
  type DataTableColumn,
  Modal,
  SearchFilter,
  type SearchFilterDef,
  StatusBadge,
  Tabs,
  type TabItem,
} from '@/components/ui'
import {
  mockDevices,
  mockPersonnel,
  mockRequirements,
  mockScenes,
  mockTaskScripts,
  mockTasks,
  type Requirement,
  type Task,
  type TaskPriority,
  type TaskScript,
  type TaskStatus,
} from '@/data/mock'
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

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  to_schedule: '待调度',
  scheduled: '已排期',
  ready: '待执行',
  in_progress: '执行中',
  completed: '已完成',
  closed: '已关闭',
}

const ALL_STATUSES: TaskStatus[] = [
  'to_schedule',
  'scheduled',
  'ready',
  'in_progress',
  'completed',
  'closed',
]

const MAINLINE_NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
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

function priorityBlockClass(priority: TaskPriority | undefined): string {
  switch (priority) {
    case 'high':
      return 'border-rose-300 bg-gradient-to-br from-rose-50 to-orange-50 text-rose-950 shadow-sm shadow-rose-200/40'
    case 'medium':
      return 'border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 text-amber-950 shadow-sm shadow-amber-200/30'
    case 'low':
      return 'border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50 text-sky-950 shadow-sm shadow-sky-200/30'
    default:
      return 'border-border bg-white text-text'
  }
}

function priorityDotClass(priority: TaskPriority | undefined): string {
  switch (priority) {
    case 'high':
      return 'bg-rose-500'
    case 'medium':
      return 'bg-amber-500'
    case 'low':
      return 'bg-sky-500'
    default:
      return 'bg-slate-400'
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

type DecompositionDraftUnit = {
  id: string
  type: string
  priority: TaskPriority
  personnelId: string
  deviceId: string
  sceneId: string
  startTime: string
  endTime: string
  scriptId: string
  selected: boolean
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
  const [tasks, setTasks] = useState<Task[]>(() =>
    mockTasks.map((t) => ({ ...t })),
  )
  const [requirements, setRequirements] = useState<Requirement[]>(() =>
    mockRequirements.map((r) => ({
      ...r,
      linkedTaskIds: [...r.linkedTaskIds],
      approvals: r.approvals.map((a) => ({
        ...a,
        evaluation: a.evaluation ? { ...a.evaluation } : undefined,
      })),
      keyRequirements: [...r.keyRequirements],
    })),
  )

  const [activeTab, setActiveTab] = useState<string>('list')
  const [search, setSearch] = useState<string>('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    status: 'all',
    readiness: 'all',
  })
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [transitionMessage, setTransitionMessage] = useState<string | null>(null)
  const [expandedScriptIds, setExpandedScriptIds] = useState<Set<string>>(
    () => new Set(),
  )

  // 任务拆解 Tab
  const [selectedReqId, setSelectedReqId] = useState<string>(
    () =>
      mockRequirements.find((r) =>
        DECOMPOSABLE_REQ_STATUSES.includes(r.status),
      )?.id ?? '',
  )
  const [decompositionDrafts, setDecompositionDrafts] = useState<DecompositionDraftUnit[]>([])
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null)
  const [decompositionMessage, setDecompositionMessage] = useState<string | null>(null)
  const [resourcePanelTab, setResourcePanelTab] = useState<'personnel' | 'device' | 'scene' | 'window'>('personnel')
  const [resourceKeyword, setResourceKeyword] = useState<string>('')
  const [resourceOnlyAvailable, setResourceOnlyAvailable] = useState<boolean>(true)
  const [resourceShowAll, setResourceShowAll] = useState<boolean>(false)

  // 任务调度 Tab（手动：仅排时间窗，人/设备/场已在拆解阶段绑定）
  const [scheduleSelectedIds, setScheduleSelectedIds] = useState<string[]>([])
  const [scheduleFormStart, setScheduleFormStart] = useState<string>('2025-04-02T09:00')
  const [scheduleFormEnd, setScheduleFormEnd] = useState<string>('2025-04-02T12:00')
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null)

  // ---------- 派生数据 ----------

  const taskReadiness = useMemo(() => {
    const m = new Map<string, TaskReadiness>()
    for (const t of tasks) m.set(t.id, computeReadiness(t))
    return m
  }, [tasks])

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

  const selectedRequirement = useMemo(() => {
    if (selectedReqId === '') return null
    return requirementById.get(selectedReqId) ?? null
  }, [selectedReqId, requirementById])

  useEffect(() => {
    setDecompositionDrafts([])
    setActiveDraftId(null)
    setDecompositionMessage(null)
  }, [selectedReqId])

  useEffect(() => {
    setResourceShowAll(false)
  }, [resourcePanelTab, resourceKeyword, resourceOnlyAvailable])

  const selectedReqTasks = useMemo(() => {
    if (selectedRequirement === null) return [] as Task[]
    const ids = new Set(selectedRequirement.linkedTaskIds)
    return tasks.filter((t) => ids.has(t.id))
  }, [selectedRequirement, tasks])

  /** 拆解后的任务单元中，尚待排期（手动调度入口） */
  const tasksPendingSchedule = useMemo(() => {
    return taskUnits.filter((t) => t.status === 'to_schedule')
  }, [taskUnits])

  const scheduledTaskUnitsForTimeline = useMemo(() => {
    return taskUnits.filter((t) =>
      ['scheduled', 'ready', 'in_progress', 'completed', 'closed'].includes(t.status),
    )
  }, [taskUnits])

  const scheduleBounds = useMemo(() => {
    const times = scheduledTaskUnitsForTimeline.flatMap((t) => [
      new Date(t.startTime).getTime(),
      new Date(t.endTime).getTime(),
    ])
    if (times.length === 0) {
      const anchor = new Date('2025-03-26T00:00:00+08:00').getTime()
      const week = 7 * 24 * 60 * 60 * 1000
      return { min: anchor, max: anchor + week, range: week }
    }
    const min = Math.min(...times)
    const max = Math.max(...times)
    return { min, max, range: Math.max(max - min, 60 * 60 * 1000) }
  }, [scheduledTaskUnitsForTimeline])

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

  const sceneById = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of mockScenes) m.set(s.id, s.name)
    return m
  }, [])

  const tabs: TabItem[] = [
    { key: 'list', label: '任务列表' },
    { key: 'decomposition', label: '任务拆解' },
    { key: 'schedule', label: '任务调度' },
    { key: 'scripts', label: '台本详情' },
  ]

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
        key: 'startTime',
        title: '计划时间',
        render: (row) => (
          <span className="font-mono text-xs text-text-secondary">
            {formatDateTime(row.startTime)} → {formatDateTime(row.endTime)}
          </span>
        ),
      },
    ],
    [taskReadiness],
  )

  function toggleScheduleTaskSelect(taskId: string): void {
    setScheduleSelectedIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId],
    )
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
    const startIso = start.toISOString()
    const endIso = end.toISOString()
    const targetSet = new Set(targets)
    const nextTasks = tasks.map((t) =>
      targetSet.has(t.id) && t.status === 'to_schedule'
        ? { ...t, status: 'scheduled' as const, startTime: startIso, endTime: endIso }
        : t,
    )
    setTasks(nextTasks)
    setRequirements((prev) => syncRequirementsByTasks(prev, nextTasks))
    setScheduleSelectedIds([])
    setScheduleMessage(
      `已提交手动调度：${targets.length} 条任务单元 待调度 → 已排期（${formatDateTime(startIso)} → ${formatDateTime(endIso)}）`,
    )
  }

  function toggleScriptExpanded(taskId: string): void {
    setExpandedScriptIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  function scriptPersonnelNames(script: TaskScript): string {
    return script.personnelIds
      .map((id) => mockPersonnel.find((p) => p.id === id)?.name ?? id)
      .join('、')
  }

  function scriptDeviceNames(script: TaskScript): string {
    return script.deviceIds
      .map((id) => mockDevices.find((d) => d.id === id)?.name ?? id)
      .join('、')
  }

  function buildDraftUnit(seed: number, baseType: string): DecompositionDraftUnit {
    const startHour = 9 + seed * 2
    const endHour = startHour + 2
    const start = `2025-04-02T${String(startHour).padStart(2, '0')}:00`
    const end = `2025-04-02T${String(endHour).padStart(2, '0')}:00`
    return {
      id: `unit-${Date.now()}-${seed}`,
      type: baseType,
      priority: 'medium',
      personnelId: '',
      deviceId: '',
      sceneId: '',
      startTime: start,
      endTime: end,
      scriptId: '',
      selected: seed === 0,
    }
  }

  function generateDraftUnitsFromRequirement(): void {
    if (selectedRequirement === null) return
    const baseType =
      selectedRequirement.dataType === 'teleoperation'
        ? '遥操作采集'
        : selectedRequirement.dataType === 'motion_capture'
          ? '动捕采集'
          : '人体数据采集'
    const constraints = selectedRequirement.keyRequirements.slice(0, 4)
    const nextUnits =
      constraints.length > 0
        ? constraints.map((constraint, idx) => ({
            ...buildDraftUnit(idx, `${baseType} · ${constraint}`),
            priority: (
              selectedRequirement.priority === 'P0'
                ? 'high'
                : selectedRequirement.priority === 'P1'
                  ? 'medium'
                  : 'low'
            ) as TaskPriority,
          }))
        : [buildDraftUnit(0, `${baseType} · 主流程任务`)]
    setDecompositionDrafts(nextUnits)
    setActiveDraftId(nextUnits[0]?.id ?? null)
    setDecompositionMessage(`已根据需求约束生成 ${nextUnits.length} 条任务单元草案。`)
  }

  function updateDraftUnit(unitId: string, patch: Partial<DecompositionDraftUnit>): void {
    setDecompositionDrafts((prev) =>
      prev.map((unit) => (unit.id === unitId ? { ...unit, ...patch } : unit)),
    )
  }

  function copyDraftUnit(unitId: string): void {
    const current = decompositionDrafts.find((unit) => unit.id === unitId)
    if (!current) return
    const copied: DecompositionDraftUnit = {
      ...current,
      id: `unit-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      selected: false,
    }
    setDecompositionDrafts((prev) => [copied, ...prev])
    setDecompositionMessage('已复制 1 条任务单元。')
  }

  function removeDraftUnit(unitId: string): void {
    setDecompositionDrafts((prev) => {
      const next = prev.filter((unit) => unit.id !== unitId)
      const nextActive = next[0]?.id ?? null
      if (activeDraftId === unitId) {
        setActiveDraftId(nextActive)
      }
      return next
    })
    setDecompositionMessage('已删除 1 条任务单元。')
  }

  function toggleDraftSelection(unitId: string): void {
    setDecompositionDrafts((prev) =>
      prev.map((unit) =>
        unit.id === unitId ? { ...unit, selected: !unit.selected } : unit,
      ),
    )
  }

  function assignResourceToDrafts(
    field: 'personnelId' | 'deviceId' | 'sceneId',
    value: string,
  ): void {
    setDecompositionDrafts((prev) => {
      const selectedIds = prev.filter((unit) => unit.selected).map((unit) => unit.id)
      const targetId = selectedIds.length > 0 ? null : activeDraftId
      return prev.map((unit) => {
        const hit = selectedIds.length > 0 ? selectedIds.includes(unit.id) : unit.id === targetId
        return hit ? { ...unit, [field]: value } : unit
      })
    })
  }

  function assignTimeWindowToDrafts(startTime: string, endTime: string): void {
    setDecompositionDrafts((prev) => {
      const selectedIds = prev.filter((unit) => unit.selected).map((unit) => unit.id)
      const targetId = selectedIds.length > 0 ? null : activeDraftId
      return prev.map((unit) => {
        const hit = selectedIds.length > 0 ? selectedIds.includes(unit.id) : unit.id === targetId
        return hit ? { ...unit, startTime, endTime } : unit
      })
    })
  }

  function batchSetPriority(priority: TaskPriority): void {
    setDecompositionDrafts((prev) => {
      const selectedIds = prev.filter((unit) => unit.selected).map((unit) => unit.id)
      return prev.map((unit) =>
        selectedIds.includes(unit.id) ? { ...unit, priority } : unit,
      )
    })
  }

  function commitDraftUnitsToTasks(): void {
    if (selectedRequirement === null) return
    if (decompositionDrafts.length === 0) {
      setDecompositionMessage('请先生成或添加任务单元。')
      return
    }
    const invalid = decompositionDrafts.find(
      (unit) =>
        unit.type.trim() === '' ||
        unit.personnelId === '' ||
        unit.deviceId === '' ||
        unit.sceneId === '',
    )
    if (invalid) {
      setDecompositionMessage('仍有任务单元缺少人/设备/场/类型，请先补齐后再提交。')
      return
    }

    let numericMax = tasks.reduce((max, task) => {
      const num = Number.parseInt(task.id.replace('task-', ''), 10)
      return Number.isNaN(num) ? max : Math.max(max, num)
    }, 0)

    const newTasks: Task[] = decompositionDrafts.map((unit) => {
      numericMax += 1
      const nextId = `task-${String(numericMax).padStart(3, '0')}`
      const person = mockPersonnel.find((p) => p.id === unit.personnelId)
      const device = mockDevices.find((d) => d.id === unit.deviceId)
      const scene = mockScenes.find((s) => s.id === unit.sceneId)
      return {
        id: nextId,
        type: unit.type.trim(),
        status: 'to_schedule',
        priority: unit.priority,
        requirementId: selectedRequirement.id,
        personnelId: unit.personnelId,
        deviceId: unit.deviceId,
        sceneId: unit.sceneId,
        scriptId: unit.scriptId.trim() || undefined,
        personnel: person?.name ?? unit.personnelId,
        device: device?.name ?? unit.deviceId,
        scene: scene?.name ?? unit.sceneId,
        startTime: new Date(unit.startTime).toISOString(),
        endTime: new Date(unit.endTime).toISOString(),
      }
    })

    const newIds = newTasks.map((task) => task.id)
    const nextTasks = [...newTasks, ...tasks]
    setTasks(nextTasks)
    setRequirements((prev) => {
      const linked = prev.map((req) => {
        if (req.id !== selectedRequirement.id) return req
        return {
          ...req,
          status: req.status === 'approved' ? 'decomposed' : req.status,
          linkedTaskIds: [...req.linkedTaskIds, ...newIds],
        }
      })
      return syncRequirementsByTasks(linked, nextTasks)
    })
    setDecompositionDrafts([])
    setActiveDraftId(null)
    setDecompositionMessage(`已生成 ${newTasks.length} 条任务单元并写入任务管理。`)
  }

  function openTaskDetail(task: Task): void {
    setDetailTask(task)
    setTransitionMessage(null)
  }

  function syncRequirementsByTasks(prev: Requirement[], nextTasks: Task[]): Requirement[] {
    const taskMap = new Map(nextTasks.map((task) => [task.id, task]))
    return prev.map((req) => {
      if (req.linkedTaskIds.length === 0) return req
      const related = req.linkedTaskIds
        .map((id) => taskMap.get(id))
        .filter((task): task is Task => task !== undefined)
      if (related.length === 0) return req
      const finishedCount = related.filter(
        (task) => task.status === 'completed' || task.status === 'closed',
      ).length
      const progress = Math.round((finishedCount / related.length) * 100)
      const activeTaskCount = related.filter(
        (task) => task.status !== 'completed' && task.status !== 'closed',
      ).length
      const blockingTasks = related.filter((task) => {
        const unfinished = task.status !== 'completed' && task.status !== 'closed'
        return unfinished && task.blockReason !== undefined && task.blockReason.trim() !== ''
      })

      const nextReq: Requirement = {
        ...req,
        progress,
        actualFinishAt: progress === 100 ? req.actualFinishAt ?? new Date().toISOString() : undefined,
      }

      if (progress === 100 && ['approved', 'decomposed', 'executing', 'blocked', 'completed'].includes(req.status)) {
        nextReq.status = 'completed'
        nextReq.blockReason = undefined
        return nextReq
      }

      if (blockingTasks.length > 0 && ['approved', 'decomposed', 'executing', 'blocked', 'completed'].includes(req.status)) {
        nextReq.status = 'blocked'
        nextReq.blockReason = `任务阻塞：${blockingTasks.map((task) => `${task.id}(${task.blockReason})`).join('；')}`
        return nextReq
      }

      if (activeTaskCount > 0 && ['approved', 'decomposed', 'executing', 'blocked', 'completed'].includes(req.status)) {
        nextReq.status = 'executing'
        nextReq.blockReason = undefined
        return nextReq
      }

      if (related.length > 0 && progress === 0 && ['approved', 'decomposed', 'blocked'].includes(req.status)) {
        nextReq.status = 'decomposed'
        nextReq.blockReason = undefined
      }
      return nextReq
    })
  }

  function validateMainlineGate(task: Task, nextStatus: TaskStatus): string | null {
    if (nextStatus === 'scheduled') {
      const start = new Date(task.startTime).getTime()
      const end = new Date(task.endTime).getTime()
      if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
        return '闸口未通过：开始/结束时间非法，无法进入已排期。'
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
    setRequirements((prev) => syncRequirementsByTasks(prev, nextTasks))
    setDetailTask((prev) => (prev && prev.id === taskId ? { ...prev, status: nextStatus } : prev))
    setTransitionMessage(`已推进：${TASK_STATUS_LABEL[current.status]} -> ${TASK_STATUS_LABEL[nextStatus]}`)
  }

  // ---------- 任务拆解 Tab 内部组件 ----------

  function renderDecompositionTab(): ReactElement {
    const timeWindowOptions = [
      { id: 'w1', label: '上午档 09:00-12:00', startTime: '2025-04-02T09:00', endTime: '2025-04-02T12:00' },
      { id: 'w2', label: '下午档 13:30-17:00', startTime: '2025-04-02T13:30', endTime: '2025-04-02T17:00' },
      { id: 'w3', label: '夜间档 19:00-22:00', startTime: '2025-04-02T19:00', endTime: '2025-04-02T22:00' },
    ]
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] px-4 py-3 text-sm text-text-secondary">
          <span className="font-medium text-text">任务拆解：</span>
          左侧选择待拆解需求，中间按约束生成任务单元并支持复制/批量编辑，右侧点选资源和时间窗即时指派。
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
          <section className="rounded-xl border border-border bg-card shadow-sm">
            <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-text">待拆解需求池</h2>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-text-secondary">
                {decomposableRequirements.length}
              </span>
            </header>
            <ul className="max-h-[520px] divide-y divide-border overflow-y-auto">
              {decomposableRequirements.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-text-secondary">
                  暂无待拆解需求
                </li>
              )}
              {decomposableRequirements.map((r) => {
                const sel = r.id === selectedReqId
                const taskCount = r.linkedTaskIds.length
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedReqId(r.id)}
                      className={cn(
                        'flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors',
                        sel ? 'bg-primary/5' : 'hover:bg-slate-50',
                      )}
                    >
                      <div className="flex w-full items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex shrink-0 rounded-md px-1 text-[10px] font-semibold ring-1 ring-inset',
                            priorityPillClass(
                              r.priority === 'P0'
                                ? 'high'
                                : r.priority === 'P1'
                                  ? 'medium'
                                  : 'low',
                            ),
                          )}
                        >
                          {r.priority}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
                          {r.title}
                        </span>
                      </div>
                      <p className="flex w-full items-center gap-2 text-xs text-text-secondary">
                        <span className="font-mono">{r.id}</span>
                        <span>·</span>
                        <span className="truncate">{r.requirementGroup}</span>
                      </p>
                      <div className="flex w-full items-center justify-end text-[11px] text-text-secondary">
                        <span className="tabular-nums">已拆 {taskCount} 个任务</span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="flex min-h-[520px] flex-col gap-4">
            {selectedRequirement === null ? (
              <div className="flex flex-1 items-center justify-center rounded-xl border border-border bg-card text-sm text-text-secondary">
                请从左侧选择一条需求进行拆解
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex rounded-md px-1.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
                            priorityPillClass(
                              selectedRequirement.priority === 'P0'
                                ? 'high'
                                : selectedRequirement.priority === 'P1'
                                  ? 'medium'
                                  : 'low',
                            ),
                          )}
                        >
                          {selectedRequirement.priority}
                        </span>
                        <h3 className="text-base font-semibold text-text">{selectedRequirement.title}</h3>
                      </div>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        {selectedRequirement.id} · {selectedRequirement.requirementGroup} · 需求方 {selectedRequirement.owner}
                      </p>
                    </div>
                    <div className="text-right text-xs text-text-secondary">
                      <p>目标 <span className="font-semibold text-text">{selectedRequirement.targetValue}</span></p>
                      <p>交付 {selectedRequirement.deliveryDate}</p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                    <p className="text-xs font-medium text-text-secondary">拆解规则说明</p>
                    <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs text-text-secondary">
                      <li>系统按需求约束（关键约束/目标类型）生成多条任务单元草案。</li>
                      <li>中间面板可复制任务单元、批量改优先级、微调任务类型。</li>
                      <li>右侧资源面板点选后立即指派到选中任务单元（人/设备/场/时间窗）。</li>
                    </ol>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-text">
                      <GitBranch className="size-4 text-primary" strokeWidth={1.75} aria-hidden />
                      任务拆解面板（草案 {decompositionDrafts.length}）
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={generateDraftUnitsFromRequirement}
                        className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/[0.06] px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/[0.12]"
                      >
                        <Plus className="size-3.5" strokeWidth={1.75} aria-hidden />
                        按约束生成任务单元
                      </button>
                      <button
                        type="button"
                        onClick={() => batchSetPriority('high')}
                        className="rounded-md border border-border px-2.5 py-1 text-xs text-text hover:bg-slate-50"
                      >
                        批量改为高优先级
                      </button>
                      <button
                        type="button"
                        onClick={commitDraftUnitsToTasks}
                        className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800"
                      >
                        生成任务单元
                      </button>
                    </div>
                  </div>
                  {decompositionMessage && (
                    <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
                      {decompositionMessage}
                    </div>
                  )}
                  {decompositionDrafts.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border bg-white/60 px-4 py-6 text-center text-sm text-text-secondary">
                      先点击“按约束生成任务单元”，系统会把需求拆解成可编辑任务草案。
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {decompositionDrafts.map((unit) => (
                        <li
                          key={unit.id}
                          className={cn(
                            'rounded-lg border bg-white/80 p-3',
                            activeDraftId === unit.id ? 'border-primary ring-1 ring-primary/20' : 'border-border',
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={unit.selected}
                                onChange={() => toggleDraftSelection(unit.id)}
                                className="size-3.5"
                              />
                              <button
                                type="button"
                                onClick={() => setActiveDraftId(unit.id)}
                                className="font-mono text-xs font-semibold text-primary hover:underline"
                              >
                                {unit.id}
                              </button>
                              <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-xs font-semibold ring-1 ring-inset', priorityPillClass(unit.priority))}>
                                {PRIORITY_LABEL[unit.priority]}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyDraftUnit(unit.id)}
                              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs text-text hover:bg-slate-50"
                            >
                              <Copy className="size-3.5" strokeWidth={1.75} aria-hidden />
                              复制
                            </button>
                            <button
                              type="button"
                              onClick={() => removeDraftUnit(unit.id)}
                              className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs text-rose-700 hover:bg-rose-100"
                            >
                              <X className="size-3.5" strokeWidth={1.75} aria-hidden />
                              删除
                            </button>
                          </div>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            <input
                              value={unit.type}
                              onChange={(e) => updateDraftUnit(unit.id, { type: e.target.value })}
                              className="h-8 rounded-md border border-border px-2 text-xs"
                              placeholder="任务类型"
                            />
                            <select
                              value={unit.priority}
                              onChange={(e) => updateDraftUnit(unit.id, { priority: e.target.value as TaskPriority })}
                              className="h-8 rounded-md border border-border px-2 text-xs"
                            >
                              <option value="high">高优先级</option>
                              <option value="medium">中优先级</option>
                              <option value="low">低优先级</option>
                            </select>
                            <input
                              value={unit.startTime}
                              onChange={(e) => updateDraftUnit(unit.id, { startTime: e.target.value })}
                              type="datetime-local"
                              className="h-8 rounded-md border border-border px-2 text-xs"
                            />
                            <input
                              value={unit.endTime}
                              onChange={(e) => updateDraftUnit(unit.id, { endTime: e.target.value })}
                              type="datetime-local"
                              className="h-8 rounded-md border border-border px-2 text-xs"
                            />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {['遥操作采集', '动捕采集', '人体数据采集'].map((presetType) => (
                              <button
                                key={presetType}
                                type="button"
                                onClick={() => updateDraftUnit(unit.id, { type: presetType })}
                                className={cn(
                                  'rounded-md border px-2 py-0.5 text-[11px]',
                                  unit.type.includes(presetType)
                                    ? 'border-primary/40 bg-primary/10 text-primary'
                                    : 'border-border bg-white text-text-secondary hover:bg-slate-50',
                                )}
                              >
                                {presetType}
                              </button>
                            ))}
                          </div>
                          <p className="mt-1.5 text-[11px] text-text-secondary">
                            人员 {unit.personnelId || '未指派'} · 设备 {unit.deviceId || '未指派'} · 场地 {unit.sceneId || '未指派'}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <h4 className="mb-2 text-sm font-semibold text-text">已入库任务单元（{selectedReqTasks.length}）</h4>
                  {selectedReqTasks.length === 0 ? (
                    <p className="text-xs text-text-secondary">当前需求尚未生成正式任务单元。</p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {selectedReqTasks.map((task) => (
                        <button
                          type="button"
                          key={task.id}
                          onClick={() => openTaskDetail(task)}
                          className="rounded-md border border-border bg-white px-3 py-2 text-left text-xs hover:bg-slate-50"
                        >
                          <p className="font-mono font-semibold text-primary">{task.id}</p>
                          <p className="mt-0.5 text-text-secondary">{task.type}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-text">资源指派面板（4 类）</h3>
            <p className="text-xs text-text-secondary">
              先在中间勾选任务单元（可多选），再在此检索并点选资源或时间窗批量指派。
            </p>
            <div className="grid grid-cols-4 gap-1 rounded-md bg-slate-100 p-1">
              {([
                ['personnel', '人'],
                ['device', '设备'],
                ['scene', '场'],
                ['window', '时间窗'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setResourcePanelTab(key)}
                  className={cn(
                    'rounded px-2 py-1 text-xs font-medium transition-colors',
                    resourcePanelTab === key
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <input
                value={resourceKeyword}
                onChange={(e) => setResourceKeyword(e.target.value)}
                placeholder={
                  resourcePanelTab === 'personnel'
                    ? '搜索姓名 / 角色'
                    : resourcePanelTab === 'device'
                      ? '搜索设备名 / 类型'
                      : resourcePanelTab === 'scene'
                        ? '搜索场景名 / 场景类型'
                        : '搜索时间窗'
                }
                className="h-8 w-full rounded-md border border-border bg-white px-2.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              {resourcePanelTab !== 'window' && (
                <label className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                  <input
                    type="checkbox"
                    checked={resourceOnlyAvailable}
                    onChange={(e) => setResourceOnlyAvailable(e.target.checked)}
                  />
                  仅显示可用资源
                </label>
              )}
            </div>

            <div className="max-h-[1120px] space-y-1.5 overflow-y-auto pr-1">
              {(() => {
                const q = resourceKeyword.trim().toLowerCase()
                if (resourcePanelTab === 'personnel') {
                  const filtered = mockPersonnel
                    .filter((person) => {
                      if (resourceOnlyAvailable && person.status !== 'available') return false
                      if (!q) return true
                      return `${person.name} ${person.role}`.toLowerCase().includes(q)
                    })
                    .sort((a, b) => {
                      if (a.status === b.status) return a.name.localeCompare(b.name)
                      return a.status === 'available' ? -1 : 1
                    })
                  const shown = resourceShowAll ? filtered : filtered.slice(0, 8)
                  return (
                    <>
                      {shown.map((person) => (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => assignResourceToDrafts('personnelId', person.id)}
                          className="w-full rounded-md border border-border bg-white px-2.5 py-1.5 text-left text-xs hover:bg-slate-50"
                        >
                          <p className="font-medium text-text">{person.name}</p>
                          <p className="text-text-secondary">
                            {person.role} · {person.status === 'available' ? '可用' : '忙碌'}
                          </p>
                        </button>
                      ))}
                      {filtered.length > 8 && (
                        <button
                          type="button"
                          onClick={() => setResourceShowAll((v) => !v)}
                          className="w-full rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-text-secondary hover:bg-slate-50"
                        >
                          {resourceShowAll ? '收起列表' : `显示全部（${filtered.length}）`}
                        </button>
                      )}
                    </>
                  )
                }
                if (resourcePanelTab === 'device') {
                  const filtered = mockDevices
                    .filter((device) => {
                      const available = device.status === 'available' && !['critical', 'maintenance'].includes(device.healthStatus)
                      if (resourceOnlyAvailable && !available) return false
                      if (!q) return true
                      return `${device.name} ${device.type}`.toLowerCase().includes(q)
                    })
                    .sort((a, b) => {
                      const sa = a.status === 'available' ? 0 : 1
                      const sb = b.status === 'available' ? 0 : 1
                      if (sa !== sb) return sa - sb
                      return a.name.localeCompare(b.name)
                    })
                  const shown = resourceShowAll ? filtered : filtered.slice(0, 8)
                  return (
                    <>
                      {shown.map((device) => (
                        <button
                          key={device.id}
                          type="button"
                          onClick={() => assignResourceToDrafts('deviceId', device.id)}
                          className="w-full rounded-md border border-border bg-white px-2.5 py-1.5 text-left text-xs hover:bg-slate-50"
                        >
                          <p className="font-medium text-text">{device.name}</p>
                          <p className="text-text-secondary">{device.type} · {device.healthStatus}</p>
                        </button>
                      ))}
                      {filtered.length > 8 && (
                        <button
                          type="button"
                          onClick={() => setResourceShowAll((v) => !v)}
                          className="w-full rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-text-secondary hover:bg-slate-50"
                        >
                          {resourceShowAll ? '收起列表' : `显示全部（${filtered.length}）`}
                        </button>
                      )}
                    </>
                  )
                }
                if (resourcePanelTab === 'scene') {
                  const filtered = mockScenes
                    .filter((scene) => {
                      if (resourceOnlyAvailable && scene.status !== 'active') return false
                      if (!q) return true
                      return `${scene.name} ${scene.type}`.toLowerCase().includes(q)
                    })
                    .sort((a, b) => {
                      const sa = a.status === 'active' ? 0 : 1
                      const sb = b.status === 'active' ? 0 : 1
                      if (sa !== sb) return sa - sb
                      return a.name.localeCompare(b.name)
                    })
                  const shown = resourceShowAll ? filtered : filtered.slice(0, 8)
                  return (
                    <>
                      {shown.map((scene) => (
                        <button
                          key={scene.id}
                          type="button"
                          onClick={() => assignResourceToDrafts('sceneId', scene.id)}
                          className="w-full rounded-md border border-border bg-white px-2.5 py-1.5 text-left text-xs hover:bg-slate-50"
                        >
                          <p className="font-medium text-text">{scene.name}</p>
                          <p className="text-text-secondary">{scene.type} · {scene.status === 'active' ? '可用' : scene.status}</p>
                        </button>
                      ))}
                      {filtered.length > 8 && (
                        <button
                          type="button"
                          onClick={() => setResourceShowAll((v) => !v)}
                          className="w-full rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-text-secondary hover:bg-slate-50"
                        >
                          {resourceShowAll ? '收起列表' : `显示全部（${filtered.length}）`}
                        </button>
                      )}
                    </>
                  )
                }
                const filtered = timeWindowOptions.filter((window) =>
                  q === '' ? true : window.label.toLowerCase().includes(q),
                )
                return filtered.map((window) => (
                  <button
                    key={window.id}
                    type="button"
                    onClick={() => assignTimeWindowToDrafts(window.startTime, window.endTime)}
                    className="w-full rounded-md border border-border bg-white px-2.5 py-1.5 text-left text-xs hover:bg-slate-50"
                  >
                    {window.label}
                  </button>
                ))
              })()}
            </div>
          </section>
        </div>
      </div>
    )
  }

  // ---------- 渲染 ----------

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-text">任务管理</h1>
        <p className="mt-1 text-sm text-text-secondary">
          仅管理已拆解需求生成的任务单元（任务列表、拆解面板、调度看板与采集台本）
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
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
          <div className="rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] px-4 py-3 text-sm text-text-secondary">
            <span className="font-medium text-text">手动调度（本期）：</span>
            人 / 设备 / 场地已在「任务拆解」绑定。此处仅勾选待调度任务单元，填写计划时间窗后提交，状态将变为
            <span className="font-medium text-text"> 已排期</span>。
          </div>

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
              <h3 className="text-sm font-semibold text-text">计划时间窗</h3>
              <p className="text-xs text-text-secondary">
                将应用于下方勾选的每条「待调度」任务单元；提交后统一进入已排期。
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

          <section className="overflow-hidden rounded-xl border-2 border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100/80 p-4 shadow-inner">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-text">调度区</h2>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      priorityDotClass('high'),
                    )}
                  />
                  高
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      priorityDotClass('medium'),
                    )}
                  />
                  中
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      priorityDotClass('low'),
                    )}
                  />
                  低
                </span>
                <span className="inline-flex items-center gap-1 border-l border-border pl-3">
                  <Play className="size-3.5 text-emerald-600" />
                  已排期
                </span>
                <span className="inline-flex items-center gap-1">
                  <Pause className="size-3.5 text-amber-600" />
                  对照图例
                </span>
              </div>
            </div>

            <div className="relative h-36 rounded-lg border border-slate-200/80 bg-white shadow-sm">
              <div className="absolute inset-x-0 top-0 flex justify-between border-b border-slate-100 px-2 py-1 text-[10px] text-text-secondary">
                <span>{formatDateTime(new Date(scheduleBounds.min).toISOString())}</span>
                <span>{formatDateTime(new Date(scheduleBounds.max).toISOString())}</span>
              </div>
              <div className="absolute inset-x-2 bottom-2 top-8">
                <div className="relative h-full rounded-md bg-slate-50/80 ring-1 ring-inset ring-slate-200/60">
                  {scheduledTaskUnitsForTimeline.map((task) => {
                    const start = new Date(task.startTime).getTime()
                    const end = new Date(task.endTime).getTime()
                    if (Number.isNaN(start) || Number.isNaN(end)) return null
                    const left =
                      ((start - scheduleBounds.min) / scheduleBounds.range) * 100
                    const width = Math.max(
                      ((end - start) / scheduleBounds.range) * 100,
                      2,
                    )
                    const sceneName =
                      task.sceneId !== undefined && task.sceneId !== ''
                        ? (sceneById.get(task.sceneId) ?? task.scene)
                        : task.scene
                    const isRunning = task.status === 'in_progress'
                    const pr = task.priority
                    return (
                      <div
                        key={`${task.id}-${task.startTime}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => openTaskDetail(task)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            openTaskDetail(task)
                          }
                        }}
                        className={cn(
                          'absolute top-2 flex h-[calc(100%-16px)] min-w-[72px] cursor-pointer flex-col justify-center overflow-hidden rounded-md border px-2 py-1 text-[11px] leading-tight transition-opacity hover:opacity-95',
                          priorityBlockClass(pr),
                        )}
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                        }}
                        title={`${task.id} · ${sceneName}`}
                      >
                        <div className="flex items-center gap-1 font-semibold">
                          <span
                            className={cn(
                              'size-1.5 shrink-0 rounded-full',
                              priorityDotClass(pr),
                            )}
                          />
                          <span className="truncate font-mono">{task.id}</span>
                          {isRunning ? (
                            <Play className="ml-auto size-3 shrink-0 text-emerald-700" />
                          ) : task.status === 'to_schedule' ? (
                            <Pause className="ml-auto size-3 shrink-0 text-amber-700" />
                          ) : null}
                        </div>
                        <p className="truncate opacity-90">{task.type}</p>
                        <p className="truncate text-[10px] opacity-80">
                          {sceneName}
                        </p>
                        <p className="truncate font-mono text-[10px] opacity-75">
                          {formatDateTime(task.startTime)} —{' '}
                          {formatDateTime(task.endTime)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'scripts' && (
        <div className="space-y-4">
          {mockTaskScripts.map((script) => {
            const open = expandedScriptIds.has(script.taskId)
            return (
              <div
                key={script.taskId}
                className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleScriptExpanded(script.taskId)}
                  className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50/80"
                >
                  <ChevronRight
                    className={cn(
                      'mt-0.5 size-5 shrink-0 text-text-secondary transition-transform',
                      open && 'rotate-90',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-text">{script.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        {formatDateTime(script.scheduledTime)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <User className="size-3.5" />
                        {scriptPersonnelNames(script)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Cpu className="size-3.5" />
                        {scriptDeviceNames(script)}
                      </span>
                    </div>
                  </div>
                </button>

                {open && (
                  <div className="border-t border-border bg-white px-4 pb-6 pt-2">
                    <p className="mb-4 text-xs font-medium uppercase tracking-wide text-text-secondary">
                      台本步骤
                    </p>
                    <ol className="space-y-0">
                      {script.steps.map((step, idx) => {
                        const isLast = idx === script.steps.length - 1
                        return (
                          <li key={step.order} className="relative flex gap-4">
                            <div className="flex flex-col items-center">
                              <div
                                className={cn(
                                  'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                                  'bg-primary/10 text-primary ring-2 ring-primary/25',
                                )}
                              >
                                {step.order}
                              </div>
                              {!isLast && (
                                <div
                                  className="w-px flex-1 min-h-10 bg-border"
                                  aria-hidden
                                />
                              )}
                            </div>
                            <div
                              className={cn(
                                'min-w-0 flex-1 pb-8',
                                isLast && 'pb-0',
                              )}
                            >
                              <p className="font-medium text-text">
                                {step.operation}
                              </p>
                              <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-text-secondary">
                                <Clock className="size-3.5" />
                                时长 {step.durationMinutes} 分钟
                              </p>
                              {step.notes ? (
                                <p className="mt-2 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm text-amber-950">
                                  备注：{step.notes}
                                </p>
                              ) : null}
                            </div>
                          </li>
                        )
                      })}
                    </ol>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={detailTask !== null}
        onClose={() => {
          setDetailTask(null)
          setTransitionMessage(null)
        }}
        title={detailTask ? `任务详情 · ${detailTask.id}` : '任务详情'}
        size="lg"
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

            <ReadinessDetailCard readiness={computeReadiness(detailTask)} />

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
