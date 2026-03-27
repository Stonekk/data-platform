import { useMemo, useState, type ReactElement } from 'react'

import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  SkipForward,
  XCircle,
} from 'lucide-react'

import { StatusBadge } from '@/components/ui'
import { mockPipelineStages, type PipelineStage } from '@/data/mock'
import { cn } from '@/lib/utils'

const PIPELINE_IDS = ['ds-001', 'ds-004'] as const

function pipelineLabel(id: string): string {
  if (id === 'ds-001') return '商超拣货动捕基准库 (ds-001)'
  if (id === 'ds-004') return '乒乓球动捕高速 (ds-004)'
  return id
}

function stageStatusLabel(status: PipelineStage['status']): string {
  switch (status) {
    case 'completed':
      return '已完成'
    case 'running':
      return '运行中'
    case 'pending':
      return '待处理'
    case 'failed':
      return '失败'
    case 'skipped':
      return '已跳过'
    default:
      return status
  }
}

function stageStatusBadgeClass(status: PipelineStage['status']): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200'
    case 'running':
      return 'bg-blue-50 text-blue-800 ring-blue-200'
    case 'pending':
      return 'bg-slate-100 text-slate-700 ring-slate-200'
    case 'failed':
      return 'bg-red-50 text-red-800 ring-red-200'
    case 'skipped':
      return 'bg-slate-100 text-slate-600 ring-slate-200'
    default:
      return ''
  }
}

function StageStatusIcon({
  status,
}: {
  status: PipelineStage['status']
}): ReactElement {
  const common = 'size-6 shrink-0'
  switch (status) {
    case 'completed':
      return (
        <CheckCircle2
          className={cn(common, 'text-emerald-600')}
          strokeWidth={1.75}
          aria-hidden
        />
      )
    case 'running':
      return (
        <Loader2
          className={cn(common, 'animate-spin text-blue-600')}
          strokeWidth={1.75}
          aria-hidden
        />
      )
    case 'pending':
      return (
        <Clock
          className={cn(common, 'text-slate-400')}
          strokeWidth={1.75}
          aria-hidden
        />
      )
    case 'failed':
      return (
        <XCircle
          className={cn(common, 'text-red-600')}
          strokeWidth={1.75}
          aria-hidden
        />
      )
    case 'skipped':
      return (
        <SkipForward
          className={cn(common, 'text-slate-400')}
          strokeWidth={1.75}
          aria-hidden
        />
      )
    default:
      return (
        <Clock className={cn(common, 'text-slate-400')} aria-hidden />
      )
  }
}

function stageCardBorder(status: PipelineStage['status']): string {
  switch (status) {
    case 'completed':
      return 'border-emerald-300 ring-emerald-500/15'
    case 'running':
      return 'border-blue-400 ring-blue-500/20 motion-safe:animate-pulse'
    case 'pending':
      return 'border-slate-200'
    case 'failed':
      return 'border-red-300 ring-red-500/15'
    case 'skipped':
      return 'border-slate-300 border-dashed'
    default:
      return 'border-border'
  }
}

export default function Processing(): React.ReactElement {
  const [activePipeline, setActivePipeline] =
    useState<(typeof PIPELINE_IDS)[number]>('ds-001')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0)

  const stages = useMemo(
    () => mockPipelineStages.filter((s) => s.datasetId === activePipeline),
    [activePipeline],
  )

  const selectedStage: PipelineStage | null =
    selectedIndex !== null && selectedIndex >= 0 && selectedIndex < stages.length
      ? stages[selectedIndex]!
      : null

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          数据处理流水线
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          按数据集查看加工阶段：原始数据入库 → 多模态对齐 → 粗剪与分段 → Clip 生成 →
          标注任务派发 → 归档存储
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {PIPELINE_IDS.map((id) => {
          const active = id === activePipeline
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActivePipeline(id)
                setSelectedIndex(0)
              }}
              className={cn(
                'rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition',
                active
                  ? 'border-primary bg-card text-text shadow-sm ring-2 ring-primary/25'
                  : 'border-border bg-white text-text-secondary hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              <span className="block font-mono text-xs text-text-secondary">
                {id}
              </span>
              <span className="mt-0.5 block">{pipelineLabel(id)}</span>
            </button>
          )
        })}
      </div>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm ring-1 ring-slate-950/5 sm:p-6">
        <h2 className="sr-only">流水线阶段</h2>
        <div className="flex flex-wrap items-stretch justify-center gap-2 md:gap-1">
          {stages.map((stage, index) => {
            const prev = index > 0 ? stages[index - 1] : undefined
            const arrowSolid = prev?.status === 'completed'
            const isSelected = selectedIndex === index

            return (
              <div
                key={`${activePipeline}-${stage.name}-${index}`}
                className="flex flex-wrap items-center gap-2"
              >
                {index > 0 && (
                  <ArrowRight
                    className={cn(
                      'size-6 shrink-0',
                      arrowSolid ? 'text-emerald-600' : 'text-slate-300',
                    )}
                    strokeDasharray={arrowSolid ? undefined : 4}
                    strokeWidth={arrowSolid ? 2.25 : 2}
                    aria-hidden
                  />
                )}
                <button
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  className={cn(
                    'w-full min-w-[140px] max-w-[200px] rounded-xl border bg-white p-4 text-left shadow-sm ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:w-auto',
                    stageCardBorder(stage.status),
                    isSelected && 'ring-2 ring-primary/35',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <StageStatusIcon status={stage.status} />
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-sm font-semibold leading-snug text-text">
                        {stage.name}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary">
                        <span>处理 {stage.count.toLocaleString()} 条</span>
                        <span className="tabular-nums">{stage.duration}</span>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {selectedStage !== null && (
        <section
          className="rounded-xl border border-border bg-card p-6 shadow-sm ring-1 ring-slate-950/5"
          aria-live="polite"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-text">
                {selectedStage.name}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  status={stageStatusLabel(selectedStage.status)}
                  className={cn(
                    'ring-1 ring-inset',
                    stageStatusBadgeClass(selectedStage.status),
                  )}
                />
                <span className="text-sm text-text-secondary">
                  已处理{' '}
                  <span className="font-medium tabular-nums text-text">
                    {selectedStage.count.toLocaleString()}
                  </span>{' '}
                  条 · 耗时{' '}
                  <span className="font-medium text-text">
                    {selectedStage.duration}
                  </span>
                </span>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-text shadow-sm transition hover:bg-slate-50"
            >
              查看日志
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
