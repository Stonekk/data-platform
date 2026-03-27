import type { ReactElement } from 'react'

import { cn } from '@/lib/utils'

export type ProgressBarColor = 'blue' | 'green' | 'orange' | 'red'
export type ProgressBarSize = 'sm' | 'md'

export type ProgressBarProps = {
  value: number
  label?: string
  color?: ProgressBarColor
  size?: ProgressBarSize
  className?: string
}

const colorBar: Record<ProgressBarColor, string> = {
  blue: 'bg-primary',
  green: 'bg-success',
  orange: 'bg-warning',
  red: 'bg-danger',
}

export function ProgressBar({
  value,
  label,
  color = 'blue',
  size = 'md',
  className,
}: ProgressBarProps): ReactElement {
  const clamped: number = Math.min(100, Math.max(0, value))

  return (
    <div className={cn('w-full', className)}>
      {(label !== undefined && label !== '') && (
        <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-medium text-text-secondary">
          <span>{label}</span>
          <span className="tabular-nums text-text">{Math.round(clamped)}%</span>
        </div>
      )}
      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-slate-200/80',
          size === 'sm' && 'h-1.5',
          size === 'md' && 'h-2.5',
        )}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-300 ease-out',
            colorBar[color],
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
