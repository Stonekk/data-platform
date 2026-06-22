import type { ScriptGenerationMeta, TaskScript } from '@/data/mock'

/** 无 generationMeta 视为人工/模板台本，默认通过 */
export function isScriptQcPassed(script: TaskScript): boolean {
  if (!script.generationMeta) return true
  return script.generationMeta.passed !== false
}

/** 候选台本排序：先通过 L1，再按评分从高到低 */
export function compareScriptsByQcScore(a: TaskScript, b: TaskScript): number {
  const aPassed = isScriptQcPassed(a)
  const bPassed = isScriptQcPassed(b)
  if (aPassed !== bPassed) return aPassed ? -1 : 1
  return (b.generationMeta?.score ?? 0) - (a.generationMeta?.score ?? 0)
}

export function sortScriptsByQcScore(scripts: TaskScript[]): TaskScript[] {
  return [...scripts].sort(compareScriptsByQcScore)
}

export type QcSummary = {
  passed: number
  failed: number
  total: number
}

export function summarizeScriptQc(scripts: TaskScript[]): QcSummary {
  let passed = 0
  let failed = 0
  for (const script of scripts) {
    if (isScriptQcPassed(script)) passed += 1
    else failed += 1
  }
  return { passed, failed, total: scripts.length }
}

export function qcStatusLabel(meta?: ScriptGenerationMeta): string {
  if (!meta) return '未评估'
  if (meta.passed === false) return '未过质检'
  if (meta.score !== undefined) return `通过 · ${meta.score} 分`
  return '通过'
}
