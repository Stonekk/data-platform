import {
  DataTable,
  type DataTableColumn,
  SearchFilter,
  type SearchFilterDef,
  StatCard,
  StatusBadge,
} from '@/components/ui'
import { mockScenes, type Scene, type SceneStatus } from '@/data/mock'
import { cn } from '@/lib/utils'
import { MapPin } from 'lucide-react'
import { useMemo, useState, type ReactElement } from 'react'

function sceneStatusLabel(status: SceneStatus): string {
  if (status === 'active') return '活跃'
  if (status === 'inactive') return '未启用'
  return '维护中'
}

function typeFilterOptions(scenes: Scene[]): SearchFilterDef['options'] {
  const types = [...new Set(scenes.map((s) => s.type))].sort()
  return [
    { value: '', label: '全部类型' },
    ...types.map((t) => ({ value: t, label: t })),
  ]
}

export default function Scenes(): ReactElement {
  const [search, setSearch] = useState<string>('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    type: '',
    status: '',
  })

  const typeOptions = useMemo(() => typeFilterOptions(mockScenes), [])

  const filterDefs: SearchFilterDef[] = useMemo(
    () => [
      {
        key: 'type',
        label: '全部类型',
        options: typeOptions,
      },
      {
        key: 'status',
        label: '全部状态',
        options: [
          { value: '', label: '全部状态' },
          { value: 'active', label: '活跃' },
          { value: 'inactive', label: '未启用' },
          { value: 'maintenance', label: '维护中' },
        ],
      },
    ],
    [typeOptions],
  )

  const activeCount = useMemo(
    () => mockScenes.filter((s) => s.status === 'active').length,
    [],
  )
  const inactiveCount = useMemo(
    () => mockScenes.filter((s) => s.status === 'inactive').length,
    [],
  )
  const maintenanceCount = useMemo(
    () => mockScenes.filter((s) => s.status === 'maintenance').length,
    [],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return mockScenes.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q)) return false
      if (activeFilters.type && s.type !== activeFilters.type) return false
      if (activeFilters.status && s.status !== activeFilters.status) return false
      return true
    })
  }, [search, activeFilters])

  const columns: DataTableColumn<Scene>[] = [
    { key: 'id', title: 'ID' },
    { key: 'name', title: '场景名称' },
    { key: 'type', title: '类型' },
    {
      key: 'status',
      title: '状态',
      render: (row) => (
        <StatusBadge status={sceneStatusLabel(row.status)} size="sm" />
      ),
    },
    { key: 'location', title: '位置' },
    {
      key: 'description',
      title: '描述',
      render: (row) => (
        <span
          className={cn('line-clamp-2 max-w-md text-text-secondary')}
          title={row.description}
        >
          {row.description}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="场景总数" value={mockScenes.length} icon={MapPin} />
        <StatCard title="活跃" value={activeCount} icon={MapPin} />
        <StatCard title="未启用" value={inactiveCount} icon={MapPin} />
        <StatCard title="维护中" value={maintenanceCount} icon={MapPin} />
      </div>

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        filters={filterDefs}
        activeFilters={activeFilters}
        onFilterChange={(key, value) => {
          setActiveFilters((prev) => ({ ...prev, [key]: value }))
        }}
        searchPlaceholder="按场景名称搜索…"
      />

      <div className="rounded-xl border border-border bg-white p-4 shadow-sm ring-1 ring-slate-950/5">
        <div className="mb-3 flex items-center gap-2 text-sm text-text-secondary">
          <MapPin className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          <span>
            共 <span className="font-semibold text-text">{filtered.length}</span>{' '}
            个场景
          </span>
        </div>
        <DataTable columns={columns} data={filtered} />
      </div>
    </div>
  )
}
