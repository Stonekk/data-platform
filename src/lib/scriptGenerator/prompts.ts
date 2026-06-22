import { categoryById } from '@/data/atomicActions'
import { getPlatformScriptTemplates, templateById } from '@/data/scriptTemplateStore'
import type { Prop } from '@/data/mock'
import { atomicActionLabels, propLabels, sceneLabel } from '@/lib/scriptWorkflow'
import { resolveSafetyTier } from '@/lib/scriptGenerator/safetyTier'
import type { GenerateScriptsContext } from '@/lib/scriptGenerator/types'
import { hasTemplateSkeleton } from '@/lib/scriptGenerator/taskScriptCard'

const FEW_SHOT_BLOCK = `
## 黄金样例 1（perception · 无模板 · 积水反光）
输入：客厅茶几、马克杯/热水壶/咖啡条、cat-a+cat-d、complex
输出 card.title: 冲咖啡；variantHint: 抗反光与杂乱版
导读含积水倒扣杯子；环境含撒水反光+杂志杂乱；动作含[翻转][抓起][倒][倒水]
redLines: 勿挡住水面倒影

## 黄金样例 2（perception · 模板 tpl-001 · 厨房抽屉）
锁定母任务「抽屉取放」，不改成洗盘子；不含积水/倒水
动作含 [开][抓起][放][关]

## 黄金样例 3（manipulation · 商超拣选）
禁止任何倒水/积水/撒水

## 反例（必须避免）
- manipulation 场景写倒水 → 应被拒
- 任意场景明火/触电
- correction 无失误恢复
- 玻璃杯/马克杯放入保鲜盒 → plausibility 常识错误
- 为用完所有 props 硬凑无关动作链

## 语义合理性
- 先理解每个 prop 的功能角色，再设计**同一任务主题**的动作链
- 饮用具（玻璃杯/马克杯/水杯）：取放、翻转、清洗沥干；**禁止**装入保鲜盒/便当盒
- 食品容器（保鲜盒）：装剩饭菜/食材并盖盖；**禁止**装杯具、电子产品、工具
- 不必用完输入中的每一个 prop；用不上的可以不出现
- 输出前自问：普通人在家会这样做吗？
`.trim()

export const LLM_SYSTEM_PROMPT = `你是具身数据采集台本导演。根据输入生成任务台本。

流程：搭骨架 → 填参数 → 加干扰 → 输出结构化 JSON（不要输出 Markdown 卡片正文，renderedCard 可省略，由系统渲染）。

## 安全
- 全局禁止：明火、开火、真实烹饪、热油、触电、擦拭插座
- manipulation 场景：禁止倒水、用水冲洗、撒水、积水
- perception 场景（客厅/厨房/卫生间/茶几/茶水）：允许积水、倒水

## 难度
- simple: 动作 ≤4 步
- complex: 动作 ≥3 步
- correction: 须含可控失误+发现+恢复
- 所有候选的 difficulty 必须与输入 difficulty 一致；complex 请求下不得输出 correction 变体

## 道具
- 只能使用输入 props 中已配置的道具，不得新增未配置道具（如额外抹布、勺子）
- card.propIds 只能包含输入 props 的 id

## 输出 JSON 格式（严格遵守）
{
  "candidates": [
    {
      "card": {
        "title": "string",
        "variantHint": "string 可选",
        "purpose": "算法测试目的",
        "context": "导读一句话",
        "preparation": {
          "environment": { "title": "string", "items": [{ "text": "string", "critical": false }] },
          "setup": { "title": "string", "items": ["string"] }
        },
        "execution": {
          "title": "动作执行",
          "actions": [{ "order": 1, "text": "含 [原语] 标签", "primitives": ["抓起"] }]
        },
        "redLines": ["string"],
        "difficulty": "simple|complex|correction",
        "variationTags": [],
        "perceptionTags": []
      }
    }
  ]
}

动作原语示例：[抓起][放下][翻转][开][关][推][拉][扭][倒][擦][按压]

${FEW_SHOT_BLOCK}`

function atomicActionDetails(ids: string[]): string {
  return ids
    .map((id) => {
      const cat = categoryById(id)
      if (!cat) return id
      return `${cat.name}（${cat.primitives.join('、')}）`
    })
    .join('；')
}

export function buildLlmUserPrompt(context: GenerateScriptsContext, candidateCount: number): string {
  const { input, props, scene } = context
  const safetyTier = scene ? resolveSafetyTier(scene) : 'manipulation'
  const sceneName = scene?.name ?? sceneLabel(input.sceneId)
  const propList = input.propIds
    .map((id) => props.find((p) => p.id === id))
    .filter((p): p is Prop => p !== undefined)

  const template = input.templateId
    ? templateById(getPlatformScriptTemplates(), input.templateId)
    : undefined
  const templateFirst = hasTemplateSkeleton(context)

  const payload = {
    path: templateFirst ? 'template-first' : 'llm-free',
    safetyTier,
    scene: scene ?? { name: sceneName },
    props: propList.map((p) => ({ id: p.id, name: p.name })),
    propLabels: propLabels(input.propIds, props),
    atomicActionIds: input.atomicActionIds,
    atomicActions: atomicActionDetails(input.atomicActionIds),
    atomicActionLabels: atomicActionLabels(input.atomicActionIds),
    difficulty: input.difficulty,
    taskType: input.taskType,
    candidateCount,
    requirement: context.requirement,
    template: template?.skeleton
      ? {
          id: template.id,
          motherTaskLabel: template.motherTaskLabel ?? template.name,
          skeleton: template.skeleton,
          allowedVariationAxes: template.allowedVariationAxes ?? [],
        }
      : undefined,
  }

  const instructions = templateFirst
    ? `有模板：锁定 skeleton 母任务语义，生成 ${candidateCount} 个不同变体（仅改道具状态/约束/动作细节，不改任务本质）。`
    : `无模板：参考黄金样例，生成 ${candidateCount} 个多样化台本。perception 场景可设计静态感知干扰（积水反光/背景杂乱/暗光），不做动态人影电视闪烁。`

  const constraints = context.requirement?.keyRequirements?.length
    ? `需求约束（MUST）：${context.requirement.keyRequirements.join('；')}`
    : ''
  const constraintLine = `约束：仅使用输入 props 列出的道具；所有候选 difficulty 必须为 ${input.difficulty}，不得混入其他难度档。动作须符合日常常识与道具用途（如玻璃杯不得放入保鲜盒）；不必强行使用全部 props。`

  return `${instructions}\n${constraintLine}${constraints ? `\n${constraints}` : ''}\n\n输入：\n${JSON.stringify(payload, null, 2)}`
}
