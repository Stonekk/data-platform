import {
  useMemo,
  useState,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from 'react'

import {
  DataTable,
  type DataTableColumn,
  Modal,
  SearchFilter,
  type SearchFilterDef,
  StatusBadge,
  Tabs,
  type TabItem,
} from '@/components/ui'
import { mockRequirements, type Requirement } from '@/data/mock'
import { cn } from '@/lib/utils'
import { Calendar, Database, Eye, Plus, Search } from 'lucide-react'

const STATUS_LABEL: Record<Requirement['status'], string> = {
  draft: '草稿',
  executing: '执行中',
  completed: '已完成',
}

const DATA_TYPE_LABEL: Record<Requirement['dataType'], string> = {
  teleoperation: '遥操作',
  human_body: '人体数据',
  motion_capture: '动捕',
}

const TAB_ITEMS: TabItem[] = [
  { key: 'all', label: '全部' },
  { key: 'draft', label: '草稿' },
  { key: 'executing', label: '执行中' },
  { key: 'completed', label: '已完成' },
]

const FILTER_DEFS: SearchFilterDef[] = [
  {
    key: 'dataType',
    label: '数据类型',
    options: [
      { label: '全部类型', value: '' },
      { label: '遥操作', value: 'teleoperation' },
      { label: '人体数据', value: 'human_body' },
      { label: '动捕', value: 'motion_capture' },
    ],
  },
  {
    key: 'status',
    label: '状态',
    options: [
      { label: '全部状态', value: '' },
      { label: '草稿', value: 'draft' },
      { label: '执行中', value: 'executing' },
      { label: '已完成', value: 'completed' },
    ],
  },
]

function nextRequirementId(existing: Requirement[]): string {
  const nums = existing
    .map((r) => {
      const m = /^req-(\d+)$/.exec(r.id)
      return m ? Number(m[1]) : 0
    })
    .filter((n) => n > 0)
  const max = nums.length ? Math.max(...nums) : 0
  return `req-${String(max + 1).padStart(3, '0')}`
}

type NewRequirementForm = {
  title: string
  dataType: Requirement['dataType'] | ''
  scene: string
  device: string
  dataVolume: string
  deliveryDate: string
  description: string
}

const emptyForm: NewRequirementForm = {
  title: '',
  dataType: '',
  scene: '',
  device: '',
  dataVolume: '',
  deliveryDate: '',
  description: '',
}

function DetailField({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}): ReactNode {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-white/60 px-4 py-3">
      <div className="mt-0.5 shrink-0 text-text-secondary">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium uppercase tracking-wide text-text-secondary">
          {label}
        </div>
        <div className="mt-1 text-sm text-text">{children}</div>
      </div>
    </div>
  )
}

