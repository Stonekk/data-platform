import type { LucideIcon } from 'lucide-react'
import type { ReactElement } from 'react'

import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

import { cn } from '@/lib/utils'

export type StatCardProps = {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: number
  className?: string
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  className,
}: StatCardProps): ReactElement {
  const trendUp: boolean | null =
    trend === undefined ? null : trend >= 0

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-5 shadow-sm ring-1 ring-slate-950/5',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm font-medium tracking-wide text-text-secondary">
            {title}
          </p>
          <p className="truncate text-2xl font-semibold tabular-nums tracking-tight text-text">
            {value}
          </p>
          {trend !== undefined && (
            <div className="flex items-center gap-1.5 text-sm">
              {trendUp ? (
                <ArrowUpRight
                  className="size-4 shrink-0 text-success"
                  aria-hidden
                />
              ) : (
                <ArrowDownRight
                  className="size-4 shrink-0 text-danger"
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  'font-medium tabular-nums',
                  trendUp ? 'text-success' : 'text-danger',
                )}
              >
                {trendUp ? '+' : ''}
                {trend.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden
        >
          <Icon className="size-5" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  )
}
