import { useSyncExternalStore } from 'react'

import { mockTaskScripts, mockTasks, type Task, type TaskScript } from '@/data/mock'
import { migrateLegacyTasks } from '@/lib/scriptBatchWorkflow'

const TASKS_STORAGE_KEY = 'edp-platform-tasks'
const SCRIPTS_STORAGE_KEY = 'edp-platform-task-scripts'

function cloneTaskScript(script: TaskScript): TaskScript {
  return {
    ...script,
    propIds: [...script.propIds],
    personnelIds: [...script.personnelIds],
    deviceIds: [...script.deviceIds],
    atomicActionIds: [...(script.atomicActionIds ?? [])],
    steps: script.steps.map((step) => ({ ...step })),
    generationMeta: script.generationMeta ? { ...script.generationMeta } : undefined,
  }
}

function cloneTask(task: Task): Task {
  return {
    ...task,
    scriptIds: task.scriptIds ? [...task.scriptIds] : undefined,
    scriptAllocations: task.scriptAllocations
      ? task.scriptAllocations.map((a) => ({ ...a }))
      : undefined,
    scriptException: task.scriptException ? { ...task.scriptException } : undefined,
  }
}

function seedTasks(): Task[] {
  return migrateLegacyTasks(mockTasks.map(cloneTask))
}

function seedTaskScripts(): TaskScript[] {
  return mockTaskScripts.map(cloneTaskScript)
}

function loadTasksFromStorage(): Task[] | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Task[]
    if (!Array.isArray(parsed)) return null
    return migrateLegacyTasks(parsed.map(cloneTask))
  } catch {
    return null
  }
}

function loadScriptsFromStorage(): TaskScript[] | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(SCRIPTS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TaskScript[]
    if (!Array.isArray(parsed)) return null
    return parsed.map(cloneTaskScript)
  } catch {
    return null
  }
}

function saveTasksToStorage(tasks: Task[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks))
  } catch {
    // ignore quota errors in prototype
  }
}

function saveScriptsToStorage(scripts: TaskScript[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(SCRIPTS_STORAGE_KEY, JSON.stringify(scripts))
  } catch {
    // ignore quota errors in prototype
  }
}

let platformTasks: Task[] = loadTasksFromStorage() ?? seedTasks()
let platformTaskScripts: TaskScript[] = loadScriptsFromStorage() ?? seedTaskScripts()
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((fn) => fn())
}

export function getPlatformTasks(): Task[] {
  return platformTasks
}

export function getPlatformTaskScripts(): TaskScript[] {
  return platformTaskScripts
}

export function setPlatformTasks(next: Task[]): void {
  platformTasks = migrateLegacyTasks(next.map(cloneTask))
  saveTasksToStorage(platformTasks)
  emit()
}

export function setPlatformTaskScripts(next: TaskScript[]): void {
  platformTaskScripts = next.map(cloneTaskScript)
  saveScriptsToStorage(platformTaskScripts)
  emit()
}

export function setPlatformTasksState(next: Task[] | ((prev: Task[]) => Task[])): void {
  if (typeof next === 'function') {
    updatePlatformTasks(next)
  } else {
    setPlatformTasks(next)
  }
}

export function setPlatformTaskScriptsState(
  next: TaskScript[] | ((prev: TaskScript[]) => TaskScript[]),
): void {
  if (typeof next === 'function') {
    updatePlatformTaskScripts(next)
  } else {
    setPlatformTaskScripts(next)
  }
}

export function updatePlatformTasks(updater: (prev: Task[]) => Task[]): void {
  platformTasks = migrateLegacyTasks(updater(platformTasks.map(cloneTask)).map(cloneTask))
  saveTasksToStorage(platformTasks)
  emit()
}

export function updatePlatformTaskScripts(updater: (prev: TaskScript[]) => TaskScript[]): void {
  platformTaskScripts = updater(platformTaskScripts.map(cloneTaskScript)).map(cloneTaskScript)
  saveScriptsToStorage(platformTaskScripts)
  emit()
}

export function subscribePlatformWorkflow(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePlatformTasks(): [Task[], typeof setPlatformTasks] {
  const tasks = useSyncExternalStore(
    subscribePlatformWorkflow,
    getPlatformTasks,
    getPlatformTasks,
  )
  return [tasks, setPlatformTasks]
}

export function usePlatformTaskScripts(): [TaskScript[], typeof setPlatformTaskScripts] {
  const scripts = useSyncExternalStore(
    subscribePlatformWorkflow,
    getPlatformTaskScripts,
    getPlatformTaskScripts,
  )
  return [scripts, setPlatformTaskScripts]
}

export function resetPlatformWorkflow(): void {
  platformTasks = seedTasks()
  platformTaskScripts = seedTaskScripts()
  saveTasksToStorage(platformTasks)
  saveScriptsToStorage(platformTaskScripts)
  emit()
}
