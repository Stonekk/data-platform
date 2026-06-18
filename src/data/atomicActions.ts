/** 原子动作库 API — 数据见 seed/sceneActionIndex.ts */
import { SCENE_ACTION_CATEGORIES, type SceneActionCategory } from '@/data/seed/sceneActionIndex'

export type { SceneActionCategory }
export { SCENE_ACTION_CATEGORIES } from '@/data/seed/sceneActionIndex'

/** @deprecated 使用 categoriesForScene / SCENE_ACTION_CATEGORIES */
export type AtomicActionCategory = SceneActionCategory & {
  actions: string
  typicalScenes: string
  code?: string
}

function withLegacyFields(cat: SceneActionCategory, index: number): AtomicActionCategory {
  const codes = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  return {
    ...cat,
    actions: cat.primitives.join('、'),
    typicalScenes: cat.sceneName,
    code: codes[index] ?? String(index + 1),
  }
}

export const SCENE_ACTION_INDEX = SCENE_ACTION_CATEGORIES

export function categoriesForScene(sceneId: string): SceneActionCategory[] {
  return SCENE_ACTION_CATEGORIES.filter((c) => c.sceneId === sceneId)
}

export function categoryById(id: string): SceneActionCategory | undefined {
  return SCENE_ACTION_CATEGORIES.find((c) => c.id === id)
}

export function defaultCategoryIdsForScene(sceneId: string): string[] {
  const highlighted = categoriesForScene(sceneId).filter((c) => c.highlight)
  if (highlighted.length > 0) return highlighted.map((c) => c.id)
  return categoriesForScene(sceneId).slice(0, 2).map((c) => c.id)
}

export function sceneIdsWithActions(): string[] {
  return [...new Set(SCENE_ACTION_CATEGORIES.map((c) => c.sceneId))]
}

/** @deprecated 管理页请用 categoriesForScene */
export const ATOMIC_ACTION_CATEGORIES: AtomicActionCategory[] = SCENE_ACTION_CATEGORIES.map(
  withLegacyFields,
)

export const HIGHLIGHT_ATOMIC_IDS = SCENE_ACTION_CATEGORIES.filter((c) => c.highlight).map(
  (c) => c.id,
)
