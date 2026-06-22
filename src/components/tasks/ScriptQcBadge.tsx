import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import type { ReactElement } from 'react'

import type { ScriptGenerationMeta } from '@/data/mock'
import { cn } from '@/lib/utils'

type ScriptQcBadgeProps = {
  meta?: ScriptGenerationMeta
  /** list = 列表紧凑；detail = 详情区醒目 */
  variant?: 'list' | 'detail'
  className?: string
}

export function ScriptQcBadge({
  meta,
  variant = 'list',
  className,
}: ScriptQcBadgeProps): ReactElement | null {
  if (!meta) return null

  if (meta.passed === false) {
    if (variant === 'detail') {
      return (
        <div
          className={cn(
            'rounded-lg border-2 border-rose-300 bg-rose-50 px-3 py-2.5',
            className,
          )}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-900">
            <XCircle className="size-4 shrink-0" />
            未通过 L1 硬规则质检
          </div>
          {meta.rejectReason && (
            <p className="mt-1.5 text-sm leading-relaxed text-rose-800">{meta.rejectReason}</p>
          )}
          <p className="mt-1 text-xs text-rose-700/90">
            建议直接剔除；若仍要使用，请人工改写后确认。
          </p>
        </div>
      )
    }

    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-900 ring-1 ring-inset ring-rose-300',
          className,
        )}
      >
        <XCircle className="size-3 shrink-0" />
        未过质检
      </span>
    )
  }

  if (variant === 'detail') {
    return (
      <div
        className={cn(
          'rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5',
          className,
        )}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-emerald-900">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="size-4 shrink-0" />
            通过 L1 硬规则质检
          </span>
          {meta.score !== undefined && (
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold tabular-nums">
              评分 {meta.score}
            </span>
          )}
          <span className="text-xs text-emerald-800/80">
            生成：{meta.mode} · {meta.durationMs}ms
          </span>
        </div>
      </div>
    )
  }

  if (meta.score !== undefined) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-emerald-900 ring-1 ring-inset ring-emerald-200',
          className,
        )}
      >
        <CheckCircle2 className="size-3 shrink-0" />
        {meta.score} 分
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800',
        className,
      )}
    >
      <CheckCircle2 className="size-3 shrink-0" />
      通过
    </span>
  )
}

type ScriptQcSummaryBarProps = {
  passed: number
  failed: number
  className?: string
}

export function ScriptQcSummaryBar({
  passed,
  failed,
  className,
}: ScriptQcSummaryBarProps): ReactElement | null {
  if (passed + failed === 0) return null

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs',
        className,
      )}
    >
      <span className="font-medium text-text">L1 质检摘要</span>
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">
        <CheckCircle2 className="size-3" />
        {passed} 通过
      </span>
      {failed > 0 && (
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 font-semibold text-rose-800">
          <AlertTriangle className="size-3" />
          {failed} 未过质检
        </span>
      )}
      <span className="text-text-secondary">排序：通过优先，同组按评分从高到低</span>
    </div>
  )
}
