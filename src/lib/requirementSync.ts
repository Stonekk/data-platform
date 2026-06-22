import type { Requirement, Task } from '@/data/mock'

/** 根据关联任务状态回写需求进度与主线状态 */
export function syncRequirementsByTasks(prev: Requirement[], nextTasks: Task[]): Requirement[] {
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
