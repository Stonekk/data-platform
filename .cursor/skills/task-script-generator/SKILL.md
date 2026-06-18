---
name: task-script-generator
description: >-
  Generates embodied data collection task scripts (任务台本) as TaskScriptCard JSON
  plus rendered collector-facing cards. Use when the user asks to generate,
  draft, or泛化 task scripts, 台本, SOP cards, or collection instructions from
  scene, props, atomic actions, templates, or requirements.
---

# 任务台本生成 Skill

具身数据采集的**参数化台本生成**：搭骨架 → 填参数 → 加干扰 → 翻译成采集员可读卡片。

完整规格见 [design spec](../../../docs/superpowers/specs/2026-06-12-task-script-generator-design.md)。黄金样例见 [examples.md](examples.md)。

## 何时使用

- 用户给出：场景、道具、原子动作、难度、可选模板或需求约束
- 需要从母任务裂变多个变体台本
- 需要输出采集 App 可下发的任务卡片

## 生成路径（路径 C）

```
有 ScriptTemplate.skeleton？
  是 → 模板优先：锁定四槽语义，仅填参 + 变体，不改任务本质
  否 → LLM 自由生成：从零搭四槽，严格对齐 examples.md 格式
```

## 输入（用户或调用方提供）

```yaml
scene:
  name: string          # 用于 resolveSafetyTier
  sceneSubtype: string
  description: string
  type: string          # 场景类型，用于匹配模板

props:                  # 本场可用道具
  - name: string
    id: string

atomicActionIds:        # cat-a … cat-i，至少 1 个
  - cat-a

difficulty: simple | complex | correction

taskType: string        # 如「遥操作采集」「人体数据采集」

# 可选
template:               # 有则走路径 C-a
  id: string
  skeleton: { context, environment, setup, sequence[] }
  allowedVariationAxes: [object, constraint, perception, action]
  defaultPerceptionProfile: ...

requirement:
  keyRequirements: []   # MUST 遵守，不得违反

candidateCount: 3       # 默认 3，最多 5
variationIntensity: low | medium | high
```

## 场景安全等级

默认 `manipulation`。名称/子类型/描述含 **客厅|厨房|卫生间|茶几|茶水** → `perception`。

| safetyTier | 液体/积水 | 全局禁止 |
|------------|-----------|----------|
| manipulation | 禁止倒水、用水冲洗、撒水、积水布置 | 明火、开火、真实烹饪、热油、触电、擦拭插座 |
| perception | 允许积水、倒水 | 同上全局禁止 |

生成前判定 `safetyTier`；生成后自检，违反则丢弃该候选。

## 四槽骨架（必须）

每个台本先产出结构化 `TaskScriptCard`，再渲染 `renderedCard`：

1. **导读** `context` — 一句话情境
2. **环境场控** `preparation.environment` — 录制前光影/干扰布置
3. **道具状态** `preparation.setup` — 初始摆位与物理状态（倒扣、积水等）
4. **动作序列** `execution.actions` — 带 `[原语]` 标签的可执行步骤
5. **防废片红线** `redLines` — 算法必须看到的约束

### 变异四维（按模板 allowedVariationAxes 激活）

| 轴 | 示例 |
|----|------|
| object | 换道具形态（高脚杯、长柄锅） |
| constraint | 单手、双手协同、倒扣、纠错恢复 |
| action | 工具延伸、开拉推关细节 |
| perception | 静态干扰：光照、杂乱、反光/积水（v1 不做人影/电视闪烁） |

### 原子动作映射

序列内用细粒度原语嵌入文本：`[抓起][放下][翻转][开][关][推][拉][扭][倒][擦][按压]`

| 大类 id | 常用原语 |
|---------|----------|
| cat-a | 抓起、放下、翻转、摆正 |
| cat-b | 开、关、推、拉、扭 |
| cat-d | 倒、擦、按压 |

## 输出格式（严格遵守）

每次调用返回 JSON：

```json
{
  "candidates": [
    {
      "card": { /* TaskScriptCard，见下 */ },
      "renderedCard": "🚩 任务：...\n🎯 目的：...",
      "passed": true,
      "rejectReason": null,
      "safetyTier": "perception"
    }
  ],
  "meta": { "path": "template-first | llm-free", "generatedCount": 3, "passedCount": 3 }
}
```

### TaskScriptCard 字段

```typescript
{
  title: string
  variantHint?: string
  relatedTemplateId?: string
  purpose: string
  context: string
  preparation: {
    environment: { title: string; items: { text: string; critical?: boolean }[] }
    setup: { title: string; items: string[] }
  }
  execution: {
    title: string
    actions: { order: number; text: string; primitives: string[] }[]
  }
  redLines: string[]
  difficulty: 'simple' | 'complex' | 'correction'
  atomicActionIds: string[]
  propIds: string[]
  variationTags: string[]
  perceptionTags: string[]
}
```

