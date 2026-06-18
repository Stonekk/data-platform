# 任务台本生成 — 黄金样例

## 例 1：perception · 无模板 · 积水反光变体

**输入摘要**

```yaml
scene: { name: "客厅茶几标准间", sceneSubtype: "茶几布置", description: "茶几与沙发区" }
safetyTier: perception
props: [马克杯, 热水壶, 咖啡条]
atomicActionIds: [cat-a, cat-d]
difficulty: complex
taskType: 人体数据采集
variationIntensity: high
allowedVariationAxes: [object, constraint, perception]
path: llm-free
```

**renderedCard（黄金参考）**

```
🚩 任务：冲咖啡·抗反光与杂乱版
🎯 目的：测验 AI 在强反光和乱七八糟背景下的认物能力。
🎬 【导读】 你的桌面乱糟糟的且有积水，杯子还倒扣着，请在这种乱局中给自己冲杯咖啡。
--- 准备工作（录制前完成） ---
💡 【第 1 步：布置光影与环境】
- 保持正常灯光。
- ⚠️ 关键：在茶几桌面上故意撒一滩水，让它产生反光。
- ⚠️ 关键：在操作区周围，故意丢几本花花绿绿的杂志和零食袋（制造视觉杂乱）。
📦 【第 2 步：摆放道具】
- 把马克杯倒扣在积水的桌子中间。
- 右边放热水壶，左边放咖啡条。
--- 开始录制（按下录制键） ---
🛠️ 【第 3 步：动作执行】
1. 伸出双手，把倒扣的杯子 [翻转] 过来放正（注意避开积水打滑）。
2. [抓起] 咖啡条撕开，把粉末 [倒] 进杯子，并 [放下] 包装袋。
3. [抓起] 旁边热水壶，向杯中 [倒水]。
🛑 【防废片红线】 翻转杯子时，手不要挡住杯子在水面上的倒影，算法需要看到倒影数据！
```

**card 要点**：`variationTags: [倒扣, 积水]`；`perceptionTags: [积水反光, 背景杂乱]`。

---

## 例 2：perception · tpl-001 · 厨房抽屉取放

**输入摘要**

```yaml
scene: { name: "家庭厨房标准间", sceneSubtype: "标准成套厨房" }
safetyTier: perception   # 含「厨房」关键词；本任务不涉及液体
template:
  id: tpl-001
  skeleton:
    context: 完成一次标准抽屉取放，动作连贯、可复述。
    environment: 打开厨房主灯，保持正常冷白光；台面整洁，无额外反光干扰。
    setup: 目标道具放在抽屉内；抽屉初始全关。
    sequence: [标定起始位姿, 拉开抽屉至全开并停顿, 抓取目标道具, 取出放到台面, 推回抽屉确认闭合]
  allowedVariationAxes: [object, constraint, action]
props: [厨房抽屉, 汤勺]
atomicActionIds: [cat-a, cat-b]
difficulty: complex
path: template-first
```

**renderedCard**

```
🚩 任务：厨房抽屉取放·标准版
🎯 目的：覆盖关节物体操作（开/拉/推/关）与抓取放置轨迹。
🎬 【导读】 完成一次标准抽屉取放，动作连贯、可复述。
--- 准备工作（录制前完成） ---
💡 【布置光影与环境】
- 打开厨房主灯，保持正常冷白光
- 台面整洁，无额外反光干扰
📦 【摆放道具】
- 汤勺放在抽屉内指定位置；抽屉初始全关
--- 开始录制（按下录制键） ---
🛠️ 【动作执行】
1. [开] 拉开抽屉至全开并停顿
2. [抓起] 汤勺
3. [放] 汤勺放到台面指定区域
4. [关] 推回抽屉确认闭合
🛑 【防废片红线】 拉抽屉时身体勿遮挡第三视角机位
```

**约束**：不激活 perception 轴；不得出现积水/倒水描写。

---

## 例 3：manipulation · 无模板 · 商超拣选

**输入摘要**

```yaml
scene: { name: "商超仿真卖场", sceneSubtype: "卖场拣选动线", description: "货架与推车" }
safetyTier: manipulation
props: [拣选推车, 货架商品]
atomicActionIds: [cat-a, cat-g]
difficulty: complex
taskType: 动捕采集
path: llm-free
```

**renderedCard（节选）**

```
🚩 任务：卖场拣选·双手协同版
🎯 目的：覆盖搬运分拣与双手协同取放轨迹。
🎬 【导读】 沿拣选动线完成一单拣选，动作连贯。
--- 准备工作（录制前完成） ---
💡 【布置光影与环境】
- 卖场顶灯正常照明，通道保持通畅
📦 【摆放道具】
- 推车停在货架端头；目标商品在第二层货架
--- 开始录制（按下录制键） ---
🛠️ 【动作执行】
1. [推] 推车靠近货架定位
2. [抓起] 目标商品放入推车
3. [放] 确认商品稳定不倒
🛑 【防废片红线】 拣选时勿遮挡胸前机位
```

**约束**：manipulation 场景禁止任何倒水/积水描写；若生成含「倒水」须 `passed: false`。

---

## 反例（应被拒）

| 场景 | 描写 | 拒因 |
|------|------|------|
| manipulation 卖场 | 「向杯里倒水」 | safety：manipulation 禁液体 |
| 任意 | 「打开燃气灶加热」 | safety：全局禁明火 |
| correction 任意 | 无失误恢复步骤 | difficulty_mismatch |
| tpl-001 抽屉 | 改成「洗盘子」 | constraint_violation：改变母任务语义 |
| 厨房 · 玻璃杯+保鲜盒 | 「把玻璃杯放入保鲜盒并盖盖」 | plausibility：饮用具不得装入食品保鲜容器 |
| 任意多 prop | 为用完所有 props 硬凑无关动作 | plausibility：动作链不符合同一任务主题 |

---

## 例 4：perception · 厨房 · 道具语义正确（对照反例）

**输入摘要**

```yaml
scene: { name: "家庭厨房标准间", sceneSubtype: "标准成套厨房" }
props: [玻璃杯, 保鲜盒]
atomicActionIds: [cat-a, cat-b]
difficulty: complex
path: llm-free
```

**合理做法**：拆成各自合理的子任务，或只围绕其中一个 prop 设计主线，**不要**把杯塞进盒。

**renderedCard（合理参考）**

```
🚩 任务：餐后收纳·杯具与剩餐分轨版
🎯 目的：分别覆盖饮用具取放与食品容器开合轨迹。
🎬 【导读】 餐后整理：先把玻璃杯归位，再把剩餐装入保鲜盒。
--- 准备工作（录制前完成） ---
💡 【布置光影与环境】
- 厨房主灯正常，台面干燥
📦 【摆放道具】
- 玻璃杯倒扣在沥水区；保鲜盒空盒打开放在台面另一侧
--- 开始录制（按下录制键） ---
🛠️ 【动作执行】
1. [翻转] 玻璃杯使其杯口朝上
2. [抓起] 玻璃杯，[放] 到餐盘指定位置
3. [开] 保鲜盒盖，将剩饭菜 [放] 入盒内
4. [关] 保鲜盒盖确认扣紧
🛑 【防废片红线】 玻璃杯全程不得接触保鲜盒内部；两个子动作区域分开可见
```
