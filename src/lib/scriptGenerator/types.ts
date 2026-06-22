import type { Prop, ScriptDifficulty, TaskScript, TaskScriptStep } from '@/data/mock'
import type { ScriptDraftInput } from '@/lib/scriptWorkflow'
import type { SceneSafetyTier } from '@/lib/scriptGenerator/safetyTier'
import type { TaskScriptCard } from '@/lib/scriptGenerator/taskScriptCard'

export type ScriptGeneratorMode = 'template' | 'mock-llm' | 'llm'

export type ScriptCandidate = {
  id: string
  instruction: string
  steps: TaskScriptStep[]
  difficulty: ScriptDifficulty
  /** 合理性评分 0–100，越高越优先 */
  score: number
  passed: boolean
  rejectReason?: string
  card?: TaskScriptCard
  renderedCard?: string
  safetyTier?: SceneSafetyTier
}

export type GenerateScriptsMeta = {
  mode: ScriptGeneratorMode
  generatedCount: number
  passedCount: number
  filteredCount: number
  durationMs: number
}

export type GenerateScriptsResult = {
  draft: TaskScript
  candidates: ScriptCandidate[]
  meta: GenerateScriptsMeta
}

export type GenerateScriptsContext = {
  input: ScriptDraftInput
  props: Prop[]
  scene?: {
    name: string
    sceneSubtype: string
    description: string
    safetyTier?: SceneSafetyTier
    type?: string
  }
  /** 溯源需求约束，供 LLM 生成时遵守 */
  requirement?: {
    title: string
    keyRequirements: string[]
    targetValue: string
  }
}

export interface ScriptGeneratorProvider {
  readonly mode: ScriptGeneratorMode
  generate(context: GenerateScriptsContext): Promise<GenerateScriptsResult>
}
