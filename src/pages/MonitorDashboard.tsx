import {
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties,
} from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  TrendingUp,
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
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { dashboardStats, monitoringCharts } from '@/data/mock'

const PAGE_BG = '#0a0e1a'
const CARD_BG = '#111827'
const CARD_BORDER = '#1e293b'
const CYAN = '#06b6d4'
const GREEN = '#10b981'
const BLUE = '#3b82f6'
const AMBER = '#f59e0b'

const PIE_COLORS = [CYAN, GREEN, BLUE, AMBER, '#8b5cf6', '#ec4899', '#94a3b8'] as const

type LiveStats = {
  totalRecords: number
  onlineDevices: number
  todayTasks: number
  anomalyAlerts: number
}

function buildInitialLive(): LiveStats {
  const totalRecords = dashboardStats.dataProductionByType.reduce(
    (s, r) => s + r.count,
    0,
  )
  const onlineDevices = dashboardStats.deviceUtilization.length
  const todayTasks =
    dashboardStats.taskCompletionBreakdown[0]?.completed ?? 0
  const anomalyAlerts = dashboardStats.anomalyAlerts.filter(
    (a) => a.level !== 'info',
  ).length
  return { totalRecords, onlineDevices, todayTasks, anomalyAlerts }
}

function fluctuateLive(prev: LiveStats): LiveStats {
  return {
    totalRecords: Math.min(
      42000,
      Math.max(22000, prev.totalRecords + Math.round((Math.random() - 0.5) * 900)),
    ),
    onlineDevices: Math.min(
      9,
      Math.max(3, prev.onlineDevices + Math.round((Math.random() - 0.5) * 2)),
    ),
    todayTasks: Math.min(
      56,
      Math.max(32, prev.todayTasks + Math.round((Math.random() - 0.5) * 5)),
    ),
    anomalyAlerts: Math.min(
      9,
      Math.max(0, prev.anomalyAlerts + Math.round((Math.random() - 0.5) * 2)),
    ),
  }
}

const tooltipDark = {
  backgroundColor: CARD_BG,
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: 8,
  color: '#e2e8f0',
}

const axisTick = { fontSize: 11, fill: '#94a3b8' }

