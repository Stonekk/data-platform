import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  HardDrive,
  Radio,
  TrendingUp,
  Wifi,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { ProgressBar, StatCard, StatusBadge } from '@/components/ui'
import type { ProgressBarColor } from '@/components/ui'
import {
  dashboardStats,
  monitoringCharts,
  type TransmissionState,
} from '@/data/mock'
import { cn } from '@/lib/utils'

const BAR_COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777', '#0891b2']

function transmissionBadgeLabel(state: TransmissionState): string {
  const map: Record<TransmissionState, string> = {
    synced: '已完成',
    syncing: '同步进行中',
    queued: '排队中',
    failed: '异常',
    offline: '离线',
  }
  return map[state]
}

function transmissionProgressColor(state: TransmissionState): ProgressBarColor {
  switch (state) {
    case 'synced':
      return 'green'
    case 'syncing':
      return 'blue'
    case 'queued':
      return 'orange'
    case 'failed':
    case 'offline':
      return 'red'
    default:
      return 'blue'
  }
}

function deviceUtilColor(percent: number): ProgressBarColor {
  if (percent >= 90) return 'orange'
  if (percent >= 75) return 'blue'
  return 'green'
}

const chartCardClass =
  'rounded-xl border border-border bg-card p-5 shadow-sm ring-1 ring-slate-950/5'

