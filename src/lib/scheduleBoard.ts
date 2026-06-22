import {
  mockDevices,
  mockPersonnel,
  mockScenes,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from '@/data/mock'
import type { TaskReadiness } from '@/lib/taskReadiness'

export type ScheduleBoardFilter =
  | 'all'
  | 'attention'
  | 'in_progress'
  | 'scheduled'
  | 'to_schedule'

export type ScheduleViewMode = 'venue' | 'personnel' | 'list'

export type ScheduleAttentionKind =
  | 'blocked'
  | 'warn'
  | 'exception'
  | 'block_reason'

export type ScheduleAttentionItem = {
  task: Task
  kinds: ScheduleAttentionKind[]
  summary: string
}

export type ScheduleLaneGroup = {
  id: string
  label: string
  subLabel?: string
  tasks: Task[]
}

const BOARD_STATUSES: TaskStatus[] = [
  'scheduled',
  'ready',
  'in_progress',
  'completed',
  'closed',
  'pending_resources',
  'to_schedule',
]

export function tasksForScheduleBoard(tasks: Task[]): Task[] {
  return tasks.filter((t) => BOARD_STATUSES.includes(t.status))
}

export function needsAttention(
  task: Task,
  readiness: TaskReadiness | undefined,
): ScheduleAttentionItem | null {
  const kinds: ScheduleAttentionKind[] = []
  if (readiness?.overall === 'blocked') kinds.push('blocked')
  if (readiness?.overall === 'warn') kinds.push('warn')
  if (task.scriptException?.status === 'open') kinds.push('exception')
  if (task.blockReason && task.blockReason.trim() !== '') kinds.push('block_reason')
  if (kinds.length === 0) return null
  const parts: string[] = []
  if (task.scriptException?.status === 'open') {
    parts.push(task.scriptException.reason)
  }
  if (task.blockReason) parts.push(task.blockReason)
  if (readiness?.overall === 'blocked') {
    const missing = (['personnel', 'device', 'script', 'scene'] as const)
      .filter((d) => readiness[d].state === 'missing')
      .map((d) => readiness[d].reason)
      .filter(Boolean)
    if (missing.length > 0) parts.push(missing.join('；'))
  }
  return {
    task,
    kinds,
    summary: parts[0] ?? '需运营介入',
  }
}

export function collectAttentionItems(
  tasks: Task[],
  readinessMap: Map<string, TaskReadiness>,
): ScheduleAttentionItem[] {
  return tasks
    .map((t) => needsAttention(t, readinessMap.get(t.id)))
    .filter((x): x is ScheduleAttentionItem => x !== null)
    .sort((a, b) => priorityRank(b.task.priority) - priorityRank(a.task.priority))
}

function priorityRank(p: TaskPriority | undefined): number {
  if (p === 'high') return 3
  if (p === 'medium') return 2
  return 1
}

export function filterBoardTasks(
  tasks: Task[],
  filter: ScheduleBoardFilter,
  readinessMap: Map<string, TaskReadiness>,
): Task[] {
  if (filter === 'all') return tasks
  if (filter === 'in_progress') return tasks.filter((t) => t.status === 'in_progress')
  if (filter === 'scheduled') {
    return tasks.filter((t) => t.status === 'scheduled' || t.status === 'ready')
  }
  if (filter === 'to_schedule') {
    return tasks.filter(
      (t) => t.status === 'to_schedule' || t.status === 'pending_resources',
    )
  }
  return tasks.filter((t) => needsAttention(t, readinessMap.get(t.id)) !== null)
}

export function boardStats(
  tasks: Task[],
  readinessMap: Map<string, TaskReadiness>,
): {
  inProgress: number
  scheduled: number
  toSchedule: number
  attention: number
  exception: number
} {
  const attention = collectAttentionItems(tasks, readinessMap)
  return {
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    scheduled: tasks.filter((t) => t.status === 'scheduled' || t.status === 'ready').length,
    toSchedule: tasks.filter(
      (t) => t.status === 'to_schedule' || t.status === 'pending_resources',
    ).length,
    attention: attention.length,
    exception: tasks.filter((t) => t.scriptException?.status === 'open').length,
  }
}

export function computeTimeBounds(tasks: Task[], anchor = new Date()): {
  min: number
  max: number
  range: number
} {
  const times = tasks
    .flatMap((t) => [new Date(t.startTime).getTime(), new Date(t.endTime).getTime()])
    .filter((t) => !Number.isNaN(t))
  if (times.length === 0) {
    const start = new Date(anchor)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return { min: start.getTime(), max: end.getTime(), range: end.getTime() - start.getTime() }
  }
  const min = Math.min(...times)
  const max = Math.max(...times)
  const pad = 30 * 60 * 1000
  return {
    min: min - pad,
    max: max + pad,
    range: Math.max(max - min + pad * 2, 60 * 60 * 1000),
  }
}

export function sceneVenueId(sceneId: string | undefined): string {
  if (!sceneId) return 'unassigned'
  return mockScenes.find((s) => s.id === sceneId)?.venueId ?? 'unknown'
}

export function groupByVenue(tasks: Task[], venueLabel: (venueId: string) => string): ScheduleLaneGroup[] {
  const map = new Map<string, Task[]>()
  for (const task of tasks) {
    const vid = sceneVenueId(task.sceneId)
    const list = map.get(vid) ?? []
    list.push(task)
    map.set(vid, list)
  }
  return [...map.entries()]
    .map(([id, groupTasks]) => ({
      id,
      label: id === 'unassigned' ? '未指派场地' : venueLabel(id),
      tasks: groupTasks.sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime() ||
          priorityRank(b.priority) - priorityRank(a.priority),
      ),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))
}

export function groupByPersonnel(tasks: Task[]): ScheduleLaneGroup[] {
  const map = new Map<string, Task[]>()
  for (const task of tasks) {
    const id = task.personnelId ?? 'unassigned'
    const list = map.get(id) ?? []
    list.push(task)
    map.set(id, list)
  }
  return [...map.entries()]
    .map(([id, groupTasks]) => ({
      id,
      label: id === 'unassigned' ? '未指派人员' : (groupTasks[0]?.personnel ?? id),
      subLabel: groupTasks[0]?.type,
      tasks: groupTasks.sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      ),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))
}

/** 原型演示：扩充并行任务量，仅用于调度区可视化 */
export function generateDemoScheduleTasks(existing: Task[], extraCount = 72): Task[] {
  const scenes = mockScenes.filter((s) => s.status === 'active')
  const personnel = mockPersonnel
  const devices = mockDevices.filter((d) => d.status === 'available')
  const statuses: TaskStatus[] = ['scheduled', 'in_progress', 'scheduled', 'in_progress', 'ready']
  const priorities: TaskPriority[] = ['high', 'medium', 'low', 'medium']
  const types = ['遥操作采集', '动捕采集', '人体数据采集']
  const base = new Date('2025-03-26T08:00:00+08:00').getTime()
  const existingIds = new Set(existing.map((t) => t.id))

  const generated: Task[] = []
  for (let i = 0; i < extraCount; i++) {
    const id = `task-demo-${String(i + 1).padStart(3, '0')}`
    if (existingIds.has(id)) continue
    const scene = scenes[i % scenes.length]
    const person = personnel[i % personnel.length]
    const device = devices[i % devices.length]
    const status = statuses[i % statuses.length]
    const slotStart = base + (i % 12) * 45 * 60 * 1000 + Math.floor(i / 12) * 3 * 60 * 60 * 1000
    const slotEnd = slotStart + (2 + (i % 3)) * 60 * 60 * 1000
    const blockReason =
      i % 17 === 0
        ? '设备档期冲突，待人工重排'
        : i % 23 === 0
          ? '场景维护窗口重叠'
          : undefined
    generated.push({
      id,
      device: device.name,
      personnel: person.name,
      scene: scene.name,
      status,
      startTime: new Date(slotStart).toISOString(),
      endTime: new Date(slotEnd).toISOString(),
      type: types[i % types.length],
      requirementId: `req-demo-${String((i % 8) + 1).padStart(3, '0')}`,
      personnelId: person.id,
      deviceId: device.id,
      sceneId: scene.id,
      priority: priorities[i % priorities.length],
      blockReason,
      scriptException:
        i % 31 === 0
          ? {
              reportedAt: new Date(slotStart).toISOString(),
              reporter: person.name,
              reason: '现场道具与台本不一致',
              status: 'open',
            }
          : undefined,
    })
  }
  return generated
}

export function taskBarStyle(
  task: Task,
  bounds: { min: number; range: number },
): { left: string; width: string } {
  const start = new Date(task.startTime).getTime()
  const end = new Date(task.endTime).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return { left: '0%', width: '2%' }
  }
  const left = ((start - bounds.min) / bounds.range) * 100
  const width = Math.max(((end - start) / bounds.range) * 100, 1.5)
  return { left: `${left}%`, width: `${width}%` }
}
