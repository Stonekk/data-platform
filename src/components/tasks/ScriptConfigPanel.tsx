import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  PenLine,
  Search,
  Sparkles,
  X,
} from 'lucide-react'

import { ATOMIC_ACTION_CATEGORIES } from '@/data/atomicActions'
import { mockTaskScripts, type Prop, type ScriptDifficulty, type TaskScript } from '@/data/mock'
import { sceneById, usePlatformScenes } from '@/data/sceneStore'
import { templateById, usePlatformScriptTemplates } from '@/data/scriptTemplateStore'
import { checkPropsApproval, requestPropUsage } from '@/lib/propApproval'
import {
  buildManualScriptDraft,
  canGenerateScript,
  confirmScript,
  generateScriptCandidates,
  propsForScene,
  resolveDefaultTemplateId,
  SCRIPT_CANDIDATE_COUNT,
  scriptSummary,
} from '@/lib/scriptWorkflow'
import { cn } from '@/lib/utils'

import { ScriptContentCard } from './ScriptContentCard'

export type ScriptWizardStep = 'configure' | 'confirm'

type ScriptConfigPanelProps = {
  taskId: string
  taskType: string
  sceneId: string
  scripts: TaskScript[]
  props: Prop[]
  wizardStep: ScriptWizardStep
  onPropsChange: (next: Prop[]) => void
  onScriptsChange: (next: TaskScript[]) => void
  onBindScript: (scriptTaskId: string) => void
  onConfigureComplete: () => void
  onGoBack: () => void
  boundScriptId?: string
}

const PROP_COLLAPSE_THRESHOLD = 6

