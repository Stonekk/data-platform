import {
  DataTable,
  type DataTableColumn,
  Modal,
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
  Download,
  FileUp,
  Plus,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useCallback, useMemo, useState, type ReactElement } from 'react'

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

type ImportRow = {
  id: string
  name?: string
  type?: string
  status?: Device['status']
  healthStatus?: Device['healthStatus']
  lastMaintenance?: string
  nextMaintenanceAt?: string
  nextCalibrationAt?: string
  location?: string
  mode: 'create' | 'update' | 'invalid'
  error?: string
}

function parseDeviceMaintenanceCsv(text: string): ImportRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  if (lines.length === 0) return []

  const firstCell = (lines[0].split(/[,，\t]/)[0] ?? '').trim().toLowerCase()
  const looksLikeDeviceRow = /^dev-\d{3}$/i.test(firstCell)
  const hasHeader = !looksLikeDeviceRow
  const dataLines = hasHeader ? lines.slice(1) : lines

  const dateRe = /^\d{4}-\d{2}-\d{2}$/
  const rows: ImportRow[] = []

  function parseStatus(v: string): Device['status'] | undefined {
    const value = v.trim().toLowerCase()
    if (value === 'available' || value === '可用') return 'available'
    if (value === 'unavailable' || value === '不可用') return 'unavailable'
    return undefined
  }

  function parseHealth(v: string): Device['healthStatus'] | undefined {
    const value = v.trim().toLowerCase()
    if (value === 'healthy' || value === '健康') return 'healthy'
    if (value === 'warning' || value === '预警') return 'warning'
    if (value === 'critical' || value === '严重') return 'critical'
    if (value === 'maintenance' || value === '维护中') return 'maintenance'
    return undefined
  }

  for (const line of dataLines) {
    const parts = line.split(/[,，\t]/).map((p) => p.trim())
    const id = parts[0] ?? ''
    const name = parts[1] || undefined
    const type = parts[2] || undefined
    const status = parseStatus(parts[3] ?? '')
    const healthStatus = parseHealth(parts[4] ?? '')
    const lastMaintenance = parts[5] || undefined
    const nextM = parts[6] || undefined
    const nextC = parts[7] || undefined
    const location = parts[8] || undefined
    const err: string[] = []

    if (!id) err.push('缺少设备 ID')
    if (name === undefined || name === '') err.push('缺少设备名称')
    if (type === undefined || type === '') err.push('缺少设备类型')
    if (status === undefined) err.push('状态非法（可用 available / 不可用 unavailable）')
    if (healthStatus === undefined)
      err.push('健康状态非法（healthy/warning/critical/maintenance）')
    if (lastMaintenance === undefined || !dateRe.test(lastMaintenance)) {
      err.push('上次维护日期格式错误（YYYY-MM-DD）')
    }
    if (nextM !== undefined && nextM !== '' && !dateRe.test(nextM)) {
      err.push(`维护日期格式错误: ${nextM}`)
    }
    if (nextC !== undefined && nextC !== '' && !dateRe.test(nextC)) {
      err.push(`校准日期格式错误: ${nextC}`)
    }
    rows.push({
      id,
      name,
      type,
      status,
      healthStatus,
      lastMaintenance: lastMaintenance && dateRe.test(lastMaintenance) ? lastMaintenance : undefined,
      nextMaintenanceAt: nextM && dateRe.test(nextM) ? nextM : undefined,
      nextCalibrationAt: nextC && dateRe.test(nextC) ? nextC : undefined,
      location,
      mode: err.length ? 'invalid' : 'create',
      error: err.length ? err.join('；') : undefined,
    })
  }
  return rows
}

function formatDateCell(v: string | undefined): string {
  if (v === undefined || v === '') return '—'
  return v
}

