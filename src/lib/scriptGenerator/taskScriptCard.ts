import type { Prop, ScriptDifficulty, ScriptTemplate, TaskScript } from '@/data/mock'
import { getPlatformScriptTemplates, templateById } from '@/data/scriptTemplateStore'
import { estimateStepDurationsFromCard } from '@/lib/scriptGenerator/estimateDuration'
import { atomicActionLabels, propLabels, sceneLabel, type ScriptDraftInput } from '@/lib/scriptWorkflow'
import type { GenerateScriptsContext } from '@/lib/scriptGenerator/types'

export type StaticPerceptionProfile = {
  lighting: {
    intensity: 'overexposed' | 'normal' | 'dim'
    colorTemp: 'cool_white' | 'warm_yellow'
  }
  background: {
    clutter: 'minimal' | 'moderate' | 'heavy'
    reflectivity: 'matte' | 'glass' | 'water_pool'
  }
}

export type TaskScriptCard = {
  title: string
  variantHint?: string
  relatedTemplateId?: string
  purpose: string
  context: string
  preparation: {
    environment: {
      title: string
      items: Array<{ text: string; critical?: boolean }>
    }
    setup: {
      title: string
      items: string[]
    }
  }
  execution: {
    title: string
    actions: Array<{
      order: number
      text: string
      primitives: string[]
    }>
  }
  redLines: string[]
  difficulty: ScriptDifficulty
  atomicActionIds: string[]
  propIds: string[]
  variationTags: string[]
  perceptionTags: string[]
}

export function cardDisplayTitle(card: Pick<TaskScriptCard, 'title' | 'variantHint'>): string {
  if (card.variantHint && !card.title.includes(card.variantHint)) {
    return `${card.title}（${card.variantHint}）`
  }
  return card.title
}

export function renderTaskCard(card: TaskScriptCard): string {
  const envLines = card.preparation.environment.items.map((item) =>
    item.critical ? `- ⚠️ 关键：${item.text}` : `- ${item.text}`,
  )
  const setupLines = card.preparation.setup.items.map((item) => `- ${item}`)
  const actionLines = card.execution.actions
    .sort((a, b) => a.order - b.order)
    .map((action) => `${action.order}. ${action.text}`)

  return [
    `🚩 任务：${cardDisplayTitle(card)}`,
    `🎯 目的：${card.purpose}`,
    `🎬 【导读】 ${card.context}`,
    '--- 准备工作（录制前完成） ---',
    `💡 【${card.preparation.environment.title}】`,
    ...envLines,
    `📦 【${card.preparation.setup.title}】`,
    ...setupLines,
    '--- 开始录制（按下录制键） ---',
    `🛠️ 【${card.execution.title}】`,
    ...actionLines,
    `🛑 【防废片红线】 ${card.redLines.join(' ')}`,
  ].join('\n')
}

export function cardFilterText(card: TaskScriptCard): string {
  const parts = [
    card.title,
    card.purpose,
    card.context,
    ...card.preparation.environment.items.map((i) => i.text),
    ...card.preparation.setup.items,
    ...card.execution.actions.map((a) => a.text),
    ...card.redLines,
  ]
  return parts.join('\n')
}

function splitEnvironmentLines(environment: string): TaskScriptCard['preparation']['environment']['items'] {
  return environment
    .split(/[；;]\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((text) => ({ text }))
}

function formatActionText(operation: string, primitives: string[]): string {
  if (/\[[^\]]+\]/.test(operation)) return operation
  if (primitives.length >= 1) return `[${primitives[0]}] ${operation}`
  return operation
}

export function buildCardFromTemplate(
  template: ScriptTemplate,
  input: ScriptDraftInput,
  props: Prop[],
): TaskScriptCard | undefined {
  if (!template.skeleton) return undefined

  const scene = sceneLabel(input.sceneId)
  const propsText = propLabels(input.propIds, props) || '场景内道具'
  const actionsText = atomicActionLabels(input.atomicActionIds) || '基础取放'

  const fill = (text: string) =>
    text
      .replaceAll('{scene}', scene)
      .replaceAll('{props}', propsText)
      .replaceAll('{actions}', actionsText)
      .replaceAll('{taskType}', input.taskType)

  const primitivesForStep = (step: string): string[] => {
    const found: string[] = []
    const tags = step.match(/\[([^\]]+)\]/g)
    if (tags) {
      tags.forEach((t) => found.push(t.slice(1, -1)))
    }
    if (/拉.*抽屉|抽屉.*拉/.test(step)) found.push('开')
    if (/抓|取/.test(step)) found.push('抓起')
    if (/放|归位/.test(step)) found.push('放')
    if (/推.*关|关|闭合/.test(step)) found.push('关')
    return [...new Set(found)]
  }

  return {
    title: template.motherTaskLabel ?? template.name,
    variantHint: '标准版',
    relatedTemplateId: template.id,
    purpose: `覆盖${actionsText}相关采集轨迹与操作约束。`,
    context: fill(template.skeleton.context),
    preparation: {
      environment: {
        title: '布置光影与环境',
        items: splitEnvironmentLines(fill(template.skeleton.environment)),
      },
      setup: {
        title: '摆放道具',
        items: [fill(template.skeleton.setup)],
      },
    },
    execution: {
      title: '动作执行',
      actions: template.skeleton.sequence.map((step, idx) => {
        const operation = fill(step)
        const primitives = primitivesForStep(operation)
        return {
          order: idx + 1,
          text: formatActionText(operation, primitives),
          primitives,
        }
      }),
    },
    redLines: ['执行时勿遮挡第三视角机位'],
    difficulty: template.difficulty,
    atomicActionIds: [...input.atomicActionIds],
    propIds: [...input.propIds],
    variationTags: ['标准'],
    perceptionTags: [],
  }
}

export function cardToLegacySteps(
  card: TaskScriptCard,
): { instruction: string; steps: Array<{ order: number; operation: string; durationMinutes: number }> } {
  const durations = estimateStepDurationsFromCard(card)
  return {
    instruction: card.context,
    steps: card.execution.actions.map((action, idx) => ({
      order: action.order,
      operation: action.text,
      durationMinutes: durations[idx] ?? 1,
    })),
  }
}

export function buildDraftFromTemplateContext(
  context: GenerateScriptsContext,
): Pick<TaskScript, 'title' | 'instruction' | 'steps' | 'difficulty' | 'card' | 'renderedCard'> | undefined {
  const templateId = context.input.templateId
  if (!templateId) return undefined
  const template = templateById(getPlatformScriptTemplates(), templateId)
  const card = template ? buildCardFromTemplate(template, context.input, context.props) : undefined
  if (!card) return undefined
  const legacy = cardToLegacySteps(card)
  const renderedCard = renderTaskCard(card)
  return {
    title: card.title,
    instruction: legacy.instruction,
    steps: legacy.steps,
    difficulty: card.difficulty,
    card,
    renderedCard,
  }
}

/** 有四槽模板时，将草案升级为 Skill 任务卡片格式 */
export function enrichScriptDraft(context: GenerateScriptsContext, draft: TaskScript): TaskScript {
  if (draft.renderedCard && draft.card) return draft
  const fromTemplate = buildDraftFromTemplateContext(context)
  if (!fromTemplate) return draft
  return {
    ...draft,
    ...fromTemplate,
  }
}

export function hasTemplateSkeleton(context: GenerateScriptsContext): boolean {
  const templateId = context.input.templateId
  if (!templateId) return false
  const template = templateById(getPlatformScriptTemplates(), templateId)
  return Boolean(template?.skeleton)
}
