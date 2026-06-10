import type { Prop } from '@/data/mock'

export type PropApprovalCheck = {
  ok: boolean
  /** 已选但需审批且未通过的道具 */
  blocked: Prop[]
  /** 待审批中 */
  pending: Prop[]
}

export function checkPropsApproval(propIds: string[], props: Prop[]): PropApprovalCheck {
  const selected = propIds
    .map((id) => props.find((p) => p.id === id))
    .filter((p): p is Prop => p !== undefined)
  const needsGate = selected.filter((p) => p.requiresApproval)
  const blocked = needsGate.filter((p) => p.approvalStatus !== 'approved')
  const pending = blocked.filter((p) => p.approvalStatus === 'pending')
  return {
    ok: blocked.length === 0,
    blocked,
    pending,
  }
}

export function requestPropUsage(propId: string, props: Prop[]): Prop[] {
  return props.map((p) =>
    p.id === propId && p.requiresApproval && p.approvalStatus === 'none'
      ? { ...p, approvalStatus: 'pending' as const }
      : p,
  )
}

export function approveProp(propId: string, props: Prop[]): Prop[] {
  return props.map((p) =>
    p.id === propId ? { ...p, approvalStatus: 'approved' as const } : p,
  )
}
