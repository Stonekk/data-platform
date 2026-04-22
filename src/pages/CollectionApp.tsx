import { useMemo, useState, type ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { Bug, ClipboardList, Smartphone } from 'lucide-react'

import {
  DataTable,
  type DataTableColumn,
  Modal,
  ProgressBar,
  StatusBadge,
} from '@/components/ui'
import {
  mockCollectionSessions,
  mockIssueReports,
  type CollectionSession,
  type IssueReport,
} from '@/data/mock'
import { cn } from '@/lib/utils'

function collectionStatusLabel(status: CollectionSession['status']): string {
  switch (status) {
    case 'idle':
      return '空闲'
    case 'collecting':
      return '采集中'
    case 'paused':
      return '暂停'
    case 'completed':
      return '已完成'
    case 'failed':
      return '失败'
    default:
      return status
  }
}

function sessionProgressColor(
  status: CollectionSession['status'],
): 'blue' | 'green' | 'orange' | 'red' {
  if (status === 'failed') return 'red'
  if (status === 'paused') return 'orange'
  if (status === 'completed' || status === 'collecting') return 'green'
  return 'blue'
}

function issueSeverityClass(level: IssueReport['severity']): string {
  if (level === 'critical') return 'bg-rose-100 text-rose-900 ring-rose-300'
  if (level === 'high') return 'bg-rose-50 text-rose-800 ring-rose-200'
  if (level === 'medium') return 'bg-amber-50 text-amber-900 ring-amber-200'
  return 'bg-slate-100 text-slate-700 ring-slate-200'
}

const ISSUE_SEVERITY_LABEL: Record<IssueReport['severity'], string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '紧急',
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function CollectionApp(): ReactElement {
  const appSessions = useMemo(
    () =>
      mockCollectionSessions.filter(
        (s) =>
          s.status === 'collecting' || s.status === 'paused' || s.status === 'failed',
      ),
    [],
  )
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    () => appSessions[0]?.id ?? '',
  )
  const [issueReports, setIssueReports] = useState<IssueReport[]>(() =>
    mockIssueReports
      .filter((i) => i.source === 'collection-app')
      .map((i) => ({ ...i })),
  )
  const [issueDraft, setIssueDraft] = useState<{
    sessionId: string
    severity: IssueReport['severity']
    title: string
    description: string
    reporter: string
  } | null>(null)

  const selectedSession = useMemo(
    () => appSessions.find((s) => s.id === selectedSessionId) ?? appSessions[0] ?? null,
    [appSessions, selectedSessionId],
  )

  function openIssueModal(sessionId: string): void {
    setIssueDraft({
      sessionId,
      severity: 'medium',
      title: `采集异常提报 · ${sessionId}`,
      description: '',
      reporter: '现场采集员',
    })
  }

  function submitIssue(): void {
    if (issueDraft === null) return
    if (issueDraft.title.trim() === '' || issueDraft.description.trim() === '') return
    const nextId = `issue-${String(issueReports.length + 1).padStart(3, '0')}`
    setIssueReports((prev) => [
      {
        id: nextId,
        source: 'collection-app',
        status: 'open',
        severity: issueDraft.severity,
        title: issueDraft.title.trim(),
        description: issueDraft.description.trim(),
        sessionId: issueDraft.sessionId,
        reporter: issueDraft.reporter.trim() || '现场采集员',
        reportedAt: new Date().toISOString(),
      },
      ...prev,
    ])
    setIssueDraft(null)
  }

  const issueColumns: DataTableColumn<IssueReport>[] = [
    { key: 'id', title: '问题ID' },
    {
      key: 'severity',
      title: '级别',
      render: (row) => (
        <span
          className={cn(
            'inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset',
            issueSeverityClass(row.severity),
          )}
        >
          {ISSUE_SEVERITY_LABEL[row.severity]}
        </span>
      ),
    },
    {
      key: 'status',
      title: '状态',
      render: (row) => (
        <StatusBadge
          status={
            row.status === 'open'
              ? '待处理'
              : row.status === 'processing'
                ? '处理中'
                : '已解决'
          }
          size="sm"
        />
      ),
    },
    { key: 'title', title: '标题' },
    {
      key: 'sessionId',
      title: '会话',
      render: (row) => (
        <span className="font-mono text-xs text-text-secondary">
          {row.sessionId ?? '—'}
        </span>
      ),
    },
    {
      key: 'reportedAt',
      title: '提报时间',
      render: (row) => formatDateTime(row.reportedAt),
    },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight text-text">
            <Smartphone className="size-6 text-primary" strokeWidth={1.75} />
            采集 App 演示页
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            独立于平台端的采集执行与一键问题提报入口
          </p>
        </div>
        <Link
          to="/collection"
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-secondary hover:bg-slate-50"
        >
          返回平台采集总览
        </Link>
      </header>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <section className="rounded-3xl border-8 border-slate-900 bg-slate-950 p-3 shadow-xl">
          <div className="rounded-[1.6rem] bg-slate-50 p-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">采集会话</h3>
              <button
                type="button"
                onClick={() => selectedSession && openIssueModal(selectedSession.id)}
                className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-1 text-[11px] font-medium text-white hover:bg-amber-600"
              >
                <Bug className="size-3.5" strokeWidth={1.75} aria-hidden />
                一键提报
              </button>
            </div>
            <div className="space-y-2">
              {appSessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSessionId(s.id)}
                  className={cn(
                    'w-full rounded-xl border px-3 py-2 text-left text-xs',
                    selectedSessionId === s.id
                      ? 'border-primary bg-primary/[0.06]'
                      : 'border-border bg-white hover:bg-slate-50',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-text">{s.id}</span>
                    <StatusBadge status={collectionStatusLabel(s.status)} size="sm" />
                  </div>
                  <p className="mt-1 truncate text-text-secondary">{s.device}</p>
                  <div className="mt-1">
                    <ProgressBar
                      value={s.progress}
                      color={sessionProgressColor(s.status)}
                      size="sm"
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-text">当前会话</h3>
            {selectedSession ? (
              <div className="space-y-2 text-sm text-text-secondary">
                <p>
                  设备：<span className="font-medium text-text">{selectedSession.device}</span>
                </p>
                <p>
                  会话：
                  <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">
                    {selectedSession.id}
                  </span>
                </p>
                <p>
                  状态：
                  <StatusBadge
                    status={collectionStatusLabel(selectedSession.status)}
                    size="sm"
                    className="ml-1"
                  />
                </p>
                {selectedSession.anomalies.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <p className="mb-1 font-medium">异常提示</p>
                    <ul className="list-inside list-disc space-y-0.5">
                      {selectedSession.anomalies.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">暂无可演示会话</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-text">
              <ClipboardList className="size-4 text-primary" strokeWidth={1.75} />
              问题提报列表
            </h3>
            <DataTable columns={issueColumns} data={issueReports} />
          </div>
        </section>
      </div>

      <Modal
        isOpen={issueDraft !== null}
        onClose={() => setIssueDraft(null)}
        title={issueDraft ? '采集 App 一键问题提报' : '问题提报'}
        size="md"
      >
        {issueDraft && (
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-text-secondary">会话ID</span>
              <input
                value={issueDraft.sessionId}
                onChange={(e) =>
                  setIssueDraft((prev) =>
                    prev ? { ...prev, sessionId: e.target.value } : prev,
                  )
                }
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-text-secondary">严重级别</span>
              <select
                value={issueDraft.severity}
                onChange={(e) =>
                  setIssueDraft((prev) =>
                    prev
                      ? { ...prev, severity: e.target.value as IssueReport['severity'] }
                      : prev,
                  )
                }
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="critical">紧急</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-text-secondary">标题</span>
              <input
                value={issueDraft.title}
                onChange={(e) =>
                  setIssueDraft((prev) =>
                    prev ? { ...prev, title: e.target.value } : prev,
                  )
                }
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-text-secondary">问题描述</span>
              <textarea
                rows={4}
                value={issueDraft.description}
                onChange={(e) =>
                  setIssueDraft((prev) =>
                    prev ? { ...prev, description: e.target.value } : prev,
                  )
                }
                placeholder="例如：采集中断、镜头遮挡、设备过热、网络波动..."
                className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-text-secondary">提报人</span>
              <input
                value={issueDraft.reporter}
                onChange={(e) =>
                  setIssueDraft((prev) =>
                    prev ? { ...prev, reporter: e.target.value } : prev,
                  )
                }
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2"
              />
            </label>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIssueDraft(null)}
                className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={submitIssue}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                <Bug className="size-4" strokeWidth={1.75} />
                提交问题
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
