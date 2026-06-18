import type { Scene } from '@/data/mock'

export type SceneSafetyTier = 'perception' | 'manipulation'

const PERCEPTION_KEYWORDS = /客厅|厨房|卫生间|茶几|茶水/

export type SceneSafetyInput = Pick<Scene, 'name' | 'sceneSubtype' | 'description'> & {
  safetyTier?: SceneSafetyTier
}

export function resolveSafetyTier(scene: SceneSafetyInput): SceneSafetyTier {
  if (scene.safetyTier) return scene.safetyTier
  const label = `${scene.name}${scene.sceneSubtype}${scene.description ?? ''}`
  return PERCEPTION_KEYWORDS.test(label) ? 'perception' : 'manipulation'
}
