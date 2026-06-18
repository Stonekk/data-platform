import type { TaskScript } from '@/data/mock'
import { getPlatformScriptTemplates } from '@/data/scriptTemplateStore'
import { generateScriptCandidate, type ScriptDraftInput } from '@/lib/scriptWorkflow'
import { evaluateCandidate, type AllowedProp } from '@/lib/scriptGenerator/filter'
import { resolveSafetyTier } from '@/lib/scriptGenerator/safetyTier'
import {
  buildDraftFromTemplateContext,
  cardFilterText,
  enrichScriptDraft,
} from '@/lib/scriptGenerator/taskScriptCard'
import type {
  GenerateScriptsContext,
  GenerateScriptsResult,
  ScriptCandidate,
  ScriptGeneratorProvider,
} from '@/lib/scriptGenerator/types'

function safetyTierFromContext(context: GenerateScriptsContext) {
  if (!context.scene) return 'manipulation' as const
  return resolveSafetyTier(context.scene)
}

function configuredProps(context: GenerateScriptsContext): AllowedProp[] {
  return context.input.propIds
    .map((id) => context.props.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof context.props[number]> => p !== undefined)
    .map((p) => ({ id: p.id, name: p.name }))
}

function toCandidate(
  draft: TaskScript,
  context: GenerateScriptsContext,
  extra?: Pick<ScriptCandidate, 'card' | 'renderedCard'>,
): ScriptCandidate {
  const safetyTier = safetyTierFromContext(context)
  const evalResult = evaluateCandidate(
    {
      instruction: draft.instruction,
      steps: draft.steps,
      difficulty: draft.difficulty,
    },
    {
      safetyTier,
      extraText: extra?.renderedCard ?? (extra?.card ? cardFilterText(extra.card) : undefined),
      requestedDifficulty: context.input.difficulty,
      allowedProps: configuredProps(context),
      card: extra?.card,
    },
  )
  return {
    id: `${draft.taskId}-template`,
    instruction: draft.instruction,
    steps: draft.steps,
    difficulty: draft.difficulty,
    score: evalResult.score,
    passed: evalResult.passed,
    rejectReason: evalResult.rejectReason,
    safetyTier,
    ...extra,
  }
}

export const templateProvider: ScriptGeneratorProvider = {
  mode: 'template',
  async generate(context: GenerateScriptsContext): Promise<GenerateScriptsResult> {
    const start = performance.now()
    const templates = getPlatformScriptTemplates()
    const fromTemplate = buildDraftFromTemplateContext(context)

    let draft: TaskScript
    let cardExtra: Pick<ScriptCandidate, 'card' | 'renderedCard'> | undefined

    if (fromTemplate) {
      draft = {
        ...generateScriptCandidate(context.input, context.props, 0, templates),
        ...fromTemplate,
      }
      cardExtra = { card: fromTemplate.card, renderedCard: fromTemplate.renderedCard }
    } else {
      draft = generateScriptCandidate(context.input, context.props, 0, templates)
    }

    const candidate = toCandidate(draft, context, cardExtra)
    return {
      draft: { ...draft, ...cardExtra },
      candidates: [candidate],
      meta: {
        mode: 'template',
        generatedCount: 1,
        passedCount: candidate.passed ? 1 : 0,
        filteredCount: candidate.passed ? 0 : 1,
        durationMs: Math.round(performance.now() - start),
      },
    }
  },
}

export function draftFromCandidate(
  input: ScriptDraftInput,
  candidate: ScriptCandidate,
  props: GenerateScriptsContext['props'],
  context?: GenerateScriptsContext,
): TaskScript {
  const templates = getPlatformScriptTemplates()
  const base = generateScriptCandidate(
    { ...input, difficulty: candidate.difficulty },
    props,
    0,
    templates,
  )
  const draft: TaskScript = {
    ...base,
    instruction: candidate.instruction,
    steps: candidate.steps.map((step, idx) => ({ ...step, order: idx + 1 })),
    difficulty: candidate.difficulty,
    card: candidate.card,
    renderedCard: candidate.renderedCard,
  }
  if (context) return enrichScriptDraft(context, draft)
  return draft
}
