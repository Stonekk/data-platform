import type {
  Requirement,
  RequirementSceneType,
  RequirementScriptBatch,
  ScriptTaskAllocation,
  Task,
  TaskPriority,
  TaskScript,
  Scene,
  Prop,
  ScriptDifficulty,
} from '@/data/mock'
import { mockScenes } from '@/data/mock'
import {
  generateScripts,
  getScriptGeneratorMode,
  pickBestCandidate,
  rankCandidates,
  type ScriptGeneratorMode,
} from '@/lib/scriptGenerator'
import { SCRIPT_DIFFICULTY_LABEL, type ScriptDraftInput } from '@/lib/scriptWorkflow'
import { draftFromCandidate } from '@/lib/scriptGenerator/templateProvider'
import { defaultCategoryIdsForScene } from '@/data/atomicActions'
import { mergeAllocations, normalizeTaskScripts } from '@/lib/taskScriptAccess'

// ---------------------------------------------------------------------------
// 需求画像
// ---------------------------------------------------------------------------

export type RequirementProfile = {
  requirementId: string
  title: string
  dataType: string
  targetValue: string
  sceneType: string
  keyRequirements: string[]
  suggestedSceneIds: string[]
  suggestedPropIds: string[]
}

const SCENE_TYPE_TO_IDS: Record<RequirementSceneType, string[]> = {
  home: ['scene-keting', 'scene-chufang', 'scene-zhuwo'],
  business: ['scene-shufang'],
  factory: ['scene-chuwujian'],
  charging: ['scene-yangtai'],
  public: ['scene-xuanguan'],
  other: ['scene-keting'],
}

const SCENE_TYPE_LABEL: Record<RequirementSceneType, string> = {
  home: '家庭',
  business: '办公',
  factory: '工业',
  charging: '充电',
  public: '公共',
  other: '其他',
}

export function candidateSceneIdsForRequirement(
  requirement: Requirement,
  scenes: Scene[],
): string[] {
  const sceneTypeKey = requirement.sceneType ?? 'home'
  return (
    SCENE_TYPE_TO_IDS[sceneTypeKey]?.filter((id) => scenes.some((s) => s.id === id)) ??
    scenes.filter((s) => s.status === 'active').slice(0, 6).map((s) => s.id)
  )
}

function sceneMatchesHint(scene: Scene, hint: string): boolean {
  return scene.name === hint || hint.includes(scene.name) || scene.name.includes(hint)
}

function resolveSuggestedSceneIds(requirement: Requirement, scenes: Scene[]): string[] {
  const typeCandidates = candidateSceneIdsForRequirement(requirement, scenes)
  const hint = requirement.scene?.trim()
  if (!hint) return typeCandidates

  const matched = scenes.find(
    (s) => typeCandidates.includes(s.id) && sceneMatchesHint(s, hint),
  )
  if (!matched) return typeCandidates
  return [matched.id]
}

function suggestedPropIdsForScenes(
  sceneIds: string[],
  scenes: Scene[],
  props: Prop[],
): string[] {
  const fromScenes = sceneIds
    .flatMap((sceneId) => scenes.find((s) => s.id === sceneId)?.recommendedPropIds ?? [])
    .filter((id, idx, arr) => arr.indexOf(id) === idx)
    .slice(0, 12)

  if (fromScenes.length > 0) return fromScenes

  return props
    .filter((p) => sceneIds.includes(p.sceneId))
    .slice(0, 8)
    .map((p) => p.id)
}

export function withProfileSceneSelection(
  profile: RequirementProfile,
  sceneIds: string[],
  scenes: Scene[],
  props: Prop[],
): RequirementProfile {
  const validIds = sceneIds.filter((id) => scenes.some((s) => s.id === id))
  const suggestedSceneIds = validIds.length > 0 ? validIds : profile.suggestedSceneIds
  return {
    ...profile,
    suggestedSceneIds,
    suggestedPropIds: suggestedPropIdsForScenes(suggestedSceneIds, scenes, props),
  }
}

