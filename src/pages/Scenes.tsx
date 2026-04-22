import {
  DataTable,
  type DataTableColumn,
  Modal,
  SearchFilter,
  type SearchFilterDef,
  StatCard,
  StatusBadge,
} from '@/components/ui'
import { mockScenes, type Scene, type SceneStatus } from '@/data/mock'
import { cn } from '@/lib/utils'
import { ChevronRight, Download, FileUp, MapPin, Plus } from 'lucide-react'
import { useMemo, useState, type ReactElement } from 'react'

function sceneStatusLabel(status: SceneStatus): string {
  if (status === 'active') return '活跃'
  if (status === 'inactive') return '未启用'
  return '维护中'
}

function industryFilterOptions(scenes: Scene[]): SearchFilterDef['options'] {
  const industries = [...new Set(scenes.map((s) => s.industry))].sort()
  return [
    { value: '', label: '全部行业' },
    ...industries.map((t) => ({ value: t, label: t })),
  ]
}

function typeFilterOptions(scenes: Scene[]): SearchFilterDef['options'] {
  const types = [...new Set(scenes.map((s) => s.type))].sort()
  return [
    { value: '', label: '全部场景类型' },
    ...types.map((t) => ({ value: t, label: t })),
  ]
}

function subtypeFilterOptions(scenes: Scene[]): SearchFilterDef['options'] {
  const sub = [...new Set(scenes.map((s) => s.sceneSubtype))].sort()
  return [
    { value: '', label: '全部子类型' },
    ...sub.map((t) => ({ value: t, label: t })),
  ]
}

type SceneImportRow = {
  id: string
  name?: string
  industry?: string
  type?: string
  sceneSubtype?: string
  status?: Scene['status']
  location?: string
  description?: string
  error?: string
}

function parseSceneCsv(text: string): SceneImportRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  if (lines.length === 0) return []
  const firstCell = (lines[0].split(/[,，\t]/)[0] ?? '').trim().toLowerCase()
  const hasHeader = !/^scene-\d{3}$/i.test(firstCell)
  const dataLines = hasHeader ? lines.slice(1) : lines

  function parseStatus(v: string): Scene['status'] | undefined {
    const s = v.trim().toLowerCase()
    if (s === 'active' || s === '活跃') return 'active'
    if (s === 'inactive' || s === '未启用') return 'inactive'
    if (s === 'maintenance' || s === '维护中') return 'maintenance'
    return undefined
  }

  const rows: SceneImportRow[] = []
  for (const line of dataLines) {
    const parts = line.split(/[,，\t]/).map((p) => p.trim())
    const row: SceneImportRow = {
      id: parts[0] ?? '',
      name: parts[1] || undefined,
      industry: parts[2] || undefined,
      type: parts[3] || undefined,
      sceneSubtype: parts[4] || undefined,
      status: parseStatus(parts[5] ?? ''),
      location: parts[6] || undefined,
      description: parts[7] || undefined,
    }
    const err: string[] = []
    if (!row.id) err.push('缺少场景ID')
    if (!row.name) err.push('缺少场景名称')
    if (!row.industry) err.push('缺少行业')
    if (!row.type) err.push('缺少类型')
    if (!row.sceneSubtype) err.push('缺少子类型')
    if (!row.status) err.push('状态非法（active/inactive/maintenance）')
    if (!row.location) err.push('缺少位置')
    if (!row.description) err.push('缺少描述')
    row.error = err.length ? err.join('；') : undefined
    rows.push(row)
  }
  return rows
}

