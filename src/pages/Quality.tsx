import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Package,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  DataTable,
  type DataTableColumn,
  Modal,
  ProgressBar,
  StatusBadge,
  Tabs,
  type TabItem,
} from '@/components/ui'
import {
  dataQualityOverview,
  mockDatasets,
  mockQualityResults,
  type Dataset,
  type QualityResult,
} from '@/data/mock'
import { cn } from '@/lib/utils'

const MAIN_TABS: TabItem[] = [
  { key: 'quality', label: '数据质量' },
  { key: 'release', label: '数据准出' },
]

const DATASET_STATUS_LABEL: Record<Dataset['status'], string> = {
  draft: '草稿',
  reviewing: '审核中',
  published: '已发布',
  deprecated: '已废弃',
}

const barChartData = dataQualityOverview.topIssueCategories.map((c) => ({
  name: c.label,
  count: c.count,
}))

function passRateClass(rate: number): string {
  if (rate >= 95) return 'font-semibold text-emerald-600'
  if (rate >= 85) return 'font-semibold text-amber-600'
  return 'font-semibold text-red-600'
}

function formatDateTime(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function Quality() {
  const [mainTab, setMainTab] = useState<string>('quality')
  const [datasets, setDatasets] = useState<Dataset[]>(() => [...mockDatasets])
  const [publishTarget, setPublishTarget] = useState<Dataset | null>(null)

  const qualityColumns: DataTableColumn<QualityResult>[] = [
    { key: 'id', title: 'ID' },
    { key: 'dataset', title: '数据集' },
    {
      key: 'passRate',
      title: '合格率',
      render: (row) => (
        <span className={cn('tabular-nums', passRateClass(row.passRate))}>
          {row.passRate.toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'issues',
      title: '问题列表',
      render: (row) =>
        row.issues.length ? (
          <ul className="max-w-md list-inside list-disc text-sm text-text-secondary">
            {row.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : (
          <span className="text-sm text-text-secondary">无</span>
        ),
    },
    {
      key: 'checkTime',
      title: '检测时间',
      render: (row) => (
        <span className="tabular-nums text-text-secondary">
          {formatDateTime(row.checkTime)}
        </span>
      ),
    },
  ]

  const datasetColumns: DataTableColumn<Dataset>[] = [
    { key: 'id', title: 'ID' },
    { key: 'name', title: '名称' },
    { key: 'version', title: '版本号' },
    { key: 'size', title: '数据量' },
    {
      key: 'records',
      title: '记录数',
      render: (row) => (
        <span className="tabular-nums">{row.records.toLocaleString('zh-CN')}</span>
      ),
    },
    {
      key: 'status',
      title: '状态',
      render: (row) => (
        <StatusBadge status={DATASET_STATUS_LABEL[row.status]} size="sm" />
      ),
    },
    {
      key: 'createdAt',
      title: '创建时间',
      render: (row) => (
        <span className="tabular-nums text-text-secondary">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (row) => {
        if (row.status === 'published') {
          return <StatusBadge status="已发布" size="sm" />
        }
        if (row.status === 'deprecated') {
          return <StatusBadge status="已废弃" size="sm" />
        }
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setPublishTarget(row)
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:opacity-95"
          >
            <Upload className="size-3.5" aria-hidden />
            发布
          </button>
        )
      },
    },
  ]

  function confirmPublish(): void {
    if (publishTarget === null) return
    setDatasets((prev) =>
      prev.map((d) =>
        d.id === publishTarget.id ? { ...d, status: 'published' } : d,
      ),
    )
    setPublishTarget(null)
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-border pb-5">
        <h1 className="text-xl font-semibold tracking-tight text-text md:text-2xl">
          数据质量与准出
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          质检结果概览与数据集发布流程（演示）
        </p>
      </header>

      <Tabs tabs={MAIN_TABS} activeTab={mainTab} onChange={setMainTab} />

      {mainTab === 'quality' && (
        <div className="space-y-6">
          <section
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            aria-label="质量概览"
          >
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm ring-1 ring-slate-950/5">
              <div className="flex items-center gap-2 text-text-secondary">
                <ShieldCheck className="size-4" aria-hidden />
                <span className="text-xs font-medium">整体合格率</span>
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-text">
                {dataQualityOverview.overallPassRate}%
              </p>
              <div className="mt-3">
                <ProgressBar
                  value={dataQualityOverview.overallPassRate}
                  color="green"
                  size="sm"
                />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm ring-1 ring-slate-950/5">
              <div className="flex items-center gap-2 text-text-secondary">
                <Package className="size-4" aria-hidden />
                <span className="text-xs font-medium">24h 检测次数</span>
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-text">
                {dataQualityOverview.autoDetectionRuns24h}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm ring-1 ring-slate-950/5">
              <div className="flex items-center gap-2 text-text-secondary">
                <AlertTriangle className="size-4 text-amber-600" aria-hidden />
                <span className="text-xs font-medium">未解决严重问题</span>
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-red-600">
                {dataQualityOverview.criticalIssuesOpen}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm ring-1 ring-slate-950/5">
              <div className="flex items-center gap-2 text-text-secondary">
                <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
                <span className="text-xs font-medium">昨日解决</span>
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-text">
                {dataQualityOverview.resolvedYesterday}
              </p>
            </div>
          </section>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm ring-1 ring-slate-950/5">
            <h2 className="text-base font-semibold text-text">高发问题类别</h2>
            <p className="mt-0.5 text-sm text-text-secondary">
              近周期自动检测归类统计
            </p>
            <div className="mt-4 h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                    }}
                  />
                  <Bar dataKey="count" name="次数" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-text">质检结果明细</h2>
            <DataTable<QualityResult>
              columns={qualityColumns}
              data={mockQualityResults}
            />
          </div>
        </div>
      )}

      {mainTab === 'release' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-slate-50/80 p-4">
            <Package className="mt-0.5 size-5 text-primary" aria-hidden />
            <div>
              <p className="text-sm font-medium text-text">数据准出</p>
              <p className="mt-1 text-sm text-text-secondary">
                草稿或审核中的数据集可模拟发布；已发布与已废弃状态以徽章展示。
              </p>
            </div>
          </div>
          <DataTable<Dataset> columns={datasetColumns} data={datasets} />
        </div>
      )}

      <Modal
        isOpen={publishTarget !== null}
        onClose={() => setPublishTarget(null)}
        title="确认发布"
        size="sm"
      >
        {publishTarget !== null && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              确定将数据集{' '}
              <span className="font-semibold text-text">
                {publishTarget.name} {publishTarget.version}
              </span>{' '}
              发布为「已发布」状态吗？此操作为演示，仅更新本地状态。
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPublishTarget(null)}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text shadow-sm transition hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmPublish}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-95"
              >
                确认发布
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