export function buildRequirementProfile(
  requirement: Requirement,
  scenes: Scene[],
  props: Prop[],
): RequirementProfile {
  const sceneTypeKey = requirement.sceneType ?? 'home'
  const suggestedSceneIds = resolveSuggestedSceneIds(requirement, scenes)

  return {
    requirementId: requirement.id,
    title: requirement.title,
    dataType: requirement.dataType,
    targetValue: requirement.targetValue,
    sceneType: SCENE_TYPE_LABEL[sceneTypeKey] ?? sceneTypeKey,
    keyRequirements: requirement.keyRequirements,
    suggestedSceneIds,
    suggestedPropIds: suggestedPropIdsForScenes(suggestedSceneIds, scenes, props),
  }
}

// ---------------------------------------------------------------------------
// 批量台本生成
// ---------------------------------------------------------------------------

function newBatchId(requirementId: string): string {
  return `batch-${requirementId}-${Date.now()}`
}

function newScriptId(requirementId: string, index: number): string {
  return `scr-${requirementId}-${String(index).padStart(3, '0')}`
}

export function taskTypeFromRequirement(requirement: Pick<Requirement, 'dataType'>): string {
  if (requirement.dataType === 'teleoperation') return '遥操作采集'
  if (requirement.dataType === 'motion_capture') return '动捕采集'
  return '人体数据采集'
}

const BATCH_DIFFICULTIES: ScriptDifficulty[] = ['simple', 'complex', 'correction']

function variantInput(
  requirement: Requirement,
  profile: RequirementProfile,
  scenes: Scene[],
  index: number,
  difficulty: ScriptDifficulty,
): ScriptDraftInput {
  const sceneIds = profile.suggestedSceneIds
  const sceneId = sceneIds[index % sceneIds.length] ?? scenes[0]?.id ?? 'scene-keting'
  const scene = scenes.find((s) => s.id === sceneId)
  const propIds = (scene?.recommendedPropIds ?? profile.suggestedPropIds).slice(0, 4)
  const actionIds = defaultCategoryIdsForScene(sceneId).slice(0, 3)
  const scriptId = newScriptId(requirement.id, index)
  const diffLabel = SCRIPT_DIFFICULTY_LABEL[difficulty]

  return {
    taskId: scriptId,
    title: `${requirement.title} · ${diffLabel} · 候选 ${index + 1}`,
    sceneId,
    propIds,
    atomicActionIds: actionIds,
    difficulty,
    taskType: taskTypeFromRequirement(requirement),
    templateId: scene?.defaultTemplateId,
  }
}

export type BatchGenerateResult = {
  batch: RequirementScriptBatch
  scripts: TaskScript[]
}

export async function generateRequirementScriptBatch(
  requirement: Requirement,
  profile: RequirementProfile,
  scenes: Scene[],
  props: Prop[],
  count: number,
  mode: ScriptGeneratorMode = getScriptGeneratorMode(),
  defaultTargetCount = 30,
): Promise<BatchGenerateResult> {
  const batchId = newBatchId(requirement.id)
  const scripts: TaskScript[] = []
  let passedCount = 0

  for (let i = 0; i < count; i++) {
    const difficulty = BATCH_DIFFICULTIES[i % BATCH_DIFFICULTIES.length]!
    const input = variantInput(requirement, profile, scenes, i, difficulty)
    const scene = scenes.find((s) => s.id === input.sceneId)
    const genContext = {
      input,
      scene: scene
        ? {
            name: scene.name,
            sceneSubtype: scene.sceneSubtype,
            description: scene.description,
            safetyTier: scene.safetyTier,
            type: scene.type,
          }
        : undefined,
      props,
      requirement: {
        title: requirement.title,
        keyRequirements: requirement.keyRequirements,
        targetValue: requirement.targetValue,
      },
    }

    let draft: TaskScript
    try {
      const result = await generateScripts(genContext, mode)
      const ranked = rankCandidates(result.candidates)
      const best = pickBestCandidate(ranked, input.difficulty) ?? ranked[0]
      if (!best) continue
      draft = draftFromCandidate(input, best, props, genContext)
      if (best.passed) passedCount += 1
      draft.generationMeta = {
        mode,
        durationMs: result.meta.durationMs,
        score: best.score,
        passed: best.passed,
        rejectReason: best.rejectReason,
      }
    } catch {
      const result = await generateScripts(genContext, 'template')
      const best = result.candidates[0]
      if (!best) continue
      draft = draftFromCandidate(input, best, props, genContext)
      draft.generationMeta = { mode: 'template', durationMs: result.meta.durationMs }
      passedCount += 1
    }

    const scriptId = newScriptId(requirement.id, i)
    scripts.push({
      ...draft,
      taskId: scriptId,
      title: input.title,
      difficulty: input.difficulty,
      scheduledTime: '',
      status: 'draft',
      reviewStatus: 'candidate',
      requirementId: requirement.id,
      batchId,
      recommendedTargetCount: defaultTargetCount,
      personnelIds: [],
      deviceIds: [],
    })
  }

  const batch: RequirementScriptBatch = {
    id: batchId,
    requirementId: requirement.id,
    createdAt: new Date().toISOString(),
    targetCount: count,
    generatedCount: scripts.length,
    passedCount,
    mode,
  }

  return { batch, scripts }
}