export default function MonitorDashboard() {
  const gradId = useId().replace(/:/g, '')
  const [now, setNow] = useState(() => new Date())
  const [live, setLive] = useState<LiveStats>(buildInitialLive)

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      setLive((prev) => fluctuateLive(prev))
    }, 5000)
    return () => window.clearInterval(id)
  }, [])

  const timeStr = useMemo(
    () =>
      now.toLocaleString('zh-CN', {
        weekday: 'long',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
    [now],
  )

  return (
    <div
      className="-mx-4 w-[calc(100%+2rem)] max-w-none py-4 text-slate-200 md:-mx-6 md:w-[calc(100%+3rem)] md:py-6"
      style={{ backgroundColor: PAGE_BG } satisfies CSSProperties}
    >
      <div className="space-y-5 px-4 md:space-y-6 md:px-6">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl lg:text-4xl">
              具身智能数据监控中心
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              采集 · 传输 · 任务 · 异常 · 实时演示
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <p
              className="font-mono text-lg tabular-nums text-cyan-400 md:text-xl"
              style={{ textShadow: '0 0 24px rgba(6,182,212,0.45)' }}
            >
              {timeStr}
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-md border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-slate-300">
                采集在线率{' '}
                <strong className="text-emerald-400">
                  {dashboardStats.collectionOnlineRate}%
                </strong>
              </span>
              <span className="rounded-md border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-slate-300">
                今日回传{' '}
                <strong className="text-cyan-400">
                  {dashboardStats.transmittedGbToday} GB
                </strong>
              </span>
              <span className="rounded-md border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-slate-300">
                任务完成率{' '}
                <strong className="text-emerald-400">
                  {dashboardStats.taskCompletionRate}%
                </strong>
              </span>
            </div>
          </div>
        </header>

        <section
          className="grid grid-cols-1 gap-4 lg:grid-cols-2"
          aria-label="趋势图行一"
        >
          <div
            className="rounded-xl border p-4 shadow-lg md:p-5"
            style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}
          >
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="size-5 text-cyan-400" aria-hidden />
              <h2 className="text-base font-semibold text-white">数据量趋势</h2>
            </div>
            <div className="h-[260px] w-full md:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monitoringCharts.dataVolumeTrend}
                  margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id={`dv-${gradId}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={CYAN} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={CYAN} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="label"
                    tick={axisTick}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    tick={axisTick}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip contentStyle={tooltipDark} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="数据量"
                    stroke={CYAN}
                    strokeWidth={2}
                    fill={`url(#dv-${gradId})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            className="rounded-xl border p-4 shadow-lg md:p-5"
            style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}
          >
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-400" aria-hidden />
              <h2 className="text-base font-semibold text-white">任务完成趋势</h2>
            </div>
            <div className="h-[260px] w-full md:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={monitoringCharts.taskCompletionTrend}
                  margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="label"
                    tick={axisTick}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    domain={['dataMin - 2', 'dataMax + 2']}
                    tick={axisTick}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={tooltipDark}
                    formatter={(v) => [`${v}%`, '完成率']}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="完成率"
                    stroke={GREEN}
                    strokeWidth={2}
                    dot={{ r: 3, fill: GREEN, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section
          className="grid grid-cols-1 gap-4 lg:grid-cols-2"
          aria-label="趋势图行二"
        >
          <div
            className="rounded-xl border p-4 shadow-lg md:p-5"
            style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}
          >
            <div className="mb-3 flex items-center gap-2">
              <Cpu className="size-5 text-blue-400" aria-hidden />
              <h2 className="text-base font-semibold text-white">设备利用率</h2>
            </div>
            <div className="h-[260px] w-full md:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monitoringCharts.deviceUtilizationTrend}
                  margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id={`bu-${gradId}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity={1} />
                      <stop offset="100%" stopColor={BLUE} stopOpacity={0.85} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={axisTick}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    tick={axisTick}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip contentStyle={tooltipDark} />
                  <Bar
                    dataKey="value"
                    name="利用率"
                    fill={`url(#bu-${gradId})`}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            className="rounded-xl border p-4 shadow-lg md:p-5"
            style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}
          >
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-400" aria-hidden />
              <h2 className="text-base font-semibold text-white">异常统计</h2>
            </div>
            <div className="h-[260px] w-full md:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={monitoringCharts.anomalyStatistics}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={2}
                    stroke={CARD_BORDER}
                    strokeWidth={1}
                  >
                    {monitoringCharts.anomalyStatistics.map((_, i) => (
                      <Cell
                        key={monitoringCharts.anomalyStatistics[i].label}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipDark} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section
          className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4"
          aria-label="实时统计"
        >
          <GlowStatCard
            label="数据总量"
            value={live.totalRecords.toLocaleString('zh-CN')}
            unit="条"
            glow="rgba(6,182,212,0.55)"
            icon={Database}
          />
          <GlowStatCard
            label="在线设备"
            value={String(live.onlineDevices)}
            unit="台"
            glow="rgba(59,130,246,0.55)"
            icon={Activity}
          />
          <GlowStatCard
            label="今日任务"
            value={String(live.todayTasks)}
            unit="项"
            glow="rgba(16,185,129,0.55)"
            icon={CheckCircle2}
          />
          <GlowStatCard
            label="异常告警"
            value={String(live.anomalyAlerts)}
            unit="条"
            glow="rgba(245,158,11,0.55)"
            icon={AlertTriangle}
          />
        </section>
      </div>
    </div>
  )
}

function GlowStatCard({
  label,
  value,
  unit,
  glow,
  icon: Icon,
}: {
  label: string
  value: string
  unit: string
  glow: string
  icon: LucideIcon
}) {
  return (
    <div
      className="rounded-xl border p-4 md:p-5"
      style={{
        backgroundColor: CARD_BG,
        borderColor: CARD_BORDER,
        boxShadow: `0 0 32px -4px ${glow}, inset 0 1px 0 0 rgba(255,255,255,0.04)`,
      }}
    >
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        <Icon className="size-4 text-slate-500" aria-hidden />
        {label}
      </div>
      <p
        className="mt-3 text-2xl font-bold tabular-nums text-white md:text-3xl"
        style={{ textShadow: `0 0 20px ${glow}` }}
      >
        {value}
        <span className="ml-1 text-base font-semibold text-slate-400 md:text-lg">
          {unit}
        </span>
      </p>
    </div>
  )
}
