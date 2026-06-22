import { useEffect, useMemo, useState, type ReactElement } from 'react'
import {
  CheckCircle2,
  ChevronRight,
  Eye,
  Loader2,
  Sparkles,
  XCircle,
} from 'lucide-react'

import {
  mockScenes,
  type Requirement,
  type RequirementScriptBatch,
  type ScriptDifficulty,
  type ScriptTaskAllocation,
  type Task,
  type TaskScript,
} from '@/data/mock'
import { ScriptContentCard } from '@/components/tasks/ScriptContentCard'
import { ScriptQcBadge, ScriptQcSummaryBar } from '@/components/tasks/ScriptQcBadge'
import { ScriptGroupingEditor } from '@/components/tasks/ScriptGroupingEditor'
import { usePlatformProps } from '@/data/propStore'
import {
  getScriptGeneratorMode,
  scriptGeneratorModeLabel,
} from '@/lib/scriptGenerator'
import {
  buildRequirementProfile,
  buildTaskUnitsFromGroups,
  candidateSceneIdsForRequirement,
  confirmScripts,
  draftsToGroupPreviews,
  generateRequirementScriptBatch,
  rejectScripts,
  suggestTaskGroupingDrafts,
  taskTypeFromRequirement,
  withProfileSceneSelection,
  type TaskGroupingDraft,
} from '@/lib/scriptBatchWorkflow'
import { sortScriptsByQcScore, summarizeScriptQc, isScriptQcPassed } from '@/lib/scriptGenerator'
import { mergeAllocations } from '@/lib/taskScriptAccess'
import { SCRIPT_DIFFICULTY_LABEL } from '@/lib/scriptWorkflow'
import { cn } from '@/lib/utils'

type DecompositionStep = 'profile' | 'scripts' | 'grouping' | 'generate'
type DifficultyFilter = 'all' | ScriptDifficulty

const BATCH_PRESETS = [10, 30, 50] as const

const DIFFICULTY_FILTER_OPTIONS: { id: DifficultyFilter; label: string }[] = [
  { id: 'all', label: '全部难度' },
  { id: 'simple', label: '简单' },
  { id: 'complex', label: '复杂' },
  { id: 'correction', label: '纠正' },
]

function difficultyBadgeClass(difficulty: ScriptDifficulty): string {
  if (difficulty === 'simple') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (difficulty === 'complex') return 'bg-amber-50 text-amber-800 border-amber-200'
  return 'bg-sky-50 text-sky-800 border-sky-200'
}

export type ScriptFirstDecompositionProps = {
  decomposableRequirements: Requirement[]
  selectedReqId: string
  onSelectRequirement: (id: string) => void
  selectedRequirement: Requirement | null
  taskScripts: TaskScript[]
  onTaskScriptsChange: (scripts: TaskScript[]) => void
  tasks: Task[]
  onTasksChange: (tasks: Task[]) => void
  onRequirementsLinked: (requirementId: string, newTaskIds: string[], allTasks: Task[]) => void
  selectedReqTasks: Task[]
}