// ---------------------------------------------------------------------------
// 台本确认与分配
// ---------------------------------------------------------------------------

export function confirmScripts(
  scripts: TaskScript[],
  scriptIds: string[],
  confirmedBy = '运营',
): TaskScript[] {
  const idSet = new Set(scriptIds)
  const now = new Date().toISOString()
  return scripts.map((s) => {
    if (!idSet.has(s.taskId)) return s
    if (s.reviewStatus === 'rejected') return s
    return {
      ...s,
      status: 'confirmed' as const,
      reviewStatus: 'confirmed' as const,
      confirmedAt: now,
      confirmedBy,
    }
  })
}

export function rejectScripts(scripts: TaskScript[], scriptIds: string[]): TaskScript[] {
  const idSet = new Set(scriptIds)
  return scripts.map((s) =>
    idSet.has(s.taskId) ? { ...s, reviewStatus: 'rejected' as const } : s,
  )
}

export function updateScriptTargetCounts(
  scripts: TaskScript[],
  allocations: ScriptTaskAllocation[],
): TaskScript[] {
  const byId = new Map(allocations.map((a) => [a.scriptId, a.targetCount]))
  return scripts.map((s) => {
    const count = byId.get(s.taskId)
    if (count === undefined) return s
    return { ...s, recommendedTargetCount: count }
  })
}

// ---------------------------------------------------------------------------
// 任务单元分组与生成
// ---------------------------------------------------------------------------

export type TaskGroupingDraft = {
  id: string
  taskType: string
  scriptIds: string[]
  allocations: ScriptTaskAllocation[]
  note?: string
}

export function suggestTaskGroupingDrafts(
  scripts: TaskScript[],
  allocations: ScriptTaskAllocation[],
  defaultTaskType: string,
): TaskGroupingDraft[] {
  const previews = groupConfirmedScriptsForTaskUnits(scripts, allocations, defaultTaskType)
  return previews.map((p, index) => ({
    id: `group-draft-${index}-${Date.now()}`,
    taskType: p.taskType,
    scriptIds: [...p.scriptIds],
    allocations: [...p.allocations],
  }))
}

export function unassignedScriptIds(
  confirmedScripts: TaskScript[],
  drafts: TaskGroupingDraft[],
): string[] {
  const assigned = new Set(drafts.flatMap((d) => d.scriptIds))
  return confirmedScripts.filter((s) => !assigned.has(s.taskId)).map((s) => s.taskId)
}

export function groupingDraftToPreview(
  draft: TaskGroupingDraft,
  scripts: TaskScript[],
): TaskUnitGroupPreview {
  const groupScripts = draft.scriptIds
    .map((id) => scripts.find((s) => s.taskId === id))
    .filter((s): s is TaskScript => s !== undefined)
  const sceneId = groupScripts[0]?.sceneId ?? ''
  const propIds = groupScripts[0]?.propIds ?? []
  const sceneLabel = sceneId.replace(/^scene-/, '') || '未指定'
  const totalTargetCount = draft.allocations.reduce((sum, a) => sum + a.targetCount, 0)
  const groupKey = `${draft.id}|${sceneId}|${sortedPropKey(propIds)}|${draft.taskType}`
  return {
    groupKey,
    sceneId,
    propIds,
    taskType: draft.taskType,
    scriptIds: draft.scriptIds,
    allocations: draft.allocations,
    totalTargetCount,
    label: `${sceneLabel} · ${propIds.length} 道具 · ${draft.scriptIds.length} 台本 · ${totalTargetCount} 条`,
  }
}

