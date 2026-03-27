import {
  DataTable,
  type DataTableColumn,
  SearchFilter,
  type SearchFilterDef,
  StatCard,
  StatusBadge,
} from '@/components/ui'
import { mockDevices, type Device, type HealthStatus } from '@/data/mock'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useMemo, useState, type ReactElement } from 'react'

const DEVICE_TYPES: string[] = [
  '遥操作主站',
  '光学动捕',
  '可穿戴',
  '人形机器人',
  'AGV',
  '移动操纵',
  '感知套件',
  '网络设备',
  '存储',
]

const deviceFilterDefs: SearchFilterDef[] = [
  {
    key: 'type',
    label: '全部类型',
    options: [
      { value: '', label: '全部类型' },
      ...DEVICE_TYPES.map((t) => ({ value: t, label: t })),
    ],
  },
  {
    key: 'status',
    label: '全部状态',
    options: [
      { value: '', label: '全部状态' },
      { value: 'available', label: '可用' },
      { value: 'unavailable', label: '不可用' },
    ],
  },
]

const healthLabel: Record<HealthStatus, string> = {
  healthy: '健康',
  warning: '预警',
  critical: '严重',
  maintenance: '维护中',
}

const healthClass: Record<HealthStatus, string> = {
  healthy: 'text-emerald-700',
  warning: 'text-amber-600',
  critical: 'text-red-600',
  maintenance: 'text-slate-500',
}

export default function Devices(): ReactElement {
  const [search, setSearch] = useState<string>('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    type: '',
    status: '',
  })

  const availableCount = useMemo(
    () => mockDevices.filter((d) => d.status === 'available').length,
    [],
  )
  const unavailableCount = useMemo(
    () => mockDevices.filter((d) => d.status === 'unavailable').length,
    [],
  )
  const healthWarningCount = useMemo(
    () => mockDevices.filter((d) => d.healthStatus === 'warning').length,
    [],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return mockDevices.filter((d) => {
      if (q && !d.name.toLowerCase().includes(q)) return false
      if (activeFilters.type && d.type !== activeFilters.type) return false
      if (activeFilters.status && d.status !== activeFilters.status) return false
      return true
    })
  }, [search, activeFilters])

  const columns: DataTableColumn<Device>[] = [
    { key: 'id', title: 'ID' },
    { key: 'name', title: '设备名称' },
    { key: 'type', title: '类型' },
    {
      key: 'status',
      title: '状态',
      render: (row) => (
        <StatusBadge
          status={row.status === 'available' ? '可用' : '不可用'}
          size="sm"
        />
      ),
    },
    {
      key: 'healthStatus',
      title: '健康状态',
      render: (row) => (
        <span
          className={cn(
            'inline-flex items-center text-sm font-medium',
            healthClass[row.healthStatus],
          )}
        >
          {healthLabel[row.healthStatus]}
        </span>
      ),
    },
    { key: 'lastMaintenance', title: '上次维护' },
    { key: 'location', title: '位置' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="设备总数"
          value={mockDevices.length}
          icon={Cpu}
        />
        <StatCard
          title="可用"
          value={availableCount}
          icon={CheckCircle2}
        />
        <StatCard
          title="不可用"
          value={unavailableCount}
          icon={WifiOff}
        />
        <StatCard
          title="健康预警"
          value={healthWarningCount}
          icon={AlertTriangle}
        />
      </div>

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        filters={deviceFilterDefs}
        activeFilters={activeFilters}
        onFilterChange={(key, value) => {
          setActiveFilters((prev) => ({ ...prev, [key]: value }))
        }}
        searchPlaceholder="按设备名称搜索…"
      />

      <div className="rounded-xl border border-border bg-white p-4 shadow-sm ring-1 ring-slate-950/5">
        <div className="mb-3 flex items-center gap-2 text-sm text-text-secondary">
          <Wifi className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          <span>
            共 <span className="font-semibold text-text">{filtered.length}</span>{' '}
            条记录
          </span>
        </div>
        <DataTable columns={columns} data={filtered} />
      </div>
    </div>
  )
}