export function ScriptConfigPanel({
  taskId,
  taskType,
  sceneId,
  scripts,
  props,
  wizardStep,
  onPropsChange,
  onScriptsChange,
  onBindScript,
  onConfigureComplete,
  onGoBack,
  boundScriptId,
}: ScriptConfigPanelProps): ReactElement {
  const scenes = usePlatformScenes()
  const templates = usePlatformScriptTemplates()
  const scene = useMemo(() => sceneById(scenes, sceneId), [scenes, sceneId])
  const sceneProps = useMemo(() => propsForScene(sceneId, props), [sceneId, props])

  const [writeMode, setWriteMode] = useState<'ai' | 'manual'>('ai')
  const [selectedPropIds, setSelectedPropIds] = useState<string[]>([])
  const [selectedAtomicIds, setSelectedAtomicIds] = useState<string[]>(['cat-a', 'cat-b'])
  const [difficulty, setDifficulty] = useState<ScriptDifficulty>('complex')
  const [templateId, setTemplateId] = useState<string>('')
  const [propSearch, setPropSearch] = useState('')
  const [showMoreProps, setShowMoreProps] = useState(false)
  const [candidates, setCandidates] = useState<TaskScript[]>([])
  const [selectedCandidateIdx, setSelectedCandidateIdx] = useState(0)
  const [manualInstruction, setManualInstruction] = useState('')
  const [manualStepsText, setManualStepsText] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const boundScript = useMemo(
    () => scripts.find((s) => s.taskId === (boundScriptId || taskId)),
    [scripts, boundScriptId, taskId],
  )

  const recommendedPropIds = scene?.recommendedPropIds ?? []
  const recommendedProps = useMemo(
    () =>
      recommendedPropIds
        .map((id) => props.find((p) => p.id === id))
        .filter((p): p is Prop => p !== undefined),
    [recommendedPropIds, props],
  )
  const moreProps = useMemo(
    () => sceneProps.filter((p) => !recommendedPropIds.includes(p.id)),
    [sceneProps, recommendedPropIds],
  )

  useEffect(() => {
    if (sceneId === '') return
    const defaults =
      recommendedPropIds.length > 0
        ? recommendedPropIds.filter((id) => sceneProps.some((p) => p.id === id))
        : sceneProps.slice(0, 2).map((p) => p.id)
    setSelectedPropIds(defaults)
    setPropSearch('')
    setCandidates([])
    setSelectedCandidateIdx(0)
    setManualInstruction('')
    setManualStepsText('')
    const tpl = resolveDefaultTemplateId(sceneId, scenes, templates)
    setTemplateId(tpl ?? '')
    if (tpl) {
      const t = templateById(templates, tpl)
      if (t) setDifficulty(t.difficulty)
    }
  }, [sceneId, sceneProps, recommendedPropIds, scenes, templates])

  const approvalCheck = useMemo(
    () => checkPropsApproval(selectedPropIds, props),
    [selectedPropIds, props],
  )

  const filteredMoreProps = useMemo(() => {
    const q = propSearch.trim().toLowerCase()
    const pool = showMoreProps ? moreProps : []
    if (!q) return pool
    return pool.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.assetCode.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    )
  }, [moreProps, propSearch, showMoreProps])

  const selectedPropItems = useMemo(
    () =>
      selectedPropIds
        .map((id) => props.find((p) => p.id === id))
        .filter((p): p is Prop => p !== undefined),
    [selectedPropIds, props],
  )

  const visibleMoreProps =
    filteredMoreProps.length > PROP_COLLAPSE_THRESHOLD
      ? filteredMoreProps.slice(0, PROP_COLLAPSE_THRESHOLD)
      : filteredMoreProps

  const activeTemplate = templateId ? templateById(templates, templateId) : undefined

  function toggleProp(propId: string): void {
    setSelectedPropIds((prev) =>
      prev.includes(propId) ? prev.filter((id) => id !== propId) : [...prev, propId],
    )
  }

  function toggleAtomic(id: string): void {
    setSelectedAtomicIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function handleRequestApproval(propId: string): void {
    onPropsChange(requestPropUsage(propId, props))
    setMessage('已提交道具使用申请，审批通过后可配置台本。')
  }

  function buildInput() {
    return {
      taskId,
      title: `台本：${taskType}`,
      sceneId,
      propIds: selectedPropIds,
      atomicActionIds: selectedAtomicIds,
      difficulty,
      taskType,
      templateId: templateId || undefined,
    }
  }

  function validateBeforeDraft(): boolean {
    if (sceneId === '') {
      setMessage('请先为任务单元指派场景库。')
      return false
    }
    if (selectedPropIds.length === 0) {
      setMessage('请至少选择一个道具。')
      return false
    }
    if (writeMode === 'ai' && selectedAtomicIds.length === 0) {
      setMessage('请至少选择一个原子动作大类。')
      return false
    }
    const gate = canGenerateScript(selectedPropIds, props)
    if (!gate.allowed) {
      setMessage(gate.reason ?? '道具审批未通过，暂不可配置台本。')
      return false
    }
    return true
  }

  function handleGenerate(): void {
    if (!validateBeforeDraft()) return
    const nextCandidates = generateScriptCandidates(
      buildInput(),
      props,
      SCRIPT_CANDIDATE_COUNT,
      templates,
    )
    setCandidates(nextCandidates)
    setSelectedCandidateIdx(0)
    setMessage(`已生成 ${SCRIPT_CANDIDATE_COUNT} 条候选台本。`)
    onConfigureComplete()
  }

  function handleSaveManual(): void {
    if (!validateBeforeDraft()) return
    if (!manualInstruction.trim()) {
      setMessage('请填写台本说明。')
      return
    }
    const stepLines = manualStepsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    if (stepLines.length === 0) {
      setMessage('请至少填写一个执行步骤（每行一步）。')
      return
    }
    const draft = buildManualScriptDraft({
      ...buildInput(),
      instruction: manualInstruction.trim(),
      steps: stepLines.map((operation, idx) => ({
        order: idx + 1,
        operation,
        durationMinutes: 10,
      })),
    })
    setCandidates([draft])
    setSelectedCandidateIdx(0)
    setMessage('人工台本已保存，请确认绑定。')
    onConfigureComplete()
  }

  function handleConfirm(): void {
    const picked = candidates[selectedCandidateIdx] ?? boundScript
    if (!picked) {
      setMessage('请先在步骤 ② 生成或撰写台本。')
      return
    }
    const confirmed = confirmScript(picked, '运营-张敏')
    const without = scripts.filter((s) => s.taskId !== taskId)
    onScriptsChange([confirmed, ...without])
    onBindScript(taskId)
    setCandidates([])
    setMessage('台本已确认绑定，任务可进入调度。')
  }

  if (sceneId === '') {
    return (
      <div className="rounded-xl border border-dashed border-border bg-slate-50/50 p-4 text-xs text-text-secondary">
        请先在步骤 ① 为任务单元指派场景库。
      </div>
    )
  }

  if (wizardStep === 'confirm') {
    const preview = candidates[selectedCandidateIdx] ?? boundScript
    return (
      <div className="space-y-3 rounded-xl border border-border bg-slate-50/80 p-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-text">③ 确认绑定</h4>
          {boundScript?.status === 'confirmed' && (
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
              已确认绑定
            </span>
          )}
        </div>

        {candidates.length > 0 && boundScript?.status !== 'confirmed' ? (
          <div className="space-y-2">
            <p className="text-xs text-text-secondary">选择一条台本方案后确认绑定：</p>
            {candidates.map((candidate, idx) => (
              <button
                key={`${candidate.taskId}-cand-${idx}`}
                type="button"
                onClick={() => setSelectedCandidateIdx(idx)}
                className={cn(
                  'w-full rounded-lg border text-left transition-colors',
                  selectedCandidateIdx === idx
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/40',
                )}
              >
                <ScriptContentCard script={candidate} props={props} summaryOnly />
              </button>
            ))}
            {preview && (
              <div className="rounded-lg border border-border bg-white">
                <p className="border-b border-border px-3 py-2 text-xs font-medium text-text">
                  预览 · {scriptSummary(preview)}
                </p>
                <ScriptContentCard script={preview} props={props} compact />
              </div>
            )}
          </div>
        ) : boundScript?.status === 'confirmed' ? (
          <ScriptContentCard script={boundScript} props={props} compact />
        ) : (
          <p className="text-xs text-text-secondary">
            尚未生成台本，请返回步骤 ② 使用 AI 辅助或人工撰写。
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onGoBack}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 text-xs hover:bg-slate-50"
          >
            <ArrowLeft className="size-3.5" />
            返回配置
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={
              boundScript?.status === 'confirmed' ||
              (candidates.length === 0 && boundScript?.status !== 'draft')
            }
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            <CheckCircle2 className="size-3.5" />
            确认绑定
          </button>
        </div>

        {message && (
          <p className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1.5 text-[11px] text-sky-900">
            {message}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-slate-50/80 p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-text">② 台本配置</h4>
        {scene && (
          <span className="text-[11px] text-text-secondary">{scene.name}</span>
        )}
      </div>

      <div className="flex gap-1 rounded-md bg-slate-200/60 p-0.5">
        <button
          type="button"
          onClick={() => setWriteMode('ai')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-[11px] font-medium',
            writeMode === 'ai' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary',
          )}
        >
          <Sparkles className="size-3" />
          AI 辅助
        </button>
        <button
          type="button"
          onClick={() => setWriteMode('manual')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-[11px] font-medium',
            writeMode === 'manual' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary',
          )}
        >
          <PenLine className="size-3" />
          人工撰写
        </button>
      </div>

      {!approvalCheck.ok && selectedPropIds.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <p className="inline-flex items-center gap-1 font-medium">
            <AlertCircle className="size-3.5" />
            道具审批门禁
          </p>
          <ul className="mt-1.5 space-y-1">
            {approvalCheck.blocked.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2">
                <span>{p.name}</span>
                {p.approvalStatus === 'none' && (
                  <button
                    type="button"
                    onClick={() => handleRequestApproval(p.id)}
                    className="rounded border border-amber-300 bg-white px-2 py-0.5 text-[11px] hover:bg-amber-100"
                  >
                    申请使用
                  </button>
                )}
                {p.approvalStatus === 'pending' && (
                  <span className="text-amber-800">审批中</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-1 text-xs font-medium text-text">
          推荐道具
          {recommendedProps.length > 0 && (
            <span className="ml-1 font-normal text-text-secondary">（来自场景库配置）</span>
          )}
        </p>
        {recommendedProps.length === 0 ? (
          <p className="text-xs text-text-secondary">
            该场景未配置推荐道具，请展开「更多道具」或至
            <Link to="/resources/scenes" className="mx-0.5 text-primary hover:underline">
              场景库
            </Link>
            维护。
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {recommendedProps.map((prop) => (
              <button
                key={prop.id}
                type="button"
                onClick={() => toggleProp(prop.id)}
                className={cn(
                  'rounded-md border px-2 py-0.5 text-[11px]',
                  selectedPropIds.includes(prop.id)
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border bg-white text-text-secondary hover:bg-slate-50',
                )}
              >
                {prop.name}
                {prop.requiresApproval && prop.approvalStatus !== 'approved' ? ' · 需审批' : ''}
              </button>
            ))}
          </div>
        )}
        {selectedPropItems.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {selectedPropItems.map((prop) => (
              <span
                key={prop.id}
                className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
              >
                {prop.name}
                <button
                  type="button"
                  onClick={() => toggleProp(prop.id)}
                  className="rounded hover:bg-primary/20"
                  aria-label={`移除 ${prop.name}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowMoreProps((v) => !v)}
          className="mt-2 inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline"
        >
          {showMoreProps ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          {showMoreProps ? '收起更多道具' : `更多道具（${moreProps.length}）`}
        </button>
        {showMoreProps && (
          <>
            <div className="relative mb-2 mt-2">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-text-secondary" />
              <input
                type="search"
                value={propSearch}
                onChange={(e) => setPropSearch(e.target.value)}
                placeholder="搜索道具…"
                className="h-8 w-full rounded-md border border-border bg-white pl-8 pr-2 text-xs"
              />
            </div>
            <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
              {visibleMoreProps.length === 0 ? (
                <span className="text-xs text-text-secondary">无更多道具或未匹配搜索。</span>
              ) : (
                visibleMoreProps.map((prop) => (
                  <button
                    key={prop.id}
                    type="button"
                    onClick={() => toggleProp(prop.id)}
                    className={cn(
                      'rounded-md border px-2 py-0.5 text-[11px]',
                      selectedPropIds.includes(prop.id)
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border bg-white text-text-secondary hover:bg-slate-50',
                    )}
                  >
                    {prop.name}
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {writeMode === 'ai' && (
        <>
          <label className="block text-xs text-text-secondary">
            台本模板
            <select
              value={templateId}
              onChange={(e) => {
                const id = e.target.value
                setTemplateId(id)
                const t = templateById(templates, id)
                if (t) setDifficulty(t.difficulty)
              }}
              className="mt-1 h-8 w-full rounded-md border border-border bg-white px-2 text-xs"
            >
              <option value="">自动匹配场景默认</option>
              {templates
                .filter((t) => t.status === 'active')
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {scene?.defaultTemplateId === t.id ? '（场景默认）' : ''}
                  </option>
                ))}
            </select>
            {activeTemplate && (
              <span className="mt-0.5 block text-[10px] text-text-secondary">
                {activeTemplate.stepSlots.length} 步 · {activeTemplate.difficulty}
              </span>
            )}
          </label>

          <div>
            <p className="mb-1 text-xs font-medium text-text">
              原子动作
              <Link
                to="/resources/atomic-actions"
                className="ml-1 inline-flex items-center gap-0.5 font-normal text-primary hover:underline"
              >
                原子动作库
                <ExternalLink className="size-3" />
              </Link>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ATOMIC_ACTION_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleAtomic(cat.id)}
                  className={cn(
                    'rounded-md border px-2 py-0.5 text-[11px]',
                    selectedAtomicIds.includes(cat.id)
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border bg-white text-text-secondary hover:bg-slate-50',
                    cat.highlight && 'ring-1 ring-amber-200',
                  )}
                >
                  {cat.code}.{cat.name}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-xs text-text-secondary">
            难度档
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as ScriptDifficulty)}
              className="mt-1 h-8 w-full rounded-md border border-border bg-white px-2 text-xs"
            >
              <option value="simple">简单</option>
              <option value="complex">复杂</option>
              <option value="correction">纠错</option>
            </select>
          </label>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!approvalCheck.ok && selectedPropIds.length > 0}
            className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-text hover:bg-slate-50 disabled:opacity-50"
          >
            <Sparkles className="size-3.5" />
            生成 {SCRIPT_CANDIDATE_COUNT} 条候选台本
          </button>
        </>
      )}

      {writeMode === 'manual' && (
        <>
          <label className="block text-xs text-text-secondary">
            台本说明 *
            <textarea
              rows={3}
              value={manualInstruction}
              onChange={(e) => setManualInstruction(e.target.value)}
              placeholder="描述采集目标、场景约束与注意事项…"
              className="mt-1 w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs"
            />
          </label>
          <label className="block text-xs text-text-secondary">
            执行步骤（每行一步）*
            <textarea
              rows={4}
              value={manualStepsText}
              onChange={(e) => setManualStepsText(e.target.value)}
              placeholder={'到达指定区域\n完成目标操作\n确认归位'}
              className="mt-1 w-full rounded-md border border-border bg-white px-2 py-1.5 font-mono text-xs"
            />
          </label>
          <button
            type="button"
            onClick={handleSaveManual}
            disabled={!approvalCheck.ok && selectedPropIds.length > 0}
            className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-text hover:bg-slate-50 disabled:opacity-50"
          >
            <PenLine className="size-3.5" />
            保存人工台本并下一步
          </button>
        </>
      )}

      {candidates.length > 0 && (
        <p className="text-[11px] text-emerald-800">
          已就绪 {candidates.length} 条方案，可进入步骤 ③ 确认绑定。
        </p>
      )}

      {candidates.length > 0 && (
        <button
          type="button"
          onClick={onConfigureComplete}
          className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary/90"
        >
          下一步：确认绑定
          <ArrowRight className="size-3.5" />
        </button>
      )}

      {message && (
        <p className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1.5 text-[11px] text-sky-900">
          {message}
        </p>
      )}
    </div>
  )
}

export function findScriptForTask(taskId: string, scripts: TaskScript[]): TaskScript | undefined {
  return scripts.find((s) => s.taskId === taskId) ?? mockTaskScripts.find((s) => s.taskId === taskId)
}
