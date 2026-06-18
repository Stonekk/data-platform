import type { ScriptDifficulty } from '@/data/mock'
import type { ScriptCandidate } from '@/lib/scriptGenerator/types'
import type { SceneSafetyTier } from '@/lib/scriptGenerator/safetyTier'
import type { TaskScriptCard } from '@/lib/scriptGenerator/taskScriptCard'

const GLOBAL_FORBIDDEN = /明火|开火|点燃|真实烹饪|热油|触电|插座/i

const MANIPULATION_LIQUID = /倒水|用水冲洗|撒.{0,6}水|积水/i

const CORRECTION_MARKERS = /失误|错误|碰落|滑落|纠正|恢复|重新|捡起|扶正/

/** 明显违背常识的道具组合（L1 硬规则，可扩展） */
const PLAUSIBILITY_RULES: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern:
      /(?:玻璃杯|马克杯|水杯|茶杯|陶瓷杯|保温杯|酒杯|饭杯).{0,40}(?:放入|放进|装进|塞入|纳入).{0,20}(?:保鲜盒|便当盒|食品盒)/,
    reason: '饮用具不应放入食品保鲜容器',
  },
  {
    pattern:
      /(?:保鲜盒|便当盒|食品盒).{0,40}(?:放入|放进|装进|塞入).{0,20}(?:玻璃杯|马克杯|水杯|茶杯|陶瓷杯|保温杯|酒杯|笔记本电脑|手机|键盘|充电器)/,
    reason: '容器用途与内容物不匹配',
  },
  {
    pattern:
      /(?:笔记本电脑|手机|平板|键盘|鼠标|充电器).{0,40}(?:放入|放进|装进).{0,20}(?:保鲜盒|便当盒|米缸|调料罐)/,
    reason: '电子产品/非食品不应放入食品容器',
  },
]

const SETUP_PROP_PATTERNS = [
  /^(?:把)?([\u4e00-\u9fff]{2,8})(?:倒扣|平放|正放|放于|放在|置于|斜靠|折叠后放在|折叠后放于|独立)/,
  /(?:^|[，,])([\u4e00-\u9fff]{2,8})(?:放于|放在|置于|斜靠)/,
  /(?:右边|左边|左侧|右侧)(?:放|放有)([\u4e00-\u9fff]{2,8})/,
  /放(?:有)?([\u4e00-\u9fff]{2,8})(?:于|在)/,
]

const ACTION_PROP_PATTERNS = [
  /\[抓起\]([\u4e00-\u9fff]{2,8})/g,
  /\[放下\]([\u4e00-\u9fff]{2,8})/g,
  /的([\u4e00-\u9fff]{2,8})\[/g,
  /\[翻转\]([\u4e00-\u9fff]{2,8})/g,
  /([\u4e00-\u9fff]{2,8})(?:撕开|掉落|搅动|传递)/g,
  /向([\u4e00-\u9fff]{2,8})[里中]/g,
  /(?:捧起|持|接)([\u4e00-\u9fff]{2,8})/g,
]

/** 从 setup / action 文本中提取、但不应视为「未配置道具」的短语 */
const PROP_EXTRACT_IGNORE = new Set([
  '右手',
  '左手',
  '双手',
  '桌面',
  '茶几',
  '中央',
  '右侧',
  '左侧',
  '右侧边缘',
  '左侧边缘',
  '操作区',
  '干净区域',
  '包装袋',
  '包装',
  '粉末',
  '助理',
  '主操作',
  '操作者',
  '另一根',
  '原条',
  '七分满',
  '两圈',
  '指定',
  '目标',
  '附近',
  '远处',
  '中间',
  '旁边',
  '杯中',
  '杯里',
])

export type AllowedProp = { id: string; name: string }

export type EvaluateCandidateOptions = {
  safetyTier?: SceneSafetyTier
  /** 追加进自检的文本（如 renderedCard） */
  extraText?: string
  /** 任务需求难度；候选 difficulty 不一致时拒绝 */
  requestedDifficulty?: ScriptDifficulty
  /** 本场已配置道具，用于校验 propIds 与 setup / 动作中的道具引用 */
  allowedProps?: AllowedProp[]
  card?: TaskScriptCard
}

function extractSetupPropNames(item: string): string[] {
  const names: string[] = []
  for (const pattern of SETUP_PROP_PATTERNS) {
    const match = item.match(pattern)
    if (match?.[1]) names.push(match[1])
  }
  return names
}

function extractActionPropNames(text: string): string[] {
  const names: string[] = []
  for (const pattern of ACTION_PROP_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      if (match[1]) names.push(match[1])
    }
  }
  return names
}

function isAllowedPropRef(ref: string, allowedIds: Set<string>, allowedNames: Set<string>): boolean {
  return allowedIds.has(ref) || allowedNames.has(ref)
}

