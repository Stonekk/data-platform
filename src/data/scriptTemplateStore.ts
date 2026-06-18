import { useSyncExternalStore } from 'react'

import { mockScriptTemplates, type ScriptTemplate } from '@/data/mock'

let platformTemplates: ScriptTemplate[] = mockScriptTemplates.map((t) => ({
  ...t,
  applicableSceneTypes: [...t.applicableSceneTypes],
  stepSlots: [...t.stepSlots],
  skeleton: t.skeleton
    ? {
        ...t.skeleton,
        sequence: [...t.skeleton.sequence],
      }
    : undefined,
  allowedVariationAxes: t.allowedVariationAxes ? [...t.allowedVariationAxes] : undefined,
}))

const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((fn) => fn())
}

export function getPlatformScriptTemplates(): ScriptTemplate[] {
  return platformTemplates
}

export function updatePlatformScriptTemplates(
  updater: (prev: ScriptTemplate[]) => ScriptTemplate[],
): void {
  platformTemplates = updater(
    platformTemplates.map((t) => ({
      ...t,
      applicableSceneTypes: [...t.applicableSceneTypes],
      stepSlots: [...t.stepSlots],
      skeleton: t.skeleton
        ? {
            ...t.skeleton,
            sequence: [...t.skeleton.sequence],
          }
        : undefined,
      allowedVariationAxes: t.allowedVariationAxes ? [...t.allowedVariationAxes] : undefined,
    })),
  )
  emit()
}

export function subscribePlatformScriptTemplates(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePlatformScriptTemplates(): ScriptTemplate[] {
  return useSyncExternalStore(
    subscribePlatformScriptTemplates,
    getPlatformScriptTemplates,
    getPlatformScriptTemplates,
  )
}

export function templateById(templates: ScriptTemplate[], id: string): ScriptTemplate | undefined {
  return templates.find((t) => t.id === id)
}

export function templatesForSceneType(
  templates: ScriptTemplate[],
  sceneType: string,
): ScriptTemplate[] {
  return templates.filter(
    (t) =>
      t.status === 'active' &&
      (t.applicableSceneTypes.length === 0 || t.applicableSceneTypes.includes(sceneType)),
  )
}
