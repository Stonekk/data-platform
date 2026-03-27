import { useMemo, useState, type ReactElement } from 'react'
import {
  ChevronRight,
  Clock,
  Cpu,
  GripVertical,
  MapPin,
  Pause,
  Play,
  User,
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
  type Task,
  type TaskScheduleSlot,
  type TaskScript,
  type TaskStatus,
  mockDevices,
  mockPersonnel,
  mockScenes,
  mockTaskSchedule,
  mockTaskScripts,
  mockTasks,
} from '@/data/mock'
import { cn } from '@/lib/utils'

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: '待执行',
  scheduled: '已排期',
  in_progress: '执行中',
  completed: '已完成',
  cancelled: '已取消',
  delayed: '延期',
}

const ALL_STATUSES: TaskStatus[] = [
  'pending',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'delayed',
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

type SimulatedAssignment = {
  personnelId?: string
  deviceId?: string
  sceneId?: string
}

function priorityBlockClass(priority: TaskScheduleSlot['priority']): string {
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

function priorityDotClass(priority: TaskScheduleSlot['priority']): string {
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

export default function Tasks(): ReactElement {
  const [activeTab, setActiveTab] = useState<string>('list')
  const [search, setSearch] = useState<string>('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    status: 'all',
  })
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [expandedScriptIds, setExpandedScriptIds] = useState<Set<string>>(
    () => new Set(),
  )

  const [selectedScheduleTaskId, setSelectedScheduleTaskId] = useState<
    string | null
  >(null)
  const [simAssignments, setSimAssignments] = useState<
    Record<string, SimulatedAssignment>
  >({})

  const scheduleTaskIdSet = useMemo(() => {
    return new Set(mockTaskSchedule.map((s) => s.taskId))
  }, [])

  const unassignedTasks = useMemo(() => {
    return mockTasks.filter((t) => !scheduleTaskIdSet.has(t.id))
  }, [scheduleTaskIdSet])

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

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase()
    const st = activeFilters.status ?? 'all'
    return mockTasks.filter((t) => {
      if (st !== 'all' && t.status !== st) return false
      if (!q) return true
      return (
        t.id.toLowerCase().includes(q) ||
        t.device.toLowerCase().includes(q) ||
        t.personnel.toLowerCase().includes(q)
      )
    })
  }, [search, activeFilters.status])

  const taskById = useMemo(() => {
    const m = new Map<string, Task>()
    for (const t of mockTasks) m.set(t.id, t)
    return m
  }, [])

  const sceneById = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of mockScenes) m.set(s.id, s.name)
    return m
  }, [])

  const scheduleBounds = useMemo(() => {
    const times = mockTaskSchedule.flatMap((s) => [
      new Date(s.startTime).getTime(),
      new Date(s.endTime).getTime(),
    ])
    const min = Math.min(...times)
    const max = Math.max(...times)
    return { min, max, range: Math.max(max - min, 1) }
  }, [])

  const tabs: TabItem[] = [
    { key: 'list', label: '任务列表' },
    { key: 'schedule', label: '任务调度' },
    { key: 'scripts', label: '台本详情' },
  ]

  const tableColumns: DataTableColumn<Task>[] = useMemo(
    () => [
      { key: 'id', title: '任务ID' },
      { key: 'type', title: '类型' },
      { key: 'device', title: '设备' },
      { key: 'personnel', title: '人员' },
      { key: 'scene', title: '场景' },
      {
        key: 'status',
        title: '状态',
        render: (row) => (
          <StatusBadge status={TASK_STATUS_LABEL[row.status]} size="sm" />
        ),
      },
      {
        key: 'startTime',
        title: '开始时间',
        render: (row) => formatDateTime(row.startTime),
      },
      {
        key: 'endTime',
        title: '结束时间',
        render: (row) => formatDateTime(row.endTime),
      },
    ],
    [],
  )

  function displayPersonnel(task: Task): string {
    const pid = simAssignments[task.id]?.personnelId
    if (pid) {
      return mockPersonnel.find((p) => p.id === pid)?.name ?? task.personnel
    }
    return task.personnel
  }

  function displayDevice(task: Task): string {
    const did = simAssignments[task.id]?.deviceId
    if (did) {
      return mockDevices.find((d) => d.id === did)?.name ?? task.device
    }
    return task.device
  }

  function displayScene(task: Task): string {
    const sid = simAssignments[task.id]?.sceneId
    if (sid) {
      return mockScenes.find((s) => s.id === sid)?.name ?? task.scene
    }
    return task.scene
  }

  function assignResource(
    kind: 'personnel' | 'device' | 'scene',
    id: string,
  ): void {
    if (!selectedScheduleTaskId) return
    setSimAssignments((prev) => ({
      ...prev,
      [selectedScheduleTaskId]: {
        ...prev[selectedScheduleTaskId],
        ...(kind === 'personnel'
          ? { personnelId: id }
          : kind === 'device'
            ? { deviceId: id }
            : { sceneId: id }),
      },
    }))
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-text">
          任务管理
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          任务列表、调度看板与采集台本
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
            filters={[statusFilterDef]}
            activeFilters={activeFilters}
            onFilterChange={(key, value) =>
              setActiveFilters((prev) => ({ ...prev, [key]: value }))
            }
            searchPlaceholder="搜索任务 ID、设备或人员…"
          />
          <DataTable
            columns={tableColumns}
            data={filteredTasks}
            onRowClick={(row) => setDetailTask(row)}
          />
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] px-4 py-3 text-sm text-text-secondary">
            <span className="font-medium text-text">模拟指派：</span>
            先点击上方未排期任务卡片选中，再依次点击人员、设备或场景卡片完成指派（可多选类型）。
          </div>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
              <GripVertical className="size-4 text-text-secondary" />
              未排期任务
            </h2>
            <div className="flex flex-wrap gap-2">
              {unassignedTasks.length === 0 ? (
                <p className="text-sm text-text-secondary">暂无未排期任务</p>
              ) : (
                unassignedTasks.map((t) => {
                  const sel = selectedScheduleTaskId === t.id
                  const sim = simAssignments[t.id]
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        setSelectedScheduleTaskId(sel ? null : t.id)
                      }
                      className={cn(
                        'min-w-[200px] max-w-full rounded-lg border px-3 py-2 text-left text-sm transition-all',
                        'bg-white shadow-sm hover:border-slate-300',
                        sel
                          ? 'border-primary ring-2 ring-primary/25'
                          : 'border-border',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-text">
                          {t.id}
                        </span>
                        <StatusBadge
                          status={TASK_STATUS_LABEL[t.status]}
                          size="sm"
                        />
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-text-secondary">
                        {t.type}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-text-secondary">
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5',
                            sim?.personnelId && 'bg-emerald-50 text-emerald-800',
                          )}
                        >
                          人员: {displayPersonnel(t)}
                        </span>
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5',
                            sim?.deviceId && 'bg-emerald-50 text-emerald-800',
                          )}
                        >
                          设备: {displayDevice(t)}
                        </span>
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5',
                            sim?.sceneId && 'bg-emerald-50 text-emerald-800',
                          )}
                        >
                          场景: {displayScene(t)}
                        </span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 border-b border-border pb-2 text-sm font-semibold text-text">
                <User className="size-4 text-violet-600" />
                人员
              </h2>
              <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-1">
                {mockPersonnel.map((p) => {
                  const assignedToSel =
                    selectedScheduleTaskId &&
                    simAssignments[selectedScheduleTaskId]?.personnelId === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => assignResource('personnel', p.id)}
                      disabled={!selectedScheduleTaskId}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                        'bg-white hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50',
                        assignedToSel
                          ? 'border-violet-400 bg-violet-50 ring-1 ring-violet-200'
                          : 'border-border',
                      )}
                    >
                      <GripVertical
                        className="size-4 shrink-0 text-slate-400"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="truncate text-xs text-text-secondary">
                          {p.role}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 border-b border-border pb-2 text-sm font-semibold text-text">
                <Cpu className="size-4 text-cyan-600" />
                设备
              </h2>
              <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-1">
                {mockDevices.map((d) => {
                  const assignedToSel =
                    selectedScheduleTaskId &&
                    simAssignments[selectedScheduleTaskId]?.deviceId === d.id
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => assignResource('device', d.id)}
                      disabled={!selectedScheduleTaskId}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                        'bg-white hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50',
                        assignedToSel
                          ? 'border-cyan-400 bg-cyan-50 ring-1 ring-cyan-200'
                          : 'border-border',
                      )}
                    >
                      <GripVertical
                        className="size-4 shrink-0 text-slate-400"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{d.name}</p>
                        <p className="truncate text-xs text-text-secondary">
                          {d.type}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 border-b border-border pb-2 text-sm font-semibold text-text">
                <MapPin className="size-4 text-emerald-600" />
                场景
              </h2>
              <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-1">
                {mockScenes.map((s) => {
                  const assignedToSel =
                    selectedScheduleTaskId &&
                    simAssignments[selectedScheduleTaskId]?.sceneId === s.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => assignResource('scene', s.id)}
                      disabled={!selectedScheduleTaskId}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                        'bg-white hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50',
                        assignedToSel
                          ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200'
                          : 'border-border',
                      )}
                    >
                      <GripVertical
                        className="size-4 shrink-0 text-slate-400"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{s.name}</p>
                        <p className="truncate text-xs text-text-secondary">
                          {s.type}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
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
                  {mockTaskSchedule.map((slot) => {
                    const task = taskById.get(slot.taskId)
                    const start = new Date(slot.startTime).getTime()
                    const end = new Date(slot.endTime).getTime()
                    const left =
                      ((start - scheduleBounds.min) / scheduleBounds.range) * 100
                    const width = Math.max(
                      ((end - start) / scheduleBounds.range) * 100,
                      2,
                    )
                    const sceneName =
                      sceneById.get(slot.sceneId) ?? slot.sceneId
                    const isRunning = task?.status === 'in_progress'
                    return (
                      <div
                        key={`${slot.taskId}-${slot.startTime}`}
                        className={cn(
                          'absolute top-2 flex h-[calc(100%-16px)] min-w-[72px] flex-col justify-center overflow-hidden rounded-md border px-2 py-1 text-[11px] leading-tight',
                          priorityBlockClass(slot.priority),
                        )}
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                        }}
                        title={`${slot.taskId} · ${sceneName}`}
                      >
                        <div className="flex items-center gap-1 font-semibold">
                          <span
                            className={cn(
                              'size-1.5 shrink-0 rounded-full',
                              priorityDotClass(slot.priority),
                            )}
                          />
                          <span className="truncate font-mono">{slot.taskId}</span>
                          {isRunning ? (
                            <Play className="ml-auto size-3 shrink-0 text-emerald-700" />
                          ) : task?.status === 'delayed' ? (
                            <Pause className="ml-auto size-3 shrink-0 text-amber-700" />
                          ) : null}
                        </div>
                        <p className="truncate opacity-90">{task?.type ?? '—'}</p>
                        <p className="truncate text-[10px] opacity-80">
                          {sceneName}
                        </p>
                        <p className="truncate font-mono text-[10px] opacity-75">
                          {formatDateTime(slot.startTime)} —{' '}
                          {formatDateTime(slot.endTime)}
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
        onClose={() => setDetailTask(null)}
        title={detailTask ? `任务详情 · ${detailTask.id}` : '任务详情'}
        size="lg"
      >
        {detailTask && (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(
              [
                ['任务ID', detailTask.id],
                ['类型', detailTask.type],
                ['设备', detailTask.device],
                ['人员', detailTask.personnel],
                ['场景', detailTask.scene],
                [
                  '状态',
                  <StatusBadge
                    key="st"
                    status={TASK_STATUS_LABEL[detailTask.status]}
                  />,
                ],
                ['开始时间', formatDateTime(detailTask.startTime)],
                ['结束时间', formatDateTime(detailTask.endTime)],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="sm:odd:col-span-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                  {label}
                </dt>
                <dd className="mt-1 text-sm text-text">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>
    </div>
  )
}
