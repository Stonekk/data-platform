import type { ScriptTaskAllocation, Task, TaskScript } from '@/data/mock'
import { isScriptSchedulable } from '@/lib/scriptWorkflow'

/** 任务单元绑定的台本 ID 列表（兼容旧 scriptId） */
export function taskScriptIds(task: Pick<Task, 'scriptId' | 'scriptIds'>): string[] {
  if (task.scriptIds && task.scriptIds.length > 0) return [...task.scriptIds]
  if (task.scriptId) return [task.scriptId]
  return []
}

export function scriptsForTask(task: Task, allScripts: TaskScript[]): TaskScript[] {
  const ids = new Set(taskScriptIds(task))
  return allScripts.filter((s) => ids.has(s.taskId))
}

export function normalizeTaskScripts(task: Task): Task {
  const ids = taskScriptIds(task)
  if (ids.length === 0) return task
  return {
    ...task,
    scriptIds: ids,
    scriptId: ids[0],
  }
}

export function totalTargetCount(
  task: Task,
  scripts: TaskScript[] = [],
): number {
  if (task.scriptAllocations && task.scriptAllocations.length > 0) {
    return task.scriptAllocations.reduce((sum, a) => sum + a.targetCount, 0)
  }
  const bound = scriptsForTask(task, scripts)
  return bound.reduce((sum, s) => sum + (s.recommendedTargetCount ?? 1), 0)
}

export function allScriptsSchedulable(task: Task, scripts: TaskScript[]): boolean {
  const bound = scriptsForTask(task, scripts)
  if (bound.length === 0) return false
  return bound.every((s) => isScriptSchedulable(s))
}

export function scriptCountLabel(task: Task): string {
  const n = taskScriptIds(task).length
  if (n === 0) return '无台本'
  if (n === 1) return '1 个台本'
  return `${n} 个台本`
}

export function mergeAllocations(
  scriptIds: string[],
  allocations: ScriptTaskAllocation[],
  defaultCount = 30,
): ScriptTaskAllocation[] {
  return scriptIds.map((scriptId) => {
    const existing = allocations.find((a) => a.scriptId === scriptId)
    return { scriptId, targetCount: existing?.targetCount ?? defaultCount }
  })
}
