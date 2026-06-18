#!/usr/bin/env node
/**
 * Validate task-script-generator skill by calling OpenAI GPT.
 * Usage: OPENAI_API_KEY=sk-... node scripts/validate-task-script-skill.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SKILL_DIR = join(ROOT, '.cursor/skills/task-script-generator')

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

const TEST_CASES = [
  {
    id: 'tpl-001',
    label: '模板路径 C-a · 厨房抽屉',
    input: {
      scene: {
        name: '家庭厨房标准间',
        sceneSubtype: '标准成套厨房',
        description: '标准化橱柜与餐具',
        type: '家庭服务',
      },
      props: [
        { id: 'prop-001', name: '厨房抽屉' },
        { id: 'prop-002', name: '汤勺' },
      ],
      atomicActionIds: ['cat-a', 'cat-b'],
      difficulty: 'complex',
      taskType: '遥操作采集',
      template: {
        id: 'tpl-001',
        skeleton: {
          context: '完成一次标准抽屉取放，动作连贯、可复述。',
          environment: '打开厨房主灯，保持正常冷白光；台面整洁，无额外反光干扰。',
          setup: '目标道具放在抽屉内指定位置；抽屉初始全关。',
          sequence: [
            '标定起始位姿',
            '拉开抽屉至全开并停顿',
            '抓取目标道具',
            '将道具取出并放到台面指定区域',
            '推回抽屉确认闭合',
          ],
        },
        allowedVariationAxes: ['object', 'constraint', 'action'],
      },
      candidateCount: 1,
      variationIntensity: 'low',
    },
    expect: {
      safetyTier: 'perception',
      mustNotContain: ['倒水', '积水', '明火'],
      mustContain: ['导读', '防废片红线', '[开]', '[抓起]'],
    },
  },
  {
    id: 't001c',
    label: '无模板 C-b · 茶几冲咖啡感知变体',
    input: {
      scene: {
        name: '客厅茶几标准间',
        sceneSubtype: '茶几布置',
        description: '茶几与沙发区',
        type: '家庭服务',
      },
      props: [
        { id: 'p1', name: '马克杯' },
        { id: 'p2', name: '热水壶' },
        { id: 'p3', name: '咖啡条' },
      ],
      atomicActionIds: ['cat-a', 'cat-d'],
      difficulty: 'complex',
      taskType: '人体数据采集',
      variationIntensity: 'high',
      candidateCount: 1,
    },
    expect: {
      safetyTier: 'perception',
      mustContain: ['倒水', '反光', '导读', '防废片红线'],
      mustNotContain: ['明火', '插座'],
    },
  },
  {
    id: 'manipulation-reject',
    label: 'manipulation 场景 · 应拒绝液体',
    input: {
      scene: {
        name: '商超仿真卖场',
        sceneSubtype: '卖场拣选动线',
        description: '货架与推车',
        type: '零售物流',
      },
      props: [{ id: 'p30', name: '拣选推车' }],
      atomicActionIds: ['cat-g'],
      difficulty: 'simple',
      taskType: '动捕采集',
      candidateCount: 2,
      variationIntensity: 'medium',
      note: '若生成含倒水/积水的候选，该候选 passed 必须为 false',
    },
    expect: {
      safetyTier: 'manipulation',
      liquidCandidatesMustFail: true,
    },
  },
]

function loadSkillPrompt() {
  const skill = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8')
  const examples = readFileSync(join(SKILL_DIR, 'examples.md'), 'utf8')
  return `${skill}\n\n---\n\n${examples}`
}

function resolveSafetyTier(scene) {
  const label = `${scene.name}${scene.sceneSubtype}${scene.description ?? ''}`
  return /客厅|厨房|卫生间|茶几|茶水/.test(label) ? 'perception' : 'manipulation'
}

function validateCase(testCase, responseJson) {
  const issues = []
  const tier = resolveSafetyTier(testCase.input.scene)
  const { expect } = testCase

  if (tier !== expect.safetyTier) {
    issues.push(`safetyTier 判定应为 ${expect.safetyTier}，实际 ${tier}`)
  }

  if (!responseJson?.candidates?.length) {
    issues.push('响应缺少 candidates 数组')
    return issues
  }

  for (const [i, c] of responseJson.candidates.entries()) {
    const text = `${c.renderedCard ?? ''}\n${JSON.stringify(c.card ?? {})}`
    const passed = c.passed !== false

    if (!c.card) issues.push(`候选 ${i}: 缺少 card`)
    if (!c.renderedCard) issues.push(`候选 ${i}: 缺少 renderedCard`)

    for (const kw of expect.mustContain ?? []) {
      if (!text.includes(kw)) issues.push(`候选 ${i}: 应包含「${kw}」`)
    }
    for (const kw of expect.mustNotContain ?? []) {
      if (passed && text.includes(kw)) issues.push(`候选 ${i}: passed 但含禁止词「${kw}」`)
    }

    if (expect.liquidCandidatesMustFail) {
      const hasLiquid = /倒水|积水|用水/.test(text)
      if (hasLiquid && passed) {
        issues.push(`候选 ${i}: manipulation 场景含液体但 passed=true`)
      }
    }
  }

  return issues
}

async function callGpt(systemPrompt, userMessage) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY 未设置')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `${userMessage}\n\n只返回 JSON 对象，结构见 SKILL 输出格式。`,
        },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API ${res.status}: ${err}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('空响应')
  return JSON.parse(content)
}

function loadFixtures() {
  const raw = readFileSync(join(ROOT, 'scripts/fixtures/skill-validation-gpt-simulated.json'), 'utf8')
  return JSON.parse(raw)
}

async function runCases(mode, getResult) {
  console.log(`\n🧪 任务台本 Skill 验证 — 模式: ${mode}\n`)
  let allPassed = true

  for (const tc of TEST_CASES) {
    console.log(`── ${tc.label} (${tc.id}) ──`)
    try {
      const result = await getResult(tc)
      const issues = validateCase(tc, result)
      if (issues.length === 0) {
        console.log('✅ 通过')
        const first = result.candidates?.find((c) => c.passed !== false) ?? result.candidates?.[0]
        if (first?.renderedCard && !first.renderedCard.startsWith('含')) {
          console.log(first.renderedCard.split('\n').slice(0, 6).join('\n'))
          console.log('   …')
        }
      } else {
        allPassed = false
        console.log('❌ 未通过:')
        issues.forEach((x) => console.log(`   - ${x}`))
      }
    } catch (e) {
      allPassed = false
      console.log(`❌ 错误: ${e.message}`)
    }
    console.log('')
  }

  console.log(allPassed ? '✅ 全部验证通过，可开始工程开发。' : '❌ 存在失败项，请先调整 Skill 后重试。')
  return allPassed
}

async function main() {
  const useFixtures = process.argv.includes('--fixtures')

  if (useFixtures) {
    const fixtures = loadFixtures()
    const ok = await runCases('fixtures（Skill 合规样例）', async (tc) => fixtures[tc.id])
    process.exit(ok ? 0 : 1)
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('❌ 请设置 OPENAI_API_KEY 后重试：')
    console.error('   OPENAI_API_KEY=sk-... node scripts/validate-task-script-skill.mjs')
    console.error('或先跑 Skill 合规样例：')
    console.error('   node scripts/validate-task-script-skill.mjs --fixtures')
    process.exit(1)
  }

  const systemPrompt = loadSkillPrompt()
  const ok = await runCases(`GPT · ${MODEL}`, async (tc) =>
    callGpt(
      systemPrompt,
      `请根据以下输入生成任务台本：\n\`\`\`json\n${JSON.stringify(tc.input, null, 2)}\n\`\`\``,
    ),
  )
  process.exit(ok ? 0 : 1)
}

main()
