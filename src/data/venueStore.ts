import { useSyncExternalStore } from 'react'

import { mockVenues, type Venue } from '@/data/mock'

let platformVenues: Venue[] = mockVenues.map((v) => ({ ...v, tags: [...v.tags] }))
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((fn) => fn())
}

export function getPlatformVenues(): Venue[] {
  return platformVenues
}

export function setPlatformVenues(next: Venue[]): void {
  platformVenues = next.map((v) => ({ ...v, tags: [...v.tags] }))
  emit()
}

export function updatePlatformVenues(updater: (prev: Venue[]) => Venue[]): void {
  platformVenues = updater(platformVenues.map((v) => ({ ...v, tags: [...v.tags] })))
  emit()
}

export function subscribePlatformVenues(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePlatformVenues(): Venue[] {
  return useSyncExternalStore(subscribePlatformVenues, getPlatformVenues, getPlatformVenues)
}

export function createVenueId(existing: Venue[]): string {
  return `venue-new-${String(existing.length + 1).padStart(3, '0')}`
}

export function venueChildren(venues: Venue[], parentId: string | null): Venue[] {
  return venues.filter((v) => v.parentId === parentId)
}

export function venueById(venues: Venue[], id: string): Venue | undefined {
  return venues.find((v) => v.id === id)
}

export function venuePathLabel(venues: Venue[], venueId: string): string {
  const parts: string[] = []
  let current = venues.find((v) => v.id === venueId)
  while (current) {
    parts.unshift(current.name)
    current = current.parentId ? venues.find((v) => v.id === current!.parentId) : undefined
  }
  return parts.join(' / ')
}

export function roomVenues(venues: Venue[]): Venue[] {
  return venues.filter((v) => v.level === 'room')
}

export function nextVenueLevel(parent: Venue | null): Venue['level'] {
  if (!parent) return 'building'
  if (parent.level === 'building') return 'floor'
  return 'room'
}
