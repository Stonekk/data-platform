import type { Task, TaskScript } from '@/data/mock'
import { computeReadiness } from '@/lib/taskReadiness'
import { allScriptsSchedulable } from '@/lib/taskScriptAccess'

export type AutoScheduleResult = {
  nextTasks: Task[]
  scheduledIds: string[]
  skipped: Array<{ taskId: string; reason: string }>
  logLines: string[]
}

const SLOT_HOURS = [9, 10, 13, 14, 15, 16, 19]

function priorityOrder(p: Task['priority']): number {
  if (p === 'high') return 0
  if (p === 'medium') return 1
  return 2
}

function occupiedSlots(tasks: Task[], dayStart: Date): Set<number> {
  const used = new Set<number>()
  for (const t of tasks) {
    if (!['scheduled', 'ready', 'in_progress'].includes(t.status)) continue
    const start = new Date(t.startTime)
    if (start.toDateString() !== dayStart.toDateString()) continue
    used.add(start.getHours())
  }
  return used
}

/**
 * 原型级自动调度：基于待调度任务的就绪态与空闲时段槽位批量排期。
 * 正式版将接入人/设备/室/场的实时占用与约束求解。
 */
export function runAutoSchedule(
  tasks: Task[],
  scripts: TaskScript[],
  options?: { baseDate?: string },
): AutoScheduleResult {
  const base = options?.baseDate
    ? new Date(options.baseDate)
    : new Date('2025-03-27T00:00:00+08:00')
  base.setHours(0, 0, 0, 0)

  const pending = tasks
    .filter((t) => t.status === 'to_schedule')
    .sort((a, b) => priorityOrder(a.priority) - priorityOrder(b.priority))

  const scheduledIds: string[] = []
  const skipped: Array<{ taskId: string; reason: string }> = []
  const logLines: string[] = []
  let working = [...tasks]
  const usedByDay = new Map<string, Set<number>>()

  for (const task of pending) {
    const readiness = computeReadiness(task, scripts)
    if (readiness.overall === 'blocked') {
      skipped.push({ taskId: task.id, reason: '资源阻塞，跳过自动排期' })
      continue
    }
    if (!allScriptsSchedulable(task, scripts)) {
      skipped.push({ taskId: task.id, reason: '台本未全部确认绑定' })
      continue
    }

    let placed = false
    for (let dayOffset = 0; dayOffset < 5 && !placed; dayOffset++) {
      const day = new Date(base)
      day.setDate(day.getDate() + dayOffset)
      const dayKey = day.toDateString()
      const used = usedByDay.get(dayKey) ?? occupiedSlots(working, day)
      for (const hour of SLOT_HOURS) {
        if (used.has(hour)) continue
        const start = new Date(day)
        start.setHours(hour, 0, 0, 0)
        const end = new Date(start)
        end.setHours(hour + 2, 30, 0, 0)
        used.add(hour)
        usedByDay.set(dayKey, used)
        working = working.map((t) =>
          t.id === task.id
            ? {
                ...t,
                status: 'scheduled' as const,
                startTime: start.toISOString(),
                endTime: end.toISOString(),
              }
            : t,
        )
        scheduledIds.push(task.id)
        logLines.push(
          `${task.id} → ${start.toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit', month: '2-digit', day: '2-digit' })}（${task.scene}）`,
        )
        placed = true
        break
      }
    }
    if (!placed) {
      skipped.push({ taskId: task.id, reason: '近 5 日无可用空闲槽位' })
    }
  }

  return { nextTasks: working, scheduledIds, skipped, logLines }
}
