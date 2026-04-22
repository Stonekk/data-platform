import {
  DataTable,
  type DataTableColumn,
  Modal,
  SearchFilter,
  type SearchFilterDef,
  StatCard,
  StatusBadge,
  Tabs,
  type TabItem,
} from '@/components/ui'
import {
  mockPersonnel,
  type Personnel,
  type PersonnelScheduleEntry,
  type PersonnelSkillRating,
  type SkillProficiency,
} from '@/data/mock'
import { cn } from '@/lib/utils'
import { Calendar, Clock, Download, FileUp, Grid3X3, List, Plus, Users } from 'lucide-react'
import { useMemo, useState, type ReactElement } from 'react'

function roleFilterOptions(personnel: Personnel[]): SearchFilterDef['options'] {
  const roles = [...new Set(personnel.map((p) => p.role))].sort()
  return [
    { value: '', label: '全部角色' },
    ...roles.map((r) => ({ value: r, label: r })),
  ]
}

function proficiencyLabel(l: SkillProficiency): string {
  if (l === 1) return '可用'
  if (l === 2) return '熟练'
  return '专家'
}

function proficiencyClass(l: SkillProficiency): string {
  if (l === 1) return 'bg-slate-100 text-slate-700 ring-slate-200'
  if (l === 2) return 'bg-amber-50 text-amber-900 ring-amber-200'
  return 'bg-emerald-50 text-emerald-900 ring-emerald-200'
}

function skillLevelFor(person: Personnel, skill: string): SkillProficiency | null {
  const rated = person.skillRatings?.find((x) => x.skill === skill)
  if (rated !== undefined) return rated.level
  if (person.skills.includes(skill)) return 2
  return null
}

type PersonnelImportRow = {
  id: string
  name?: string
  role?: string
  status?: Personnel['status']
  skills: string[]
  skillRatings: PersonnelSkillRating[]
  mode: 'create' | 'update' | 'invalid'
  error?: string
}

function parsePersonnelCsv(text: string): PersonnelImportRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  if (lines.length === 0) return []
  const firstCell = (lines[0].split(/[,，\t]/)[0] ?? '').trim().toLowerCase()
  const hasHeader = !/^per-\d{3}$/i.test(firstCell)
  const dataLines = hasHeader ? lines.slice(1) : lines

  function parseStatus(v: string): Personnel['status'] | undefined {
    const s = v.trim().toLowerCase()
    if (s === 'available' || s === '可接单' || s === '可用') return 'available'
    if (s === 'busy' || s === '忙碌') return 'busy'
    return undefined
  }

  function parseSkills(v: string): string[] {
    return v
      .split(/[;；|]/)
      .map((s) => s.trim())
      .filter(Boolean)
  }

  function parseSkillRatings(v: string): PersonnelSkillRating[] {
    if (v.trim() === '') return []
    return v
      .split(/[;；|]/)
      .map((seg) => seg.trim())
      .filter(Boolean)
      .flatMap((seg) => {
        const [skill, lv] = seg.split(':').map((s) => s.trim())
        const levelNum = Number.parseInt(lv ?? '', 10)
        if (!skill || ![1, 2, 3].includes(levelNum)) return []
        return [{ skill, level: levelNum as SkillProficiency }]
      })
  }

  const rows: PersonnelImportRow[] = []
  for (const line of dataLines) {
    const parts = line.split(/[,，\t]/).map((p) => p.trim())
    const id = parts[0] ?? ''
    const name = parts[1] || undefined
    const role = parts[2] || undefined
    const status = parseStatus(parts[3] ?? '')
    const skills = parseSkills(parts[4] ?? '')
    const skillRatings = parseSkillRatings(parts[5] ?? '')
    const err: string[] = []
    if (!id) err.push('缺少人员ID')
    if (!name) err.push('缺少姓名')
    if (!role) err.push('缺少角色')
    if (status === undefined) err.push('状态非法（available/busy）')
    if (skills.length === 0) err.push('至少提供 1 个技能')
    rows.push({
      id,
      name,
      role,
      status,
      skills,
      skillRatings,
      mode: err.length ? 'invalid' : 'create',
      error: err.length ? err.join('；') : undefined,
    })
  }
  return rows
}

