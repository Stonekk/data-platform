import type { ReactElement } from 'react'

import { cn } from '@/lib/utils'

export type StatusBadgeSize = 'sm' | 'md'

export type StatusBadgeProps = {
  status: string
  size?: StatusBadgeSize
  className?: string
}

type StatusTone = 'gray' | 'blue' | 'green' | 'red' | 'amber' | 'purple'

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase()
}

function resolveTone(status: string): StatusTone {
  const s = normalizeStatus(status)

  if (s === '草稿' || s === 'draft') return 'gray'
  if (
    s === '执行中' ||
    s === '进行中' ||
    s === 'processing' ||
    s.includes('执行中') ||
    s.includes('进行中')
  ) {
    return 'blue'
  }
  if (s === '已完成' || s === 'completed' || s.includes('已完成')) return 'green'
  if (s === '异常' || s === 'error' || s.includes('异常')) return 'red'
  if (s === '可用' || s === 'available' || s === '在线' || s.includes('在线')) return 'green'
  if (s === '可接单') return 'green'
  if (
    s === '不可用' ||
    s === 'unavailable' ||
    s === '离线' ||
    s.includes('离线') ||
    s.includes('不可用')
  ) {
    return 'red'
  }
  if (s === '活跃' || s === 'active') return 'green'
  if (s === '未启用' || s === 'inactive') return 'gray'
  if (s === '维护中' || s === 'maintenance') return 'amber'
  if (s === '忙碌' || s === 'busy' || s.includes('忙碌')) return 'amber'
  if (s === '待发布' || s.includes('待发布')) return 'purple'
  if (s === '已发布' || s.includes('已发布')) return 'green'

  return 'gray'
}

const toneClasses: Record<
  StatusTone,
  { bg: string; text: string; ring: string }
> = {
  gray: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    ring: 'ring-slate-200',
  },
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    ring: 'ring-blue-200',
  },
  green: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    ring: 'ring-emerald-200',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    ring: 'ring-red-200',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    ring: 'ring-amber-200',
  },
  purple: {
    bg: 'bg-violet-50',
    text: 'text-violet-800',
    ring: 'ring-violet-200',
  },
}

export function StatusBadge({
  status,
  size = 'md',
  className,
}: StatusBadgeProps): ReactElement {
  const tone = resolveTone(status)
  const styles = toneClasses[tone]

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-md font-medium ring-1 ring-inset',
        styles.bg,
        styles.text,
        styles.ring,
        size === 'sm' && 'px-1.5 py-0.5 text-xs',
        size === 'md' && 'px-2 py-0.5 text-sm',
        className,
      )}
    >
      <span className="truncate">{status}</span>
    </span>
  )
}
