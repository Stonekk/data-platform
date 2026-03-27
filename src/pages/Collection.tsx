import { useCallback, useEffect, useState, type ReactElement } from 'react'

import {
  AlertTriangle,
  CheckCircle2,
  Radio,
  RefreshCw,
  Upload,
  Wifi,
  WifiOff,
} from 'lucide-react'

import { ProgressBar, StatusBadge } from '@/components/ui'
import {
  collectionTransmissionSummary,
  mockCollectionSessions,
  mockTransmissionRecords,
  type CollectionSession,
  type TransmissionRecord,
} from '@/data/mock'
import { cn } from '@/lib/utils'

function cloneSessions(source: CollectionSession[]): CollectionSession[] {
  return source.map((s) => ({ ...s, anomalies: [...s.anomalies] }))
}

function cloneRecords(source: TransmissionRecord[]): TransmissionRecord[] {
  return source.map((r) => ({ ...r }))
}

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

function collectionBadgeClass(status: CollectionSession['status']): string {
  switch (status) {
    case 'collecting':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200'
    case 'idle':
      return 'bg-slate-100 text-slate-700 ring-slate-200'
    case 'paused':
      return 'bg-amber-50 text-amber-900 ring-amber-200'
    case 'completed':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200'
    case 'failed':
      return 'bg-red-50 text-red-800 ring-red-200'
    default:
      return ''
  }
}

function transmissionStateLabel(state: TransmissionRecord['state']): string {
  switch (state) {
    case 'synced':
      return '已同步'
    case 'syncing':
      return '同步中'
    case 'queued':
      return '排队中'
    case 'failed':
      return '失败'
    case 'offline':
      return '离线'
    default:
      return state
  }
}

