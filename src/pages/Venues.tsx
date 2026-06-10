import { useMemo, useState, type ReactElement } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronDown,
  ChevronRight,
  Download,
  Layers,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'

import { Modal, SearchFilter, type SearchFilterDef, StatusBadge } from '@/components/ui'
import { scenesForVenue, usePlatformScenes } from '@/data/sceneStore'
import {
  createVenueId,
  nextVenueLevel,
  updatePlatformVenues,
  usePlatformVenues,
  venueById,
  venueChildren,
} from '@/data/venueStore'
import type {
  Scene,
  Venue,
  VenueConstructionStatus,
  VenueLevel,
  VenueRentalStatus,
  VenueSiteType,
  VenueUsageStatus,
} from '@/data/mock'
import { cn } from '@/lib/utils'

type TableRow =
  | { kind: 'venue'; venue: Venue; depth: number }
  | { kind: 'scene'; scene: Scene; depth: number; venueId: string }

type VenueForm = {
  name: string
  parentId: string
  level: VenueLevel
  siteType: VenueSiteType
  constructionStatus: VenueConstructionStatus
  usageStatus: VenueUsageStatus
  rentalStatus: VenueRentalStatus
  category: string
  city: string
  tags: string
}

const SITE_TYPE_LABEL: Record<VenueSiteType, string> = {
  self_built: '自建工程',
  crowdsourced: '众包场地',
}

const CONSTRUCTION_LABEL: Record<VenueConstructionStatus, string> = {
  planning: '规划中',
  building: '建设中',
  completed: '已完成',
}

const USAGE_LABEL: Record<VenueUsageStatus, string> = {
  maintenance: '维护中',
  in_use: '使用中',
  idle: '空闲',
}

const RENTAL_LABEL: Record<VenueRentalStatus, string> = {
  owned: '自有',
  leasing: '租赁中',
  returned: '已退租',
}

const LEVEL_LABEL: Record<VenueLevel, string> = {
  building: '楼栋',
  floor: '楼层',
  room: '室',
}

function sceneStatusLabel(status: Scene['status']): string {
  if (status === 'active') return '活跃'
  if (status === 'inactive') return '未启用'
  return '维护中'
}

function venueMatchesFilters(
  venue: Venue,
  filters: Record<string, string>,
): boolean {
  if (filters.siteType && venue.siteType !== filters.siteType) return false
  if (filters.construction && venue.constructionStatus !== filters.construction) return false
  if (filters.usage && venue.usageStatus !== filters.usage) return false
  if (filters.rental && venue.rentalStatus !== filters.rental) return false
  return true
}

function collectVisibleRows(
  venues: Venue[],
  scenes: Scene[],
  expanded: Set<string>,
  filters: Record<string, string>,
  parentId: string | null,
  depth: number,
): TableRow[] {
  const rows: TableRow[] = []
  for (const venue of venueChildren(venues, parentId)) {
    const selfMatch = venueMatchesFilters(venue, filters)
    const childRows = collectVisibleRows(venues, scenes, expanded, filters, venue.id, depth + 1)
    const sceneRows: TableRow[] =
      venue.level === 'room' && expanded.has(venue.id)
        ? scenesForVenue(scenes, venue.id).map((scene) => ({
            kind: 'scene' as const,
            scene,
            depth: depth + 1,
            venueId: venue.id,
          }))
        : []

    if (!selfMatch && childRows.length === 0 && sceneRows.length === 0) continue

    rows.push({ kind: 'venue', venue, depth })
    if (expanded.has(venue.id)) {
      rows.push(...childRows)
      rows.push(...sceneRows)
    }
  }
  return rows
}