export default function Devices(): ReactElement {
  const [devices, setDevices] = useState<Device[]>(() =>
    mockDevices.map((d) => ({ ...d })),
  )
  const [search, setSearch] = useState<string>('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    type: '',
    status: '',
  })

  const [importPreview, setImportPreview] = useState<ImportRow[] | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false)
  const [draftDevice, setDraftDevice] = useState<Device>({
    id: '',
    name: '',
    type: '遥操作主站',
    status: 'available',
    healthStatus: 'healthy',
    lastMaintenance: '2025-04-01',
    nextMaintenanceAt: '',
    nextCalibrationAt: '',
    location: '',
  })

  const availableCount = useMemo(
    () => devices.filter((d) => d.status === 'available').length,
    [devices],
  )
  const unavailableCount = useMemo(
    () => devices.filter((d) => d.status === 'unavailable').length,
    [devices],
  )
  const healthWarningCount = useMemo(
    () => devices.filter((d) => d.healthStatus === 'warning').length,
    [devices],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return devices.filter((d) => {
      if (q && !d.name.toLowerCase().includes(q) && !d.id.toLowerCase().includes(q))
        return false
      if (activeFilters.type && d.type !== activeFilters.type) return false
      if (activeFilters.status && d.status !== activeFilters.status) return false
      return true
    })
  }, [search, activeFilters, devices])

  const applyImport = useCallback(() => {
    if (importPreview === null || importPreview.length === 0) return
    const valid = importPreview.filter((r) => r.error === undefined && r.id)
    if (valid.length === 0) {
      setImportMessage('没有可合并的有效行（请修正标红错误后重试）')
      return
    }
    let created = 0
    let updated = 0
    setDevices((prev) =>
      valid.reduce<Device[]>((acc, row) => {
        const idx = acc.findIndex((d) => d.id === row.id)
        const payload: Device = {
          id: row.id,
          name: row.name ?? '',
          type: row.type ?? '',
          status: row.status ?? 'available',
          healthStatus: row.healthStatus ?? 'healthy',
          lastMaintenance: row.lastMaintenance ?? '',
          nextMaintenanceAt: row.nextMaintenanceAt,
          nextCalibrationAt: row.nextCalibrationAt,
          location: row.location ?? '',
        }
        if (idx >= 0) {
          acc[idx] = { ...acc[idx], ...payload }
          updated += 1
        } else {
          acc.push(payload)
          created += 1
        }
        return acc
      }, [...prev]),
    )
    setImportMessage(
      `已导入 ${valid.length} 条：新增 ${created} 条，更新 ${updated} 条（Demo，未写后端）`,
    )
    setImportPreview(null)
  }, [importPreview])

  const downloadTemplate = useCallback(() => {
    const content = [
      'id,name,type,status,healthStatus,lastMaintenance,nextMaintenanceAt,nextCalibrationAt,location',
      'dev-013,双臂遥操作台 A3,遥操作主站,available,healthy,2025-04-01,2025-05-01,2025-04-20,实验室 A 区',
      'dev-014,动捕套装 M4,光学动捕,unavailable,maintenance,2025-03-28,2025-04-05,2025-04-05,动捕棚 3',
    ].join('\n')
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'device-import-template.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }, [])

  const createDevice = useCallback(() => {
    if (
      draftDevice.id.trim() === '' ||
      draftDevice.name.trim() === '' ||
      draftDevice.type.trim() === '' ||
      draftDevice.lastMaintenance.trim() === '' ||
      draftDevice.location.trim() === ''
    ) {
      setImportMessage('请补齐手动新增设备的必填项')
      return
    }
    if (devices.some((d) => d.id === draftDevice.id.trim())) {
      setImportMessage(`设备 ID ${draftDevice.id.trim()} 已存在`)
      return
    }
    setDevices((prev) => [
      {
        ...draftDevice,
        id: draftDevice.id.trim(),
        name: draftDevice.name.trim(),
        type: draftDevice.type.trim(),
        location: draftDevice.location.trim(),
        nextMaintenanceAt: draftDevice.nextMaintenanceAt?.trim() || undefined,
        nextCalibrationAt: draftDevice.nextCalibrationAt?.trim() || undefined,
      },
      ...prev,
    ])
    setIsCreateModalOpen(false)
    setImportMessage(`已新增设备 ${draftDevice.id.trim()}`)
    setDraftDevice({
      id: '',
      name: '',
      type: '遥操作主站',
      status: 'available',
      healthStatus: 'healthy',
      lastMaintenance: '2025-04-01',
      nextMaintenanceAt: '',
      nextCalibrationAt: '',
      location: '',
    })
  }, [devices, draftDevice])

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
    {
      key: 'nextMaintenanceAt',
      title: '计划维护',
      render: (row) => (
        <span className="font-mono text-xs text-text-secondary">
          {formatDateCell(row.nextMaintenanceAt)}
        </span>
      ),
    },
    {
      key: 'nextCalibrationAt',
      title: '计划校准',
      render: (row) => (
        <span className="font-mono text-xs text-text-secondary">
          {formatDateCell(row.nextCalibrationAt)}
        </span>
      ),
    },
    { key: 'location', title: '位置' },
  ]

  const importColumns: DataTableColumn<ImportRow>[] = [
    { key: 'id', title: '设备 ID' },
    { key: 'name', title: '名称' },
    { key: 'type', title: '类型' },
    {
      key: 'status',
      title: '状态',
      render: (r) => (r.status === 'available' ? '可用' : r.status === 'unavailable' ? '不可用' : '—'),
    },
    {
      key: 'healthStatus',
      title: '健康',
      render: (r) => (r.healthStatus ? healthLabel[r.healthStatus] : '—'),
    },
    {
      key: 'nextMaintenanceAt',
      title: '计划维护',
      render: (r) => r.nextMaintenanceAt ?? '—',
    },
    {
      key: 'nextCalibrationAt',
      title: '计划校准',
      render: (r) => r.nextCalibrationAt ?? '—',
    },
    {
      key: 'error',
      title: '导入结果',
      render: (r) =>
        r.error !== undefined ? (
          <span className="text-xs text-rose-700">{r.error}</span>
        ) : (
          <span className="text-xs text-emerald-700">通过</span>
        ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="设备总数" value={devices.length} icon={Cpu} />
        <StatCard title="可用" value={availableCount} icon={CheckCircle2} />
        <StatCard title="不可用" value={unavailableCount} icon={WifiOff} />
        <StatCard title="健康预警" value={healthWarningCount} icon={AlertTriangle} />
      </div>

      <section className="rounded-xl border border-border bg-white p-4 shadow-sm ring-1 ring-slate-950/5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text">
            <FileUp className="size-4 text-primary" strokeWidth={1.75} aria-hidden />
            设备信息导入
          </h3>
          <span className="text-xs text-text-secondary">
            支持 CSV 模板导入 + 手动新增
          </span>
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
                  const rows = parseDeviceMaintenanceCsv(t)
                  setImportPreview(rows)
                  setImportMessage(
                    rows.length ? `已解析 ${rows.length} 行，请核对预览后合并` : '文件为空',
                  )
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
            手动新增设备
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
            <DataTable columns={importColumns} data={importPreview} />
          </div>
        )}
      </section>

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        filters={deviceFilterDefs}
        activeFilters={activeFilters}
        onFilterChange={(key, value) => {
          setActiveFilters((prev) => ({ ...prev, [key]: value }))
        }}
        searchPlaceholder="按设备名称或 ID 搜索…"
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

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="手动新增设备"
        size="lg"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-text-secondary">设备 ID</span>
            <input
              value={draftDevice.id}
              onChange={(e) =>
                setDraftDevice((prev) => ({ ...prev, id: e.target.value }))
              }
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-text-secondary">设备名称</span>
            <input
              value={draftDevice.name}
              onChange={(e) =>
                setDraftDevice((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-text-secondary">类型</span>
            <input
              value={draftDevice.type}
              onChange={(e) =>
                setDraftDevice((prev) => ({ ...prev, type: e.target.value }))
              }
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-text-secondary">位置</span>
            <input
              value={draftDevice.location}
              onChange={(e) =>
                setDraftDevice((prev) => ({ ...prev, location: e.target.value }))
              }
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-text-secondary">状态</span>
            <select
              value={draftDevice.status}
              onChange={(e) =>
                setDraftDevice((prev) => ({
                  ...prev,
                  status: e.target.value as Device['status'],
                }))
              }
              className="w-full rounded-lg border border-border px-3 py-2"
            >
              <option value="available">可用</option>
              <option value="unavailable">不可用</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-text-secondary">健康状态</span>
            <select
              value={draftDevice.healthStatus}
              onChange={(e) =>
                setDraftDevice((prev) => ({
                  ...prev,
                  healthStatus: e.target.value as Device['healthStatus'],
                }))
              }
              className="w-full rounded-lg border border-border px-3 py-2"
            >
              <option value="healthy">健康</option>
              <option value="warning">预警</option>
              <option value="critical">严重</option>
              <option value="maintenance">维护中</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-text-secondary">上次维护</span>
            <input
              value={draftDevice.lastMaintenance}
              onChange={(e) =>
                setDraftDevice((prev) => ({
                  ...prev,
                  lastMaintenance: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-text-secondary">计划维护</span>
            <input
              value={draftDevice.nextMaintenanceAt ?? ''}
              onChange={(e) =>
                setDraftDevice((prev) => ({
                  ...prev,
                  nextMaintenanceAt: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-xs text-text-secondary">计划校准（可选）</span>
            <input
              value={draftDevice.nextCalibrationAt ?? ''}
              onChange={(e) =>
                setDraftDevice((prev) => ({
                  ...prev,
                  nextCalibrationAt: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-border px-3 py-2"
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
            onClick={createDevice}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            新增设备
          </button>
        </div>
      </Modal>
    </div>
  )
}