function transmissionBadgeClass(state: TransmissionRecord['state']): string {
  switch (state) {
    case 'synced':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200'
    case 'syncing':
      return 'bg-blue-50 text-blue-800 ring-blue-200'
    case 'queued':
    case 'offline':
      return 'bg-slate-100 text-slate-700 ring-slate-200'
    case 'failed':
      return 'bg-red-50 text-red-800 ring-red-200'
    default:
      return ''
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

function recordProgressColor(
  state: TransmissionRecord['state'],
): 'blue' | 'green' | 'orange' | 'red' {
  if (state === 'failed') return 'red'
  if (state === 'syncing') return 'blue'
  if (state === 'synced') return 'green'
  return 'blue'
}

export default function Collection(): ReactElement {
  const [sessions, setSessions] = useState<CollectionSession[]>(() =>
    cloneSessions(mockCollectionSessions),
  )
  const [records, setRecords] = useState<TransmissionRecord[]>(() =>
    cloneRecords(mockTransmissionRecords),
  )
  const resetFromMock = useCallback(() => {
    setSessions(cloneSessions(mockCollectionSessions))
    setRecords(cloneRecords(mockTransmissionRecords))
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      const delta = (): number => 1 + Math.floor(Math.random() * 5)

      setSessions((prev) =>
        prev.map((s) => {
          if (s.status !== 'collecting' || s.progress >= 100) return s
          return { ...s, progress: Math.min(100, s.progress + delta()) }
        }),
      )
      setRecords((prev) =>
        prev.map((r) => {
          if (r.state !== 'syncing' || r.progress >= 100) return r
          return { ...r, progress: Math.min(100, r.progress + delta()) }
        }),
      )
    }, 3000)

    return () => window.clearInterval(interval)
  }, [])

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            数据采集与传输
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            会话状态、边缘回传与中心同步一览（演示数据 + 实时进度模拟）
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-secondary shadow-sm">
            <span
              className="size-2 rounded-full bg-emerald-500 motion-safe:animate-pulse"
              aria-hidden
            />
            自动刷新 · 每 3 秒
          </span>
          <button
            type="button"
            onClick={resetFromMock}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-text shadow-sm ring-1 ring-slate-950/5 transition hover:bg-slate-50"
          >
            <RefreshCw className="size-4" strokeWidth={1.75} aria-hidden />
            刷新
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            {
              title: '采集在线率',
              value: `${collectionTransmissionSummary.onlineRatePercent}%`,
              icon: Wifi,
            },
            {
              title: '活跃会话',
              value: collectionTransmissionSummary.activeSessions,
              icon: Radio,
            },
            {
              title: '传输中',
              value: collectionTransmissionSummary.syncingCount,
              icon: Upload,
            },
            {
              title: '24h 失败',
              value: collectionTransmissionSummary.failedLast24h,
              icon: AlertTriangle,
            },
          ] as const
        ).map(({ title, value, icon: Icon }) => (
          <div
            key={title}
            className="rounded-xl border border-border bg-card p-5 shadow-sm ring-1 ring-slate-950/5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-3">
                <p className="text-sm font-medium tracking-wide text-text-secondary">
                  {title}
                </p>
                <p className="truncate text-2xl font-semibold tabular-nums tracking-tight text-text">
                  {value}
                </p>
              </div>
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                aria-hidden
              >
                <Icon className="size-5" strokeWidth={1.75} />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2
            className="size-5 text-emerald-600"
            strokeWidth={1.75}
            aria-hidden
          />
          <h2 className="text-lg font-semibold text-text">采集会话</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sessions.map((session) => (
            <article
              key={session.id}
              className="rounded-xl border border-border bg-card p-5 shadow-sm ring-1 ring-slate-950/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-text">
                    {session.device}
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    开始 {session.startTime || '—'}
                  </p>
                </div>
                <StatusBadge
                  status={collectionStatusLabel(session.status)}
                  size="sm"
                  className={cn(
                    'shrink-0 ring-1 ring-inset',
                    collectionBadgeClass(session.status),
                    session.status === 'collecting' &&
                      'motion-safe:animate-pulse',
                  )}
                />
              </div>
              <div className="mt-4">
                <ProgressBar
                  value={session.progress}
                  label="进度"
                  color={sessionProgressColor(session.status)}
                  size="sm"
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-text-secondary">数据量</span>
                <span className="font-medium tabular-nums text-text">
                  {session.dataSize}
                </span>
              </div>
              {session.anomalies.length > 0 && (
                <div className="mt-3 flex gap-2 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
                  <AlertTriangle
                    className="mt-0.5 size-4 shrink-0 text-amber-600"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <ul className="list-inside list-disc space-y-0.5">
                    {session.anomalies.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Upload
            className="size-5 text-primary"
            strokeWidth={1.75}
            aria-hidden
          />
          <h2 className="text-lg font-semibold text-text">传输任务</h2>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm ring-1 ring-slate-950/5">
          <div className="divide-y divide-border">
            {records.map((row) => (
              <div
                key={row.id}
                className="grid gap-4 p-4 lg:grid-cols-[1fr_auto_280px] lg:items-center"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium text-text">
                    {row.destination}
                  </p>
                  <p className="text-xs text-text-secondary">
                    会话 {row.sessionId} · 开始{' '}
                    {row.startedAt || '—'}
                  </p>
                  {row.anomaly !== undefined && row.anomaly !== '' && (
                    <p className="flex items-start gap-1.5 text-xs text-amber-900">
                      <AlertTriangle
                        className="mt-0.5 size-3.5 shrink-0 text-amber-600"
                        aria-hidden
                      />
                      {row.anomaly}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {row.state === 'offline' ? (
                    <WifiOff
                      className="size-4 text-slate-400"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  ) : (
                    <Wifi
                      className="size-4 text-slate-400"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  )}
                  <StatusBadge
                    status={transmissionStateLabel(row.state)}
                    size="sm"
                    className={cn(
                      'ring-1 ring-inset',
                      transmissionBadgeClass(row.state),
                    )}
                  />
                </div>
                <div className="min-w-0 lg:max-w-none">
                  <ProgressBar
                    value={row.progress}
                    color={recordProgressColor(row.state)}
                    size="sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