export default function Venues(): ReactElement {
  const venues = usePlatformVenues()
  const scenes = usePlatformScenes()
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(['venue-bld-hq', 'venue-flr-hq-1', 'venue-room-101', 'venue-bld-crowd', 'venue-flr-crowd-1']),
  )
  const [filters, setFilters] = useState<Record<string, string>>({
    siteType: '',
    construction: '',
    usage: '',
    rental: '',
  })
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Venue | null>(null)
  const [form, setForm] = useState<VenueForm>({
    name: '',
    parentId: '',
    level: 'building',
    siteType: 'self_built',
    constructionStatus: 'completed',
    usageStatus: 'idle',
    rentalStatus: 'owned',
    category: '',
    city: '广东省 / 深圳市 / 福田区',
    tags: '',
  })

  const filterDefs: SearchFilterDef[] = useMemo(
    () => [
      {
        key: 'siteType',
        label: '场地类型',
        options: [
          { value: '', label: '全部类型' },
          { value: 'self_built', label: '自建工程' },
          { value: 'crowdsourced', label: '众包场地' },
        ],
      },
      {
        key: 'construction',
        label: '建设状态',
        options: [
          { value: '', label: '全部建设状态' },
          { value: 'planning', label: '规划中' },
          { value: 'building', label: '建设中' },
          { value: 'completed', label: '已完成' },
        ],
      },
      {
        key: 'usage',
        label: '使用状态',
        options: [
          { value: '', label: '全部使用状态' },
          { value: 'maintenance', label: '维护中' },
          { value: 'in_use', label: '使用中' },
          { value: 'idle', label: '空闲' },
        ],
      },
      {
        key: 'rental',
        label: '租赁状态',
        options: [
          { value: '', label: '全部租赁状态' },
          { value: 'owned', label: '自有' },
          { value: 'leasing', label: '租赁中' },
          { value: 'returned', label: '已退租' },
        ],
      },
    ],
    [],
  )

  const visibleRows = useMemo(
    () => collectVisibleRows(venues, scenes, expanded, filters, null, 0),
    [venues, scenes, expanded, filters],
  )

  const roomCount = venues.filter((v) => v.level === 'room').length
  const sceneCount = scenes.length

  function toggleExpand(id: string): void {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openCreate(parent?: Venue): void {
    const parentId = parent?.id ?? ''
    const parentVenue = parent ?? null
    setEditingId(null)
    setForm({
      name: '',
      parentId,
      level: nextVenueLevel(parentVenue),
      siteType: parent?.siteType ?? 'self_built',
      constructionStatus: 'planning',
      usageStatus: 'idle',
      rentalStatus: parent?.rentalStatus ?? 'owned',
      category: parent?.category ?? '',
      city: parent?.city ?? '广东省 / 深圳市 / 福田区',
      tags: '',
    })
    setEditorOpen(true)
  }

  function openEdit(venue: Venue): void {
    setEditingId(venue.id)
    setForm({
      name: venue.name,
      parentId: venue.parentId ?? '',
      level: venue.level,
      siteType: venue.siteType,
      constructionStatus: venue.constructionStatus,
      usageStatus: venue.usageStatus,
      rentalStatus: venue.rentalStatus,
      category: venue.category,
      city: venue.city,
      tags: venue.tags.join('、'),
    })
    setEditorOpen(true)
  }

  function handleSave(): void {
    if (!form.name.trim()) return
    const tags = form.tags
      .split(/[、,，]/)
      .map((t) => t.trim())
      .filter(Boolean)
    if (editingId) {
      updatePlatformVenues((prev) =>
        prev.map((v) =>
          v.id === editingId
            ? {
                ...v,
                name: form.name.trim(),
                siteType: form.siteType,
                constructionStatus: form.constructionStatus,
                usageStatus: form.usageStatus,
                rentalStatus: form.rentalStatus,
                category: form.category.trim() || '未分类',
                city: form.city.trim(),
                tags,
              }
            : v,
        ),
      )
    } else {
      const parent = form.parentId ? venueById(venues, form.parentId) : null
      const id = createVenueId(venues)
      updatePlatformVenues((prev) => [
        ...prev,
        {
          id,
          name: form.name.trim(),
          parentId: form.parentId || null,
          level: form.level,
          siteType: form.siteType,
          constructionStatus: form.constructionStatus,
          usageStatus: form.usageStatus,
          rentalStatus: form.rentalStatus,
          category: form.category.trim() || '未分类',
          city: form.city.trim(),
          tags,
        },
      ])
      if (parent) setExpanded((prev) => new Set([...prev, parent.id]))
    }
    setEditorOpen(false)
  }

  function handleDelete(): void {
    if (!deleteTarget) return
    const hasChildren = venues.some((v) => v.parentId === deleteTarget.id)
    const hasScenes = scenes.some((s) => s.venueId === deleteTarget.id)
    if (hasChildren || hasScenes) return
    updatePlatformVenues((prev) => prev.filter((v) => v.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">场地管理</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            楼栋 → 楼层 → 室；场景库挂在「室」级场地下，一室可承载多个场景库
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <Download className="size-4" />
            下载模板
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <Upload className="size-4" />
            导入 CSV
          </button>
          <button
            type="button"
            onClick={() => openCreate()}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="size-4" />
            新增场地
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">场地节点</p>
          <p className="mt-1 text-2xl font-semibold">{venues.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">室级场地</p>
          <p className="mt-1 text-2xl font-semibold">{roomCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">场景库总数</p>
          <p className="mt-1 text-2xl font-semibold text-primary">{sceneCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">层级结构</p>
          <p className="mt-1 text-sm font-medium text-slate-800">楼栋 / 楼层 / 室</p>
        </div>
      </div>

      <SearchFilter
        searchValue=""
        onSearchChange={() => {}}
        searchPlaceholder="搜索场地名称…"
        filters={filterDefs}
        activeFilters={filters}
        onFilterChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {[
                  '场地名称',
                  '层级',
                  '场地类型',
                  '建设状态',
                  '使用状态',
                  '租赁状态',
                  '场地分类',
                  '城市',
                  '标签',
                  '场景库',
                  '操作',
                ].map((title) => (
                  <th
                    key={title}
                    className="px-4 py-3 text-xs font-semibold text-slate-600"
                  >
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-slate-500">
                    暂无匹配场地
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  if (row.kind === 'scene') {
                    return (
                      <tr key={`scene-${row.scene.id}`} className="bg-sky-50/40 hover:bg-sky-50/70">
                        <td className="px-4 py-2.5" style={{ paddingLeft: `${16 + row.depth * 20}px` }}>
                          <span className="inline-flex items-center gap-2 text-sky-900">
                            <Layers className="size-3.5 text-sky-600" />
                            <span className="font-mono text-xs text-sky-700">{row.scene.id}</span>
                            {row.scene.name}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-sky-700">场景库</td>
                        <td colSpan={6} className="px-4 py-2.5 text-xs text-slate-600">
                          {row.scene.industry} · {row.scene.type} · {row.scene.sceneSubtype}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={sceneStatusLabel(row.scene.status)} size="sm" />
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">—</td>
                        <td className="px-4 py-2.5">
                          <Link
                            to="/resources/scenes"
                            className="text-xs text-primary hover:underline"
                          >
                            在场景库管理
                          </Link>
                        </td>
                      </tr>
                    )
                  }

                  const { venue, depth } = row
                  const children = venueChildren(venues, venue.id)
                  const roomScenes = scenesForVenue(scenes, venue.id)
                  const expandable = children.length > 0 || roomScenes.length > 0
                  const isExpanded = expanded.has(venue.id)

                  return (
                    <tr key={venue.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-2.5" style={{ paddingLeft: `${16 + depth * 20}px` }}>
                        <div className="flex items-center gap-1.5">
                          {expandable ? (
                            <button
                              type="button"
                              onClick={() => toggleExpand(venue.id)}
                              className="rounded p-0.5 text-slate-500 hover:bg-slate-100"
                            >
                              {isExpanded ? (
                                <ChevronDown className="size-4" />
                              ) : (
                                <ChevronRight className="size-4" />
                              )}
                            </button>
                          ) : (
                            <span className="inline-block w-5" />
                          )}
                          <MapPin className="size-3.5 shrink-0 text-slate-400" />
                          <span className="font-medium text-slate-900">{venue.name}</span>
                          {venue.level === 'room' && roomScenes.length > 0 && (
                            <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] text-sky-800">
                              {roomScenes.length} 个场景库
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{LEVEL_LABEL[venue.level]}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge
                          status={SITE_TYPE_LABEL[venue.siteType]}
                          size="sm"
                          className={cn(
                            venue.siteType === 'self_built'
                              ? 'bg-blue-50 text-blue-800'
                              : 'bg-emerald-50 text-emerald-800',
                          )}
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={CONSTRUCTION_LABEL[venue.constructionStatus]} size="sm" />
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={USAGE_LABEL[venue.usageStatus]} size="sm" />
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={RENTAL_LABEL[venue.rentalStatus]} size="sm" />
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{venue.category}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{venue.city}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {venue.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">
                        {venue.level === 'room' ? `${roomScenes.length} 个` : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {venue.level !== 'room' && (
                            <button
                              type="button"
                              onClick={() => openCreate(venue)}
                              className="rounded border border-slate-200 px-2 py-0.5 text-[11px] hover:bg-slate-50"
                            >
                              添加子级
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEdit(venue)}
                            className="inline-flex items-center gap-0.5 rounded border border-slate-200 px-2 py-0.5 text-[11px] hover:bg-slate-50"
                          >
                            <Pencil className="size-3" />
                            编辑
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(venue)}
                            className="inline-flex items-center gap-0.5 rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] text-rose-800 hover:bg-rose-100"
                          >
                            <Trash2 className="size-3" />
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={editorOpen} onClose={() => setEditorOpen(false)} title={editingId ? '编辑场地' : '新增场地'} size="md">
        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">场地名称 *</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="h-9 w-full rounded-md border border-slate-200 px-2"
              placeholder="如 A栋-1楼-101室"
            />
          </label>
          {!editingId && (
            <p className="text-xs text-slate-500">
              层级：{LEVEL_LABEL[form.level]}
              {form.parentId ? ` · 上级：${venueById(venues, form.parentId)?.name ?? form.parentId}` : ' · 顶级楼栋'}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">场地类型</span>
              <select
                value={form.siteType}
                onChange={(e) => setForm((f) => ({ ...f, siteType: e.target.value as VenueSiteType }))}
                className="h-9 w-full rounded-md border border-slate-200 px-2"
              >
                <option value="self_built">自建工程</option>
                <option value="crowdsourced">众包场地</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">场地分类</span>
              <input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="h-9 w-full rounded-md border border-slate-200 px-2"
              />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">建设状态</span>
              <select
                value={form.constructionStatus}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    constructionStatus: e.target.value as VenueConstructionStatus,
                  }))
                }
                className="h-9 w-full rounded-md border border-slate-200 px-2 text-xs"
              >
                <option value="planning">规划中</option>
                <option value="building">建设中</option>
                <option value="completed">已完成</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">使用状态</span>
              <select
                value={form.usageStatus}
                onChange={(e) =>
                  setForm((f) => ({ ...f, usageStatus: e.target.value as VenueUsageStatus }))
                }
                className="h-9 w-full rounded-md border border-slate-200 px-2 text-xs"
              >
                <option value="maintenance">维护中</option>
                <option value="in_use">使用中</option>
                <option value="idle">空闲</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">租赁状态</span>
              <select
                value={form.rentalStatus}
                onChange={(e) =>
                  setForm((f) => ({ ...f, rentalStatus: e.target.value as VenueRentalStatus }))
                }
                className="h-9 w-full rounded-md border border-slate-200 px-2 text-xs"
              >
                <option value="owned">自有</option>
                <option value="leasing">租赁中</option>
                <option value="returned">已退租</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">城市</span>
            <input
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              className="h-9 w-full rounded-md border border-slate-200 px-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">标签（顿号分隔）</span>
            <input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              className="h-9 w-full rounded-md border border-slate-200 px-2"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditorOpen(false)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!form.name.trim()}
              className="rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              保存
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="删除场地" size="sm">
        {deleteTarget && (
          <div className="space-y-4 text-sm">
            <p>
              确认删除 <span className="font-medium">{deleteTarget.name}</span>？
            </p>
            {(venues.some((v) => v.parentId === deleteTarget.id) ||
              scenes.some((s) => s.venueId === deleteTarget.id)) && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
                该场地下仍有子级或场景库，请先移除后再删除。
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={
                  venues.some((v) => v.parentId === deleteTarget.id) ||
                  scenes.some((s) => s.venueId === deleteTarget.id)
                }
                className="rounded-lg bg-rose-600 px-3 py-1.5 font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                确认删除
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
