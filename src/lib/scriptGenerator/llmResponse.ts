import type { Prop, ScriptDifficulty } from '@/data/mock'
import { evaluateCandidate, type AllowedProp } from '@/lib/scriptGenerator/filter'
import { resolveSafetyTier } from '@/lib/scriptGenerator/safetyTier'
import {
  cardFilterText,
  cardToLegacySteps,
  renderTaskCard,
  type TaskScriptCard,
} from '@/lib/scriptGenerator/taskScriptCard'
import type { GenerateScriptsContext, ScriptCandidate } from '@/lib/scriptGenerator/types'

export type RawLlmCandidate = {
  card?: Partial<TaskScriptCard>
}

export type RawLlmResponse = {
  candidates?: RawLlmCandidate[]
}

function isDifficulty(v: unknown): v is ScriptDifficulty {
  return v === 'simple' || v === 'complex' || v === 'correction'
}

function configuredProps(context: GenerateScriptsContext): AllowedProp[] {
  return context.input.propIds
    .map((id) => context.props.find((p) => p.id === id))
    .filter((p): p is Prop => p !== undefined)
    .map((p) => ({ id: p.id, name: p.name }))
}

function normalizeCard(
  raw: Partial<TaskScriptCard>,
  context: GenerateScriptsContext,
): TaskScriptCard | undefined {
  const { input } = context
  if (!raw.title || !raw.purpose || !raw.context) return undefined
  if (!raw.preparation?.environment?.items || !raw.preparation?.setup?.items) return undefined
  if (!raw.execution?.actions?.length) return undefined

  const difficulty = isDifficulty(raw.difficulty) ? raw.difficulty : input.difficulty

  return {
    title: raw.title,
    variantHint: raw.variantHint,
    relatedTemplateId: raw.relatedTemplateId ?? input.templateId,
    purpose: raw.purpose,
    context: raw.context,
    preparation: {
      environment: {
        title: raw.preparation.environment.title ?? '布置光影与环境',
        items: raw.preparation.environment.items.map((item) => ({
          text: item.text,
          critical: item.critical,
        })),
      },
      setup: {
        title: raw.preparation.setup.title ?? '摆放道具',
        items: raw.preparation.setup.items,
      },
    },
    execution: {
      title: raw.execution.title ?? '动作执行',
      actions: raw.execution.actions.map((action, idx) => ({
        order: action.order ?? idx + 1,
        text: action.text,
        primitives: action.primitives ?? [],
      })),
    },
    redLines: raw.redLines?.length ? raw.redLines : ['执行时勿遮挡采集机位'],
    difficulty,
    atomicActionIds: raw.atomicActionIds?.length ? raw.atomicActionIds : [...input.atomicActionIds],
    propIds: raw.propIds?.length ? raw.propIds : [...input.propIds],
    variationTags: raw.variationTags ?? [],
    perceptionTags: raw.perceptionTags ?? [],
  }
}

export function llmResponseToCandidates(
  response: RawLlmResponse,
  context: GenerateScriptsContext,
): ScriptCandidate[] {
  const safetyTier = context.scene ? resolveSafetyTier(context.scene) : 'manipulation'
  const list = response.candidates ?? []

  return list.flatMap((item, index) => {
    const card = item.card ? normalizeCard(item.card, context) : undefined
    if (!card) return []

    const renderedCard = renderTaskCard(card)
    const legacy = cardToLegacySteps(card)
    const evalResult = evaluateCandidate(
      {
        instruction: legacy.instruction,
        steps: legacy.steps,
        difficulty: card.difficulty,
      },
      {
        safetyTier,
        extraText: cardFilterText(card),
        requestedDifficulty: context.input.difficulty,
        allowedProps: configuredProps(context),
        card,
      },
    )

    return [
      {
        id: `${context.input.taskId}-llm-${index}`,
        instruction: legacy.instruction,
        steps: legacy.steps,
        difficulty: card.difficulty,
        score: evalResult.score,
        passed: evalResult.passed,
        rejectReason: evalResult.rejectReason,
        card,
        renderedCard,
        safetyTier,
      },
    ]
  })
}
