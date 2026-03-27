import {
  DataTable,
  type DataTableColumn,
  Modal,
  SearchFilter,
  type SearchFilterDef,
  StatCard,
  StatusBadge,
} from '@/components/ui'
import {
  mockPersonnel,
  type Personnel,
  type PersonnelScheduleEntry,
} from '@/data/mock'
import { cn } from '@/lib/utils'
import { Calendar, Clock, Users } from 'lucide-react'
import { useMemo, useState, type ReactElement } from 'react'

function roleFilterOptions(personnel: Personnel[]): SearchFilterDef['options'] {
  const roles = [...new Set(personnel.map((p) => p.role))].sort()
  return [
    { value: '', label: '全部角色' },
    ...roles.map((r) => ({ value: r, label: r })),
  ]
}

export default function Personnel(): ReactElement {
  const [search, setSearch] = useState<string>('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    status: '',
    role: '',
  })
  const [selected, setSelected] = useState<Personnel | null>(null)

  const roleOptions = useMemo(
    () => roleFilterOptions(mockPersonnel),
    [],
  )

  const filterDefs: SearchFilterDef[] = useMemo(
    () => [
      {
        key: 'status',
        label: '全部状态',
        options: [
          { value: '', label: '全部状态' },
          { value: 'available', label: '可接单' },
          { value: 'busy', label: '忙碌' },
        ],
      },
      {
        key: 'role',
        label: '全部角色',
        options: roleOptions,
      },
    ],
    [roleOptions],
  )

  const availableCount = useMemo(
    () => mockPersonnel.filter((p) => p.status === 'available').length,
    [],
  )
  const busyCount = useMemo(
    () => mockPersonnel.filter((p) => p.status === 'busy').length,
    [],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return mockPersonnel.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false
      if (activeFilters.status && p.status !== activeFilters.status) return false
      if (activeFilters.role && p.role !== activeFilters.role) return false
      return true
    })
  }, [search, activeFilters])

  const columns: DataTableColumn<Personnel>[] = [
    { key: 'id', title: 'ID' },
    { key: 'name', title: '姓名' },
    { key: 'role', title: '角色' },
    {
      key: 'status',
      title: '状态',
      render: (row) => (
        <StatusBadge
          status={row.status === 'available' ? '可接单' : '忙碌'}
          size="sm"
        />
      ),
    },
    {
      key: 'skills',
      title: '技能',
      render: (row) => (
        <div className="flex max-w-md flex-wrap gap-1">
          {row.skills.map((s) => (
            <span
              key={s}
              className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200/80"
            >
              {s}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'schedule',
      title: '排班数',
      render: (row) => (
        <span className="tabular-nums text-text">{row.schedule.length}</span>
      ),
    },
  ]

  const scheduleSorted: PersonnelScheduleEntry[] = useMemo(() => {
    if (!selected) return []
    return [...selected.schedule].sort((a, b) => {
      const da = a.date.localeCompare(b.date)
      if (da !== 0) return da
      return a.startTime.localeCompare(b.startTime)
    })
  }, [selected])

  const scheduleByDate = useMemo(() => {
    const map = new Map<string, PersonnelScheduleEntry[]>()
    for (const e of scheduleSorted) {
      const list = map.get(e.date) ?? []
      list.push(e)
      map.set(e.date, list)
    }
    return map
  }, [scheduleSorted])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="人员总数" value={mockPersonnel.length} icon={Users} />
        <StatCard title="可接单" value={availableCount} icon={Calendar} />
        <StatCard title="忙碌" value={busyCount} icon={Clock} />
      </div>

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        filters={filterDefs}
        activeFilters={activeFilters}
        onFilterChange={(key, value) => {
          setActiveFilters((prev) => ({ ...prev, [key]: value }))
        }}
        searchPlaceholder="按姓名搜索…"
      />

      <div className="rounded-xl border border-border bg-white p-4 shadow-sm ring-1 ring-slate-950/5">
        <div className="mb-3 flex items-center gap-2 text-sm text-text-secondary">
          <Calendar className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          <span>
            共 <span className="font-semibold text-text">{filtered.length}</span>{' '}
            人 · 点击行查看排班
          </span>
        </div>
        <DataTable
          columns={columns}
          data={filtered}
          onRowClick={(row) => {
            setSelected(row)
          }}
        />
      </div>

      <Modal
        isOpen={selected !== null}
        onClose={() => {
          setSelected(null)
        }}
        title={selected ? `排班 · ${selected.name}` : '排班'}
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-sm text-text-secondary">
              <span>
                角色：<span className="font-medium text-text">{selected.role}</span>
              </span>
              <span className="text-border">|</span>
              <span>
                状态：
                <StatusBadge
                  status={selected.status === 'available' ? '可接单' : '忙碌'}
                  size="sm"
                  className="ml-1 align-middle"
                />
              </span>
            </div>

            {scheduleSorted.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-slate-50/80 px-4 py-8 text-center text-sm text-text-secondary">
                暂无排班条目
              </p>
            ) : (
              <div className="space-y-6">
                {[...scheduleByDate.entries()].map(([date, entries]) => (
                  <div key={date}>
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Calendar
                          className="size-4"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text">{date}</p>
                        <p className="text-xs text-text-secondary">
                          {entries.length} 个时段
                        </p>
                      </div>
                    </div>
                    <ul className="relative space-y-2 border-l-2 border-primary/20 pl-4">
                      {entries.map((e) => (
                        <li
                          key={`${e.date}-${e.startTime}-${e.taskId}`}
                          className={cn(
                            'relative rounded-lg border border-border bg-white px-3 py-2.5 shadow-sm',
                            'before:absolute before:-left-[calc(0.5rem+2px)] before:top-3 before:size-2 before:rounded-full before:bg-primary before:ring-4 before:ring-white',
                          )}
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-text">
                              <Clock
                                className="size-3.5 text-text-secondary"
                                strokeWidth={1.75}
                                aria-hidden
                              />
                              {e.startTime} – {e.endTime}
                            </span>
                            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                              {e.taskId}
                            </code>
                          </div>
                          <p className="mt-1 text-sm text-text-secondary">
                            {e.label}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