**不要**使用 T-001 式平台编号；`title` 由语义命名（如「冲咖啡·积水反光版」）。

### renderedCard 模板

```
🚩 任务：{title}{variantHint 用括号附在标题后}
🎯 目的：{purpose}
🎬 【导读】 {context}
--- 准备工作（录制前完成） ---
💡 【{environment.title}】
- {items；critical 项写为「⚠️ 关键：...」}
📦 【{setup.title}】
- {items}
--- 开始录制（按下录制键） ---
🛠️ 【{execution.title}】
{order}. {action.text}
🛑 【防废片红线】 {redLines 用空格或分号连接}
```

## 生成流程（逐步执行）

1. **判定** `safetyTier`（关键词规则）
2. **选路径**：有 `template.skeleton` → C-a，否则 C-b
3. **采变体**：按 `variationIntensity` 激活 1–3 个轴（须落在 `allowedVariationAxes` 内）
4. **填四槽** → 组装 `TaskScriptCard`
5. **自检 L1**：
   - 全局硬禁词 → `passed: false`
   - manipulation + 液体相关 → `passed: false`
   - 使用了未配置道具 → `passed: false`
   - 候选 difficulty 与输入 difficulty 不一致 → `passed: false`
   - 非 correction 需求但含失误/恢复流程 → `passed: false`
   - **道具组合违背常识/用途（plausibility）** → `passed: false`
   - correction 无失误/恢复描述 → `passed: false`
   - simple 动作 >4 步 → `passed: false`
   - complex 动作 <3 步 → `passed: false`
   - 违反 `keyRequirements` → `passed: false`
6. **渲染** `renderedCard`
7. 输出 `candidateCount` 条通过自检的候选；不足则说明原因

## 难度约束

| difficulty | 动作步数 | 额外要求 |
|------------|----------|----------|
| simple | ≤4 | 单次核心操作 |
| complex | ≥3 | 多步串联或约束 |
| correction | ≥3 | 须含可控失误 + 发现 + 恢复 |

## 禁止事项

- 不发明场景中不存在的道具
- 不改变模板母任务的语义（C-a 路径）
- 不使用动态感知干扰（人影、电视闪烁）— v2 再做
- 不输出纯 prose；必须同时给 `card` + `renderedCard`
- **不为了用完所有 props 而硬凑动作**；未用到的 prop 可以不出现

## 物理与语义合理性（必须）

生成前理解每个 prop 的**功能角色**，动作须符合日常常识与场景习惯：

| 角色 | 示例道具 | 合理用法 | 禁止用法 |
|------|----------|----------|----------|
| 饮用具 | 玻璃杯、马克杯、水杯 | 取放、翻转、清洗后沥水、放到餐盘/杯垫 | 装入保鲜盒/便当盒等**食品密封容器** |
| 食品容器 | 保鲜盒、便当盒 | 装剩饭菜/食材并盖盖 | 装玻璃杯、手机、工具等无关物 |
| 固定设施 | 抽屉、门把手、冰箱门 | 操作开/关/拉/推本身 | 把任意小物塞进去只为「凑步骤」 |
| 工具/清洁 | 抹布、刷子 | 擦拭、清洁对应表面 | 与任务主题无关的乱用 |

**自检三问（每条候选必答）：**
1. 普通人在家会这样做吗？
2. 每个 prop 的出现是否服务于同一任务主题？
3. 容器类 prop 里装的东西是否与容器用途匹配？

违反 → `passed: false`，`rejectReason: plausibility_violation`（说明具体荒谬点）。

**典型反例：**
- ❌ 把玻璃杯放入保鲜盒再盖盖 — 饮用具≠食品收纳
- ❌ 笔记本电脑放进保鲜盒
- ❌ 汤勺放进保温杯密封保存
- ✅ 玻璃杯倒扣沥干后放到餐盘；保鲜盒单独用于装剩饭菜并盖盖

## 参考样例

生成前阅读 [examples.md](examples.md)：
- **例 1** — perception / 无模板：茶几冲咖啡·积水反光（T-001-C 等价）
- **例 2** — perception / tpl-001：厨房抽屉取放·标准版
- **例 3** — manipulation / 无模板：商超拣选（无液体）

## 快速自检清单

- [ ] JSON 可解析，含 `candidates[].card` 与 `renderedCard`
- [ ] 四段结构齐全（导读 / 准备×2 / 执行 / 红线）
- [ ] `safetyTier` 与液体描写一致
- [ ] 动作含 `[原语]` 标签
- [ ] correction 档含失误恢复
- [ ] 道具组合符合日常常识（饮用具不进保鲜盒等）
