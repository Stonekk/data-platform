import { categoryById } from '@/data/atomicActions'
import { templatesForSceneType, templateById } from '@/data/scriptTemplateStore'
import {
  mockProps,
  mockScenes,
  type Prop,
  type ScriptDifficulty,
  type ScriptTemplate,
  type TaskScript,
} from '@/data/mock'
import {
  estimateCardPreparationMinutes,
  formatEstimatedMinutes,
} from '@/lib/scriptGenerator/estimateDuration'
import { checkPropsApproval } from '@/lib/propApproval'

export const SCRIPT_CANDIDATE_COUNT = 3

export const SCRIPT_DIFFICULTY_LABEL: Record<ScriptDifficulty, string> = {
  simple: '简单',
  complex: '复杂',
  correction: '纠正',
}

export type ScriptDraftInput = {
  taskId: string
  title: string
  sceneId: string
  propIds: string[]
  atomicActionIds: string[]
  difficulty: ScriptDifficulty
  taskType: string
  templateId?: string
}

const CANDIDATE_SUFFIX = ['标准方案', '强化校验方案', '变体丰富方案'] as const

export function propsForScene(sceneId: string, props: Prop[] = mockProps): Prop[] {
  return props.filter((p) => p.sceneId === sceneId)
}

export function sceneLabel(sceneId: string): string {
  return mockScenes.find((s) => s.id === sceneId)?.name ?? sceneId
}

export function propLabels(propIds: string[], props: Prop[] = mockProps): string {
  return propIds
    .map((id) => props.find((p) => p.id === id)?.name ?? id)
    .join('、')
}

export function atomicActionLabels(ids: string[]): string {
  return ids
    .map((id) => {
      const cat = categoryById(id)
      return cat ? cat.name : id
    })
    .join('、')
}

function fillSkeleton(
  skeleton: string,
  scene: string,
  props: string,
  actions: string,
  taskType: string,
): string {
  return skeleton
    .replaceAll('{scene}', scene)
    .replaceAll('{props}', props || '场景内道具')
    .replaceAll('{actions}', actions || '基础取放')
    .replaceAll('{taskType}', taskType)
}

export function buildInstruction(
  input: ScriptDraftInput,
  props: Prop[] = mockProps,
  variantIndex = 0,
  template?: ScriptTemplate,
): string {
  const scene = sceneLabel(input.sceneId)
  const propText = propLabels(input.propIds, props)
  const actionText = atomicActionLabels(input.atomicActionIds)
  const base = template
    ? fillSkeleton(template.instructionSkeleton, scene, propText, actionText, input.taskType)
    : `在${scene}，使用${propText || '场景内道具'}，覆盖动作「${actionText || '基础取放'}」，完成${input.taskType}相关演示。`
  const hint = CANDIDATE_SUFFIX[variantIndex] ?? CANDIDATE_SUFFIX[0]
  return `【${hint}】${base}`
}

export function canGenerateScript(propIds: string[], props: Prop[]): {
  allowed: boolean
  reason?: string
} {
  const check = checkPropsApproval(propIds, props)
  if (check.ok) return { allowed: true }
  if (check.pending.length > 0) {
    return {
      allowed: false,
      reason: `${check.pending.map((p) => p.name).join('、')} 审批中，通过后可配置台本`,
    }
  }
  return {
    allowed: false,
    reason: `${check.blocked.map((p) => p.name).join('、')} 需先完成道具使用审批`,
  }
}

function buildStepsFromTemplate(
  template: ScriptTemplate,
  variantIndex: number,
): TaskScript['steps'] {
  const minutes =
    template.difficulty === 'complex' ? 18 + variantIndex * 2 : template.difficulty === 'correction' ? 14 : 9 + variantIndex
  return template.stepSlots.map((operation, idx) => ({
    order: idx + 1,
    operation: `${operation}${variantIndex > 0 ? `（变体${variantIndex + 1}）` : ''}`,
    durationMinutes: minutes,
  }))
}

