import { useMemo, useState } from 'react'
import { CheckCircle2, Pause, Play, Tag } from 'lucide-react'

import {
  DataTable,
  type DataTableColumn,
  Modal,
  ProgressBar,
  StatusBadge,
  Tabs,
  type TabItem,
} from '@/components/ui'
import { mockAnnotationTasks, type AnnotationTask } from '@/data/mock'
import { cn } from '@/lib/utils'

const TAB_ITEMS: TabItem[] = [
  { key: 'all', label: '全部' },
  { key: 'not-started', label: '未开始' },
  { key: 'in-progress', label: '进行中' },
  { key: 'completed', label: '已完成' },
]

const STATUS_LABEL: Record<AnnotationTask['status'], string> = {
  'not-started': '未开始',
  'in-progress': '进行中',
  completed: '已完成',
}

function progressColor(
  status: AnnotationTask['status'],
): 'blue' | 'green' | 'orange' {
  if (status === 'completed') return 'green'
  if (status === 'in-progress') return 'blue'
  return 'orange'
}

export default function Annotation() {
  const [tab, setTab] = useState<string>('all')
  const [workspaceTask, setWorkspaceTask] = useState<AnnotationTask | null>(
    null,
  )
  const [simPlaying, setSimPlaying] = useState<boolean>(false)

  const filtered = useMemo(() => {
    if (tab === 'all') return mockAnnotationTasks
    return mockAnnotationTasks.filter((t) => t.status === tab)
  }, [tab])

  const columns: DataTableColumn<AnnotationTask>[] = useMemo(
    () => [
      { key: 'id', title: 'ID' },
      { key: 'dataset', title: '数据集' },
      {
        key: 'type',
        title: '类型',
        render: (row) => (
          <span className="inline-flex items-center gap-1.5">
            <Tag className="size-3.5 shrink-0 text-text-secondary" aria-hidden />
            <span>{row.type}</span>
          </span>
        ),
      },
      { key: 'assignee', title: '标注组' },
      {
        key: 'status',
        title: '状态',
        render: (row) => (
          <StatusBadge status={STATUS_LABEL[row.status]} size="sm" />
        ),
      },
      {
        key: 'progress',
        title: '进度',
        render: (row) => (
          <div className="min-w-[140px] max-w-[220px]">
            <ProgressBar
              value={row.progress}
              color={progressColor(row.status)}
              size="sm"
            />
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <header className="border-b border-border pb-5">
        <h1 className="text-xl font-semibold tracking-tight text-text md:text-2xl">
          数据标注
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          标注任务管理与模拟标注工作台
        </p>
      </header>

      <Tabs tabs={TAB_ITEMS} activeTab={tab} onChange={setTab} />

      <DataTable<AnnotationTask>
        columns={columns}
        data={filtered}
        onRowClick={(row) => {
          setWorkspaceTask(row)
          setSimPlaying(false)
        }}
      />

      <Modal
        isOpen={workspaceTask !== null}
        onClose={() => {
          setWorkspaceTask(null)
          setSimPlaying(false)
        }}
        title="标注工作台（演示）"
        size="lg"
      >
        {workspaceTask !== null && (
          <div className="flex min-h-[min(52vh,420px)] flex-col gap-4 lg:flex-row lg:gap-0">
            <div
              className={cn(
                'flex min-h-[220px] flex-[3] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-slate-200/90 lg:rounded-r-none lg:border-r-0',
              )}
            >
              <button
                type="button"
                onClick={() => setSimPlaying((p) => !p)}
                className="flex size-16 items-center justify-center rounded-full bg-slate-400/80 text-white shadow-md transition hover:bg-slate-500"
                aria-label={simPlaying ? '暂停预览' : '播放预览'}
              >
                {simPlaying ? (
                  <Pause className="size-8" strokeWidth={1.75} />
                ) : (
                  <Play className="size-8 pl-1" strokeWidth={1.75} />
                )}
              </button>
              <p className="text-sm font-medium text-slate-600">视频预览区域</p>
            </div>

            <div
              className={cn(
                'flex flex-[2] flex-col gap-4 rounded-xl border border-border bg-card p-4 lg:rounded-l-none lg:border-l-0',
              )}
            >
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                  数据集
                </p>
                <p className="mt-1 text-sm font-semibold text-text">
                  {workspaceTask.dataset}
                </p>
                <p className="mt-2 text-xs text-text-secondary">
                  任务类型：{workspaceTask.type}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    '标记起点',
                    '标记终点',
                    '添加关键帧',
                    '标记异常',
                  ] as const
                ).map((label) => (
                  <button
                    key={label}
                    type="button"
                    className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-xs font-medium text-text transition hover:bg-primary/5 hover:ring-1 hover:ring-primary/20"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-text-secondary">
                  当前进度
                </p>
                <ProgressBar
                  value={workspaceTask.progress}
                  color={progressColor(workspaceTask.status)}
                />
              </div>

              <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text shadow-sm transition hover:bg-slate-50"
                >
                  <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
                  保存标注
                </button>
                <button
                  type="button"
                  className="inline-flex flex-1 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-95"
                >
                  提交
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
