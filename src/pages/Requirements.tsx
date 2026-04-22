import {
  useMemo,
  useState,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from 'react'

import {
  DataTable,
  type DataTableColumn,
  Modal,
  ProgressBar,
  SearchFilter,
  type SearchFilterDef,
  StatusBadge,
  Tabs,
  type TabItem,
} from '@/components/ui'
import {
  mockRequirements,
  mockTasks,
  type ApprovalDecision,
  type ApprovalEvaluation,
  type ApprovalRecord,
  type RequirementDataPurpose,
  type Requirement,
  type RequirementPriority,
  type RequirementSceneType,
  type RequirementStatus,
  type RequirementTargetType,
  type Task,
  type TaskStatus,
} from '@/data/mock'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock,
  Database,
  ExternalLink,
  FileText,
  Flag,
  ListChecks,
  MapPin,
  Plus,
  Search,
  User,
  XCircle,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// 枚举 → 展示名称 / 分组
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<RequirementStatus, string> = {
  draft: '草稿',
  submitted: '已提交',
  reviewing: '审批中',
  approved: '已批准',
  decomposed: '已拆解',
  executing: '执行中',
  completed: '已完成',
  closed: '已关闭',
  rejected: '已驳回',
  blocked: '已阻塞',
}

const STATUS_GROUP: Record<string, RequirementStatus[]> = {
  all: [
    'draft',
    'submitted',
    'reviewing',
    'approved',
    'decomposed',
    'executing',
    'completed',
    'closed',
    'rejected',
    'blocked',
  ],
  draft: ['draft'],
  reviewing: ['submitted', 'reviewing'],
  decomposed: ['decomposed'],
  executing: ['approved', 'executing'],
  completed: ['completed', 'closed'],
  rejected: ['rejected'],
  blocked: ['blocked'],
}

const DATA_TYPE_LABEL: Record<Requirement['dataType'], string> = {
  teleoperation: '遥操作',
  human_body: '人体数据',
  motion_capture: '动捕',
}

const TARGET_TYPE_LABEL: Record<RequirementTargetType, string> = {
  duration: '时长',
  count: '条数',
}

const SCENE_TYPE_LABEL: Record<RequirementSceneType, string> = {
  home: '家庭',
  business: '商务',
  factory: '工厂',
  charging: '充电',
  public: '公共道路',
  other: '其他',
}

const DATA_PURPOSE_LABEL: Record<RequirementDataPurpose, string> = {
  debug: '调试',
  training: '正式训练',
}

const REQUIREMENT_MAINLINE_NEXT: Partial<Record<RequirementStatus, RequirementStatus>> = {
  submitted: 'reviewing',
  reviewing: 'approved',
  approved: 'decomposed',
  decomposed: 'executing',
  executing: 'completed',
  completed: 'closed',
}

const TAB_ITEMS: TabItem[] = [
  { key: 'all', label: '全部' },
  { key: 'draft', label: '草稿' },
  { key: 'reviewing', label: '审批中' },
  { key: 'decomposed', label: '已拆解' },
  { key: 'executing', label: '执行中' },
  { key: 'completed', label: '已完成' },
  { key: 'rejected', label: '已驳回' },
  { key: 'blocked', label: '已阻塞' },
]

const FILTER_DEFS: SearchFilterDef[] = [
  {
    key: 'dataType',
    label: '数据类型',
    options: [
      { label: '全部类型', value: '' },
      { label: '遥操作', value: 'teleoperation' },
      { label: '人体数据', value: 'human_body' },
      { label: '动捕', value: 'motion_capture' },
    ],
  },
  {
    key: 'priority',
    label: '优先级',
    options: [
      { label: '全部优先级', value: '' },
      { label: 'P0', value: 'P0' },
      { label: 'P1', value: 'P1' },
      { label: 'P2', value: 'P2' },
    ],
  },
]

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  to_schedule: '待调度',
  scheduled: '已排期',
  ready: '待执行',
  in_progress: '执行中',
  completed: '已完成',
  closed: '已关闭',
}

// ---------------------------------------------------------------------------
// 展示辅助
// ---------------------------------------------------------------------------

function formatDate(iso: string | undefined): string {
  if (iso === undefined || iso === '') return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('zh-CN')
}

