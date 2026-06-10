import { useMemo, useState, type ReactElement } from 'react'

import { DataTable, type DataTableColumn, SearchFilter } from '@/components/ui'
import {
  ATOMIC_ACTION_CATEGORIES,
  type AtomicActionCategory,
} from '@/data/atomicActions'
import { cn } from '@/lib/utils'

export default function AtomicActions(): ReactElement {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return ATOMIC_ACTION_CATEGORIES
    return ATOMIC_ACTION_CATEGORIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.actions.toLowerCase().includes(q) ||
        c.typicalScenes.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q),
    )
  }, [search])

  const columns: DataTableColumn<AtomicActionCategory>[] = [
    {
      key: 'code',
      title: '大类',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-primary">{row.code}</span>
      ),
    },
    {
      key: 'name',
      title: '动作大类',
      render: (row) => (
        <span className={cn(row.highlight && 'font-medium text-amber-900')}>
          {row.name}
          {row.highlight ? (
            <span className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[10px] text-amber-800">
              重点覆盖
            </span>
          ) : null}
        </span>
      ),
    },
    { key: 'actions', title: '原子动作全集' },
    { key: 'typicalScenes', title: '典型承载场景' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">原子动作库</h3>
        <p className="mt-0.5 text-sm text-slate-500">
          内置 §4.7 全量原子动作集（A–I），供台本配置时勾选覆盖；标「重点覆盖」为高价值动作
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">动作大类</p>
          <p className="mt-1 text-2xl font-semibold">{ATOMIC_ACTION_CATEGORIES.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">重点覆盖类</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">
            {ATOMIC_ACTION_CATEGORIES.filter((c) => c.highlight).length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">引用来源</p>
          <p className="mt-1 text-sm font-medium text-slate-800">XA 203075 §4.7</p>
        </div>
      </div>

      <SearchFilter
        searchPlaceholder="搜索动作大类、动作描述、场景…"
        searchValue={search}
        onSearchChange={setSearch}
        filters={[]}
        activeFilters={{}}
        onFilterChange={() => {}}
      />

      <DataTable columns={columns} data={filtered} />
    </div>
  )
}
