import { useMemo, useState, type ReactElement } from 'react'
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  List,
  Play,
  Users,
  Zap,
} from 'lucide-react'

import { StatusBadge } from '@/components/ui'
import type { Task, TaskPriority } from '@/data/mock'
import { venuePathLabel } from '@/data/venueStore'
import type { Venue } from '@/data/mock'
import {
  boardStats,
  collectAttentionItems,
  computeTimeBounds,
  filterBoardTasks,
  groupByPersonnel,
  groupByVenue,
  taskBarStyle,
  tasksForScheduleBoard,
  type ScheduleBoardFilter,
  type ScheduleViewMode,
} from '@/lib/scheduleBoard'
import type { TaskReadiness } from '@/lib/taskReadiness'
import { cn } from '@/lib/utils'

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatBoundsTime(ms: number): string {
  if (Number.isNaN(ms)) return '—'
  return formatDateTime(new Date(ms).toISOString())
}

function priorityDotClass(priority: TaskPriority | undefined): string {
  if (priority === 'high') return 'bg-rose-500'
  if (priority === 'medium') return 'bg-amber-500'
  return 'bg-slate-400'
}

function taskStatusBarClass(task: Task, attention: boolean): string {
  if (attention) return 'border-rose-300 bg-rose-50 text-rose-950 ring-1 ring-rose-200'
  if (task.scriptException?.status === 'open') {
    return 'border-amber-300 bg-amber-50 text-amber-950 ring-1 ring-amber-200'
  }
  if (task.status === 'in_progress') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200'
  }
  if (task.status === 'scheduled' || task.status === 'ready') {
    return 'border-sky-200 bg-sky-50 text-sky-950'
  }
  return 'border-slate-200 bg-white text-text'
}

const STATUS_LABEL: Record<string, string> = {
  pending_resources: '待配资源',
  to_schedule: '待调度',
  scheduled: '已排期',
  ready: '待执行',
  in_progress: '执行中',
  completed: '已完成',
  closed: '已关闭',
}

type ScheduleBoardProps = {
  tasks: Task[]
  venues: Venue[]
  readinessMap: Map<string, TaskReadiness>
  demoScale: boolean
  onTaskClick: (task: Task) => void
}

