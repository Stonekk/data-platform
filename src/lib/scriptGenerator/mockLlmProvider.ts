import { categoryById } from '@/data/atomicActions'
import type { ScriptDifficulty, TaskScriptStep } from '@/data/mock'
import {
  atomicActionLabels,
  buildInstruction,
  propLabels,
  sceneLabel,
  type ScriptDraftInput,
} from '@/lib/scriptWorkflow'
import { draftFromCandidate, templateProvider } from '@/lib/scriptGenerator/templateProvider'
import { evaluateCandidate, rankCandidates } from '@/lib/scriptGenerator/filter'
import { resolveSafetyTier } from '@/lib/scriptGenerator/safetyTier'
import { hasTemplateSkeleton } from '@/lib/scriptGenerator/taskScriptCard'
import type {
  GenerateScriptsContext,
  GenerateScriptsResult,
  ScriptCandidate,
  ScriptGeneratorProvider,
} from '@/lib/scriptGenerator/types'

const MOCK_LATENCY_MS = 1400

const INSTRUCTION_VARIANTS = [
  (scene: string, props: string, actions: string, taskType: string) =>
    `在${scene}，使用${props}，按顺序完成${taskType}演示，重点覆盖${actions}。`,
  (scene: string, props: string, actions: string, taskType: string) =>
    `请于${scene}内，借助${props}，以${actions}为主线完成一次${taskType}任务。`,
  (scene: string, props: string, actions: string, taskType: string) =>
    `任务：在${scene}利用现有${props}，完成可语言化的${taskType}流程（含${actions}）。`,
  (scene: string, props: string, actions: string, taskType: string) =>
    `在${scene}保持干式安全操作，用${props}完成${taskType}，并体现${actions}。`,
]

const SIMPLE_OPS = [
  ['观察初始布局', '完成核心单次操作', '确认结果并归位'],
  ['对准目标物体', '执行指定取放', '检查摆放是否达标'],
]

const COMPLEX_OPS = [
  ['清点道具并摆位', '按逻辑顺序执行多步操作', '中途检查约束条件', '整理现场并收尾'],
  ['准备工位与道具', '串联两个以上子任务', '复核动作可见性', '恢复场景初始状态'],
  ['从起始位出发', '完成长程组合动作', '处理中间过渡姿态', '结束并自检'],
]

const CORRECTION_OPS = [
  ['正常执行前半段', '引入可控失误（如碰落）', '发现并纠正', '恢复至正确状态'],
  ['开始标准流程', '模拟拿取不稳导致滑落', '捡起并重新调整', '继续完成剩余步骤'],
  ['按台本推进', '故意拧盖失败一次', '重新对准后完成', '确认最终状态正确'],
]

/** 故意注入会被筛掉的荒谬候选，模拟 LLM 批量生成 + 筛选 */
const BAD_CANDIDATES: Array<{
  instruction: string
  steps: TaskScriptStep[]
  difficulty: ScriptDifficulty
}> = [
  {
    instruction: '单手端起装满水的重汤锅并快步穿过厨房',
    steps: [
      { order: 1, operation: '打开燃气灶明火加热', durationMinutes: 5 },
      { order: 2, operation: '单手端满锅奔跑', durationMinutes: 3 },
    ],
    difficulty: 'complex',
  },
  {
    instruction: '简单地把遥控器摆正',
    steps: [
      { order: 1, operation: '摆正', durationMinutes: 1 },
      { order: 2, operation: '再摆正', durationMinutes: 1 },
      { order: 3, operation: '第三次摆正', durationMinutes: 1 },
      { order: 4, operation: '第四次摆正', durationMinutes: 1 },
      { order: 5, operation: '第五次摆正', durationMinutes: 1 },
    ],
    difficulty: 'simple',
  },
]

function buildSteps(
  difficulty: ScriptDifficulty,
  variantIndex: number,
  propNames: string[],
): TaskScriptStep[] {
  const primaryProp = propNames[0] ?? '目标道具'
  const templates =
    difficulty === 'simple'
      ? SIMPLE_OPS
      : difficulty === 'correction'
        ? CORRECTION_OPS
        : COMPLEX_OPS
  const ops = templates[variantIndex % templates.length] ?? templates[0]
  return ops.map((operation, idx) => ({
    order: idx + 1,
    operation: operation.replace(/目标道具/g, primaryProp).replace(/道具/g, primaryProp),
    durationMinutes:
      difficulty === 'complex' ? 18 + (idx % 3) * 2 : difficulty === 'correction' ? 12 + idx * 2 : 8 + idx * 2,
  }))
}

