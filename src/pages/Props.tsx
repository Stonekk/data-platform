import { useMemo, useState, type ReactElement } from 'react'
import { Pencil, Plus, Trash2, Upload } from 'lucide-react'

import {
  DataTable,
  type DataTableColumn,
  Modal,
  SearchFilter,
  type SearchFilterDef,
  StatusBadge,
} from '@/components/ui'
import {
  createPropId,
  normalizeApprovalOnSave,
  updatePlatformProps,
  usePlatformProps,
} from '@/data/propStore'
import { mockScenes, type Prop, type PropApprovalStatus } from '@/data/mock'
import { approveProp } from '@/lib/propApproval'

type PropFormState = {
  name: string
  assetCode: string
  sceneId: string
  category: string
  quantity: number
  requiresApproval: boolean
}

const EMPTY_FORM: PropFormState = {
  name: '',
  assetCode: '',
  sceneId: 'scene-001',
  category: '',
  quantity: 1,
  requiresApproval: false,
}

function approvalLabel(status: PropApprovalStatus): string {
  if (status === 'approved') return '已审批'
  if (status === 'pending') return '待审批'
  if (status === 'rejected') return '已驳回'
  return '无需审批'
}

export default function Props(): ReactElement {
  const [props] = usePlatformProps()
  const [search, setSearch] = useState('')
  const [sceneFilter, setSceneFilter] = useState('all')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<PropFormState>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<Prop | null>(null)

  const sceneById = useMemo(() => new Map(mockScenes.map((s) => [s.id, s.name])), [])

  const sceneFilterDef: SearchFilterDef = useMemo(
    () => ({
      key: 'scene',
      label: '场景库',
      options: [
        { value: 'all', label: '全部场景' },
        ...mockScenes.map((s) => ({ value: s.id, label: s.name })),
      ],
    }),
    [],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return props.filter((p) => {
      if (sceneFilter !== 'all' && p.sceneId !== sceneFilter) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.assetCode.toLowerCase().includes(q) ||
        (sceneById.get(p.sceneId) ?? '').toLowerCase().includes(q)
      )
    })
  }, [props, search, sceneFilter, sceneById])

  function openCreate(): void {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, assetCode: `NEW-${Date.now().toString(36).slice(-4).toUpperCase()}` })
    setEditorOpen(true)
  }

  function openEdit(row: Prop): void {
    setEditingId(row.id)
    setForm({
      name: row.name,
      assetCode: row.assetCode,
      sceneId: row.sceneId,
      category: row.category,
      quantity: row.quantity,
      requiresApproval: row.requiresApproval,
    })
    setEditorOpen(true)
  }

  function handleSave(): void {
    if (!form.name.trim() || !form.assetCode.trim()) return
    if (editingId) {
      updatePlatformProps((prev) =>
        prev.map((p) => {
          if (p.id !== editingId) return p
          const requiresApproval = form.requiresApproval
          const approvalStatus = requiresApproval
            ? p.requiresApproval && p.approvalStatus !== 'none'
              ? p.approvalStatus
              : 'none'
            : 'none'
          return {
            ...p,
            name: form.name.trim(),
            assetCode: form.assetCode.trim(),
            sceneId: form.sceneId,
            category: form.category.trim() || '未分类',
            quantity: Math.max(1, form.quantity),
            requiresApproval,
            approvalStatus: normalizeApprovalOnSave(requiresApproval, approvalStatus),
          }
        }),
      )
    } else {
      const id = createPropId(props)
      const requiresApproval = form.requiresApproval
      updatePlatformProps((prev) => [
        {
          id,
          name: form.name.trim(),
          assetCode: form.assetCode.trim(),
          sceneId: form.sceneId,
          category: form.category.trim() || '未分类',
          quantity: Math.max(1, form.quantity),
          requiresApproval,
          approvalStatus: normalizeApprovalOnSave(requiresApproval, 'none'),
        },
        ...prev,
      ])
    }
    setEditorOpen(false)
  }

  function handleDelete(): void {
    if (!deleteTarget) return
    updatePlatformProps((prev) => prev.filter((p) => p.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  function handleBatchUpload(): void {
    const nextId = createPropId(props)
    updatePlatformProps((prev) => [
      {
        id: nextId,
        name: '批量导入道具样例',
        sceneId: 'scene-001',
        category: '导入',
        requiresApproval: false,
        approvalStatus: 'none',
        assetCode: `IMP-${nextId}`,
        quantity: 1,
      },
      ...prev,
    ])
  }

  const columns: DataTableColumn<Prop>[] = [
    { key: 'assetCode', title: '资产编号' },
    { key: 'name', title: '道具名称' },
    {
      key: 'sceneId',
      title: '关联场景库',
      render: (row) => sceneById.get(row.sceneId) ?? row.sceneId,
    },
    { key: 'category', title: '类别' },
    { key: 'quantity', title: '数量' },
    {
      key: 'requiresApproval',
      title: '审批',
      render: (row) => (
        <StatusBadge
          status={row.requiresApproval ? approvalLabel(row.approvalStatus) : '无需审批'}
          size="sm"
        />
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="inline-flex items-center gap-0.5 rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="size-3" />
            编辑
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            className="inline-flex items-center gap-0.5 rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] text-rose-800 hover:bg-rose-100"
          >
            <Trash2 className="size-3" />
            删除
          </button>
          {row.requiresApproval && row.approvalStatus === 'pending' && (
            <>
              <button
                type="button"
                onClick={() => updatePlatformProps((prev) => approveProp(row.id, prev))}
                className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800 hover:bg-emerald-100"
              >
                通过
              </button>
              <button
                type="button"
                onClick={() =>
                  updatePlatformProps((prev) =>
                    prev.map((p) =>
                      p.id === row.id ? { ...p, approvalStatus: 'rejected' as const } : p,
                    ),
                  )
                }
                className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50"
              >
                驳回
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">道具管理</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            与场景库关联的道具台账；支持增删改查，贵重道具需审批后可用于台本配置
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
          >
            <Plus className="size-4" />
            新增道具
          </button>
          <button
            type="button"
            onClick={handleBatchUpload}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Upload className="size-4" />
            批量上传台账
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">道具总数</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{props.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">关联场景库</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {new Set(props.map((p) => p.sceneId)).size}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">待审批贵重道具</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">
            {props.filter((p) => p.requiresApproval && p.approvalStatus === 'pending').length}
          </p>
        </div>
      </div>

      <SearchFilter
        searchPlaceholder="搜索道具名称、资产编号、场景…"
        searchValue={search}
        onSearchChange={setSearch}
        filters={[sceneFilterDef]}
        activeFilters={{ scene: sceneFilter }}
        onFilterChange={(key, value) => {
          if (key === 'scene') setSceneFilter(value)
        }}
      />

      <DataTable columns={columns} data={filtered} />

      <Modal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editingId ? '编辑道具' : '新增道具'}
        size="md"
      >
        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">道具名称 *</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="h-9 w-full rounded-md border border-slate-200 px-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">资产编号 *</span>
            <input
              value={form.assetCode}
              onChange={(e) => setForm((f) => ({ ...f, assetCode: e.target.value }))}
              className="h-9 w-full rounded-md border border-slate-200 px-2 font-mono text-xs"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">关联场景库</span>
            <select
              value={form.sceneId}
              onChange={(e) => setForm((f) => ({ ...f, sceneId: e.target.value }))}
              className="h-9 w-full rounded-md border border-slate-200 px-2"
            >
              {mockScenes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">类别</span>
              <input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="h-9 w-full rounded-md border border-slate-200 px-2"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">数量</span>
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, quantity: Number.parseInt(e.target.value, 10) || 1 }))
                }
                className="h-9 w-full rounded-md border border-slate-200 px-2"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={form.requiresApproval}
              onChange={(e) => setForm((f) => ({ ...f, requiresApproval: e.target.checked }))}
            />
            贵重道具（需审批后可用于台本配置）
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditorOpen(false)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!form.name.trim() || !form.assetCode.trim()}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              保存
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="删除道具"
        size="sm"
      >
        {deleteTarget && (
          <div className="space-y-4 text-sm">
            <p>
              确认删除道具 <span className="font-medium">{deleteTarget.name}</span>（
              {deleteTarget.assetCode}）？删除后关联台本需重新配置道具。
            </p>
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
                className="rounded-lg bg-rose-600 px-3 py-1.5 font-medium text-white hover:bg-rose-700"
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