function formatDateTime(iso: string | undefined): string {
  if (iso === undefined || iso === '') return '—'
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

function priorityClass(p: RequirementPriority): string {
  switch (p) {
    case 'P0':
      return 'bg-rose-50 text-rose-800 ring-rose-200'
    case 'P1':
      return 'bg-amber-50 text-amber-900 ring-amber-200'
    case 'P2':
      return 'bg-sky-50 text-sky-800 ring-sky-200'
  }
}

function progressColor(p: number): 'green' | 'blue' | 'orange' {
  if (p >= 100) return 'green'
  if (p >= 50) return 'blue'
  return 'orange'
}

function decisionIcon(d: ApprovalDecision): ReactElement {
  if (d === 'approved')
    return <CheckCircle2 className="size-5 text-emerald-600" strokeWidth={2} aria-hidden />
  if (d === 'rejected')
    return <XCircle className="size-5 text-rose-600" strokeWidth={2} aria-hidden />
  return <Circle className="size-5 text-slate-400" strokeWidth={2} aria-hidden />
}

function decisionText(d: ApprovalDecision): string {
  if (d === 'approved') return '通过'
  if (d === 'rejected') return '驳回'
  return '待审批'
}

function evalPill(label: string, value: 'pass' | 'warn' | 'fail'): ReactElement {
  const map: Record<'pass' | 'warn' | 'fail', string> = {
    pass: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    warn: 'bg-amber-50 text-amber-900 ring-amber-200',
    fail: 'bg-rose-50 text-rose-800 ring-rose-200',
  }
  const text: Record<'pass' | 'warn' | 'fail', string> = {
    pass: '✓',
    warn: '△',
    fail: '✗',
  }
  return (
    <span
      key={label}
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs ring-1 ring-inset',
        map[value],
      )}
    >
      {text[value]} {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// 表单与 ID 生成
// ---------------------------------------------------------------------------

function nextRequirementId(existing: Requirement[]): string {
  const nums = existing
    .map((r) => {
      const m = /^req-(\d+)$/.exec(r.id)
      return m ? Number(m[1]) : 0
    })
    .filter((n) => n > 0)
  const max = nums.length ? Math.max(...nums) : 0
  return `req-${String(max + 1).padStart(3, '0')}`
}

function inferSceneType(scene: string): RequirementSceneType {
  const t = scene.toLowerCase()
  if (t.includes('家庭') || t.includes('home')) return 'home'
  if (t.includes('商务') || t.includes('business')) return 'business'
  if (t.includes('工厂') || t.includes('factory')) return 'factory'
  if (t.includes('充电') || t.includes('charging')) return 'charging'
  if (t.includes('道路') || t.includes('public')) return 'public'
  return 'other'
}

function normalizeRequirementFields(row: Requirement): Requirement {
  return {
    ...row,
    sceneType: row.sceneType ?? inferSceneType(row.scene),
    dataPurpose: row.dataPurpose ?? 'training',
  }
}

function csvEscape(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}

type NewRequirementForm = {
  title: string
  dataType: Requirement['dataType'] | ''
  sceneType: RequirementSceneType
  dataPurpose: RequirementDataPurpose
  owner: string
  requirementGroup: string
  priority: RequirementPriority
  scene: string
  device: string
  deviceRequirement: string
  targetType: RequirementTargetType
  targetValue: string
  dataVolume: string
  deliveryDate: string
  description: string
  keyRequirement1: string
  keyRequirement2: string
  keyRequirement3: string
  annotationRequirement: string
  sopLink: string
  annotationRuleLink: string
  collectionEntryLink: string
}

const emptyForm: NewRequirementForm = {
  title: '',
  dataType: '',
  sceneType: 'other',
  dataPurpose: 'training',
  owner: '',
  requirementGroup: '',
  priority: 'P1',
  scene: '',
  device: '',
  deviceRequirement: '',
  targetType: 'duration',
  targetValue: '',
  dataVolume: '',
  deliveryDate: '',
  description: '',
  keyRequirement1: '',
  keyRequirement2: '',
  keyRequirement3: '',
  annotationRequirement: '',
  sopLink: '',
  annotationRuleLink: '',
  collectionEntryLink: '',
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

function DetailField({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}): ReactElement {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-white/60 px-4 py-3">
      <div className="mt-0.5 shrink-0 text-text-secondary">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium uppercase tracking-wide text-text-secondary">
          {label}
        </div>
        <div className="mt-1 text-sm text-text">{children}</div>
      </div>
    </div>
  )
}

function ApprovalTimeline({
  approvals,
}: {
  approvals: ApprovalRecord[]
}): ReactElement {
  if (approvals.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-white/60 px-4 py-6 text-center text-sm text-text-secondary">
        暂无审批节点
      </p>
    )
  }
  return (
    <ol className="space-y-0">
      {approvals.map((node, idx) => {
        const isLast = idx === approvals.length - 1
        return (
          <li key={node.level} className="relative flex gap-4">
            <div className="flex flex-col items-center">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white ring-2 ring-slate-200">
                {decisionIcon(node.decision)}
              </div>
              {!isLast && <div className="w-px flex-1 min-h-10 bg-border" aria-hidden />}
            </div>
            <div className={cn('min-w-0 flex-1 pb-6', isLast && 'pb-0')}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                  L{node.level}
                </span>
                <span className="font-medium text-text">{node.nodeName}</span>
                <StatusBadge
                  status={decisionText(node.decision)}
                  size="sm"
                />
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                {node.approverRole} · {node.approverName}
                {node.actedAt !== undefined && ` · ${formatDateTime(node.actedAt)}`}
              </p>
              {node.evaluation !== undefined && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(
                    [
                      ['可行性', node.evaluation.feasibility],
                      ['成本', node.evaluation.cost],
                      ['效率', node.evaluation.efficiency],
                      ['资源匹配', node.evaluation.resourceMatch],
                    ] as [string, ApprovalEvaluation[keyof ApprovalEvaluation]][]
                  ).map(([label, value]) => evalPill(label, value))}
                </div>
              )}
              {node.opinion !== undefined && node.opinion !== '' && (
                <p className="mt-2 rounded-lg border border-border bg-slate-50/80 px-3 py-2 text-sm text-text">
                  {node.opinion}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function LinkedTasksTable({
  taskIds,
}: {
  taskIds: string[]
}): ReactElement {
  const tasks = useMemo<Task[]>(() => {
    return taskIds
      .map((id) => mockTasks.find((t) => t.id === id))
      .filter((t): t is Task => t !== undefined)
  }, [taskIds])

  if (tasks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-white/60 px-4 py-6 text-center text-sm text-text-secondary">
        暂无关联任务，需求批准后会在拆解环节生成。
      </p>
    )
  }

  const columns: DataTableColumn<Task>[] = [
    { key: 'id', title: '任务ID' },
    { key: 'type', title: '类型' },
    {
      key: 'status',
      title: '状态',
      render: (row) => <StatusBadge status={TASK_STATUS_LABEL[row.status]} size="sm" />,
    },
    { key: 'personnel', title: '人员' },
    { key: 'device', title: '设备' },
    { key: 'scene', title: '场景' },
    {
      key: 'startTime',
      title: '计划时间',
      render: (row) => (
        <span className="font-mono text-xs text-text-secondary">
          {formatDateTime(row.startTime)} → {formatDateTime(row.endTime)}
        </span>
      ),
    },
  ]

  return <DataTable columns={columns} data={tasks} />
}

// ---------------------------------------------------------------------------
// 主页面
// ---------------------------------------------------------------------------

type DetailTab = 'basic' | 'approval' | 'tasks'

export default function Requirements(): ReactElement {
  const [requirements, setRequirements] = useState<Requirement[]>(() =>
    mockRequirements.map((row) => normalizeRequirementFields(row)),
  )
  const [activeTab, setActiveTab] = useState<string>('all')
  const [searchValue, setSearchValue] = useState<string>('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    dataType: '',
    priority: '',
  })
  const [selected, setSelected] = useState<Requirement | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTab>('basic')
  const [newOpen, setNewOpen] = useState<boolean>(false)
  const [newForm, setNewForm] = useState<NewRequirementForm>(emptyForm)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const handleTabChange = (key: string): void => {
    setActiveTab(key)
  }

  const handleFilterChange = (key: string, value: string): void => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }))
  }

  const filtered = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    const allowedStatuses = STATUS_GROUP[activeTab] ?? STATUS_GROUP.all
    return requirements.filter((row) => {
      if (!allowedStatuses.includes(row.status)) return false
      if (activeFilters.dataType && row.dataType !== activeFilters.dataType) return false
      if (activeFilters.priority && row.priority !== activeFilters.priority) return false
      if (q) {
        const haystack = (
          row.title +
          ' ' +
          row.id +
          ' ' +
          row.owner +
          ' ' +
          row.requirementGroup
        ).toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [requirements, activeTab, activeFilters.dataType, activeFilters.priority, searchValue])

  const columns: DataTableColumn<Requirement>[] = useMemo(
    () => [
      { key: 'id', title: '需求ID' },
      {
        key: 'title',
        title: '需求名称',
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-text">{row.title}</p>
            <p className="truncate text-xs text-text-secondary">
              {row.requirementGroup} · {row.owner}
            </p>
          </div>
        ),
      },
      {
        key: 'priority',
        title: '优先级',
        render: (row) => (
          <span
            className={cn(
              'inline-flex rounded-md px-1.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
              priorityClass(row.priority),
            )}
          >
            {row.priority}
          </span>
        ),
      },
      {
        key: 'status',
        title: '状态',
        render: (row) => (
          <StatusBadge status={STATUS_LABEL[row.status]} size="sm" />
        ),
      },
      {
        key: 'dataType',
        title: '数据类型',
        render: (row) => DATA_TYPE_LABEL[row.dataType],
      },
      {
        key: 'progress',
        title: '进度',
        render: (row) => (
          <div className="min-w-[120px]">
            <ProgressBar
              value={row.progress}
              size="sm"
              color={progressColor(row.progress)}
            />
            <p className="mt-1 text-xs tabular-nums text-text-secondary">
              {row.progress}% · 目标 {row.targetValue}
            </p>
          </div>
        ),
      },
      { key: 'deliveryDate', title: '交付时间' },
    ],
    [],
  )

  const openDetail = (row: Requirement): void => {
    setSelected(row)
    setDetailTab('basic')
    setStatusMessage(null)
  }

  const taskById = useMemo(() => {
    return new Map(mockTasks.map((task) => [task.id, task]))
  }, [])

  const requirementTaskProgress = (row: Requirement): number => {
    if (row.linkedTaskIds.length === 0) return 0
    const relatedTasks = row.linkedTaskIds
      .map((id) => taskById.get(id))
      .filter((task): task is Task => task !== undefined)
    if (relatedTasks.length === 0) return 0
    const completed = relatedTasks.filter(
      (task) => task.status === 'completed' || task.status === 'closed',
    ).length
    return Math.round((completed / relatedTasks.length) * 100)
  }

  const approvalGatePassed = (row: Requirement): boolean => {
    if (row.approvals.length === 0) return false
    return row.approvals.every(
      (node) =>
        node.decision === 'approved' &&
        node.evaluation !== undefined &&
        node.opinion !== undefined &&
        node.opinion.trim() !== '',
    )
  }

  const validateRequirementTransition = (
    current: Requirement,
    nextStatus: RequirementStatus,
  ): string | null => {
    if (nextStatus === 'approved' && !approvalGatePassed(current)) {
      return '审批闸口：审批中 -> 已审批前，需补齐审批结论、评估项与审批意见。'
    }
    if (nextStatus === 'decomposed' && current.linkedTaskIds.length === 0) {
      return '拆解闸口：已审批 -> 已拆解前，至少需要关联 1 条任务。'
    }
    if (nextStatus === 'executing' && current.linkedTaskIds.length === 0) {
      return '拆解闸口：进入执行中前，至少需要关联 1 条任务。'
    }
    if (nextStatus === 'completed') {
      const progress = requirementTaskProgress(current)
      if (progress < 100) {
        return `完成闸口：执行中 -> 已完成前，关联任务完成率需达到 100%，当前为 ${progress}%。`
      }
    }
    return null
  }

  const updateRequirementStatus = (requirementId: string, nextStatus: RequirementStatus): void => {
    const current = requirements.find((row) => row.id === requirementId)
    if (!current) return

    const allowedNext = REQUIREMENT_MAINLINE_NEXT[current.status]
    if (allowedNext !== nextStatus) {
      setStatusMessage(
        `状态流转不合法：当前为「${STATUS_LABEL[current.status]}」，只能流转到「${allowedNext ? STATUS_LABEL[allowedNext] : '终态'}」。`,
      )
      return
    }

    const gateError = validateRequirementTransition(current, nextStatus)
    if (gateError) {
      setStatusMessage(gateError)
      return
    }

    setStatusMessage(null)
    const patch: Partial<Requirement> = { status: nextStatus }
    if (nextStatus === 'completed') {
      patch.actualFinishAt = new Date().toISOString()
      patch.progress = 100
    }

    setRequirements((prev) =>
      prev.map((row) => (row.id === requirementId ? { ...row, ...patch } : row)),
    )
    setSelected((prev) => (prev && prev.id === requirementId ? { ...prev, ...patch } : prev))
  }

  const exportFilteredCsv = (): void => {
    const header = [
      'id',
      'title',
      'status',
      'priority',
      'owner',
      'requirementGroup',
      'dataType',
      'sceneType',
      'dataPurpose',
      'targetType',
      'targetValue',
      'deliveryDate',
      'progress',
      'linkedTaskIds',
      'annotationRuleLink',
      'collectionEntryLink',
      'createdAt',
    ]
    const rows = filtered.map((row) => [
      row.id,
      row.title,
      STATUS_LABEL[row.status],
      row.priority,
      row.owner,
      row.requirementGroup,
      DATA_TYPE_LABEL[row.dataType],
      row.sceneType ? SCENE_TYPE_LABEL[row.sceneType] : '',
      row.dataPurpose ? DATA_PURPOSE_LABEL[row.dataPurpose] : '',
      TARGET_TYPE_LABEL[row.targetType],
      row.targetValue,
      row.deliveryDate,
      String(row.progress),
      row.linkedTaskIds.join('|'),
      row.annotationRuleLink ?? '',
      row.collectionEntryLink ?? '',
      row.createdAt,
    ])
    const csv = [header, ...rows]
      .map((line) => line.map((value) => csvEscape(value)).join(','))
      .join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const now = new Date()
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate(),
    ).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(
      now.getMinutes(),
    ).padStart(2, '0')}`
    const link = document.createElement('a')
    link.href = url
    link.download = `requirements-filtered-${stamp}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const submitNew = (e: FormEvent): void => {
    e.preventDefault()
    const now = new Date().toISOString()
    const keys = [newForm.keyRequirement1, newForm.keyRequirement2, newForm.keyRequirement3]
      .map((s) => s.trim())
      .filter((s) => s !== '')
    const row: Requirement = {
      id: nextRequirementId(requirements),
      title: newForm.title.trim(),
      status: 'submitted',
      dataType: newForm.dataType as Requirement['dataType'],
      scene: newForm.scene.trim() || '—',
      device: newForm.device.trim() || '—',
      dataVolume: newForm.dataVolume.trim() || '—',
      deliveryDate: newForm.deliveryDate || '—',
      createdAt: now,
      description: newForm.description.trim() || '—',
      owner: newForm.owner.trim() || '—',
      requirementGroup: newForm.requirementGroup.trim() || '未分组',
      priority: newForm.priority,
      targetType: newForm.targetType,
      targetValue: newForm.targetValue.trim() || '待定',
      sceneType: newForm.sceneType,
      dataPurpose: newForm.dataPurpose,
      keyRequirements: keys,
      deviceRequirement: newForm.deviceRequirement.trim() || '—',
      annotationRequirement: newForm.annotationRequirement.trim() || '—',
      sopLink: newForm.sopLink.trim() || undefined,
      annotationRuleLink: newForm.annotationRuleLink.trim() || undefined,
      collectionEntryLink: newForm.collectionEntryLink.trim() || undefined,
      approvals: [
        {
          level: 1,
          nodeName: '初审 · 可行性与资源',
          approverRole: '采集运营',
          approverName: '待指派',
          decision: 'pending',
        },
        {
          level: 2,
          nodeName: '终审 · 需求批复',
          approverRole: '采集运营 Leader',
          approverName: '待指派',
          decision: 'pending',
        },
      ],
      linkedTaskIds: [],
      progress: 0,
    }
    setRequirements((prev) => [normalizeRequirementFields(row), ...prev])
    setNewOpen(false)
    setNewForm(emptyForm)
  }

  const inputClass =
    'h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-text outline-none transition-[box-shadow,border-color] placeholder:text-text-secondary focus:border-primary focus:ring-2 focus:ring-primary/20'

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Search className="size-5 text-primary" strokeWidth={1.75} aria-hidden />
            <h1 className="text-xl font-semibold tracking-tight text-text">数据需求管理</h1>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            覆盖需求提报 → 审批 → 拆解 → 执行 → 关闭全链路
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={exportFilteredCsv}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-medium text-text shadow-sm transition-colors hover:bg-slate-50"
          >
            导出筛选结果 CSV
          </button>
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" strokeWidth={1.75} aria-hidden />
            新建需求
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <Tabs tabs={TAB_ITEMS} activeTab={activeTab} onChange={handleTabChange} />
      </div>

      <SearchFilter
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        filters={FILTER_DEFS}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        searchPlaceholder="搜索需求名称 / ID / 需求方 / 需求组…"
      />

      <DataTable columns={columns} data={filtered} onRowClick={openDetail} />

      {/* ---------- 需求详情 Modal ---------- */}
      <Modal
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        title="需求详情"
        size="lg"
      >
        {selected && (
          <div className="space-y-5">
            {/* Header */}
            <div className="space-y-3 border-b border-border pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex rounded-md px-1.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
                        priorityClass(selected.priority),
                      )}
                    >
                      {selected.priority}
                    </span>
                    <StatusBadge status={STATUS_LABEL[selected.status]} size="sm" />
                    <span className="font-mono text-xs text-text-secondary">
                      {selected.id}
                    </span>
                  </div>
                  <h3 className="mt-1 text-lg font-semibold text-text">
                    {selected.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {selected.requirementGroup} · 需求方 {selected.owner}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(() => {
                    const nextStatus = REQUIREMENT_MAINLINE_NEXT[selected.status]
                    if (nextStatus === undefined) return null
                    return (
                      <button
                        type="button"
                        onClick={() => updateRequirementStatus(selected.id, nextStatus)}
                        className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-white transition-colors hover:bg-primary/90"
                      >
                        推进到{STATUS_LABEL[nextStatus]}
                      </button>
                    )
                  })()}
                  <button
                    type="button"
                    onClick={() => setDetailTab('approval')}
                    className="h-8 rounded-md border border-border bg-white px-3 text-xs font-medium text-text transition-colors hover:bg-slate-50"
                  >
                    查看审批流
                  </button>
                </div>
              </div>
              {statusMessage && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
                  {statusMessage}
                </div>
              )}
              {(() => {
                const linkedTaskCount = selected.linkedTaskIds.length
                const progress = requirementTaskProgress(selected)
                const approvalPassed = approvalGatePassed(selected)
                const decomposeGatePassed = linkedTaskCount > 0
                const completeGatePassed = progress === 100
                const nextStatus = REQUIREMENT_MAINLINE_NEXT[selected.status]
                const checks = [
                  {
                    label: '审批闸口（审批中 -> 已审批）',
                    passed: approvalPassed,
                    detail: approvalPassed
                      ? '审批结论、评估项与意见已齐全'
                      : '存在待审批节点，或缺评估/意见',
                  },
                  {
                    label: '拆解闸口（已审批 -> 已拆解）',
                    passed: decomposeGatePassed,
                    detail: `关联任务数：${linkedTaskCount}`,
                  },
                  {
                    label: '完成闸口（执行中 -> 已完成）',
                    passed: completeGatePassed,
                    detail: `关联任务完成率：${progress}%`,
                  },
                ] as const
                return (
                  <div className="rounded-lg border border-border bg-slate-50/70 p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                        运营流转检查面板
                      </p>
                      <p className="text-xs text-text-secondary">
                        下一状态：{nextStatus ? STATUS_LABEL[nextStatus] : '终态'}
                      </p>
                    </div>
                    <ul className="space-y-1.5">
                      {checks.map((item) => (
                        <li
                          key={item.label}
                          className={cn(
                            'flex items-center justify-between gap-3 rounded-md px-2.5 py-2 text-xs ring-1 ring-inset',
                            item.passed
                              ? 'bg-emerald-50 text-emerald-900 ring-emerald-200'
                              : 'bg-amber-50 text-amber-900 ring-amber-200',
                          )}
                        >
                          <div className="min-w-0">
                            <p className="font-medium">{item.label}</p>
                            <p className="mt-0.5 text-[11px] opacity-85">{item.detail}</p>
                          </div>
                          <span className="inline-flex items-center gap-1 whitespace-nowrap font-medium">
                            {item.passed ? (
                              <CheckCircle2 className="size-3.5" strokeWidth={1.75} aria-hidden />
                            ) : (
                              <XCircle className="size-3.5" strokeWidth={1.75} aria-hidden />
                            )}
                            {item.passed ? '通过' : '未通过'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })()}
              {/* Progress bar */}
              <div>
                <ProgressBar
                  value={selected.progress}
                  color={progressColor(selected.progress)}
                  label={`执行进度 · 目标 ${selected.targetValue}（${TARGET_TYPE_LABEL[selected.targetType]}）`}
                />
              </div>
              {/* Block reason */}
              {(selected.status === 'blocked' || selected.status === 'rejected') &&
                selected.blockReason !== undefined && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-900">
                    <AlertTriangle
                      className="mt-0.5 size-4 shrink-0 text-amber-700"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <div>
                      <span className="font-medium">
                        {selected.status === 'blocked' ? '阻塞原因' : '驳回原因'}：
                      </span>
                      {selected.blockReason}
                    </div>
                  </div>
                )}
            </div>

            {/* Detail Tabs */}
            <Tabs
              tabs={[
                { key: 'basic', label: '基本信息' },
                { key: 'approval', label: '审批流' },
                {
                  key: 'tasks',
                  label: `关联任务 (${selected.linkedTaskIds.length})`,
                },
              ]}
              activeTab={detailTab}
              onChange={(k) => setDetailTab(k as DetailTab)}
            />

            {detailTab === 'basic' && (
              <div className="space-y-4">
                <p className="rounded-lg border border-border bg-slate-50/80 px-4 py-3 text-sm leading-relaxed text-text">
                  {selected.description}
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailField
                    icon={<Database className="size-4" strokeWidth={1.75} aria-hidden />}
                    label="数据类型"
                  >
                    {DATA_TYPE_LABEL[selected.dataType]}
                  </DetailField>
                  <DetailField
                    icon={<Flag className="size-4" strokeWidth={1.75} aria-hidden />}
                    label="采集目标"
                  >
                    {selected.targetValue}（{TARGET_TYPE_LABEL[selected.targetType]}）
                  </DetailField>
                  <DetailField
                    icon={<MapPin className="size-4" strokeWidth={1.75} aria-hidden />}
                    label="场景"
                  >
                    {selected.scene}
                  </DetailField>
                  <DetailField
                    icon={<MapPin className="size-4" strokeWidth={1.75} aria-hidden />}
                    label="场景类型"
                  >
                    {selected.sceneType ? SCENE_TYPE_LABEL[selected.sceneType] : '—'}
                  </DetailField>
                  <DetailField
                    icon={<Database className="size-4" strokeWidth={1.75} aria-hidden />}
                    label="设备要求"
                  >
                    {selected.deviceRequirement}
                  </DetailField>
                  <DetailField
                    icon={<Database className="size-4" strokeWidth={1.75} aria-hidden />}
                    label="数据用途"
                  >
                    {selected.dataPurpose ? DATA_PURPOSE_LABEL[selected.dataPurpose] : '—'}
                  </DetailField>
                  <DetailField
                    icon={<Database className="size-4" strokeWidth={1.75} aria-hidden />}
                    label="数据量"
                  >
                    {selected.dataVolume}
                  </DetailField>
                  <DetailField
                    icon={<Calendar className="size-4" strokeWidth={1.75} aria-hidden />}
                    label="交付时间"
                  >
                    {selected.deliveryDate}
                  </DetailField>
                  <DetailField
                    icon={<User className="size-4" strokeWidth={1.75} aria-hidden />}
                    label="需求方"
                  >
                    {selected.owner}
                  </DetailField>
                  <DetailField
                    icon={<Clock className="size-4" strokeWidth={1.75} aria-hidden />}
                    label="创建时间 → 实际完成"
                  >
                    {formatDate(selected.createdAt)} →{' '}
                    {formatDate(selected.actualFinishAt)}
                  </DetailField>
                </div>
                <div className="rounded-lg border border-dashed border-border bg-slate-50/70 px-3 py-2 text-xs text-text-secondary">
                  系统计算字段只读：创建时间、执行进度、实际完成时间由系统自动维护，不支持手动编辑。
                </div>

                {/* 关键约束 */}
                {selected.keyRequirements.length > 0 && (
                  <div className="rounded-lg border border-border bg-white/60 p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
                      <ListChecks className="size-4" strokeWidth={1.75} aria-hidden />
                      关键约束（最多 3 条）
                    </div>
                    <ul className="space-y-1.5">
                      {selected.keyRequirements.map((k, idx) => (
                        <li key={idx} className="flex gap-2 text-sm text-text">
                          <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                            {idx + 1}
                          </span>
                          {k}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 标注要求 */}
                <div className="rounded-lg border border-border bg-white/60 p-4">
                  <div className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
                    <ClipboardList className="size-4" strokeWidth={1.75} aria-hidden />
                    标注要求
                  </div>
                  <p className="text-sm text-text">{selected.annotationRequirement}</p>
                </div>

                {/* SOP 链接 */}
                {selected.sopLink !== undefined && selected.sopLink !== '' && (
                  <a
                    href={selected.sopLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <FileText className="size-4" strokeWidth={1.75} aria-hidden />
                    SOP 文档
                    <ExternalLink className="size-3.5" strokeWidth={1.75} aria-hidden />
                  </a>
                )}
                {selected.annotationRuleLink && (
                  <a
                    href={selected.annotationRuleLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 pl-4 text-sm font-medium text-primary hover:underline"
                  >
                    <FileText className="size-4" strokeWidth={1.75} aria-hidden />
                    标注规则
                    <ExternalLink className="size-3.5" strokeWidth={1.75} aria-hidden />
                  </a>
                )}
                {selected.collectionEntryLink && (
                  <a
                    href={selected.collectionEntryLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 pl-4 text-sm font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden />
                    采集入口
                  </a>
                )}
              </div>
            )}

            {detailTab === 'approval' && (
              <div className="space-y-3">
                <p className="text-xs text-text-secondary">
                  审批流按顺序推进：初审由采集运营评估可行性 / 成本 / 效率 / 资源匹配 4 个维度，终审由 Leader 批复。任一节点驳回 → 需求回到草稿。
                </p>
                <ApprovalTimeline approvals={selected.approvals} />
              </div>
            )}

            {detailTab === 'tasks' && (
              <div className="space-y-3">
                <p className="text-xs text-text-secondary">
                  关联任务由需求拆解环节生成。任务完成率聚合为需求执行进度（见顶部进度条）。
                </p>
                <LinkedTasksTable taskIds={selected.linkedTaskIds} />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ---------- 新建需求 Modal ---------- */}
      <Modal
        isOpen={newOpen}
        onClose={() => {
          setNewOpen(false)
          setNewForm(emptyForm)
        }}
        title="新建数据需求"
        size="lg"
      >
        <form className="space-y-4" onSubmit={submitNew}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="req-title">
              需求名称
            </label>
            <input
              id="req-title"
              className={inputClass}
              value={newForm.title}
              onChange={(e) => setNewForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="简要描述采集目标"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="req-owner">
                需求方
              </label>
              <input
                id="req-owner"
                className={inputClass}
                value={newForm.owner}
                onChange={(e) => setNewForm((f) => ({ ...f, owner: e.target.value }))}
                placeholder="发起人姓名"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="req-group">
                需求组
              </label>
              <input
                id="req-group"
                className={inputClass}
                value={newForm.requirementGroup}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, requirementGroup: e.target.value }))
                }
                placeholder="如 CU6-家庭服务"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="req-priority">
                优先级
              </label>
              <select
                id="req-priority"
                className={cn(inputClass, 'cursor-pointer')}
                value={newForm.priority}
                onChange={(e) =>
                  setNewForm((f) => ({
                    ...f,
                    priority: e.target.value as RequirementPriority,
                  }))
                }
              >
                <option value="P0">P0</option>
                <option value="P1">P1</option>
                <option value="P2">P2</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="req-type">
                数据类型
              </label>
              <select
                id="req-type"
                className={cn(inputClass, 'cursor-pointer')}
                value={newForm.dataType}
                onChange={(e) =>
                  setNewForm((f) => ({
                    ...f,
                    dataType: e.target.value as NewRequirementForm['dataType'],
                  }))
                }
                required
              >
                <option value="">请选择</option>
                <option value="teleoperation">遥操作</option>
                <option value="human_body">人体数据</option>
                <option value="motion_capture">动捕</option>
              </select>
            </div>
            <div className="grid grid-cols-[110px_1fr] gap-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="req-target-type">
                  目标度量
                </label>
                <select
                  id="req-target-type"
                  className={cn(inputClass, 'cursor-pointer')}
                  value={newForm.targetType}
                  onChange={(e) =>
                    setNewForm((f) => ({
                      ...f,
                      targetType: e.target.value as RequirementTargetType,
                    }))
                  }
                >
                  <option value="duration">时长</option>
                  <option value="count">条数</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="req-target-value">
                  目标值
                </label>
                <input
                  id="req-target-value"
                  className={inputClass}
                  value={newForm.targetValue}
                  onChange={(e) =>
                    setNewForm((f) => ({ ...f, targetValue: e.target.value }))
                  }
                  placeholder="如 120 小时"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="req-scene-type">
                场景类型
              </label>
              <select
                id="req-scene-type"
                className={cn(inputClass, 'cursor-pointer')}
                value={newForm.sceneType}
                onChange={(e) =>
                  setNewForm((f) => ({
                    ...f,
                    sceneType: e.target.value as RequirementSceneType,
                  }))
                }
              >
                <option value="home">家庭</option>
                <option value="business">商务</option>
                <option value="factory">工厂</option>
                <option value="charging">充电</option>
                <option value="public">公共道路</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-text"
                htmlFor="req-data-purpose"
              >
                数据用途
              </label>
              <select
                id="req-data-purpose"
                className={cn(inputClass, 'cursor-pointer')}
                value={newForm.dataPurpose}
                onChange={(e) =>
                  setNewForm((f) => ({
                    ...f,
                    dataPurpose: e.target.value as RequirementDataPurpose,
                  }))
                }
              >
                <option value="debug">调试</option>
                <option value="training">正式训练</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="req-scene">
                场景
              </label>
              <input
                id="req-scene"
                className={inputClass}
                value={newForm.scene}
                onChange={(e) => setNewForm((f) => ({ ...f, scene: e.target.value }))}
                placeholder="采集场景（具体到 3F-02 级）"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="req-device">
                设备
              </label>
              <input
                id="req-device"
                className={inputClass}
                value={newForm.device}
                onChange={(e) => setNewForm((f) => ({ ...f, device: e.target.value }))}
                placeholder="主要设备"
              />
            </div>
          </div>

          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-text"
              htmlFor="req-device-requirement"
            >
              设备要求详情
            </label>
            <input
              id="req-device-requirement"
              className={inputClass}
              value={newForm.deviceRequirement}
              onChange={(e) =>
                setNewForm((f) => ({ ...f, deviceRequirement: e.target.value }))
              }
              placeholder="型号 / 版本 / 精度 / 配件"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="req-volume">
                数据量
              </label>
              <input
                id="req-volume"
                className={inputClass}
                value={newForm.dataVolume}
                onChange={(e) => setNewForm((f) => ({ ...f, dataVolume: e.target.value }))}
                placeholder="如 约 1 TB"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="req-delivery">
                交付时间
              </label>
              <input
                id="req-delivery"
                type="date"
                className={inputClass}
                value={newForm.deliveryDate}
                onChange={(e) => setNewForm((f) => ({ ...f, deliveryDate: e.target.value }))}
              />
            </div>
          </div>

          {/* 关键约束 x3 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">
              关键约束（最多 3 条）
            </label>
            <div className="space-y-2">
              <input
                className={inputClass}
                value={newForm.keyRequirement1}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, keyRequirement1: e.target.value }))
                }
                placeholder="约束 1"
              />
              <input
                className={inputClass}
                value={newForm.keyRequirement2}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, keyRequirement2: e.target.value }))
                }
                placeholder="约束 2（可选）"
              />
              <input
                className={inputClass}
                value={newForm.keyRequirement3}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, keyRequirement3: e.target.value }))
                }
                placeholder="约束 3（可选）"
              />
            </div>
          </div>

          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-text"
              htmlFor="req-annotation"
            >
              标注要求
            </label>
            <textarea
              id="req-annotation"
              className={cn(inputClass, 'min-h-[72px] resize-y py-2.5')}
              value={newForm.annotationRequirement}
              onChange={(e) =>
                setNewForm((f) => ({ ...f, annotationRequirement: e.target.value }))
              }
              placeholder="标签粒度、标签体系、验收口径"
              rows={3}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="req-sop">
              SOP 链接（可选）
            </label>
            <input
              id="req-sop"
              className={inputClass}
              value={newForm.sopLink}
              onChange={(e) => setNewForm((f) => ({ ...f, sopLink: e.target.value }))}
              placeholder="https://"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-text"
                htmlFor="req-annotation-rule-link"
              >
                标注规则链接（可选）
              </label>
              <input
                id="req-annotation-rule-link"
                className={inputClass}
                value={newForm.annotationRuleLink}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, annotationRuleLink: e.target.value }))
                }
                placeholder="https://"
              />
            </div>
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-text"
                htmlFor="req-collection-entry-link"
              >
                采集入口链接（可选）
              </label>
              <input
                id="req-collection-entry-link"
                className={inputClass}
                value={newForm.collectionEntryLink}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, collectionEntryLink: e.target.value }))
                }
                placeholder="https://"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="req-desc">
              需求描述
            </label>
            <textarea
              id="req-desc"
              className={cn(inputClass, 'min-h-[100px] resize-y py-2.5')}
              value={newForm.description}
              onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="采集范围、背景、对齐说明等"
              rows={4}
            />
          </div>

          <div className="rounded-lg border border-dashed border-border bg-slate-50/70 p-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
              系统计算字段（只读）
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">创建时间</label>
                <input
                  className={cn(inputClass, 'bg-slate-100 text-text-secondary')}
                  value="系统自动生成"
                  disabled
                  readOnly
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">执行进度</label>
                <input
                  className={cn(inputClass, 'bg-slate-100 text-text-secondary')}
                  value="关联任务自动聚合"
                  disabled
                  readOnly
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  实际完成时间
                </label>
                <input
                  className={cn(inputClass, 'bg-slate-100 text-text-secondary')}
                  value="达成完成状态后自动回填"
                  disabled
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
            <p className="text-xs text-text-secondary">
              提交后进入 <span className="font-medium">已提交</span> 状态，等待采集运营初审。
              创建时间、进度、实际完成时间均由系统维护。
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewOpen(false)
                  setNewForm(emptyForm)
                }}
                className="h-10 rounded-lg border border-border bg-white px-4 text-sm font-medium text-text transition-colors hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="submit"
                className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/90"
              >
                提交审批
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