export function draftsToGroupPreviews(
  drafts: TaskGroupingDraft[],
  scripts: TaskScript[],
): TaskUnitGroupPreview[] {
  return drafts.map((d) => groupingDraftToPreview(d, scripts))
}

export function createEmptyGroupingDraft(taskType = '遥操作采集'): TaskGroupingDraft {
  return {
    id: `group-draft-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    taskType,
    scriptIds: [],
    allocations: [],
  }
}

export type TaskUnitGroupPreview = {
  groupKey: string
  sceneId: string
  propIds: string[]
  taskType: string
  scriptIds: string[]
  allocations: ScriptTaskAllocation[]
  totalTargetCount: number
  label: string
}

function sortedPropKey(propIds: string[]): string {
  return [...propIds].sort().join(',')
}

export function groupKeyForScript(script: TaskScript, taskType: string): string {
  return `${script.sceneId}|${sortedPropKey(script.propIds)}|${taskType}`
}

export function groupConfirmedScriptsForTaskUnits(
  scripts: TaskScript[],
  allocations: ScriptTaskAllocation[],
  taskType: string,
): TaskUnitGroupPreview[] {
  const confirmed = scripts.filter(
    (s) => s.reviewStatus === 'confirmed' || s.status === 'confirmed',
  )
  const byKey = new Map<string, TaskScript[]>()

  for (const script of confirmed) {
    const key = groupKeyForScript(script, taskType)
    const list = byKey.get(key) ?? []
    list.push(script)
    byKey.set(key, list)
  }

  const groups: TaskUnitGroupPreview[] = []
  for (const [groupKey, groupScripts] of byKey) {
    const scriptIds = groupScripts.map((s) => s.taskId)
    const groupAllocations = mergeAllocations(scriptIds, allocations, 30)
    const totalTargetCount = groupAllocations.reduce((sum, a) => sum + a.targetCount, 0)
    const sceneId = groupScripts[0]?.sceneId ?? ''
    const propIds = groupScripts[0]?.propIds ?? []
    const sceneLabel = sceneId.replace(/^scene-/, '')
    groups.push({
      groupKey,
      sceneId,
      propIds,
      taskType,
      scriptIds,
      allocations: groupAllocations,
      totalTargetCount,
      label: `${sceneLabel} · ${propIds.length} 道具 · ${scriptIds.length} 台本 · ${totalTargetCount} 条`,
    })
  }

  return groups.sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))
}

export type BuildTaskUnitsOptions = {
  requirement: Requirement
  groups: TaskUnitGroupPreview[]
  existingTaskCount?: number
}

export function buildTaskUnitsFromGroups(options: BuildTaskUnitsOptions): Task[] {
  const {
    requirement,
    groups,
    existingTaskCount = 0,
  } = options

  const priorityMap: Record<string, TaskPriority> = {
    P0: 'high',
    P1: 'medium',
    P2: 'low',
  }
  const priority = priorityMap[requirement.priority] ?? 'medium'

  return groups.map((group, index) => {
    const seq = existingTaskCount + index + 1
    const taskId = `task-${requirement.id.replace('req-', '')}-${String(seq).padStart(3, '0')}`
    const sceneName = mockScenes.find((s) => s.id === group.sceneId)?.name ?? group.sceneId
    const task: Task = {
      id: taskId,
      requirementId: requirement.id,
      type: group.taskType,
      priority,
      status: 'pending_resources',
      device: '待指派',
      personnel: '待指派',
      sceneId: group.sceneId,
      scene: sceneName,
      startTime: '',
      endTime: '',
      scriptIds: group.scriptIds,
      scriptId: group.scriptIds[0],
      scriptAllocations: group.allocations,
    }
    return normalizeTaskScripts(task)
  })
}

export function migrateLegacyTask(task: Task): Task {
  return normalizeTaskScripts(task)
}

export function migrateLegacyTasks(tasks: Task[]): Task[] {
  return tasks.map(migrateLegacyTask)
}
