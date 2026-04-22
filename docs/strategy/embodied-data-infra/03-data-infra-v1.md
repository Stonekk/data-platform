# Data Infra v1 执行蓝图（技术视角）

> 上位原则见 `00-problem-definition.md`，数据来源与飞轮模型见 `01-data-cost-model.md`，阶段门槛见 `02-stage-milestones.md`。
> 本文件只讲技术执行：**架构、节奏、数据对象、外部接入预留、验收**。不涉及组织与流程。

## 1. 目标

0-12 个月打通"采集 → 治理 → 编译 → 训练 → 部署 → 回流"的周级闭环，输出每周可验证的模型迭代。
**同时**为 Stage 2 的外部回流和 2nd-dev 生态接入预留接口与 schema（规范冻结，不落地）。

## 2. 首批场景

零售/服务高频任务（自有场景，用于成本控制与价值密度验证）：

- 补货（shelf_restock）
- 取放（pick_place）
- 分拣（light_sorting）
- 简单导购交互（guide_interaction）

## 3. 五层架构（内外环统一设计）

| 层 | 内环职责（v1 落地） | 外环预留（v1 出规范，Stage 2 落地） |
|---|---|---|
| 采集（Collection） | 自采 + 遥操作 + 故障复现 | 外部回流接入 SDK 规范 |
| 治理（Governance） | 多模态对齐、质检、标签补全 | 外部数据脱敏与合规校验流水线规范 |
| 编译（Compiler） | 切片、标签体系、检索索引 | 跨来源（自采/外采/生态/2nd-dev）溯源字段 |
| 训练（Training） | 复用自驾训练栈，周级窗口 | 来源加权 & 采样策略接口（先留钩子） |
| 评估/部署（Eval/Deploy） | 离线评测 + 门店灰度 + 回流 | 跨场景 UDV 评测协议、失败模式回传协议 |

核心原则：**v1 只做内环，但所有数据对象和接口都按"未来要接外环"的 schema 设计**。避免 Stage 2 返工。

## 4. 周级闭环节拍

- 周一：基于上周失败模式定义本周采集配额
- 周二到周三：采集 + 治理，输出可训练数据包
- 周四：触发训练流水线并完成离线评估
- 周五：1-2 家门店灰度部署，线上表现回流至治理层

## 5. 数据对象与最小字段（含飞轮溯源字段）

### 5.1 采集记录 `collection_record`

- `record_id` / `scene_id` / `task_type` / `robot_version`
- `operator_mode`（teleop/human_assist/autonomous）
- `start_ts` / `end_ts`
- **新增**：`source_type`（self_collect / external_purchase / ecosystem / second_dev_partner / crowd）
- **新增**：`source_id`（伙伴/客户/众包用户匿名 ID）
- **新增**：`data_rights`（own / licensed / shared / restricted）
- **新增**：`view_type`（first_person_ego / third_person / mixed）

### 5.2 编译样本 `compiled_sample`

- `sample_id` / `source_record_id`
- `task_phase` / `outcome`（success/failure/recovery）/ `failure_mode`
- `quality_score` / `data_version`
- **新增**：`provenance_chain`（来源链路，含脱敏处理记录）
- **新增**：`usage_policy`（训练 / 评测 / 内部共享 / 外部共享）

### 5.3 部署回流 `deployment_feedback`

- `model_version` / `scene_id` / `task_type`
- `success_flag` / `human_intervention_flag` / `incident_level`
- **新增**：`deployment_channel`（internal / external_customer / second_dev_partner）
- **新增**：`cross_scene_flag`（是否跨出自有场景覆盖范围）

## 6. 外部接入规范（v1 冻结，Stage 2 激活）

### 6.1 外部回流 SDK 规范（接口冻结）

- 数据接入协议：鉴权、批量上传、增量同步、断点续传
- 元数据必填字段：`source_type` / `source_id` / `view_type` / `task_type_hint`
- 默认脱敏策略：人脸 / 语音 / 位置 / 文本敏感信息的自动处理

### 6.2 数据权属 schema（Stage 1 末冻结）

- 所有权 / 使用权 / 衍生模型权分离
- 合作伙伴四种授权档：`only_self_use` / `share_anonymized` / `share_full` / `platform_full`
- 合同条款与 schema 字段一一对应，避免合同-数据脱节

### 6.3 2nd-dev 开放接口（只出文档）

- 模型能力 API：技能列表、调用参数、限速与计费骨架
- 数据接入 SDK：复用 6.1 的接入协议
- 评测接入 API：提交评测集并获取跨场景 UDV 报告

规范冻结不等于落地。v1 阶段只产出文档和 Mock 实现，真实对外服务在 Stage 2 早期开启。

## 7. v1 技术验收门槛（12 个月内）

### 7.1 闭环效率

- `LoopCycleTime <= 7 天`（采集到灰度上线）
- 周级迭代连续运行 >= 8 周不中断

### 7.2 数据有效性

- 质检通过率 >= 92%
- 数据采纳率 >= 70%（入池被训练消费）
- 失败样本占比在目标区间（20%-35%）

### 7.3 模型价值

- 核心任务加权成功率较基线提升 >= 15%
- 人工介入率较基线下降 >= 20%
- `UDV_total > 0`，且至少 2 类任务 `UDV_by_task > 0`

### 7.4 可复制性

- 至少 3 个门店复用同一流程
- 任务模板复用率 >= 60%
- 跨门店迁移性能损耗 <= 20%

### 7.5 飞轮接入就绪度（新增）

- 外部回流 SDK 规范 V1 冻结并通过内部 Mock 测试
- 数据权属 schema V1 冻结且法务审核通过
- 2nd-dev 接口文档 V1 可独立被外部研发跑通 Demo

## 8. 12 个月里程碑（按季度）

- Q1：五层架构 MVP + 单门店闭环跑通
- Q2：扩展多门店，统一标签与失败模式库；启动外部接入 schema 设计
- Q3：周级发布稳定，自动化指标与回归报表；外部 SDK 与权属 schema 内部评审
- Q4：输出"内部闭环能力包"（能力边界、接口、评测协议）+ "外部接入规范 V1"，作为 Stage 2 飞轮启动的技术底座

## 9. 关键技术风险与缓解

- 风险：采集量增长但高价值样本不足。
  - 缓解：失败样本占比下限强制约束；每周复盘失败模式覆盖。
- 风险：模型无法有效利用新增数据（成本升、价值不升）。
  - 缓解：跟踪数据采纳率、训练贡献度、UDV；连续 2 周反转触发训练策略复盘。
- 风险：跨门店迁移损耗超限。
  - 缓解：场景差异向量化标注；迁移时强制最小增量微调样本量。
- 风险：灰度事故回滚不及时。
  - 缓解：回滚演练每季度 1 次；失败门店白名单控制。
- 风险（飞轮）：外部接入 schema 设计不足，Stage 2 被迫返工重构数据底座。
  - 缓解：Q2 启动 schema 设计，Q3 完成内部评审，Q4 冻结并 Mock 跑通。
- 风险（飞轮）：外部回流数据质量差，污染内环训练。
  - 缓解：外部数据默认进隔离池，通过独立评测通道转正，不直接混入主训练集。