/** 找出 card 中引用但未在 allowedProps 中配置的道具 */
export function findUnconfiguredProps(
  card: Pick<
    TaskScriptCard,
    'propIds' | 'preparation' | 'execution' | 'context' | 'title' | 'purpose' | 'redLines'
  >,
  allowedProps: AllowedProp[],
): string[] {
  if (allowedProps.length === 0) return []

  const allowedIds = new Set(allowedProps.map((p) => p.id))
  const allowedNames = new Set(allowedProps.map((p) => p.name))
  const unknown = new Set<string>()

  for (const ref of card.propIds ?? []) {
    if (!isAllowedPropRef(ref, allowedIds, allowedNames)) unknown.add(ref)
  }

  for (const item of card.preparation.setup.items) {
    for (const name of extractSetupPropNames(item)) {
      if (!PROP_EXTRACT_IGNORE.has(name) && !allowedNames.has(name)) unknown.add(name)
    }
  }

  for (const action of card.execution.actions) {
    for (const name of extractActionPropNames(action.text)) {
      if (!PROP_EXTRACT_IGNORE.has(name) && !allowedNames.has(name)) unknown.add(name)
    }
  }

  return [...unknown]
}

/** 检测明显违背常识的道具组合描写 */
export function findPlausibilityViolations(text: string): string | undefined {
  for (const rule of PLAUSIBILITY_RULES) {
    if (rule.pattern.test(text)) return rule.reason
  }
  return undefined
}

export function evaluateCandidate(
  candidate: Pick<ScriptCandidate, 'instruction' | 'steps' | 'difficulty'>,
  options: EvaluateCandidateOptions = {},
): { passed: boolean; score: number; rejectReason?: string } {
  const safetyTier = options.safetyTier ?? 'manipulation'
  const text = [
    candidate.instruction,
    candidate.steps.map((s) => s.operation).join('\n'),
    options.extraText ?? '',
  ].join('\n')

  if (options.requestedDifficulty && candidate.difficulty !== options.requestedDifficulty) {
    return {
      passed: false,
      score: 0,
      rejectReason: `难度与需求不符（需求 ${options.requestedDifficulty}，候选 ${candidate.difficulty}）`,
    }
  }

  if (
    options.requestedDifficulty &&
    options.requestedDifficulty !== 'correction' &&
    CORRECTION_MARKERS.test(text)
  ) {
    return {
      passed: false,
      score: 0,
      rejectReason: '非纠错档不应包含失误/恢复流程',
    }
  }

  if (options.card && options.allowedProps?.length) {
    const unknownProps = findUnconfiguredProps(options.card, options.allowedProps)
    if (unknownProps.length > 0) {
      return {
        passed: false,
        score: 0,
        rejectReason: `使用了未配置道具：${unknownProps.join('、')}`,
      }
    }
  }

  const plausibilityIssue = findPlausibilityViolations(text)
  if (plausibilityIssue) {
    return {
      passed: false,
      score: 0,
      rejectReason: `常识性错误：${plausibilityIssue}`,
    }
  }

  if (GLOBAL_FORBIDDEN.test(text)) {
    return { passed: false, score: 0, rejectReason: '含不安全操作（明火/触电等）' }
  }

  if (safetyTier === 'manipulation' && MANIPULATION_LIQUID.test(text)) {
    return { passed: false, score: 0, rejectReason: 'manipulation 场景禁止液体相关操作' }
  }

  if (candidate.steps.length === 0) {
    return { passed: false, score: 0, rejectReason: '步骤为空' }
  }

  if (candidate.difficulty === 'simple' && candidate.steps.length > 4) {
    return { passed: false, score: 0, rejectReason: '简单档步骤过多' }
  }

  if (candidate.difficulty === 'correction' && !CORRECTION_MARKERS.test(text)) {
    return {
      passed: false,
      score: 0,
      rejectReason: '纠错档须包含失误与恢复描述',
    }
  }

  if (candidate.difficulty === 'complex' && candidate.steps.length < 3) {
    return { passed: false, score: 0, rejectReason: '复杂档步骤过少' }
  }

  let score = 70
  score += Math.min(candidate.steps.length * 3, 15)
  if (candidate.instruction.length >= 24 && candidate.instruction.length <= 120) {
    score += 8
  }
  if (candidate.difficulty === 'correction' && CORRECTION_MARKERS.test(text)) {
    score += 7
  }

  return { passed: true, score: Math.min(score, 98) }
}

export function rankCandidates(candidates: ScriptCandidate[]): ScriptCandidate[] {
  return [...candidates].sort((a, b) => {
    if (a.passed !== b.passed) return a.passed ? -1 : 1
    return b.score - a.score
  })
}

export function pickBestCandidate(
  candidates: ScriptCandidate[],
  difficulty: ScriptDifficulty,
): ScriptCandidate | undefined {
  const ranked = rankCandidates(candidates)
  return ranked.find((c) => c.passed && c.difficulty === difficulty) ?? ranked.find((c) => c.passed)
}