export function ScheduleBoard({
  tasks,
  venues,
  readinessMap,
  demoScale,
  onTaskClick,
}: ScheduleBoardProps): ReactElement {
  const [filter, setFilter] = useState<ScheduleBoardFilter>('all')
  const [viewMode, setViewMode] = useState<ScheduleViewMode>('venue')
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set())
  const [listSearch, setListSearch] = useState('')

  const boardTasks = useMemo(() => tasksForScheduleBoard(tasks), [tasks])
  const stats = useMemo(() => boardStats(boardTasks, readinessMap), [boardTasks, readinessMap])
  const attentionItems = useMemo(
    () => collectAttentionItems(boardTasks, readinessMap),
    [boardTasks, readinessMap],
  )

  const filteredTasks = useMemo(() => {
    let list = filterBoardTasks(boardTasks, filter, readinessMap)
    if (listSearch.trim()) {
      const q = listSearch.trim().toLowerCase()
      list = list.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.personnel.toLowerCase().includes(q) ||
          t.scene.toLowerCase().includes(q) ||
          t.device.toLowerCase().includes(q),
      )
    }
    return list
  }, [boardTasks, filter, readinessMap, listSearch])

  const bounds = useMemo(() => computeTimeBounds(filteredTasks), [filteredTasks])

  const laneGroups = useMemo(() => {
    if (viewMode === 'personnel') return groupByPersonnel(filteredTasks)
    return groupByVenue(filteredTasks, (venueId) => venuePathLabel(venues, venueId))
  }, [filteredTasks, viewMode, venues])

  function toggleLane(id: string): void {
    setCollapsedLanes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const kpiChips: Array<{
    key: ScheduleBoardFilter
    label: string
    count: number
    tone: string
  }> = [
    { key: 'attention', label: '需介入', count: stats.attention, tone: 'rose' },
    { key: 'in_progress', label: '执行中', count: stats.inProgress, tone: 'emerald' },
    { key: 'scheduled', label: '已排期', count: stats.scheduled, tone: 'sky' },
    { key: 'to_schedule', label: '待调度', count: stats.toSchedule, tone: 'amber' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {kpiChips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setFilter((f) => (f === chip.key ? 'all' : chip.key))}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
              filter === chip.key
                ? chip.tone === 'rose'
                  ? 'border-rose-300 bg-rose-50 text-rose-900'
                  : chip.tone === 'emerald'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                    : chip.tone === 'sky'
                      ? 'border-sky-300 bg-sky-50 text-sky-900'
                      : 'border-amber-300 bg-amber-50 text-amber-900'
                : 'border-border bg-white text-text-secondary hover:bg-slate-50',
            )}
          >
            {chip.label}
            <span className="tabular-nums">{chip.count}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={cn(
            'rounded-lg border px-2.5 py-1 text-xs',
            filter === 'all'
              ? 'border-slate-400 bg-slate-100 font-medium text-text'
              : 'border-border text-text-secondary hover:bg-slate-50',
          )}
        >
          全部
        </button>
        {demoScale && (
          <span className="ml-auto text-[11px] text-text-secondary">
            演示规模：{boardTasks.length} 条并行任务
          </span>
        )}
      </div>

      {attentionItems.length > 0 && (
        <section className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-rose-900">
            <AlertTriangle className="size-3.5" />
            需介入队列（{attentionItems.length}）
            <span className="font-normal text-rose-700">— 阻塞 / 异常 / 预警优先处理</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {attentionItems.slice(0, 12).map((item) => (
              <button
                key={item.task.id}
                type="button"
                onClick={() => onTaskClick(item.task)}
                className="min-w-[200px] shrink-0 rounded-lg border border-rose-200 bg-white px-3 py-2 text-left text-xs hover:bg-rose-50/50"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn('size-1.5 rounded-full', priorityDotClass(item.task.priority))}
                  />
                  <span className="font-mono font-semibold text-primary">{item.task.id}</span>
                  <StatusBadge status={STATUS_LABEL[item.task.status] ?? item.task.status} size="sm" />
                </div>
                <p className="mt-0.5 truncate text-text-secondary">
                  {item.task.personnel} · {item.task.scene}
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] text-rose-800">{item.summary}</p>
              </button>
            ))}
            {attentionItems.length > 12 && (
              <div className="flex min-w-[120px] items-center justify-center rounded-lg border border-dashed border-rose-200 px-3 text-[11px] text-rose-700">
                +{attentionItems.length - 12} 条
              </div>
            )}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-md bg-slate-100 p-0.5">
          {([
            ['venue', '场地泳道', Building2],
            ['personnel', '人员泳道', Users],
            ['list', '紧凑列表', List],
          ] as const).map(([mode, label, Icon]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={cn(
                'inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium',
                viewMode === mode ? 'bg-white text-primary shadow-sm' : 'text-text-secondary',
              )}
            >
              <Icon className="size-3" />
              {label}
            </button>
          ))}
        </div>
        {viewMode === 'list' && (
          <input
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            placeholder="搜索任务 / 人员 / 场景 / 设备…"
            className="h-8 w-56 rounded-md border border-border px-2 text-xs"
          />
        )}
      </div>

      {viewMode === 'list' ? (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-border bg-slate-50 text-text-secondary">
                <tr>
                  <th className="px-3 py-2 font-medium">任务</th>
                  <th className="px-3 py-2 font-medium">状态</th>
                  <th className="px-3 py-2 font-medium">人员</th>
                  <th className="px-3 py-2 font-medium">场景</th>
                  <th className="px-3 py-2 font-medium">计划时间</th>
                  <th className="px-3 py-2 font-medium">备注</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-text-secondary">
                      当前筛选下无任务
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const attn = needsAttentionLocal(task, readinessMap.get(task.id))
                    return (
                      <tr
                        key={task.id}
                        className={cn(
                          'cursor-pointer border-b border-border/60 hover:bg-slate-50',
                          attn && 'bg-rose-50/40',
                        )}
                        onClick={() => onTaskClick(task)}
                      >
                        <td className="px-3 py-2 font-mono font-semibold text-primary">{task.id}</td>
                        <td className="px-3 py-2">
                          <StatusBadge status={STATUS_LABEL[task.status] ?? task.status} size="sm" />
                        </td>
                        <td className="px-3 py-2">{task.personnel}</td>
                        <td className="px-3 py-2">{task.scene}</td>
                        <td className="px-3 py-2 font-mono text-text-secondary">
                          {task.startTime && task.endTime
                            ? `${formatDateTime(task.startTime)} → ${formatDateTime(task.endTime)}`
                            : '—'}
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-2 text-rose-800">
                          {task.scriptException?.reason ?? task.blockReason ?? '—'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border-2 border-slate-200 bg-gradient-to-b from-slate-50 to-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 text-[10px] text-text-secondary">
            <span>{formatBoundsTime(bounds.min)}</span>
            <span className="inline-flex items-center gap-1">
              <LayoutGrid className="size-3" />
              {laneGroups.length} 条泳道 · {filteredTasks.length} 个任务块
            </span>
            <span>{formatBoundsTime(bounds.min + bounds.range)}</span>
          </div>

          <div className="max-h-[520px] overflow-y-auto">
            {laneGroups.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-text-secondary">暂无已排期任务</p>
            ) : (
              laneGroups.map((lane) => {
                const collapsed = collapsedLanes.has(lane.id)
                const inProgress = lane.tasks.filter((t) => t.status === 'in_progress').length
                return (
                  <div key={lane.id} className="border-b border-slate-100 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => toggleLane(lane.id)}
                      className="flex w-full items-center gap-2 bg-slate-50/80 px-3 py-1.5 text-left text-xs hover:bg-slate-100"
                    >
                      {collapsed ? (
                        <ChevronRight className="size-3.5 shrink-0 text-text-secondary" />
                      ) : (
                        <ChevronDown className="size-3.5 shrink-0 text-text-secondary" />
                      )}
                      <span className="font-medium text-text">{lane.label}</span>
                      <span className="text-text-secondary">
                        {lane.tasks.length} 任务
                        {inProgress > 0 && (
                          <span className="ml-1 text-emerald-700">· {inProgress} 执行中</span>
                        )}
                      </span>
                    </button>
                    {!collapsed && (
                      <div className="relative mx-3 mb-2 mt-1 h-14 rounded-md bg-white ring-1 ring-inset ring-slate-200/80">
                        {lane.tasks.map((task, idx) => {
                          const bar = taskBarStyle(task, bounds)
                          const attn = needsAttentionLocal(task, readinessMap.get(task.id))
                          return (
                            <div
                              key={`${task.id}-${idx}`}
                              role="button"
                              tabIndex={0}
                              onClick={() => onTaskClick(task)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  onTaskClick(task)
                                }
                              }}
                              className={cn(
                                'absolute top-1 flex h-[calc(100%-8px)] min-w-[48px] cursor-pointer flex-col justify-center overflow-hidden rounded border px-1.5 text-[10px] leading-tight transition-shadow hover:shadow-md',
                                taskStatusBarClass(task, attn),
                              )}
                              style={{
                                left: bar.left,
                                width: bar.width,
                                top: `${4 + (idx % 2) * 0}px`,
                              }}
                              title={`${task.id} · ${task.personnel}`}
                            >
                              <div className="flex items-center gap-0.5 font-semibold">
                                <span
                                  className={cn(
                                    'size-1 shrink-0 rounded-full',
                                    priorityDotClass(task.priority),
                                  )}
                                />
                                <span className="truncate font-mono">{task.id}</span>
                                {task.status === 'in_progress' && (
                                  <Play className="ml-auto size-2.5 shrink-0 text-emerald-700" />
                                )}
                                {attn && (
                                  <Zap className="ml-auto size-2.5 shrink-0 text-rose-600" />
                                )}
                              </div>
                              <p className="truncate opacity-90">{task.personnel}</p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function needsAttentionLocal(
  task: Task,
  readiness: TaskReadiness | undefined,
): boolean {
  return (
    readiness?.overall === 'blocked' ||
    readiness?.overall === 'warn' ||
    task.scriptException?.status === 'open' ||
    Boolean(task.blockReason)
  )
}