export default function Scenes(): ReactElement {
  const [scenes, setScenes] = useState<Scene[]>(() =>
    mockScenes.map((s) => ({ ...s })),
  )
  const [search, setSearch] = useState<string>('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    industry: '',
    type: '',
    sceneSubtype: '',
    status: '',
  })
  const [importPreview, setImportPreview] = useState<SceneImportRow[] | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false)
  const [draftScene, setDraftScene] = useState<Scene>({
    id: '',
    name: '',
    industry: '',
    type: '',
    sceneSubtype: '',
    status: 'active',
    location: '',
    description: '',
  })

  const industryOptions = useMemo(() => industryFilterOptions(scenes), [scenes])
  const typeOptions = useMemo(() => typeFilterOptions(scenes), [scenes])
  const subtypeOptions = useMemo(() => subtypeFilterOptions(scenes), [scenes])

  const filterDefs: SearchFilterDef[] = useMemo(
    () => [
      {
        key: 'industry',
        label: '全部行业',
        options: industryOptions,
      },
      {
        key: 'type',
        label: '全部场景类型',
        options: typeOptions,
      },
      {
        key: 'sceneSubtype',
        label: '全部子类型',
        options: subtypeOptions,
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
    [industryOptions, typeOptions, subtypeOptions],
  )

  const activeCount = useMemo(
    () => scenes.filter((s) => s.status === 'active').length,
    [scenes],
  )
  const inactiveCount = useMemo(
    () => scenes.filter((s) => s.status === 'inactive').length,
    [scenes],
  )
  const maintenanceCount = useMemo(
    () => scenes.filter((s) => s.status === 'maintenance').length,
    [scenes],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return scenes.filter((s) => {
      if (
        q &&
        !s.name.toLowerCase().includes(q) &&
        !s.sceneSubtype.toLowerCase().includes(q) &&
        !s.industry.toLowerCase().includes(q)
      ) {
        return false
      }
      if (activeFilters.industry && s.industry !== activeFilters.industry) return false
      if (activeFilters.type && s.type !== activeFilters.type) return false
      if (activeFilters.sceneSubtype && s.sceneSubtype !== activeFilters.sceneSubtype)
        return false
      if (activeFilters.status && s.status !== activeFilters.status) return false
      return true
    })
  }, [search, activeFilters, scenes])

  function downloadTemplate(): void {
    const content = [
      'id,name,industry,type,sceneSubtype,status,location,description',
      'scene-013,家庭客厅标准间,生活服务,家庭服务,客厅抓取区域,active,B 栋 3 层,支持收纳与日常交互动作采集',
      'scene-014,园区道路交汇口,移动机器人,移动机器人,十字路口,maintenance,园区外场,高峰期需封控后采集',
    ].join('\n')
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'scene-import-template.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  function applyImport(): void {
    if (importPreview === null) return
    const valid = importPreview.filter((r) => r.error === undefined)
    if (valid.length === 0) {
      setImportMessage('无有效导入行，请修正错误后重试')
      return
    }
    let created = 0
    let updated = 0
    setScenes((prev) =>
      valid.reduce<Scene[]>((acc, row) => {
        const idx = acc.findIndex((s) => s.id === row.id)
        const payload: Scene = {
          id: row.id,
          name: row.name ?? '',
          industry: row.industry ?? '',
          type: row.type ?? '',
          sceneSubtype: row.sceneSubtype ?? '',
          status: row.status ?? 'active',
          location: row.location ?? '',
          description: row.description ?? '',
        }
        if (idx >= 0) {
          acc[idx] = payload
          updated += 1
        } else {
          acc.push(payload)
          created += 1
        }
        return acc
      }, [...prev]),
    )
    setImportPreview(null)
    setImportMessage(`已导入 ${valid.length} 条：新增 ${created}，更新 ${updated}`)
  }

  function createScene(): void {
    if (
      draftScene.id.trim() === '' ||
      draftScene.name.trim() === '' ||
      draftScene.industry.trim() === '' ||
      draftScene.type.trim() === '' ||
      draftScene.sceneSubtype.trim() === '' ||
      draftScene.location.trim() === '' ||
      draftScene.description.trim() === ''
    ) {
      setImportMessage('请补齐场景新增表单的必填项')
      return
    }
    if (scenes.some((s) => s.id === draftScene.id.trim())) {
      setImportMessage(`场景 ID ${draftScene.id.trim()} 已存在`)
      return
    }
    setScenes((prev) => [
      {
        ...draftScene,
        id: draftScene.id.trim(),
        name: draftScene.name.trim(),
        industry: draftScene.industry.trim(),
        type: draftScene.type.trim(),
        sceneSubtype: draftScene.sceneSubtype.trim(),
        location: draftScene.location.trim(),
        description: draftScene.description.trim(),
      },
      ...prev,
    ])
    setIsCreateModalOpen(false)
    setImportMessage(`已新增场景 ${draftScene.id.trim()}`)
    setDraftScene({
      id: '',
      name: '',
      industry: '',
      type: '',
      sceneSubtype: '',
      status: 'active',
      location: '',
      description: '',
    })
  }

  const columns: DataTableColumn<Scene>[] = [
    { key: 'id', title: 'ID' },
    { key: 'name', title: '场景名称' },
    {
      key: 'hierarchy',
      title: '层级（行业 → 类型 → 子类型）',
      render: (row) => (
        <div className="flex max-w-lg flex-wrap items-center gap-1 text-xs text-text-secondary">
          <span className="rounded-md bg-sky-50 px-1.5 py-0.5 font-medium text-sky-900 ring-1 ring-inset ring-sky-200">
            {row.industry}
          </span>
          <ChevronRight className="size-3 shrink-0 text-border" aria-hidden />
          <span className="rounded-md bg-violet-50 px-1.5 py-0.5 font-medium text-violet-900 ring-1 ring-inset ring-violet-200">
            {row.type}
          </span>
          <ChevronRight className="size-3 shrink-0 text-border" aria-hidden />
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-800 ring-1 ring-inset ring-slate-200">
            {row.sceneSubtype}
          </span>
        </div>
      ),
    },
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
      <div className="rounded-lg border border-dashed border-primary/25 bg-primary/[0.03] px-3 py-2 text-xs text-text-secondary">
        资源池场景按「行业 → 场景类型 → 子类型」三层归类，便于与需求侧 CU 域及任务拆解时的场地筛选对齐。
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="场景总数" value={scenes.length} icon={MapPin} />
        <StatCard title="活跃" value={activeCount} icon={MapPin} />
        <StatCard title="未启用" value={inactiveCount} icon={MapPin} />
        <StatCard title="维护中" value={maintenanceCount} icon={MapPin} />
      </div>

      <section className="rounded-xl border border-border bg-white p-4 shadow-sm ring-1 ring-slate-950/5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text">
            <FileUp className="size-4 text-primary" strokeWidth={1.75} aria-hidden />
            场景信息导入
          </h3>
          <span className="text-xs text-text-secondary">支持 CSV 模板导入 + 手动新增</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-slate-50"
          >
            <Download className="size-4" strokeWidth={1.75} aria-hidden />
            下载 CSV 模板
          </button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/[0.04] px-3 py-2 text-sm font-medium text-primary hover:bg-primary/[0.08]">
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f === undefined) return
                void f.text().then((t) => {
                  const rows = parseSceneCsv(t)
                  setImportPreview(rows)
                  setImportMessage(rows.length ? `已解析 ${rows.length} 行` : '文件为空')
                })
              }}
            />
            选择 CSV 文件
          </label>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="size-4" strokeWidth={1.75} aria-hidden />
            手动新增场景
          </button>
          {importPreview !== null && importPreview.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => {
                  setImportPreview(null)
                  setImportMessage(null)
                }}
                className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-slate-50"
              >
                清除预览
              </button>
              <button
                type="button"
                onClick={applyImport}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                导入到当前列表（Demo）
              </button>
            </>
          )}
        </div>
        {importMessage !== null && (
          <p className="mt-2 text-xs text-text-secondary">{importMessage}</p>
        )}
        {importPreview !== null && importPreview.length > 0 && (
          <div className="mt-4">
            <DataTable
              columns={[
                { key: 'id', title: '场景ID' },
                { key: 'name', title: '名称' },
                { key: 'industry', title: '行业' },
                { key: 'type', title: '类型' },
                { key: 'sceneSubtype', title: '子类型' },
                {
                  key: 'status',
                  title: '状态',
                  render: (r: SceneImportRow) =>
                    r.status ? sceneStatusLabel(r.status) : '—',
                },
                {
                  key: 'error',
                  title: '导入结果',
                  render: (r: SceneImportRow) =>
                    r.error ? (
                      <span className="text-xs text-rose-700">{r.error}</span>
                    ) : (
                      <span className="text-xs text-emerald-700">通过</span>
                    ),
                },
              ]}
              data={importPreview}
            />
          </div>
        )}
      </section>

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        filters={filterDefs}
        activeFilters={activeFilters}
        onFilterChange={(key, value) => {
          setActiveFilters((prev) => ({ ...prev, [key]: value }))
        }}
        searchPlaceholder="按场景名称、行业或子类型搜索…"
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

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="手动新增场景"
        size="lg"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-text-secondary">场景 ID</span>
            <input
              value={draftScene.id}
              onChange={(e) =>
                setDraftScene((prev) => ({ ...prev, id: e.target.value }))
              }
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-text-secondary">场景名称</span>
            <input
              value={draftScene.name}
              onChange={(e) =>
                setDraftScene((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-text-secondary">行业</span>
            <input
              value={draftScene.industry}
              onChange={(e) =>
                setDraftScene((prev) => ({ ...prev, industry: e.target.value }))
              }
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-text-secondary">类型</span>
            <input
              value={draftScene.type}
              onChange={(e) =>
                setDraftScene((prev) => ({ ...prev, type: e.target.value }))
              }
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-text-secondary">子类型</span>
            <input
              value={draftScene.sceneSubtype}
              onChange={(e) =>
                setDraftScene((prev) => ({ ...prev, sceneSubtype: e.target.value }))
              }
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-text-secondary">状态</span>
            <select
              value={draftScene.status}
              onChange={(e) =>
                setDraftScene((prev) => ({
                  ...prev,
                  status: e.target.value as Scene['status'],
                }))
              }
              className="w-full rounded-lg border border-border px-3 py-2"
            >
              <option value="active">活跃</option>
              <option value="inactive">未启用</option>
              <option value="maintenance">维护中</option>
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-xs text-text-secondary">位置</span>
            <input
              value={draftScene.location}
              onChange={(e) =>
                setDraftScene((prev) => ({ ...prev, location: e.target.value }))
              }
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-xs text-text-secondary">描述</span>
            <textarea
              rows={3}
              value={draftScene.description}
              onChange={(e) =>
                setDraftScene((prev) => ({ ...prev, description: e.target.value }))
              }
              className="w-full resize-none rounded-lg border border-border px-3 py-2"
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(false)}
            className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-slate-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={createScene}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            新增场景
          </button>
        </div>
      </Modal>
    </div>
  )
}
