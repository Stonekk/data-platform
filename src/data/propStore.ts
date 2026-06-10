import { useSyncExternalStore } from 'react'

import { mockProps, type Prop, type PropApprovalStatus } from '@/data/mock'

let platformProps: Prop[] = mockProps.map((p) => ({ ...p }))
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((fn) => fn())
}

export function getPlatformProps(): Prop[] {
  return platformProps
}

export function setPlatformProps(next: Prop[]): void {
  platformProps = next.map((p) => ({ ...p }))
  emit()
}

export function updatePlatformProps(updater: (prev: Prop[]) => Prop[]): void {
  platformProps = updater(platformProps.map((p) => ({ ...p })))
  emit()
}

export function subscribePlatformProps(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePlatformProps(): [Prop[], (next: Prop[]) => void] {
  const props = useSyncExternalStore(subscribePlatformProps, getPlatformProps, getPlatformProps)
  return [props, setPlatformProps]
}

export function createPropId(existing: Prop[]): string {
  const nums = existing
    .map((p) => /^prop-(\d+)$/.exec(p.id)?.[1])
    .filter((n): n is string => n !== undefined)
    .map((n) => Number.parseInt(n, 10))
  const next = (nums.length > 0 ? Math.max(...nums) : 0) + 1
  return `prop-${String(next).padStart(3, '0')}`
}

export function normalizeApprovalOnSave(
  requiresApproval: boolean,
  current: PropApprovalStatus | undefined,
): PropApprovalStatus {
  if (!requiresApproval) return 'none'
  if (current === 'approved' || current === 'pending' || current === 'rejected') return current
  return 'none'
}