export function ScriptFirstDecomposition({
  decomposableRequirements,
  selectedReqId,
  onSelectRequirement,
  selectedRequirement,
  taskScripts,
  onTaskScriptsChange,
  tasks,
  onTasksChange,
  onRequirementsLinked,
  selectedReqTasks,
}: ScriptFirstDecompositionProps): ReactElement {
  const [props] = usePlatformProps()
  const [step, setStep] = useState<DecompositionStep>('profile')
  const [, setBatches] = useState<RequirementScriptBatch[]>([])
  const [generatingBatch, setGeneratingBatch] = useState<number | null>(null)
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all')
  const [defaultTargetCountInput, setDefaultTargetCountInput] = useState('30')
  const defaultTargetCount = Math.max(1, Number.parseInt(defaultTargetCountInput, 10) || 1)
  const generatorMode = getScriptGeneratorMode()
  const generatorModeLabel = scriptGeneratorModeLabel(generatorMode)
  const [selectedScriptIds, setSelectedScriptIds] = useState<Set<string>>(new Set())
  const [allocations, setAllocations] = useState<ScriptTaskAllocation[]>([])
  const [defaultTaskType, setDefaultTaskType] = useState('遥操作采集')
  const [profileSceneOverrides, setProfileSceneOverrides] = useState<Record<string, string[]>>({})
  const [groupingDrafts, setGroupingDrafts] = useState<TaskGroupingDraft[]>([])
  const [groupingConfirmed, setGroupingConfirmed] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [activeScriptId, setActiveScriptId] = useState<string | null>(null)
  const [poolTab, setPoolTab] = useState<'candidate' | 'confirmed'>('candidate')

  const baseProfile = useMemo(() => {
    if (!selectedRequirement) return null
    return buildRequirementProfile(selectedRequirement, mockScenes, props)
  }, [selectedRequirement, props])

  const profile = useMemo(() => {
    if (!baseProfile || !selectedRequirement) return baseProfile
    const override = profileSceneOverrides[selectedRequirement.id]
    if (!override || override.length === 0) return baseProfile
    return withProfileSceneSelection(baseProfile, override, mockScenes, props)
  }, [baseProfile, selectedRequirement, profileSceneOverrides, props])

  const candidateSceneIds = useMemo(() => {
    if (!selectedRequirement) return []
    return candidateSceneIdsForRequirement(selectedRequirement, mockScenes)
  }, [selectedRequirement])

  const selectedProfileSceneIds = useMemo(() => {
    if (!selectedRequirement || !profile) return []
    return profileSceneOverrides[selectedRequirement.id] ?? profile.suggestedSceneIds
  }, [selectedRequirement, profile, profileSceneOverrides])

  const profileSceneCustomized = Boolean(
    selectedRequirement && profileSceneOverrides[selectedRequirement.id]?.length,
  )

  useEffect(() => {
    if (!selectedRequirement) return
    const type = taskTypeFromRequirement(selectedRequirement)
    setDefaultTaskType(type)
    setGroupingDrafts((prev) => {
      if (prev.length === 0) return prev
      if (prev.every((d) => d.taskType === type)) return prev
      return prev.map((d) => ({ ...d, taskType: type }))
    })
  }, [selectedRequirement])

  const requirementScripts = useMemo(() => {
    if (!selectedRequirement) return []
    return taskScripts.filter((s) => s.requirementId === selectedRequirement.id)
  }, [taskScripts, selectedRequirement])

  const candidateScripts = useMemo(
    () => requirementScripts.filter((s) => s.reviewStatus !== 'rejected' && s.status !== 'confirmed'),
    [requirementScripts],
  )

  const confirmedScripts = useMemo(
    () =>
      requirementScripts.filter(
        (s) => s.reviewStatus === 'confirmed' || s.status === 'confirmed',
      ),
    [requirementScripts],
  )

  const groupPreviews = useMemo(() => {
    if (groupingDrafts.length === 0) return []
    return draftsToGroupPreviews(groupingDrafts, confirmedScripts)
  }, [groupingDrafts, confirmedScripts])

  const activeScript = activeScriptId
    ? taskScripts.find((s) => s.taskId === activeScriptId)
    : null

  const poolScripts = poolTab === 'candidate' ? candidateScripts : confirmedScripts

  const filteredPoolScripts = useMemo(() => {
    const filtered =
      difficultyFilter === 'all'
        ? poolScripts
        : poolScripts.filter((s) => s.difficulty === difficultyFilter)
    return sortScriptsByQcScore(filtered)
  }, [poolScripts, difficultyFilter])

  const poolQcSummary = useMemo(() => summarizeScriptQc(poolScripts), [poolScripts])

  const difficultyCounts = useMemo(() => {
    const counts = { simple: 0, complex: 0, correction: 0 }
    for (const script of poolScripts) {
      counts[script.difficulty] += 1
    }
    return counts
  }, [poolScripts])

  useEffect(() => {
    if (filteredPoolScripts.length === 0) {
      setActiveScriptId(null)
      return
    }
    if (!activeScriptId || !filteredPoolScripts.some((s) => s.taskId === activeScriptId)) {
      setActiveScriptId(filteredPoolScripts[0]?.taskId ?? null)
    }
  }, [filteredPoolScripts, activeScriptId])

  function toggleProfileScene(sceneId: string): void {
    if (!selectedRequirement || !profile) return
    const current = profileSceneOverrides[selectedRequirement.id] ?? profile.suggestedSceneIds
    const next = current.includes(sceneId)
      ? current.filter((id) => id !== sceneId)
      : [...current, sceneId]
    if (next.length === 0) return
    setProfileSceneOverrides((prev) => ({
      ...prev,
      [selectedRequirement.id]: next,
    }))
  }

  function resetProfileScenes(): void {
    if (!selectedRequirement) return
    setProfileSceneOverrides((prev) => {
      const next = { ...prev }
      delete next[selectedRequirement.id]
      return next
    })
  }

  async function handleBatchGenerate(count: number): Promise<void> {
    if (!selectedRequirement || !profile) return
    setGeneratingBatch(count)
    setMessage(null)
    try {
      const { batch, scripts } = await generateRequirementScriptBatch(
        selectedRequirement,
        profile,
        mockScenes,
        props,
        count,
        generatorMode,
        defaultTargetCount,
      )
      setBatches((prev) => [batch, ...prev])
      onTaskScriptsChange([...taskScripts, ...scripts])
      setStep('scripts')
      setPoolTab('candidate')
      setDifficultyFilter('all')
      if (scripts[0]) setActiveScriptId(scripts[0].taskId)
      const diffSummary = (['simple', 'complex', 'correction'] as const)
        .map((d) => `${SCRIPT_DIFFICULTY_LABEL[d]} ${scripts.filter((s) => s.difficulty === d).length}`)
        .join(' / ')
      setMessage(
        `已生成 ${scripts.length} 条台本候选（通过质检 ${batch.passedCount} 条；${diffSummary}）`,
      )
    } catch (e) {
      setMessage(`生成失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setGeneratingBatch(null)
    }
  }

  function toggleScriptSelection(scriptId: string): void {
    setSelectedScriptIds((prev) => {
      const next = new Set(prev)
      if (next.has(scriptId)) next.delete(scriptId)
      else next.add(scriptId)
      return next
    })
  }

  function handleConfirmSelected(): void {
    const ids = [...selectedScriptIds]
    if (ids.length === 0) return
    const next = confirmScripts(taskScripts, ids)
    const mergedAlloc = mergeAllocations(ids, allocations, defaultTargetCount)
    setAllocations((prev) => {
      const map = new Map(prev.map((a) => [a.scriptId, a]))
      for (const a of mergedAlloc) map.set(a.scriptId, a)
      return [...map.values()]
    })
    onTaskScriptsChange(next)
    setSelectedScriptIds(new Set())
    const allConfirmed = next.filter(
      (s) =>
        s.requirementId === selectedRequirement?.id &&
        (s.reviewStatus === 'confirmed' || s.status === 'confirmed'),
    )
    setGroupingDrafts(
      suggestTaskGroupingDrafts(
        allConfirmed,
        mergedAlloc,
        selectedRequirement ? taskTypeFromRequirement(selectedRequirement) : defaultTaskType,
      ),
    )
    setGroupingConfirmed(false)
    setStep('grouping')
    setMessage(`已确认 ${ids.length} 条台本，请编排分组方案`)
  }

  function handleConfirmActiveScript(): void {
    if (!activeScriptId) return
    const ids = [activeScriptId]
    const next = confirmScripts(taskScripts, ids)
    const mergedAlloc = mergeAllocations(ids, allocations, defaultTargetCount)
    setAllocations((prev) => {
      const map = new Map(prev.map((a) => [a.scriptId, a]))
      for (const a of mergedAlloc) map.set(a.scriptId, a)
      return [...map.values()]
    })
    onTaskScriptsChange(next)
    setPoolTab('confirmed')
    setMessage(`已确认台本 ${activeScriptId}`)
  }

  function handleRejectSelected(): void {
    const ids = [...selectedScriptIds]
    if (ids.length === 0) return
    onTaskScriptsChange(rejectScripts(taskScripts, ids))
    setSelectedScriptIds(new Set())
    setMessage(`已剔除 ${ids.length} 条候选`)
  }

  function handleApplySuggestedGrouping(): void {
    const type = selectedRequirement
      ? taskTypeFromRequirement(selectedRequirement)
      : defaultTaskType
    setGroupingDrafts(suggestTaskGroupingDrafts(confirmedScripts, allocations, type))
    setGroupingConfirmed(false)
    setMessage('已填入系统建议分组，可继续手动调整')
  }

  function handleGenerateTaskUnits(): void {
    if (!selectedRequirement || !groupingConfirmed || groupPreviews.length === 0) return
    const newTasks = buildTaskUnitsFromGroups({
      requirement: selectedRequirement,
      groups: groupPreviews,
      existingTaskCount: selectedReqTasks.length,
    })
    const nextTasks = [...tasks, ...newTasks]
    onTasksChange(nextTasks)
    onRequirementsLinked(
      selectedRequirement.id,
      newTasks.map((t) => t.id),
      nextTasks,
    )
    setGroupingDrafts([])
    setGroupingConfirmed(false)
    setMessage(
      `已生成 ${newTasks.length} 个任务单元（待配资源）。请前往任务列表为每条任务指派人/设备/场地后再调度。`,
    )
  }

  const stepItems: { key: DecompositionStep; label: string }[] = [
    { key: 'profile', label: '需求画像' },
    { key: 'scripts', label: '台本候选池' },
    { key: 'grouping', label: '台本分组编排' },
    { key: 'generate', label: '生成任务单元' },
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] px-4 py-3 text-sm text-text-secondary">
        <span className="font-medium text-text">V2.3.0 台本优先：</span>
        定事（台本确认）→ 编组（人工分组）→ 落库（任务单元）→ 任务列表配资源 → 调度。
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text">待拆解需求</h2>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-text-secondary">
              {decomposableRequirements.length}
            </span>
          </header>
          <ul className="max-h-[560px] divide-y divide-border overflow-y-auto">
            {decomposableRequirements.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectRequirement(r.id)
                    setStep('profile')
                    setMessage(null)
                    setGroupingDrafts([])
                    setGroupingConfirmed(false)
                  }}
                  className={cn(
                    'flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors',
                    r.id === selectedReqId ? 'bg-primary/5' : 'hover:bg-slate-50',
                  )}
                >
                  <span className="text-sm font-medium text-text">{r.title}</span>
                  <span className="text-xs text-text-secondary font-mono">{r.id}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          {!selectedRequirement || !profile ? (
            <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-border bg-card text-sm text-text-secondary">
              请从左侧选择需求
            </div>
          ) : (
            <>
              <nav className="flex flex-wrap gap-2">
                {stepItems.map((item, idx) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setStep(item.key)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors',
                      step === item.key
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-text-secondary hover:bg-slate-200',
                    )}
                  >
                    <span className="font-mono text-xs opacity-80">{idx + 1}</span>
                    {item.label}
                    {idx < stepItems.length - 1 && (
                      <ChevronRight className="size-3.5 opacity-50" aria-hidden />
                    )}
                  </button>
                ))}
              </nav>

              {message && (
                <p className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm text-text-secondary">
                  {message}
                </p>
              )}

              {step === 'profile' && (
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-text">{selectedRequirement.title}</h3>
                    <p className="text-xs text-text-secondary mt-1">
                      {selectedRequirement.id} · {selectedRequirement.dataType} · 目标{' '}
                      {selectedRequirement.targetValue}
                    </p>
                  </div>
                  <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                    <div>
                      <dt className="text-text-secondary">场景类型</dt>
                      <dd className="font-medium">{profile.sceneType}</dd>
                    </div>
                    <div>
                      <dt className="text-text-secondary">需求场景</dt>
                      <dd className="font-medium">{selectedRequirement.scene || '—'}</dd>
                    </div>
                  </dl>
                  <div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-text">建议场景（场景库）</p>
                      {profileSceneCustomized && (
                        <button
                          type="button"
                          onClick={resetProfileScenes}
                          className="text-xs text-primary hover:underline"
                        >
                          恢复系统推荐
                        </button>
                      )}
                    </div>
                    <p className="mb-2 text-xs text-text-secondary">
                      系统根据场景类型与需求场景推荐；运营可勾选本次拆解实际使用的场景库条目。
                    </p>
                    <ul className="space-y-1.5 rounded-lg border border-border bg-slate-50/80 p-3">
                      {candidateSceneIds.map((sceneId) => {
                        const scene = mockScenes.find((s) => s.id === sceneId)
                        const checked = selectedProfileSceneIds.includes(sceneId)
                        return (
                          <li key={sceneId}>
                            <label className="flex cursor-pointer items-start gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleProfileScene(sceneId)}
                                className="mt-0.5 size-3.5 shrink-0"
                              />
                              <span>
                                <span className="font-medium text-text">
                                  {scene?.name ?? sceneId}
                                </span>
                                {scene?.status !== 'active' && (
                                  <span className="ml-1 text-xs text-amber-700">
                                    （{scene?.status === 'maintenance' ? '维护中' : '未开放'}）
                                  </span>
                                )}
                                <span className="mt-0.5 block text-xs text-text-secondary">
                                  {scene?.description ?? sceneId}
                                </span>
                              </span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text mb-2">关键要求</p>
                    <ul className="list-disc pl-5 text-sm text-text-secondary space-y-1">
                      {profile.keyRequirements.map((k) => (
                        <li key={k}>{k}</li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('scripts')}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
                  >
                    进入台本候选池
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              )}

              {step === 'scripts' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
                    <label className="text-sm">
                      <span className="text-text-secondary">默认采集次数/台本</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={defaultTargetCountInput}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '')
                          setDefaultTargetCountInput(v)
                        }}
                        onBlur={() => {
                          const n = Math.max(1, Number.parseInt(defaultTargetCountInput, 10) || 30)
                          setDefaultTargetCountInput(String(n))
                        }}
                        className="mt-1 block w-24 rounded-md border border-border px-2 py-1"
                      />
                    </label>
                    <span className="self-end text-xs text-text-secondary">
                      台本引擎：<span className="font-medium text-text">{generatorModeLabel}</span>
                      {generatorMode === 'mock-llm' && (
                        <span className="ml-1 text-amber-700">
                          （演示数据；请在 .env.local 设 VITE_SCRIPT_GENERATOR_MODE=llm）
                        </span>
                      )}
                    </span>
                    <span className="self-end text-xs text-text-secondary">
                      批量生成按 简单 → 复杂 → 纠正 轮换
                    </span>
                    {BATCH_PRESETS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        disabled={generatingBatch !== null}
                        onClick={() => void handleBatchGenerate(n)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
                      >
                        {generatingBatch === n ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Sparkles className="size-4" />
                        )}
                        生成 {n} 条
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-lg border border-border p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setPoolTab('candidate')}
                        className={cn(
                          'rounded-md px-2.5 py-1',
                          poolTab === 'candidate' ? 'bg-primary text-white' : 'text-text-secondary',
                        )}
                      >
                        候选 ({candidateScripts.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPoolTab('confirmed')}
                        className={cn(
                          'rounded-md px-2.5 py-1',
                          poolTab === 'confirmed' ? 'bg-primary text-white' : 'text-text-secondary',
                        )}
                      >
                        已确认 ({confirmedScripts.length})
                      </button>
                    </div>
                    {poolTab === 'candidate' && (
                      <>
                        <button
                          type="button"
                          disabled={selectedScriptIds.size === 0}
                          onClick={handleConfirmSelected}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-40"
                        >
                          <CheckCircle2 className="size-4" />
                          确认选中 ({selectedScriptIds.size})
                        </button>
                        <button
                          type="button"
                          disabled={selectedScriptIds.size === 0}
                          onClick={handleRejectSelected}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-700 disabled:opacity-40"
                        >
                          <XCircle className="size-4" />
                          剔除
                        </button>
                      </>
                    )}
                    {poolScripts.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {DIFFICULTY_FILTER_OPTIONS.map((opt) => {
                          const count =
                            opt.id === 'all'
                              ? poolScripts.length
                              : difficultyCounts[opt.id]
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setDifficultyFilter(opt.id)}
                              className={cn(
                                'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                                difficultyFilter === opt.id
                                  ? 'border-primary bg-primary text-white'
                                  : 'border-border bg-card text-text-secondary hover:border-primary/40',
                              )}
                            >
                              {opt.label} ({count})
                            </button>
                          )
                        })}
                      </div>
                    )}
                    {confirmedScripts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setStep('grouping')}
                        className="ml-auto text-sm text-primary hover:underline"
                      >
                        进入分组编排 →
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] min-h-[480px]">
                    {poolTab === 'candidate' && (
                      <ScriptQcSummaryBar
                        passed={poolQcSummary.passed}
                        failed={poolQcSummary.failed}
                        className="lg:col-span-2"
                      />
                    )}
                    <ul className="space-y-2 overflow-y-auto max-h-[520px] pr-1">
                      {filteredPoolScripts.length === 0 && (
                        <li className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-text-secondary">
                          {poolScripts.length === 0
                            ? poolTab === 'candidate'
                              ? '暂无候选，请批量生成'
                              : '暂无已确认台本'
                            : '当前难度筛选无结果'}
                        </li>
                      )}
                      {filteredPoolScripts.map((script) => {
                        const isActive = activeScriptId === script.taskId
                        const checked = selectedScriptIds.has(script.taskId)
                        const qcFailed = !isScriptQcPassed(script)
                        return (
                          <li
                            key={script.taskId}
                            className={cn(
                              'rounded-xl border transition-colors',
                              qcFailed && 'border-rose-300 bg-rose-50/60',
                              !qcFailed && isActive
                                ? 'border-primary ring-1 ring-primary/20 bg-primary/[0.03]'
                                : !qcFailed && 'border-border bg-card',
                            )}
                          >
                            <div className="flex items-start gap-2 p-3">
                              {poolTab === 'candidate' && (
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleScriptSelection(script.taskId)}
                                  className="mt-1 size-3.5 shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => setActiveScriptId(script.taskId)}
                                className="min-w-0 flex-1 text-left"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span
                                    className={cn(
                                      'text-sm font-medium line-clamp-1',
                                      qcFailed ? 'text-rose-900' : 'text-text',
                                    )}
                                  >
                                    {script.title}
                                  </span>
                                  <div className="flex shrink-0 items-center gap-1.5">
                                    <ScriptQcBadge meta={script.generationMeta} variant="list" />
                                    <span
                                      className={cn(
                                        'rounded border px-1.5 py-0.5 text-[10px] font-medium',
                                        difficultyBadgeClass(script.difficulty),
                                      )}
                                    >
                                      {SCRIPT_DIFFICULTY_LABEL[script.difficulty]}
                                    </span>
                                    <Eye
                                      className={cn(
                                        'size-3.5',
                                        isActive ? 'text-primary' : 'text-slate-300',
                                      )}
                                    />
                                  </div>
                                </div>
                                <p className="mt-1 text-xs text-text-secondary line-clamp-2">
                                  {script.instruction}
                                </p>
                                {qcFailed && script.generationMeta?.rejectReason && (
                                  <p className="mt-1.5 rounded-md bg-rose-100/80 px-2 py-1 text-xs font-medium text-rose-800 line-clamp-2">
                                    {script.generationMeta.rejectReason}
                                  </p>
                                )}
                                <p className="mt-2 text-[11px] text-text-secondary font-mono">
                                  {script.taskId} ·{' '}
                                  {mockScenes.find((s) => s.id === script.sceneId)?.name ??
                                    script.sceneId}
                                  · {script.steps.length} 步
                                </p>
                              </button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>

                    <div className="rounded-xl border border-border bg-card p-4 overflow-y-auto max-h-[520px]">
                      {!activeScript ? (
                        <p className="flex h-full min-h-[200px] items-center justify-center text-sm text-text-secondary">
                          单击左侧台本查看详情
                        </p>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-semibold text-text">{activeScript.title}</h4>
                              <span
                                className={cn(
                                  'rounded border px-1.5 py-0.5 text-[10px] font-medium',
                                  difficultyBadgeClass(activeScript.difficulty),
                                )}
                              >
                                {SCRIPT_DIFFICULTY_LABEL[activeScript.difficulty]}
                              </span>
                            </div>
                            <p className="mt-1 font-mono text-[11px] text-text-secondary">
                              {activeScript.taskId}
                            </p>
                          </div>
                          {activeScript.generationMeta && (
                            <ScriptQcBadge meta={activeScript.generationMeta} variant="detail" />
                          )}
                          <ScriptContentCard script={activeScript} />
                          {poolTab === 'candidate' && (
                            <div className="flex gap-2 pt-2 border-t border-border">
                              {!isScriptQcPassed(activeScript) ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onTaskScriptsChange(
                                      rejectScripts(taskScripts, [activeScript.taskId]),
                                    )
                                  }}
                                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white"
                                >
                                  剔除（未过质检）
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleConfirmActiveScript}
                                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white"
                                >
                                  确认此台本
                                </button>
                              )}
                              {isScriptQcPassed(activeScript) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onTaskScriptsChange(
                                      rejectScripts(taskScripts, [activeScript.taskId]),
                                    )
                                  }}
                                  className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-700"
                                >
                                  剔除
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {step === 'grouping' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-card p-4">
                    <div className="text-sm">
                      <span className="text-text-secondary">任务类型</span>
                      <p className="mt-1 font-medium text-text">{defaultTaskType}</p>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        来自需求采集类型（{selectedRequirement?.dataType ?? '—'}），与台本生成一致
                      </p>
                    </div>
                    <p className="self-end text-xs text-text-secondary">
                      已确认 {confirmedScripts.length} 条台本 · 请人工确认分组后再生成任务单元
                    </p>
                  </div>

                  {confirmedScripts.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-text-secondary">
                      请先在台本候选池中确认台本
                    </p>
                  ) : (
                    <ScriptGroupingEditor
                      confirmedScripts={confirmedScripts}
                      drafts={groupingDrafts}
                      onDraftsChange={setGroupingDrafts}
                      defaultTaskType={defaultTaskType}
                      defaultTargetCount={defaultTargetCount}
                      allocations={allocations}
                      groupingConfirmed={groupingConfirmed}
                      onGroupingConfirmedChange={setGroupingConfirmed}
                      onApplySuggested={handleApplySuggestedGrouping}
                    />
                  )}

                  {groupingConfirmed && (
                    <button
                      type="button"
                      onClick={() => setStep('generate')}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
                    >
                      下一步：生成任务单元
                      <ChevronRight className="size-4" />
                    </button>
                  )}
                </div>
              )}

              {step === 'generate' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-card p-4 text-sm text-text-secondary">
                    <p>
                      本步仅生成<strong className="text-text">任务定义</strong>（台本包 + 采集次数），不指派人员与设备。
                    </p>
                    <p className="mt-1">
                      生成后任务状态为「待配资源」，请在任务列表详情中完成人 / 设备 / 场地编排，再进入调度。
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-card shadow-sm">
                    <header className="border-b border-border px-4 py-3 flex justify-between">
                      <h3 className="text-sm font-semibold">已确认分组方案</h3>
                      <span className="text-xs text-text-secondary">
                        {groupPreviews.length} 个任务单元
                      </span>
                    </header>
                    <ul className="divide-y divide-border max-h-[320px] overflow-y-auto">
                      {groupPreviews.map((g, i) => (
                        <li key={g.groupKey} className="px-4 py-3 text-sm">
                          <p className="font-medium text-text">
                            任务单元 {i + 1} · {g.taskType}
                          </p>
                          <p className="text-text-secondary mt-0.5">{g.label}</p>
                          <p className="text-xs text-text-secondary mt-1 font-mono">
                            {g.scriptIds.join(', ')}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    disabled={!groupingConfirmed || groupPreviews.length === 0}
                    onClick={handleGenerateTaskUnits}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                  >
                    确认并生成 {groupPreviews.length} 个任务单元
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
