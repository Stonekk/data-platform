import type { ScriptDifficulty } from '@/data/mock'
import type { TaskScriptCard } from '@/lib/scriptGenerator/taskScriptCard'

const DIFFICULTY_TOTAL_CAP: Record<
  ScriptDifficulty,
  { min: number; max: number }
> = {
  simple: { min: 3, max: 6 },
  complex: { min: 5, max: 12 },
  correction: { min: 6, max: 15 },
}

type DurationRule = {
  minutes: number
  test: (text: string, primitives: string[]) => boolean
}

const ACTION_RULES: DurationRule[] = [
  {
    minutes: 1.5,
    test: (text) => /标定|校准|检查|巡检|封包|确认.*位姿|起始位姿/.test(text),
  },
  {
    minutes: 2,
    test: (text) => /纠错|恢复|失误|重试|纠正/.test(text),
  },
  {
    minutes: 2,
    test: (text) => /擦拭|倾倒|涂抹|刮|揉|擀|抛光|吸尘|控量/.test(text),
  },
  {
    minutes: 1.25,
    test: (text) => /翻转|对位|摆正|归位|堆叠|摞齐/.test(text),
  },
  {
    minutes: 0.75,
    test: (text, primitives) =>
      primitives.some((p) => /^(开|关|推|拉)$/.test(p)) ||
      /开.*抽屉|关.*抽屉|拉开|推回|推拉|开门|关门|打开|关闭|全开|闭合/.test(text),
  },
  {
    minutes: 0.75,
    test: (text, primitives) =>
      primitives.some((p) => /^(抓起|放|取|放)$/.test(p)) ||
      /抓|取|放|拿起|放下|取出|放入|握/.test(text),
  },
  {
    minutes: 1,
    test: (text) => /暂停|停顿|等待|静止/.test(text),
  },
]

const DEFAULT_ACTION_MINUTES = 1

function clampTotal(
  total: number,
  difficulty: ScriptDifficulty,
): number {
  const { min, max } = DIFFICULTY_TOTAL_CAP[difficulty]
  if (total < min) return min
  if (total > max) return max
  return total
}

function scaleStepDurations(
  durations: number[],
  difficulty: ScriptDifficulty,
): number[] {
  const raw = durations.reduce((sum, m) => sum + m, 0)
  const capped = clampTotal(raw, difficulty)
  if (raw === 0) return durations.map(() => capped / Math.max(durations.length, 1))
  if (raw === capped) return durations
  const factor = capped / raw
  return durations.map((m) => roundMinutes(m * factor))
}

export function roundMinutes(minutes: number): number {
  return Math.round(minutes * 2) / 2
}

export function formatEstimatedMinutes(minutes: number): string {
  const rounded = roundMinutes(minutes)
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export function estimateActionDurationMinutes(
  text: string,
  primitives: string[] = [],
  _difficulty: ScriptDifficulty = 'simple',
): number {
  const combined = `${text} ${primitives.join(' ')}`
  for (const rule of ACTION_RULES) {
    if (rule.test(combined, primitives)) return rule.minutes
  }
  return DEFAULT_ACTION_MINUTES
}

export function estimateCardRecordingMinutes(card: TaskScriptCard): number {
  const perStep = card.execution.actions.map((action) =>
    estimateActionDurationMinutes(
      action.text,
      action.primitives,
      card.difficulty,
    ),
  )
  const scaled = scaleStepDurations(perStep, card.difficulty)
  return roundMinutes(scaled.reduce((sum, m) => sum + m, 0))
}

export function estimateCardPreparationMinutes(card: TaskScriptCard): number {
  const envCount = card.preparation.environment.items.length
  const setupCount = card.preparation.setup.items.length
  const envMinutes = envCount > 0 ? Math.min(3, Math.max(1, envCount * 0.5)) : 0
  const setupMinutes = setupCount > 0 ? Math.min(2, Math.max(1, setupCount * 0.5)) : 0
  return roundMinutes(envMinutes + setupMinutes)
}

export function estimateStepDurationsFromCard(
  card: TaskScriptCard,
): number[] {
  const perStep = card.execution.actions.map((action) =>
    estimateActionDurationMinutes(
      action.text,
      action.primitives,
      card.difficulty,
    ),
  )
  return scaleStepDurations(perStep, card.difficulty)
}

export function estimateStepDurationsFromOperations(
  operations: string[],
  difficulty: ScriptDifficulty = 'simple',
): number[] {
  const perStep = operations.map((operation) => {
    const primitives = operation.match(/\[([^\]]+)\]/g)?.map((t) => t.slice(1, -1)) ?? []
    return estimateActionDurationMinutes(operation, primitives, difficulty)
  })
  return scaleStepDurations(perStep, difficulty)
}
