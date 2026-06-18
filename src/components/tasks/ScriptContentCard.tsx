import type { ReactElement } from 'react'

import type { Prop, TaskScript } from '@/data/mock'
import { atomicActionLabels, propLabels, scriptSummary } from '@/lib/scriptWorkflow'
import { cn } from '@/lib/utils'

const DIFFICULTY_LABEL = {
  simple: '简单',
  complex: '复杂',
  correction: '纠错',
} as const

type ScriptContentCardProps = {
  script: TaskScript
  props?: Prop[]
  compact?: boolean
  summaryOnly?: boolean
  className?: string
}

export function ScriptContentCard({
  script,
  props,
  compact = false,
  summaryOnly = false,
  className,
}: ScriptContentCardProps): ReactElement {
  if (summaryOnly) {
    const summaryTitle = script.renderedCard
      ? (script.card?.title ?? script.title.replace(/ · 方案\d+$/, ''))
      : script.title.replace(/ · 方案\d+$/, '')
    return (
      <div className={cn('px-3 py-2 text-xs', className)}>
        <p className="font-medium text-text">{summaryTitle}</p>
        <p className="mt-0.5 text-text-secondary">
          {script.renderedCard
            ? `四段式任务卡片 · ${scriptSummary(script)}`
            : `${DIFFICULTY_LABEL[script.difficulty]} · ${scriptSummary(script)}`}{' '}
          · 道具：
          {propLabels(script.propIds, props)}
        </p>
      </div>
    )
  }

  if (script.renderedCard) {
    return (
      <div className={cn('rounded-lg border border-border bg-white', compact ? 'p-3 text-xs' : 'p-4 text-sm', className)}>
        <pre className={cn('whitespace-pre-wrap font-sans text-text-secondary', compact && 'text-[11px]')}>
          {script.renderedCard}
        </pre>
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border border-border bg-white', compact ? 'p-3 text-xs' : 'p-4 text-sm', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <p className={cn('font-medium text-text', compact && 'text-xs')}>{script.title}</p>
        <span
          className={cn(
            'rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
            script.status === 'confirmed'
              ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
              : 'bg-amber-50 text-amber-900 ring-amber-200',
          )}
        >
          {script.status === 'confirmed' ? '已确认绑定' : '待确认'}
        </span>
      </div>
      <p className={cn('mt-1 text-text-secondary', compact && 'text-[11px]')}>
        {DIFFICULTY_LABEL[script.difficulty]} · 道具：{propLabels(script.propIds, props)} · 动作：
        {atomicActionLabels(script.atomicActionIds ?? [])}
      </p>
      <p className={cn('mt-2 rounded-md bg-slate-50 px-2 py-1.5 text-text-secondary whitespace-pre-wrap', compact && 'text-[11px]')}>
        {script.renderedCard ?? script.instruction}
      </p>
      {!script.renderedCard && script.steps.length > 0 && (
        <ol className={cn('mt-2 list-decimal space-y-1 pl-4 text-text-secondary', compact && 'text-[11px]')}>
          {script.steps.map((step) => (
            <li key={step.order}>
              {step.operation}
              <span className="ml-1 text-text-secondary/80">（约 {step.durationMinutes} 分钟）</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
