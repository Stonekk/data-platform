# 任务台本生成器 — 设计规格

**状态**：已定稿（2026-06-12）  
**目标**：建立「参数化台本生成引擎」，通过调试收敛为可复用的 `task-script-generator` Skill，满足大部分任务台本的生成需求。  
**参考**：[低精度人体采集任务规划生成策略](https://xiaopeng.feishu.cn/docx/SL8SdbizhoOi75xTjJEcKtgunfd)

---

## 1. 背景与问题

### 1.1 痛点

| 痛点 | 根因 |
|------|------|
| 采集员不知道做什么 | 仅有粗粒度「场景 + 道具 + 原子动作」，缺少可执行指令 |
| 手写 SOP 穷举不可扩展 | 开放环境任务空间无限，人工清单成本极高 |
| 纯随机组合产生荒谬任务 | 排列组合违背物理/安全常识 |
| 词汇多样性 ≠ 物理多样性 | 同质运动学任务浪费采集成本 |

### 1.2 设计目标

1. **需求驱动**：台本追溯到采集需求的约束与动作覆盖计划。
2. **可控泛化**：在明确边界内做变体，边界外一律拒绝。
3. **人机协同**：LLM 批量出候选 → 规则筛选 → 运营确认；`confirmed` 前不可调度。
4. **Skill 沉淀**：规则、Prompt、拒因、黄金样例收敛为可复用 Skill。

### 1.3 核心范式

来自业务文档的 **参数化台本生成引擎**：

```
搭骨架 → 填参数 → 加干扰 → 翻译成「人话」
```

---

## 2. 生成路径

### 2.1 路径 C（首版唯一策略）

| 条件 | 路径 | 行为 |
|------|------|------|
| `templatesForSceneType(scene.type)` 非空 | **模板优先（C-a）** | 加载母任务四槽骨架；LLM 仅填参 + 渲染，不改骨架语义 |
| 无匹配模板 | **LLM 自由生成（C-b）** | LLM 从零搭四槽骨架；靠 few-shot 约束形态 |

分流与现有 `resolveDefaultTemplateId` / `templatesForSceneType` 衔接。

### 2.2 不采用的路径（首版范围外）

- **纯老虎机随机组合**：仅作变体采样器，不作主路径。
- **目标导向 CoT 口述法**：远期众包模式，不纳入首版 Skill。
- **实时 VLM + 在线 LLM**：远期「云端预生成 + 端侧盲盒匹配」，与平台生成器数据同源但触发时机不同。

---

## 3. 四库模型

| 库 | 平台映射 | 生成角色 |
|----|----------|----------|
| **场景与道具库** | `Scene` + `Prop` + 审批状态 | 限定可用道具、初始摆位 |
| **原子动作库** | A–I 大类 + 细粒度原语映射 | 动作序列骨架与 `[标签]` |
| **变异约束库** | 手部/空间/物理状态变体 | 「加干扰」之操作约束维 |
| **环境与感知干扰库** | `StaticPerceptionProfile`（v1 仅静态） | 「加干扰」之感知维 |

### 3.1 原子动作两层映射

- **平台层**：运营勾选 `atomicActionIds`（cat-a … cat-i），用于需求覆盖统计。
- **生成层**：序列中 `[翻转][抓起][倒]` 等细粒度原语，由大类展开或模板槽位指定。

示例映射：

| 大类 | 展开原语 |
|------|----------|
| cat-a 抓取与放置 | 抓起、放下、翻转、摆正 |
| cat-b 关节物体操作 | 开、关、推、拉、扭 |
| cat-d 接触丰富与受力 | 倒、擦、按压 |

### 3.2 静态感知干扰库（v1）

仅支持静态三项，**不做**动态干扰（人影走动、电视闪烁等，留 v2）：

```typescript
type StaticPerceptionProfile = {
  lighting: {
    intensity: 'overexposed' | 'normal' | 'dim'
    colorTemp: 'cool_white' | 'warm_yellow'
  }
  background: {
    clutter: 'minimal' | 'moderate' | 'heavy'
    reflectivity: 'matte' | 'glass' | 'water_pool'
  }
}
```

### 3.3 变异四维矩阵

| 轴 | 键名 | 示例 |
|----|------|------|
| 对象变体 | `object` | 平底盘 → 高脚杯 |
| 操作约束 | `constraint` | 单手、双手协同、倒扣、纠错恢复 |
| 动作机构 | `action` | 开拉推关细节、工具延伸 |
| 静态感知 | `perception` | 积水反光、背景杂乱、暗光 |

模板通过 `allowedVariationAxes` 声明可激活的轴；未声明的轴使用 `defaultPerceptionProfile` 默认值。

---

## 4. 场景安全等级

### 4.1 `safetyTier`

```typescript
type SceneSafetyTier = 'perception' | 'manipulation'
```

| 等级 | 默认 | 液体/积水 | 全局仍禁 |
|------|------|-----------|----------|
| `manipulation` | ✅ 默认 | 禁止倒水、用水冲洗、液体布置 | 明火、真实烹饪、热油、触电 |
| `perception` | 名称含关键词时 | **允许**积水、倒水 | 同上 |

### 4.2 判定规则

```typescript
const PERCEPTION_KEYWORDS = /客厅|厨房|卫生间|茶几|茶水/

function resolveSafetyTier(scene: Scene): SceneSafetyTier {
  const label = `${scene.name}${scene.sceneSubtype}${scene.description}`
  return PERCEPTION_KEYWORDS.test(label) ? 'perception' : 'manipulation'
}
```

- 新建场景默认 `manipulation`。
- 客厅、厨房、卫生间、茶几、茶水等关键词命中 → `perception`。
- **不设液体量变上限**（首版不做杯量等限制）。

### 4.3 Filter 分级

替代 `filter.ts` 全局禁止「倒水」：

| 层 | 规则 |
|----|------|
| 全局硬禁 | `/明火|开火|点燃|真实烹饪|热油|触电|插座/` 等 |
| `manipulation` 追加 | `/倒水|用水冲洗|撒.*水|积水/` |
| `perception` | 不追加液体相关规则 |

筛选时传入 `scene.safetyTier`（或 `resolveSafetyTier(scene)` 结果）。

---

## 5. 数据结构

### 5.1 `ScriptTemplate`（四槽骨架）

扩展现有 `ScriptTemplate`，保留 `instructionSkeleton` / `stepSlots` 作兼容派生字段。

```typescript
type ScriptTemplate = {
  id: string
  name: string
  applicableSceneTypes: string[]
  difficulty: ScriptDifficulty
  status: ScriptTemplateStatus

  /** 母任务展示名，非平台编号体系 */
  motherTaskLabel?: string

  skeleton: {
    context: string       // 🎬 导读
    environment: string   // 💡 环境场控（单段或条目，生成时可拆条）
    setup: string         // 📦 道具状态
    sequence: string[]    // 🛠️ 动作序列槽
  }

  allowedVariationAxes: Array<'object' | 'constraint' | 'perception' | 'action'>

  defaultPerceptionProfile?: StaticPerceptionProfile

  // 兼容层：由 skeleton 派生，供旧 UI / 旧生成器读取
  instructionSkeleton: string
  stepSlots: string[]
}
```

**首条迁移**：`tpl-001`（家庭厨房-抽屉取放标准）。其余模板保留旧格式，读取时 fallback 到 `instructionSkeleton` + `stepSlots`。

### 5.2 `TaskScriptCard`（生成态）

```typescript
type TaskScriptCard = {
  id: string
  title: string
  variantHint?: string           // 自由文本，如「抗反光与杂乱版」
  relatedTemplateId?: string
  purpose: string                // 算法/采集测试目的

  context: string                // 🎬 导读

  preparation: {
    environment: {
      title: string              // 默认「布置光影与环境」
      items: Array<{ text: string; critical?: boolean }>
    }
    setup: {
      title: string              // 默认「摆放道具」
      items: string[]
    }
  }

  execution: {
    title: string                // 默认「动作执行」
    actions: Array<{
      order: number
      text: string
      primitives: string[]        // 细粒度原语标签
    }>
  }

  redLines: string[]             // 🛑 防废片红线

  // 溯源
  sceneId: string
  propIds: string[]
  atomicActionIds: string[]
  difficulty: ScriptDifficulty
  variationTags: string[]
  perceptionTags: string[]
}
```

### 5.3 `TaskScript` 兼容

现有 `TaskScript` 保留，新增可选字段或并行存储：

- `card?: TaskScriptCard` — 结构化内容
- `renderedCard?: string` — 采集端展示文本
- `instruction` — 保留为导读摘要或 `renderTaskCard(card)` 的短版，供列表/搜索

### 5.4 编号策略

- **平台不维护** T-001 → T-001-C 母/子编号体系。
- 每条台本独立：`id`（平台 UUID）、`title`（运营可编辑）、可选 `variantHint`。
- 文档中的 `T-001-C` 仅作 few-shot 示范，不进入平台编号规则。

---

## 6. 终端任务卡片格式

由 `renderTaskCard(card: TaskScriptCard): string` **确定性渲染**，不依赖 LLM 二次发挥。

```
🚩 任务：{title}
🎯 目的：{purpose}
🎬 【导读】 {context}
--- 准备工作（录制前完成） ---
💡 【{preparation.environment.title}】
- {item.text}                    // critical 项前缀 ⚠️ 关键：
...
📦 【{preparation.setup.title}】
- ...
--- 开始录制（按下录制键） ---
🛠️ 【{execution.title}】
1. {action.text}                 // 原语以 [xxx] 嵌入 text
...
🛑 【防废片红线】 {redLines.join(' ')}
```

### 6.1 黄金 Few-shot（无模板路径 + 格式示范）

**T-001-C 感知类**（`safetyTier: perception`）— 茶水间冲咖啡 · 积水反光与杂乱背景。完整 `renderedCard` 见业务文档第五步；`variationAxes: [object, constraint, perception]`。

### 6.2 模板路径示范（tpl-001）

**厨房抽屉取放** — `allowedVariationAxes: [object, constraint, action]`，不启 perception 轴。骨架见 §7.2。

---

## 7. 生成流水线

```
运营选场景 + 道具 + 原子动作 + 难度
        │
        ▼
┌─ templatesForSceneType 非空？ ────────────────┐
│  是 → 加载 ScriptTemplate.skeleton            │
│  否 → LLM 搭四槽 + few-shot                   │
└───────────────────────────────────────────────┘
        │
        ▼
  按 allowedVariationAxes 四维采样
  （液体规则受 scene.safetyTier 约束）
        │
        ▼
  填槽 → TaskScriptCard JSON
        │
        ▼
  L1 硬规则（safetyTier + 难度 + 纠错标记）
  L2 LLM 软判（合理性，可选/批量）
  L3 UDV 启发式评分 + 去重
        │
        ▼
  renderTaskCard() → renderedCard
        │
        ▼
  运营选稿 → confirmScript() → status: confirmed
```

### 7.1 Provider 模式

对齐现有 `ScriptGeneratorMode`：

| 模式 | 用途 |
|------|------|
| `template` | 纯规则填槽 + 渲染，无 LLM |
| `mock-llm` | 调试态：模拟批量候选 + 筛选 |
| `llm` | 后端 API 真实 LLM |

### 7.2 tpl-001 迁移内容

```typescript
{
  id: 'tpl-001',
  name: '家庭厨房-抽屉取放标准',
  motherTaskLabel: '厨房抽屉取放',
  applicableSceneTypes: ['家庭服务'],
  difficulty: 'complex',
  status: 'active',
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
  defaultPerceptionProfile: {
    lighting: { intensity: 'normal', colorTemp: 'cool_white' },
    background: { clutter: 'minimal', reflectivity: 'matte' },
  },
  instructionSkeleton: '在{scene}，使用{props}，{context}',
  stepSlots: [/* = skeleton.sequence */],
}
```

---

## 8. 筛选与评分

### 8.1 拒因分类

```typescript
type RejectCategory =
  | 'safety'
  | 'feasibility'
  | 'difficulty_mismatch'
  | 'constraint_violation'
  | 'low_udv'
  | 'duplicate'
```

### 8.2 保留规则

- `correction` 档须含失误/恢复标记（现有 `CORRECTION_MARKERS`）。
- `simple` 步骤 ≤ 4；`complex` 步骤 ≥ 3。
- 道具审批未通过不可生成（现有 `canGenerateScript`）。

### 8.3 UDV 启发式（首版）

- 动作大类覆盖分（`mustCoverActionIds`）
- 变体维度激活数
- instruction / 卡片长度适中
- `correction` 档加分
- 同批候选运动学同质去重（简化：variationTags 完全相同则留高分）

---

## 9. 与需求 / 任务拆解联动

`ScriptGenerationContext` 扩展（实现期）：

```typescript
type ScriptGenerationContext = {
  draft: ScriptDraftInput
  scene: Scene
  props: Prop[]
  requirement?: {
    id: string
    keyRequirements: string[]
    // ...
  }
  mustCoverActionIds: string[]
  candidateCount: number          // 默认 8–12，展示 top 5
  variationIntensity: 'low' | 'medium' | 'high'
}
```

需求 `keyRequirements` 进入 Prompt **MUST** 区；变体采样不得违反。

---

## 10. Skill 沉淀（`task-script-generator`）

调试收敛后导出 Skill，包含：

| 资产 | 内容 |
|------|------|
| 决策树 | 模板路径 vs LLM 路径；`variationIntensity` 档位 |
| Prompt 模板 | System + Context + Schema + Few-shot |
| 兼容性矩阵 | 道具 × 动作 × safetyTier |
| Filter 规则 | 全局 / 分级 / 拒因表 |
| 黄金样例 | T-001-C（perception）+ tpl-001 渲染样例 |
| 输出 Schema | `TaskScriptCard` + `renderTaskCard` 规范 |

---

## 11. 实现分期

| 阶段 | 交付物 |
|------|--------|
| **P0** | `SceneSafetyTier` + `resolveSafetyTier`；`filter` 分级；`TaskScriptCard` 类型；`renderTaskCard()` |
| **P1** | `ScriptTemplate` 四槽；`tpl-001` 迁移；`templateProvider` 读四槽生成 |
| **P2** | `StaticPerceptionProfile` + `VariationSampler`；T-001-C few-shot；`mockLlmProvider` 输出 `TaskScriptCard` |
| **P3** | `llmProvider` + 后端 API；`ScriptContentCard` 四段式展示；需求上下文注入 |

### 11.1 不在首版范围

- 动态感知干扰（人影、电视闪烁）
- 平台母任务编号体系
- 液体量变上限
- 端侧 YOLO 盲盒匹配（采集 App 另立项）
- 旧模板 bulk 迁移（仅 tpl-001）

---

## 12. 现有代码映射

| 模块 | 路径 | 变更 |
|------|------|------|
| Filter | `src/lib/scriptGenerator/filter.ts` | safetyTier 参数化 |
| Types | `src/lib/scriptGenerator/types.ts` | `TaskScriptCard`、`ScriptCandidate` 扩展 |
| Template | `src/data/mock.ts` | `ScriptTemplate` 四槽；tpl-001 迁移 |
| Scene | `src/data/mock.ts` | `safetyTier` 或运行时 `resolveSafetyTier` |
| Provider | `src/lib/scriptGenerator/*` | 输出 card + renderedCard |
| UI | `ScriptContentCard.tsx` | 渲染四段式卡片 |
| UI | `ScriptConfigPanel.tsx` | 候选展示 card 摘要 |

---

## 13. 验收标准

1. **tpl-001 路径**：选家庭厨房场景 + 匹配道具 → 生成四段式卡片，含环境/道具/动作/红线，无感知变体。
2. **T-001-C 等价路径**：perception 场景 + mock-llm → 可生成含积水/倒水/反光的候选，且通过 filter。
3. **manipulation 场景**：含「倒水」的候选被 L1 拒绝。
4. **全局安全**：含「明火」的候选在任何场景均被拒绝。
5. **无模板场景**：无 `ScriptTemplate` 时走 LLM/mock 路径，输出格式与有模板一致。
6. **运营闭环**：选稿 → 确认 → `status: confirmed` → `isScriptSchedulable` 为 true。

---

## 附录 A：tpl-001 渲染样例（节选）

```
🚩 任务：厨房抽屉取放·标准版
🎯 目的：覆盖关节物体操作（开/拉/推/关）与抓取放置轨迹。
🎬 【导读】 完成一次标准抽屉取放，动作连贯、可复述。
--- 准备工作（录制前完成） ---
💡 【布置光影与环境】
- 打开厨房主灯，保持正常冷白光
- 台面整洁，无额外反光干扰
📦 【摆放道具】
- 目标道具放在抽屉内；抽屉初始全关
--- 开始录制（按下录制键） ---
🛠️ 【动作执行】
1. [开] 拉开抽屉至全开并停顿
2. [抓起] 目标道具
3. [放] 道具放到台面指定区域
4. [关] 推回抽屉确认闭合
🛑 【防废片红线】 拉抽屉时身体勿遮挡第三视角机位
```

## 附录 B：决策记录

| 日期 | 决策 |
|------|------|
| 2026-06-12 | 首版路径 C：有模板优先，无模板 LLM |
| 2026-06-12 | 输出对齐文档第五步任务卡片；内层 JSON + 确定性渲染 |
| 2026-06-12 | perception 场景允许液体；默认 manipulation；关键词判定 |
| 2026-06-12 | 不设液体量变上限 |
| 2026-06-12 | 静态感知干扰 v1；动态干扰 v2 |
| 2026-06-12 | 不做 T-001 编号体系 |
| 2026-06-12 | 先迁移 tpl-001 作模板路径示范 |