function buildCandidatePool(
  input: ScriptDraftInput,
  props: GenerateScriptsContext['props'],
  context: GenerateScriptsContext,
): ScriptCandidate[] {
  const safetyTier = context.scene ? resolveSafetyTier(context.scene) : 'manipulation'
  const scene = sceneLabel(input.sceneId)
  const propText = propLabels(input.propIds, props) || '场景内道具'
  const actionText = atomicActionLabels(input.atomicActionIds) || '基础取放'
  const propNames = input.propIds.map((id) => props.find((p) => p.id === id)?.name ?? id)

  const pool: ScriptCandidate[] = []

  INSTRUCTION_VARIANTS.forEach((fn, idx) => {
    const instruction = fn(scene, propText, actionText, input.taskType)
    const steps = buildSteps(input.difficulty, idx, propNames)
    const evalResult = evaluateCandidate(
      { instruction, steps, difficulty: input.difficulty },
      { safetyTier, requestedDifficulty: input.difficulty },
    )
    pool.push({
      id: `${input.taskId}-v${idx}`,
      instruction,
      steps,
      difficulty: input.difficulty,
      score: evalResult.score,
      passed: evalResult.passed,
      rejectReason: evalResult.rejectReason,
      safetyTier,
    })
  })

  // 跨难度变体（模拟批量候选里混入其他档位）
  const altDifficulties: ScriptDifficulty[] = ['simple', 'complex', 'correction'].filter(
    (d) => d !== input.difficulty,
  ) as ScriptDifficulty[]
  altDifficulties.forEach((diff, idx) => {
    const instruction = buildInstruction({ ...input, difficulty: diff }, props)
    const steps = buildSteps(diff, idx + 2, propNames)
    const evalResult = evaluateCandidate(
      { instruction, steps, difficulty: diff },
      { safetyTier, requestedDifficulty: input.difficulty },
    )
    pool.push({
      id: `${input.taskId}-alt-${diff}`,
      instruction,
      steps,
      difficulty: diff,
      score: evalResult.score - 5,
      passed: evalResult.passed,
      rejectReason: evalResult.rejectReason,
      safetyTier,
    })
  })

  // 原子动作强化变体
  const highlightActions = input.atomicActionIds
    .map((id) => categoryById(id))
    .filter((c) => c?.highlight)
  if (highlightActions.length > 0) {
    const focus = highlightActions.map((c) => c!.name).join('、')
    const instruction = `在${scene}，突出训练${focus}，使用${propText}完成${input.taskType}。`
    const steps = buildSteps(input.difficulty, 1, propNames)
    steps[1] = {
      ...steps[1],
      operation: `针对${focus}执行关键动作（${actionText}）`,
    }
    const evalResult = evaluateCandidate(
      { instruction, steps, difficulty: input.difficulty },
      { safetyTier, requestedDifficulty: input.difficulty },
    )
    pool.push({
      id: `${input.taskId}-highlight`,
      instruction,
      steps,
      difficulty: input.difficulty,
      score: evalResult.score + 5,
      passed: evalResult.passed,
      rejectReason: evalResult.rejectReason,
      safetyTier,
    })
  }

  BAD_CANDIDATES.forEach((bad, idx) => {
    const evalResult = evaluateCandidate(bad, { safetyTier, requestedDifficulty: input.difficulty })
    pool.push({
      id: `${input.taskId}-bad-${idx}`,
      ...bad,
      score: evalResult.score,
      passed: evalResult.passed,
      rejectReason: evalResult.rejectReason,
      safetyTier,
    })
  })

  return pool
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export const mockLlmProvider: ScriptGeneratorProvider = {
  mode: 'mock-llm',
  async generate(context: GenerateScriptsContext): Promise<GenerateScriptsResult> {
    const start = performance.now()
    await delay(MOCK_LATENCY_MS)

    // 路径 C-a：有四槽模板时走模板卡片，不生成旧版 mock 文案
    if (hasTemplateSkeleton(context)) {
      const templateResult = await templateProvider.generate(context)
      return {
        ...templateResult,
        meta: {
          ...templateResult.meta,
          mode: 'mock-llm',
          durationMs: Math.round(performance.now() - start),
        },
      }
    }

    const pool = buildCandidatePool(context.input, context.props, context)
    const generatedCount = pool.length
    const ranked = rankCandidates(pool)
    const passed = ranked.filter((c) => c.passed)
    const filteredCount = generatedCount - passed.length

    const best =
      passed.find((c) => c.difficulty === context.input.difficulty) ?? passed[0]

    if (!best) {
      const fallback = draftFromCandidate(context.input, ranked[0], context.props, context)
      return {
        draft: fallback,
        candidates: ranked.slice(0, 5),
        meta: {
          mode: 'mock-llm',
          generatedCount,
          passedCount: 0,
          filteredCount: generatedCount,
          durationMs: Math.round(performance.now() - start),
        },
      }
    }

    const draft = draftFromCandidate(context.input, best, context.props, context)
    const displayCandidates = [
      ...passed.filter((c) => c.difficulty === context.input.difficulty).slice(0, 5),
      ...ranked.filter((c) => !c.passed).slice(0, 2),
    ]

    return {
      draft,
      candidates: displayCandidates,
      meta: {
        mode: 'mock-llm',
        generatedCount,
        passedCount: passed.length,
        filteredCount,
        durationMs: Math.round(performance.now() - start),
      },
    }
  },
}