export default function Requirements(): ReactElement {
  const [requirements, setRequirements] = useState<Requirement[]>(mockRequirements)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [searchValue, setSearchValue] = useState<string>('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    dataType: '',
    status: '',
  })
  const [selected, setSelected] = useState<Requirement | null>(null)
  const [newOpen, setNewOpen] = useState<boolean>(false)
  const [newForm, setNewForm] = useState<NewRequirementForm>(emptyForm)

  const handleTabChange = (key: string): void => {
    setActiveTab(key)
    setActiveFilters((prev) => ({
      ...prev,
      status: key === 'all' ? '' : key,
    }))
  }

  const handleFilterChange = (key: string, value: string): void => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }))
    if (key === 'status') {
      setActiveTab(value === '' ? 'all' : value)
    }
  }

  const filtered = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    const statusFilter =
      activeTab !== 'all' ? activeTab : activeFilters.status || ''
    return requirements.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false
      if (activeFilters.dataType && row.dataType !== activeFilters.dataType) return false
      if (q && !row.title.toLowerCase().includes(q)) return false
      return true
    })
  }, [requirements, activeTab, activeFilters.dataType, activeFilters.status, searchValue])

  const columns: DataTableColumn<Requirement>[] = useMemo(
    () => [
      { key: 'id', title: '需求ID' },
      { key: 'title', title: '需求名称' },
      {
        key: 'status',
        title: '状态',
        render: (row) => (
          <StatusBadge status={STATUS_LABEL[row.status]} size="sm" />
        ),
      },
      {
        key: 'dataType',
        title: '数据类型',
        render: (row) => DATA_TYPE_LABEL[row.dataType],
      },
      { key: 'scene', title: '场景' },
      { key: 'dataVolume', title: '数据量' },
      { key: 'deliveryDate', title: '交付时间' },
    ],
    [],
  )

  const submitNew = (e: FormEvent): void => {
    e.preventDefault()
    const now = new Date().toISOString()
    const row: Requirement = {
      id: nextRequirementId(requirements),
      title: newForm.title.trim(),
      status: 'draft',
      dataType: newForm.dataType as Requirement['dataType'],
      scene: newForm.scene.trim() || '—',
      device: newForm.device.trim() || '—',
      dataVolume: newForm.dataVolume.trim() || '—',
      deliveryDate: newForm.deliveryDate || '—',
      createdAt: now,
      description: newForm.description.trim() || '—',
    }
    setRequirements((prev) => [row, ...prev])
    setNewOpen(false)
    setNewForm(emptyForm)
  }

  const inputClass =
    'h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-text outline-none transition-[box-shadow,border-color] placeholder:text-text-secondary focus:border-primary focus:ring-2 focus:ring-primary/20'

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Search className="size-5 text-primary" strokeWidth={1.75} aria-hidden />
            <h1 className="text-xl font-semibold tracking-tight text-text">数据需求管理</h1>
          </div>
          <p className="mt-1 text-sm text-text-secondary">维护具身数据采集需求与交付计划</p>
        </div>
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" strokeWidth={1.75} aria-hidden />
          新建需求
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <Tabs tabs={TAB_ITEMS} activeTab={activeTab} onChange={handleTabChange} />
      </div>

      <SearchFilter
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        filters={FILTER_DEFS}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        searchPlaceholder="按需求名称搜索…"
      />

      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={(row) => setSelected(row)}
      />

      <Modal
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        title="需求详情"
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Eye className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  <span className="text-xs font-medium uppercase tracking-wide">预览</span>
                </div>
                <h3 className="mt-1 text-lg font-semibold text-text">{selected.title}</h3>
                <p className="mt-1 font-mono text-xs text-text-secondary">{selected.id}</p>
              </div>
              <StatusBadge status={STATUS_LABEL[selected.status]} />
            </div>
            <p className="rounded-lg border border-border bg-slate-50/80 px-4 py-3 text-sm leading-relaxed text-text">
              {selected.description}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailField
                icon={<Database className="size-4" strokeWidth={1.75} aria-hidden />}
                label="数据类型"
              >
                {DATA_TYPE_LABEL[selected.dataType]}
              </DetailField>
              <DetailField
                icon={<Calendar className="size-4" strokeWidth={1.75} aria-hidden />}
                label="交付时间"
              >
                {selected.deliveryDate}
              </DetailField>
              <DetailField
                icon={<Database className="size-4" strokeWidth={1.75} aria-hidden />}
                label="场景"
              >
                {selected.scene}
              </DetailField>
              <DetailField
                icon={<Database className="size-4" strokeWidth={1.75} aria-hidden />}
                label="设备"
              >
                {selected.device}
              </DetailField>
              <DetailField
                icon={<Database className="size-4" strokeWidth={1.75} aria-hidden />}
                label="数据量"
              >
                {selected.dataVolume}
              </DetailField>
              <DetailField
                icon={<Calendar className="size-4" strokeWidth={1.75} aria-hidden />}
                label="创建时间"
              >
                {selected.createdAt}
              </DetailField>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={newOpen}
        onClose={() => {
          setNewOpen(false)
          setNewForm(emptyForm)
        }}
        title="新建数据需求"
        size="lg"
      >
        <form className="space-y-4" onSubmit={submitNew}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="req-title">
              需求名称
            </label>
            <input
              id="req-title"
              className={inputClass}
              value={newForm.title}
              onChange={(e) => setNewForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="简要描述采集目标"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="req-type">
              数据类型
            </label>
            <select
              id="req-type"
              className={cn(inputClass, 'cursor-pointer')}
              value={newForm.dataType}
              onChange={(e) =>
                setNewForm((f) => ({
                  ...f,
                  dataType: e.target.value as NewRequirementForm['dataType'],
                }))
              }
              required
            >
              <option value="">请选择</option>
              <option value="teleoperation">遥操作</option>
              <option value="human_body">人体数据</option>
              <option value="motion_capture">动捕</option>
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="req-scene">
                场景
              </label>
              <input
                id="req-scene"
                className={inputClass}
                value={newForm.scene}
                onChange={(e) => setNewForm((f) => ({ ...f, scene: e.target.value }))}
                placeholder="采集场景"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="req-device">
                设备
              </label>
              <input
                id="req-device"
                className={inputClass}
                value={newForm.device}
                onChange={(e) => setNewForm((f) => ({ ...f, device: e.target.value }))}
                placeholder="关联设备"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="req-volume">
                数据量
              </label>
              <input
                id="req-volume"
                className={inputClass}
                value={newForm.dataVolume}
                onChange={(e) => setNewForm((f) => ({ ...f, dataVolume: e.target.value }))}
                placeholder="如 约 1 TB"
              />
            </div>
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-text"
                htmlFor="req-delivery"
              >
                交付时间
              </label>
              <input
                id="req-delivery"
                type="date"
                className={inputClass}
                value={newForm.deliveryDate}
                onChange={(e) => setNewForm((f) => ({ ...f, deliveryDate: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="req-desc">
              描述
            </label>
            <textarea
              id="req-desc"
              className={cn(
                inputClass,
                'min-h-[100px] resize-y py-2.5',
              )}
              value={newForm.description}
              onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="采集范围、标注要求、对齐说明等"
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => {
                setNewOpen(false)
                setNewForm(emptyForm)
              }}
              className="h-10 rounded-lg border border-border bg-white px-4 text-sm font-medium text-text transition-colors hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/90"
            >
              提交
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
