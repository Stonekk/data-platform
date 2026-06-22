import { useSyncExternalStore } from 'react'

import {
  mockRequirements,
  type Requirement,
  type RequirementDataPurpose,
  type RequirementSceneType,
} from '@/data/mock'
import { resetPlatformWorkflow } from '@/data/taskStore'

const STORAGE_KEY = 'edp-platform-requirements'

function inferSceneType(scene: string): RequirementSceneType {
  const t = scene.toLowerCase()
  if (t.includes('家庭') || t.includes('home')) return 'home'
  if (t.includes('商务') || t.includes('business')) return 'business'
  if (t.includes('工厂') || t.includes('factory')) return 'factory'
  if (t.includes('充电') || t.includes('charging')) return 'charging'
  if (t.includes('道路') || t.includes('public')) return 'public'
  return 'other'
}

export function normalizeRequirementFields(row: Requirement): Requirement {
  return {
    ...row,
    sceneType: row.sceneType ?? inferSceneType(row.scene),
    dataPurpose: row.dataPurpose ?? ('training' satisfies RequirementDataPurpose),
  }
}

function cloneRequirement(row: Requirement): Requirement {
  return {
    ...row,
    linkedTaskIds: [...row.linkedTaskIds],
    keyRequirements: [...row.keyRequirements],
    approvals: row.approvals.map((node) => ({
      ...node,
      evaluation: node.evaluation ? { ...node.evaluation } : undefined,
    })),
  }
}

function seedRequirements(): Requirement[] {
  return mockRequirements.map(cloneRequirement).map(normalizeRequirementFields)
}

function loadFromStorage(): Requirement[] | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Requirement[]
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    return parsed.map(cloneRequirement).map(normalizeRequirementFields)
  } catch {
    return null
  }
}

function saveToStorage(requirements: Requirement[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requirements))
  } catch {
    // ignore quota errors in prototype
  }
}

let platformRequirements: Requirement[] = loadFromStorage() ?? seedRequirements()
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((fn) => fn())
}

export function getPlatformRequirements(): Requirement[] {
  return platformRequirements
}

export function setPlatformRequirements(next: Requirement[]): void {
  platformRequirements = next.map(cloneRequirement).map(normalizeRequirementFields)
  saveToStorage(platformRequirements)
  emit()
}

export function updatePlatformRequirements(
  updater: (prev: Requirement[]) => Requirement[],
): void {
  platformRequirements = updater(platformRequirements.map(cloneRequirement))
    .map(cloneRequirement)
    .map(normalizeRequirementFields)
  saveToStorage(platformRequirements)
  emit()
}

export function subscribePlatformRequirements(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePlatformRequirements(): [Requirement[], typeof setPlatformRequirements] {
  const requirements = useSyncExternalStore(
    subscribePlatformRequirements,
    getPlatformRequirements,
    getPlatformRequirements,
  )
  return [requirements, setPlatformRequirements]
}

export function nextRequirementId(existing: Requirement[]): string {
  const nums = existing
    .map((r) => {
      const m = /^req-(\d+)$/.exec(r.id)
      return m ? Number(m[1]) : 0
    })
    .filter((n) => n > 0)
  const max = nums.length ? Math.max(...nums) : 0
  return `req-${String(max + 1).padStart(3, '0')}`
}

/** 原型演示：补齐审批记录并推进到已批准 */
export function simulateRequirementApproval(requirementId: string): boolean {
  const current = platformRequirements.find((r) => r.id === requirementId)
  if (!current) return false
  if (!['submitted', 'reviewing'].includes(current.status)) return false

  const now = new Date().toISOString()
  updatePlatformRequirements((prev) =>
    prev.map((row) => {
      if (row.id !== requirementId) return row
      return {
        ...row,
        status: 'approved',
        approvals: row.approvals.map((node, index) => ({
          ...node,
          approverName: index === 0 ? '许明哲' : '胡明宇',
          decision: 'approved' as const,
          evaluation: {
            feasibility: 'pass' as const,
            cost: 'pass' as const,
            efficiency: 'pass' as const,
            resourceMatch: 'pass' as const,
          },
          opinion: '原型演示：审批通过，可进入任务拆解。',
          actedAt: now,
        })),
      }
    }),
  )
  return true
}

export function resetPlatformRequirements(): void {
  platformRequirements = seedRequirements()
  saveToStorage(platformRequirements)
  emit()
}

/** 重置需求、任务与台本种子数据（原型演示） */
export function resetAllPlatformData(): void {
  resetPlatformRequirements()
  resetPlatformWorkflow()
}