function fallbackSteps(difficulty: ScriptDifficulty, variantIndex: number): TaskScript['steps'] {
  const base =
    difficulty === 'simple'
      ? ['到达指定位置', '完成目标操作', '确认归位']
      : difficulty === 'correction'
        ? ['引入可控失误', '发现并纠正', '恢复确认']
        : ['准备场景道具', '按序多步操作', '检查约束', '整理收尾']
  return base.map((operation, idx) => ({
    order: idx + 1,
    operation,
    durationMinutes: difficulty === 'complex' ? 15 + variantIndex * 2 : 10,
  }))
}

export function generateScriptCandidate(
  input: ScriptDraftInput,
  props: Prop[] = mockProps,
  variantIndex = 0,
  templates: ScriptTemplate[] = [],
): TaskScript {
  const template = input.templateId
    ? templateById(templates, input.templateId)
    : undefined
  const difficulty = template?.difficulty ?? input.difficulty
  const instruction = buildInstruction(input, props, variantIndex, template)
  const steps = template
    ? buildStepsFromTemplate(template, variantIndex)
    : fallbackSteps(difficulty, variantIndex)

  return {
    taskId: input.taskId,
    title: `${input.title || `台本：${input.taskType}`} · 方案${variantIndex + 1}`,
    scheduledTime: new Date().toISOString(),
    personnelIds: [],
    deviceIds: [],
    status: 'draft',
    sceneId: input.sceneId,
    propIds: [...input.propIds],
    atomicActionIds: [...input.atomicActionIds],
    difficulty,
    instruction,
    steps,
  }
}

export function generateScriptCandidates(
  input: ScriptDraftInput,
  props: Prop[] = mockProps,
  count = SCRIPT_CANDIDATE_COUNT,
  templates: ScriptTemplate[] = [],
): TaskScript[] {
  return Array.from({ length: count }, (_, i) =>
    generateScriptCandidate(input, props, i, templates),
  )
}

export function buildManualScriptDraft(
  input: ScriptDraftInput & {
    instruction: string
    steps: TaskScript['steps']
  },
): TaskScript {
  return {
    taskId: input.taskId,
    title: input.title || `台本：${input.taskType}`,
    scheduledTime: new Date().toISOString(),
    personnelIds: [],
    deviceIds: [],
    status: 'draft',
    sceneId: input.sceneId,
    propIds: [...input.propIds],
    atomicActionIds: [...input.atomicActionIds],
    difficulty: input.difficulty,
    instruction: input.instruction,
    steps: input.steps.map((s, idx) => ({ ...s, order: idx + 1 })),
  }
}

export function resolveDefaultTemplateId(
  sceneId: string,
  scenes = mockScenes,
  templates: ScriptTemplate[] = [],
): string | undefined {
  const scene = scenes.find((s) => s.id === sceneId)
  if (scene?.defaultTemplateId) return scene.defaultTemplateId
  if (!scene) return undefined
  const matched = templatesForSceneType(templates, scene.type)
  return matched[0]?.id
}

export function confirmScript(script: TaskScript, confirmedBy: string): TaskScript {
  return {
    ...script,
    title: script.title.replace(/ · 方案\d+$/, ''),
    status: 'confirmed',
    confirmedAt: new Date().toISOString(),
    confirmedBy,
  }
}

export function applyOpsScriptFix(
  script: TaskScript,
  patch: Pick<TaskScript, 'instruction' | 'propIds' | 'atomicActionIds'>,
  fixedBy: string,
): TaskScript {
  return {
    ...script,
    ...patch,
    propIds: [...patch.propIds],
    atomicActionIds: [...patch.atomicActionIds],
    status: 'confirmed',
    confirmedAt: new Date().toISOString(),
    confirmedBy: fixedBy,
  }
}

export function isScriptSchedulable(script: TaskScript | undefined): boolean {
  return script !== undefined && script.status === 'confirmed'
}

export function scriptEstimatedMinutes(script: TaskScript): number {
  return script.steps.reduce((sum, s) => sum + s.durationMinutes, 0)
}

export function scriptSummary(script: TaskScript): string {
  const stepCount = script.steps.length
  const minutes = scriptEstimatedMinutes(script)
  const recording = `录制 ${stepCount} 步 · 约 ${formatEstimatedMinutes(minutes)} 分钟`
  if (script.card) {
    const prep = estimateCardPreparationMinutes(script.card)
    if (prep > 0) {
      return `${recording}（准备约 ${formatEstimatedMinutes(prep)} 分钟）`
    }
  }
  return recording
}