function SectionTitle({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string
  subtitle?: string
  icon?: LucideIcon
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      {Icon !== undefined && (
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon className="size-4" strokeWidth={1.75} aria-hidden />
        </div>
      )}
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-text">
          {title}
        </h2>
        {subtitle !== undefined && subtitle !== '' && (
          <p className="mt-0.5 text-sm text-text-secondary">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

function AnomalyLevelIcon({ level }: { level: 'info' | 'warning' | 'error' }) {
  const common = 'size-5 shrink-0'
  if (level === 'error') {
    return (
      <AlertTriangle
        className={cn(common, 'text-red-600')}
        strokeWidth={1.75}
        aria-hidden
      />
    )
  }
  if (level === 'warning') {
    return (
      <AlertTriangle
        className={cn(common, 'text-amber-500')}
        strokeWidth={1.75}
        aria-hidden
      />
    )
  }
  return (
    <Activity
      className={cn(common, 'text-blue-600')}
      strokeWidth={1.75}
      aria-hidden
    />
  )
}

export default function Dashboard() {
  const totalProduction = dashboardStats.dataProductionByType.reduce(
    (sum, row) => sum + row.count,
    0,
  )
  const formattedTotalProduction = totalProduction.toLocaleString('zh-CN')

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text md:text-2xl">
            运营仪表盘
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            具身智能数据平台 · 采集、传输与设备运行总览
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Radio className="size-3.5 text-primary" aria-hidden />
          <span className="tabular-nums">实时指标 · 演示数据</span>
        </div>
      </header>

      {/* 1. Top stats */}
      <section
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
        aria-label="核心指标"
      >
        <StatCard
          title="数据总产量"
          value={formattedTotalProduction}
          icon={Database}
          trend={12.5}
        />
        <StatCard
          title="任务完成率"
          value={`${dashboardStats.taskCompletionRate}%`}
          icon={CheckCircle2}
          trend={3.2}
        />
        <StatCard
          title="采集在线率"
          value={`${dashboardStats.collectionOnlineRate}%`}
          icon={Wifi}
          trend={1.8}
        />
        <StatCard
          title="今日回传"
          value={`${dashboardStats.transmittedGbToday} GB`}
          icon={HardDrive}
          trend={8.4}
        />
      </section>

      {/* 2. Trend charts */}
      <section
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
        aria-label="趋势图表"
      >
        <div className={chartCardClass}>
          <SectionTitle
            title="数据产量趋势"
            subtitle="近期待入库数据量（相对指数）"
            icon={TrendingUp}
          />
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monitoringCharts.dataVolumeTrend}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="fillVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)',
                  }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="产量"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fill="url(#fillVolume)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={chartCardClass}>
          <SectionTitle
            title="任务完成率趋势"
            subtitle="计划任务按期完成比例（%）"
            icon={CheckCircle2}
          />
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={monitoringCharts.taskCompletionTrend}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  domain={['dataMin - 2', 'dataMax + 2']}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)',
                  }}
                  labelStyle={{ fontWeight: 600 }}
                  formatter={(v) => [`${v}%`, '完成率']}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="完成率"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#16a34a', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* 3. Production by type */}
      <section className={chartCardClass} aria-label="按类型产量">
        <SectionTitle
          title="各类型数据产量"
          subtitle="当前统计周期内按数据类型汇总"
          icon={Database}
        />
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dashboardStats.dataProductionByType}
              margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)',
                }}
                formatter={(value, _name, item) => {
                  const unit =
                    (item?.payload as { unit?: string })?.unit ?? '条'
                  return [Number(value).toLocaleString('zh-CN') + ' ' + unit, '产量']
                }}
              />
              <Bar dataKey="count" name="产量" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {dashboardStats.dataProductionByType.map((entry, index) => (
                  <Cell
                    key={entry.type}
                    fill={BAR_COLORS[index % BAR_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 4. Transmission & devices */}
      <section
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
        aria-label="传输与设备"
      >
        <div className={chartCardClass}>
          <SectionTitle
            title="传输状态"
            subtitle="链路进度、吞吐与待传量"
            icon={HardDrive}
          />
          <ul className="space-y-4">
            {dashboardStats.dataTransmission.map((row) => (
              <li
                key={row.label}
                className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 flex-1 text-sm font-medium text-text">
                    {row.label}
                  </p>
                  <StatusBadge
                    status={transmissionBadgeLabel(row.state)}
                    size="sm"
                  />
                </div>
                <div className="mt-3">
                  <ProgressBar
                    value={row.progress}
                    label="同步进度"
                    color={transmissionProgressColor(row.state)}
                    size="sm"
                  />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-secondary">
                  <div>
                    <dt className="text-text-secondary/80">吞吐</dt>
                    <dd className="font-medium tabular-nums text-text">
                      {row.throughputMbps > 0
                        ? `${row.throughputMbps} Mbps`
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-secondary/80">待传</dt>
                    <dd className="font-medium tabular-nums text-text">
                      {row.pendingGb > 0 ? `${row.pendingGb} GB` : '—'}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </div>

        <div className={chartCardClass}>
          <SectionTitle
            title="设备利用率"
            subtitle="近 24h 在线与占用情况"
            icon={Activity}
          />
          <ul className="space-y-4">
            {dashboardStats.deviceUtilization.map((dev) => (
              <li key={dev.deviceId}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate font-medium text-text">
                    {dev.deviceName}
                  </span>
                  <span className="shrink-0 tabular-nums text-xs text-text-secondary">
                    在线 {dev.onlineHours24h}h
                  </span>
                </div>
                <div className="mt-2">
                  <ProgressBar
                    value={dev.utilizationPercent}
                    label="利用率"
                    color={deviceUtilColor(dev.utilizationPercent)}
                    size="sm"
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5. Anomalies */}
      <section className={chartCardClass} aria-label="异常告警">
        <SectionTitle
          title="异常与告警"
          subtitle="需要关注的运行事件"
          icon={AlertTriangle}
        />
        <ul className="divide-y divide-slate-200/80">
          {dashboardStats.anomalyAlerts.map((alert) => (
            <li
              key={alert.id}
              className="flex gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div className="pt-0.5">
                <AnomalyLevelIcon level={alert.level} />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold text-text">{alert.title}</p>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {alert.message}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                  <time dateTime={alert.time}>
                    {new Date(alert.time).toLocaleString('zh-CN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                  <span className="text-slate-400">·</span>
                  <span>{alert.source}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
