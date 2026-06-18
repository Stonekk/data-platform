import { generateScriptCandidate } from '@/lib/scriptWorkflow'
import { getPlatformScriptTemplates } from '@/data/scriptTemplateStore'
import { chatJson } from '@/lib/scriptGenerator/llmClient'
import { evaluateCandidate, rankCandidates } from '@/lib/scriptGenerator/filter'
import { buildLlmUserPrompt, LLM_SYSTEM_PROMPT } from '@/lib/scriptGenerator/prompts'
import { llmResponseToCandidates, type RawLlmResponse } from '@/lib/scriptGenerator/llmResponse'
import { resolveSafetyTier } from '@/lib/scriptGenerator/safetyTier'
import { buildDraftFromTemplateContext, hasTemplateSkeleton } from '@/lib/scriptGenerator/taskScriptCard'
import { draftFromCandidate } from '@/lib/scriptGenerator/templateProvider'
import type {
  GenerateScriptsContext,
  GenerateScriptsResult,
  ScriptGeneratorProvider,
} from '@/lib/scriptGenerator/types'

const DEFAULT_CANDIDATE_COUNT = 3

export const llmProvider: ScriptGeneratorProvider = {
  mode: 'llm',
  async generate(context: GenerateScriptsContext): Promise<GenerateScriptsResult> {
    const start = performance.now()
    const candidateCount = DEFAULT_CANDIDATE_COUNT

    const raw = await chatJson<RawLlmResponse>([
      { role: 'system', content: LLM_SYSTEM_PROMPT },
      { role: 'user', content: buildLlmUserPrompt(context, candidateCount) },
    ])

    let candidates = llmResponseToCandidates(raw, context)
    const generatedCount = candidates.length

    // 有模板且 LLM 未返回有效结果时，回退本地四槽模板
    if (candidates.length === 0 && hasTemplateSkeleton(context)) {
      const fromTemplate = buildDraftFromTemplateContext(context)
      if (fromTemplate) {
        const safetyTier = context.scene ? resolveSafetyTier(context.scene) : 'manipulation'
        const legacy = { instruction: fromTemplate.instruction, steps: fromTemplate.steps }
        const evalResult = evaluateCandidate(
          { ...legacy, difficulty: fromTemplate.difficulty },
          {
            safetyTier,
            extraText: fromTemplate.renderedCard,
            requestedDifficulty: context.input.difficulty,
            allowedProps: context.input.propIds
              .map((id) => context.props.find((p) => p.id === id))
              .filter((p): p is NonNullable<(typeof context.props)[number]> => p !== undefined)
              .map((p) => ({ id: p.id, name: p.name })),
            card: fromTemplate.card,
          },
        )
        candidates = [
          {
            id: `${context.input.taskId}-llm-fallback-template`,
            instruction: fromTemplate.instruction,
            steps: fromTemplate.steps,
            difficulty: fromTemplate.difficulty,
            score: evalResult.score,
            passed: evalResult.passed,
            rejectReason: evalResult.rejectReason,
            card: fromTemplate.card,
            renderedCard: fromTemplate.renderedCard,
            safetyTier,
          },
        ]
      }
    }

    const ranked = rankCandidates(candidates)
    const passed = ranked.filter((c) => c.passed)
    const best =
      passed.find((c) => c.difficulty === context.input.difficulty) ?? passed[0] ?? ranked[0]

    const templates = getPlatformScriptTemplates()
    const baseDraft = generateScriptCandidate(context.input, context.props, 0, templates)
    const draft = best
      ? draftFromCandidate(context.input, best, context.props, context)
      : { ...baseDraft }

    return {
      draft,
      candidates: ranked.slice(0, 6),
      meta: {
        mode: 'llm',
        generatedCount: generatedCount || ranked.length,
        passedCount: passed.length,
        filteredCount: (generatedCount || ranked.length) - passed.length,
        durationMs: Math.round(performance.now() - start),
      },
    }
  },
}
