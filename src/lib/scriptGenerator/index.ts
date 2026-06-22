import { mockLlmProvider } from '@/lib/scriptGenerator/mockLlmProvider'
import { llmProvider } from '@/lib/scriptGenerator/llmProvider'
import { templateProvider } from '@/lib/scriptGenerator/templateProvider'
import type {
  GenerateScriptsContext,
  GenerateScriptsResult,
  ScriptGeneratorMode,
  ScriptGeneratorProvider,
} from '@/lib/scriptGenerator/types'

export type {
  GenerateScriptsContext,
  GenerateScriptsResult,
  ScriptCandidate,
  ScriptGeneratorMode,
} from '@/lib/scriptGenerator/types'
export { draftFromCandidate } from '@/lib/scriptGenerator/templateProvider'
export { resolveSafetyTier } from '@/lib/scriptGenerator/safetyTier'
export {
  compareScriptsByQcScore,
  isScriptQcPassed,
  qcStatusLabel,
  sortScriptsByQcScore,
  summarizeScriptQc,
} from '@/lib/scriptGenerator/scriptQc'
export { pickBestCandidate, rankCandidates } from '@/lib/scriptGenerator/filter'
export type { SceneSafetyTier } from '@/lib/scriptGenerator/safetyTier'
export {
  buildCardFromTemplate,
  buildDraftFromTemplateContext,
  cardDisplayTitle,
  cardFilterText,
  cardToLegacySteps,
  enrichScriptDraft,
  hasTemplateSkeleton,
  renderTaskCard,
} from '@/lib/scriptGenerator/taskScriptCard'
export {
  estimateActionDurationMinutes,
  estimateCardPreparationMinutes,
  estimateCardRecordingMinutes,
  formatEstimatedMinutes,
} from '@/lib/scriptGenerator/estimateDuration'
export type { StaticPerceptionProfile, TaskScriptCard } from '@/lib/scriptGenerator/taskScriptCard'

const MODE_ENV = (import.meta.env.VITE_SCRIPT_GENERATOR_MODE as string | undefined)?.trim()

export function getScriptGeneratorMode(): ScriptGeneratorMode {
  if (MODE_ENV === 'template' || MODE_ENV === 'mock-llm' || MODE_ENV === 'llm') {
    return MODE_ENV
  }
  return 'mock-llm'
}

function getProvider(mode: ScriptGeneratorMode): ScriptGeneratorProvider {
  if (mode === 'template') return templateProvider
  if (mode === 'mock-llm') return mockLlmProvider
  if (mode === 'llm') return llmProvider
  throw new Error(`未知台本生成模式：${mode}`)
}

export async function generateScripts(
  context: GenerateScriptsContext,
  mode: ScriptGeneratorMode = getScriptGeneratorMode(),
): Promise<GenerateScriptsResult> {
  return getProvider(mode).generate(context)
}

export function scriptGeneratorModeLabel(mode: ScriptGeneratorMode = getScriptGeneratorMode()): string {
  if (mode === 'template') return '规则模板'
  if (mode === 'mock-llm') return 'Mock LLM（候选生成 + 筛选）'
  if (mode === 'llm') return 'DeepSeek LLM'
  return 'LLM'
}
