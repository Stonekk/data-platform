import type { ReactElement } from 'react'

import { cn } from '@/lib/utils'

export type SkeletonVariant = 'text' | 'card' | 'chart'

export type SkeletonProps = {
  className?: string
  variant?: SkeletonVariant
}

export function Skeleton({
  className,
  variant = 'text',
}: SkeletonProps): ReactElement {
  const base: string = 'animate-pulse rounded-md bg-slate-200/90'

  if (variant === 'text') {
    return (
      <div
        className={cn(base, 'h-4 w-full max-w-md', className)}
        aria-hidden
      />
    )
  }

  if (variant === 'card') {
    return (
      <div
        className={cn(
          base,
          'flex h-32 w-full flex-col gap-3 p-4 ring-1 ring-slate-200/80',
          className,
        )}
        aria-hidden
      >
        <div className="h-3 w-1/3 rounded bg-slate-200/90" />
        <div className="h-8 w-2/3 rounded bg-slate-200/90" />
        <div className="mt-auto h-2 w-full rounded bg-slate-200/90" />
      </div>
    )
  }

  return (
    <div
      className={cn(base, 'h-48 w-full rounded-xl', className)}
      aria-hidden
    />
  )
}