export default function Personnel(): ReactElement {
  const [personnel, setPersonnel] = useState<Personnel[]>(() =>
    mockPersonnel.map((p) => ({
      ...p,
      skills: [...p.skills],
      skillRatings: p.skillRatings?.map((r) => ({ ...r })),
      schedule: p.schedule.map((s) => ({ ...s })),
    })),
  )
  const [view, setView] = useState<string>('list')
  const [search, setSearch] = useState<string>('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    status: '',
    role: '',
  })
  const [selected, setSelected] = useState<Personnel | null>(null)
  const [importPreview, setImportPreview] = useState<PersonnelImportRow[] | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false)
  const [draftPersonnel, setDraftPersonnel] = useState<{
    id: string
    name: string
    role: string
    status: Personnel['status']
    skillsInput: string
  }>({
    id: '',
    name: '',
    role: '',
    status: 'available',
    skillsInput: '',
  })

  const roleOptions = useMemo(
    () => roleFilterOptions(personnel),
    [personnel],
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

  const viewTabs: TabItem[] = [
    { key: 'list', label: '列表视图' },
    { key: 'matrix', label: '技能矩阵' },
  ]

  const allSkills = useMemo(() => {
    const s = new Set<string>()
    for (const p of personnel) {
      for (const k of p.skills) s.add(k)
      for (const r of p.skillRatings ?? []) s.add(r.skill)
    }
    return [...s].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  }, [personnel])

  const availableCount = useMemo(
    () => personnel.filter((p) => p.status === 'available').length,
    [personnel],
  )
  const busyCount = useMemo(
    () => personnel.filter((p) => p.status === 'busy').length,
    [personnel],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return personnel.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) {
        const hitSkill = p.skills.some((sk) => sk.toLowerCase().includes(q))
        if (!hitSkill) return false
      }
      if (activeFilters.status && p.status !== activeFilters.status) return false
      if (activeFilters.role && p.role !== activeFilters.role) return false
      return true
    })
  }, [search, activeFilters, personnel])

  function downloadTemplate(): void {
    const content = [
      'id,name,role,status,skills,skillRatings',
      'per-013,王晓峰,采集员,available,力控微调;双臂遥操作,力控微调:3|双臂遥操作:2',
      'per-014,李沫,动捕演员,busy,体育类动作;高强度连续动作,体育类动作:3|高强度连续动作:2',
    ].join('\n')
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'personnel-import-template.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  function applyImport(): void {
    if (importPreview === null) return
    const valid = importPreview.filter((r) => r.error === undefined)
    if (valid.length === 0) {
      setImportMessage('无有效导入行，请先修正错误')
      return
    }
    let created = 0
    let updated = 0
    setPersonnel((prev) =>
      valid.reduce<Personnel[]>((acc, row) => {
        const idx = acc.findIndex((p) => p.id === row.id)
        const payload: Personnel = {
          id: row.id,
          name: row.name ?? '',
          role: row.role ?? '',
          status: row.status ?? 'available',
          skills: [...row.skills],
          skillRatings:
            row.skillRatings.length > 0
              ? [...row.skillRatings]
              : row.skills.map((s) => ({ skill: s, level: 2 as SkillProficiency })),
          schedule: idx >= 0 ? acc[idx].schedule : [],
        }
        if (idx >= 0) {
          acc[idx] = { ...acc[idx], ...payload, schedule: acc[idx].schedule }
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

  function createPersonnel(): void {
    const id = draftPersonnel.id.trim()
    const name = draftPersonnel.name.trim()
    const role = draftPersonnel.role.trim()
    const skills = draftPersonnel.skillsInput
      .split(/[，,;；|]/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (!id || !name || !role || skills.length === 0) {
      setImportMessage('手动新增人员请补齐 ID、姓名、角色、技能')
      return
    }
    if (personnel.some((p) => p.id === id)) {
      setImportMessage(`人员 ID ${id} 已存在`)
      return
    }
    setPersonnel((prev) => [
      {
        id,
        name,
        role,
        status: draftPersonnel.status,
        skills,
        skillRatings: skills.map((s) => ({ skill: s, level: 2 as SkillProficiency })),
        schedule: [],
      },
      ...prev,
    ])
    setIsCreateModalOpen(false)
    setImportMessage(`已新增人员 ${id}`)
    setDraftPersonnel({
      id: '',
      name: '',
      role: '',
      status: 'available',
      skillsInput: '',
    })
  }

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
      render: (row) => {
        const merged = new Map<string, SkillProficiency>()
        for (const sk of row.skills) merged.set(sk, 2)
        for (const r of row.skillRatings ?? []) merged.set(r.skill, r.level)
        const pairs = [...merged.entries()]
        return (
          <div className="flex max-w-md flex-wrap gap-1">
            {pairs.map(([skill, level]) => (
              <span
                key={skill}
                className={cn(
                  'rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                  proficiencyClass(level),
                )}
                title={proficiencyLabel(level)}
              >
                {skill}
                <span className="ml-0.5 font-mono text-[10px] opacity-80">
                  L{level}
                </span>
              </span>
            ))}
          </div>
        )
      },
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
      <div className="rounded-lg border border-dashed border-primary/25 bg-primary/[0.03] px-3 py-2 text-xs text-text-secondary">
        人员资源池支持技能标签与熟练度（L1 可用 / L2 熟练 / L3 专家）；技能矩阵用于排期与任务拆解时快速匹配「人」要素。
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="人员总数" value={personnel.length} icon={Users} />
        <StatCard title="可接单" value={availableCount} icon={Calendar} />
        <StatCard title="忙碌" value={busyCount} icon={Clock} />
      </div>

      <section className="rounded-xl border border-border bg-white p-4 shadow-sm ring-1 ring-slate-950/5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text">
            <FileUp className="size-4 text-primary" strokeWidth={1.75} aria-hidden />
            人员信息导入
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
                  const rows = parsePersonnelCsv(t)
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
            手动新增人员
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
                { key: 'id', title: '人员 ID' },
                { key: 'name', title: '姓名' },
                { key: 'role', title: '角色' },
                {
                  key: 'status',
                  title: '状态',
                  render: (r: PersonnelImportRow) =>
                    r.status === 'available'
                      ? '可接单'
                      : r.status === 'busy'
                        ? '忙碌'
                        : '—',
                },
                {
                  key: 'skills',
                  title: '技能',
                  render: (r: PersonnelImportRow) => r.skills.join('、') || '—',
                },
                {
                  key: 'error',
                  title: '导入结果',
                  render: (r: PersonnelImportRow) =>
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

      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <Tabs tabs={viewTabs} activeTab={view} onChange={setView} />
      </div>

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        filters={filterDefs}
        activeFilters={activeFilters}
        onFilterChange={(key, value) => {
          setActiveFilters((prev) => ({ ...prev, [key]: value }))
        }}
        searchPlaceholder="按姓名或技能关键词搜索…"
      />

      {view === 'list' && (
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm ring-1 ring-slate-950/5">
          <div className="mb-3 flex items-center gap-2 text-sm text-text-secondary">
            <List className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
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
      )}

      {view === 'matrix' && (
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm ring-1 ring-slate-950/5">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
            <Grid3X3 className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            <span>
              技能矩阵 · <span className="font-semibold text-text">{allSkills.length}</span>{' '}
              项技能 × {filtered.length} 人（空单元表示未覆盖该技能）
            </span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-max w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50/90">
                  <th className="sticky left-0 z-10 border-r border-border bg-slate-50/95 px-3 py-2 font-semibold text-text">
                    人员
                  </th>
                  <th className="whitespace-nowrap border-r border-border px-3 py-2 text-xs font-medium text-text-secondary">
                    角色
                  </th>
                  {allSkills.map((sk) => (
                    <th
                      key={sk}
                      className="max-w-[140px] whitespace-normal border-r border-border px-2 py-2 text-xs font-medium text-text-secondary last:border-r-0"
                    >
                      {sk}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-b-0 hover:bg-slate-50/80">
                    <td className="sticky left-0 z-10 border-r border-border bg-white px-3 py-2 font-medium text-text">
                      <button
                        type="button"
                        onClick={() => setSelected(p)}
                        className="text-left hover:text-primary hover:underline"
                      >
                        {p.name}
                      </button>
                      <div className="font-mono text-[10px] text-text-secondary">{p.id}</div>
                    </td>
                    <td className="whitespace-nowrap border-r border-border px-3 py-2 text-xs text-text-secondary">
                      {p.role}
                    </td>
                    {allSkills.map((sk) => {
                      const lv = skillLevelFor(p, sk)
                      return (
                        <td
                          key={sk}
                          className="border-r border-border px-1 py-1.5 text-center last:border-r-0"
                        >
                          {lv === null ? (
                            <span className="text-border">—</span>
                          ) : (
                            <span
                              className={cn(
                                'inline-flex min-w-[2.25rem] justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
                                proficiencyClass(lv),
                              )}
                              title={proficiencyLabel(lv)}
                            >
                              L{lv}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="手动新增人员"
        size="md"
      >
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-text-secondary">人员 ID</span>
            <input
              value={draftPersonnel.id}
              onChange={(e) =>
                setDraftPersonnel((prev) => ({ ...prev, id: e.target.value }))
              }
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-text-secondary">姓名</span>
            <input
              value={draftPersonnel.name}
              onChange={(e) =>
                setDraftPersonnel((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-text-secondary">角色</span>
            <input
              value={draftPersonnel.role}
              onChange={(e) =>
                setDraftPersonnel((prev) => ({ ...prev, role: e.target.value }))
              }
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-text-secondary">状态</span>
            <select
              value={draftPersonnel.status}
              onChange={(e) =>
                setDraftPersonnel((prev) => ({
                  ...prev,
                  status: e.target.value as Personnel['status'],
                }))
              }
              className="w-full rounded-lg border border-border px-3 py-2"
            >
              <option value="available">可接单</option>
              <option value="busy">忙碌</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-text-secondary">技能（逗号分隔）</span>
            <input
              value={draftPersonnel.skillsInput}
              onChange={(e) =>
                setDraftPersonnel((prev) => ({
                  ...prev,
                  skillsInput: e.target.value,
                }))
              }
              placeholder="双臂遥操作, 力控微调"
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
            onClick={createPersonnel}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            新增人员
          </button>
        </div>
      </Modal>
    </div>
  )
}
