import { useSyncExternalStore } from 'react'

import { mockScenes, type Scene } from '@/data/mock'

let platformScenes: Scene[] = mockScenes.map((s) => ({
  ...s,
  recommendedPropIds: [...s.recommendedPropIds],
}))
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((fn) => fn())
}

export function getPlatformScenes(): Scene[] {
  return platformScenes
}

export function setPlatformScenes(next: Scene[]): void {
  platformScenes = next.map((s) => ({
    ...s,
    recommendedPropIds: [...s.recommendedPropIds],
  }))
  emit()
}

export function sceneById(scenes: Scene[], id: string): Scene | undefined {
  return scenes.find((s) => s.id === id)
}

export function updatePlatformScenes(updater: (prev: Scene[]) => Scene[]): void {
  platformScenes = updater(platformScenes.map((s) => ({
    ...s,
    recommendedPropIds: [...s.recommendedPropIds],
  })))
  emit()
}

export function subscribePlatformScenes(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePlatformScenes(): Scene[] {
  return useSyncExternalStore(subscribePlatformScenes, getPlatformScenes, getPlatformScenes)
}

export function scenesForVenue(scenes: Scene[], venueId: string): Scene[] {
  return scenes.filter((s) => s.venueId === venueId)
}
