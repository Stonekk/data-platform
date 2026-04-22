/**
 * 具身智能数据平台 — 原型演示用 Mock 数据
 */

// ---------------------------------------------------------------------------
// 基础与通用类型
// ---------------------------------------------------------------------------

export type ChartDataPoint = {
  label: string;
  value: number;
  /** 可选第二序列（如同比、对比组） */
  value2?: number;
};

export type RequirementStatus =
  | 'draft'
  | 'submitted'
  | 'reviewing'
  | 'approved'
  | 'decomposed'
  | 'executing'
  | 'completed'
  | 'closed'
  | 'rejected'
  | 'blocked';
export type DataRequirementType = 'teleoperation' | 'human_body' | 'motion_capture';
export type RequirementPriority = 'P0' | 'P1' | 'P2';
export type RequirementTargetType = 'duration' | 'count';
export type RequirementSceneType =
  | 'home'
  | 'business'
  | 'factory'
  | 'charging'
  | 'public'
  | 'other';
export type RequirementDataPurpose = 'debug' | 'training';
export type ApprovalDecision = 'pending' | 'approved' | 'rejected';

export type ApprovalEvaluation = {
  feasibility: 'pass' | 'warn' | 'fail';
  cost: 'pass' | 'warn' | 'fail';
  efficiency: 'pass' | 'warn' | 'fail';
  resourceMatch: 'pass' | 'warn' | 'fail';
};

export type ApprovalRecord = {
  level: 1 | 2;
  nodeName: string;
  approverRole: string;
  approverName: string;
  decision: ApprovalDecision;
  evaluation?: ApprovalEvaluation;
  opinion?: string;
  actedAt?: string;
};

export type TaskStatus =
  | 'to_schedule'
  | 'scheduled'
  | 'ready'
  | 'in_progress'
  | 'completed'
  | 'closed';

export type TaskPriority = 'low' | 'medium' | 'high';

export type DeviceStatus = 'available' | 'unavailable';
export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'maintenance';

export type PersonnelStatus = 'available' | 'busy';

export type SceneStatus = 'active' | 'inactive' | 'maintenance';

export type CollectionStatus = 'idle' | 'collecting' | 'paused' | 'completed' | 'failed';

export type PipelineStageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export type AnnotationTaskStatus = 'not-started' | 'in-progress' | 'completed';

export type DatasetStatus = 'draft' | 'reviewing' | 'published' | 'deprecated';

export type TransmissionState = 'synced' | 'syncing' | 'queued' | 'failed' | 'offline';

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IssueSource = 'task-workbench' | 'collection-app';
export type IssueStatus = 'open' | 'processing' | 'resolved';

// ---------------------------------------------------------------------------
// 业务实体类型（用户指定 + 扩展）
// ---------------------------------------------------------------------------

export type DashboardStats = {
  /** 按数据类型的产量（条/小时或 GB，演示用统一为「条」） */
  dataProductionByType: {
    type: string;
    label: string;
    count: number;
    unit: string;
  }[];
  /** 任务完成率 0–100 */
  taskCompletionRate: number;
  taskCompletionBreakdown: {
    label: string;
    completed: number;
    total: number;
  }[];
  /** 数据传输概况 */
  dataTransmission: {
    label: string;
    state: TransmissionState;
    progress: number;
    throughputMbps: number;
    pendingGb: number;
  }[];
  /** 设备利用率 0–100 */
  deviceUtilization: {
    deviceId: string;
    deviceName: string;
    utilizationPercent: number;
    onlineHours24h: number;
  }[];
  /** 异常告警 */
  anomalyAlerts: {
    id: string;
    level: 'info' | 'warning' | 'error';
    title: string;
    message: string;
    time: string;
    source: string;
  }[];
  /** 采集在线率 */
  collectionOnlineRate: number;
  /** 今日已传数据量 GB */
  transmittedGbToday: number;
};

export type Requirement = {
  id: string;
  title: string;
  status: RequirementStatus;
  dataType: DataRequirementType;
  scene: string;
  device: string;
  dataVolume: string;
  deliveryDate: string;
  createdAt: string;
  description: string;

  /** 画板要求：需求方（发起人） */
  owner: string;
  /** 画板要求：需求归属组（CU5 / CU6 / CU17…） */
  requirementGroup: string;
  /** 画板要求：P0/P1/P2，直接进入调度打分 */
  priority: RequirementPriority;
  /** 采集目标度量方式 */
  targetType: RequirementTargetType;
  /** 采集目标值，例如 "120 小时" / "20000 条" */
  targetValue: string;
  /** 业务场景类型（家庭/商务/工厂/充电等） */
  sceneType?: RequirementSceneType;
  /** 数据用途（调试/正式训练） */
  dataPurpose?: RequirementDataPurpose;
  /** 关键约束，最多 3 条（画板要求） */
  keyRequirements: string[];
  /** 设备要求细节（型号/版本/精度等） */
  deviceRequirement: string;
  /** 标注要求（粒度、标签体系、验收口径） */
  annotationRequirement: string;
  /** SOP 文档链接 */
  sopLink?: string;
  /** 标注规则链接 */
  annotationRuleLink?: string;
  /** 采集入口链接（Xlive / App） */
  collectionEntryLink?: string;
  /** 评审流程节点（按顺序） */
  approvals: ApprovalRecord[];
  /** 关联任务 ID 列表（进入执行后联动） */
  linkedTaskIds: string[];
  /** 自动计算的进度，0-100；系统维护，禁止人工编辑 */
  progress: number;
  /** 实际完成时间，自动回填 */
  actualFinishAt?: string;
  /** 驳回或阻塞原因（状态分支时展示） */
  blockReason?: string;
};

export type TaskScriptStep = {
  order: number;
  operation: string;
  durationMinutes: number;
  notes?: string;
};

export type TaskScript = {
  taskId: string;
  title: string;
  scheduledTime: string;
  personnelIds: string[];
  deviceIds: string[];
  steps: TaskScriptStep[];
};

export type TaskScheduleSlot = {
  taskId: string;
  startTime: string;
  endTime: string;
  sceneId: string;
  priority: 'low' | 'medium' | 'high';
};

export type Task = {
  id: string;
  device: string;
  personnel: string;
  scene: string;
  status: TaskStatus;
  startTime: string;
  endTime: string;
  type: string;
  /** 画板要求：任务 = 人 + 设备 + 事 + 场地，以下四组 ID 为 4 要素引用 */
  personnelId?: string;
  deviceId?: string;
  sceneId?: string;
  /** 关联台本 ID（"事"要素），对齐 mockTaskScripts[*].taskId */
  scriptId?: string;
  /** 关联需求，用于任务拆解溯源；缺失为"孤儿任务"（应补录） */
  requirementId?: string;
  /** 任务优先级，调度面板颜色与排序依据；默认继承需求优先级 */
  priority?: TaskPriority;
  /** 阻塞/延期原因，可选 */
  blockReason?: string;
};

export type Device = {
  id: string;
  name: string;
  type: string;
  status: DeviceStatus;
  healthStatus: HealthStatus;
  lastMaintenance: string;
  location: string;
  /** 计划下次例行维护（YYYY-MM-DD） */
  nextMaintenanceAt?: string;
  /** 计划下次标定 / 校准（YYYY-MM-DD），动捕/可穿戴/感知类常用 */
  nextCalibrationAt?: string;
};

export type PersonnelScheduleEntry = {
  date: string;
  startTime: string;
  endTime: string;
  taskId: string;
  label: string;
};

/** 技能熟练度，用于资源池「技能矩阵」视图 */
export type SkillProficiency = 1 | 2 | 3;

export type PersonnelSkillRating = {
  skill: string;
  level: SkillProficiency;
};

export type Personnel = {
  id: string;
  name: string;
  role: string;
  status: PersonnelStatus;
  skills: string[];
  /** 与 skills 对齐的等级：1 可用、2 熟练、3 专家；缺省可由前端按 2 展示 */
  skillRatings?: PersonnelSkillRating[];
  schedule: PersonnelScheduleEntry[];
};

export type Scene = {
  id: string;
  name: string;
  /** 场景类型（中间层）：零售物流、家庭服务等 */
  type: string;
  /** 行业域（顶层）：画板「行业 → 场景类型 → 子类型」第一层 */
  industry: string;
  /** 子类型（最细）：具体布置或空间变体 */
  sceneSubtype: string;
  status: SceneStatus;
  location: string;
  description: string;
};

export type CollectionSession = {
  id: string;
  device: string;
  status: CollectionStatus;
  progress: number;
  startTime: string;
  dataSize: string;
  anomalies: string[];
};

export type TransmissionRecord = {
  id: string;
  sessionId: string;
  destination: string;
  state: TransmissionState;
  progress: number;
  startedAt: string;
  anomaly?: string;
};

export type PipelineStage = {
  name: string;
  status: PipelineStageStatus;
  count: number;
  duration: string;
  datasetId?: string;
};

export type AnnotationTask = {
  id: string;
  dataset: string;
  status: AnnotationTaskStatus;
  assignee: string;
  progress: number;
  type: string;
};

export type QualityResult = {
  id: string;
  dataset: string;
  passRate: number;
  issues: string[];
  checkTime: string;
};

export type Dataset = {
  id: string;
  name: string;
  version: string;
  size: string;
  status: DatasetStatus;
  createdAt: string;
  records: number;
};

export type MonitoringCharts = {
  dataVolumeTrend: ChartDataPoint[];
  taskCompletionTrend: ChartDataPoint[];
  deviceUtilizationTrend: ChartDataPoint[];
  anomalyStatistics: ChartDataPoint[];
};

export type IssueReport = {
  id: string;
  source: IssueSource;
  status: IssueStatus;
  severity: IssueSeverity;
  title: string;
  description: string;
  /** 可选：关联任务 */
  taskId?: string;
  /** 可选：关联需求 */
  requirementId?: string;
  /** 可选：关联采集会话 */
  sessionId?: string;
  reporter: string;
  reportedAt: string;
};

// ---------------------------------------------------------------------------
// 1. 仪表盘统计
// ---------------------------------------------------------------------------

export const dashboardStats: DashboardStats = {
  dataProductionByType: [
    { type: 'teleoperation', label: '遥操作', count: 12840, unit: '条' },
    { type: 'human_body', label: '人体数据', count: 9620, unit: '条' },
    { type: 'motion_capture', label: '动捕', count: 7340, unit: '条' },
  ],
  taskCompletionRate: 87.3,
  taskCompletionBreakdown: [
    { label: '本周计划', completed: 41, total: 48 },
    { label: '高优先级', completed: 18, total: 20 },
    { label: '动捕专项', completed: 12, total: 15 },
  ],
  dataTransmission: [
    {
      label: '边缘节点 → 中心存储',
      state: 'syncing',
      progress: 72,
      throughputMbps: 640,
      pendingGb: 128.4,
    },
    {
      label: '标注集群回传',
      state: 'synced',
      progress: 100,
      throughputMbps: 210,
      pendingGb: 0,
    },
    {
      label: '备份链路',
      state: 'queued',
      progress: 0,
      throughputMbps: 0,
      pendingGb: 45.2,
    },
  ],
  deviceUtilization: [
    { deviceId: 'dev-001', deviceName: '双臂遥操作台 A1', utilizationPercent: 91, onlineHours24h: 21.5 },
    { deviceId: 'dev-004', deviceName: '动捕套装 M3', utilizationPercent: 78, onlineHours24h: 18.2 },
    { deviceId: 'dev-006', deviceName: '人形机器人 H2', utilizationPercent: 65, onlineHours24h: 15.0 },
    { deviceId: 'dev-008', deviceName: '可穿戴惯性套装 W1', utilizationPercent: 82, onlineHours24h: 19.1 },
    { deviceId: 'dev-010', deviceName: '移动底盘 C1', utilizationPercent: 54, onlineHours24h: 12.8 },
  ],
  anomalyAlerts: [
    {
      id: 'alt-001',
      level: 'error',
      title: '传输校验失败',
      message: '批次 B-20250324-07 校验码不一致，已自动重试 2 次',
      time: '2025-03-26T09:12:00+08:00',
      source: '传输服务',
    },
    {
      id: 'alt-002',
      level: 'warning',
      title: '设备温度偏高',
      message: '动捕基站 M3-左臂节点温度 58°C，建议检查散热',
      time: '2025-03-26T08:45:00+08:00',
      source: '设备监控',
    },
    {
      id: 'alt-003',
      level: 'info',
      title: '计划维护窗口',
      message: '今晚 23:00–01:00 场景「仓储分拣区」例行消杀与标定',
      time: '2025-03-26T08:00:00+08:00',
      source: '运维日历',
    },
  ],
  collectionOnlineRate: 94.2,
  transmittedGbToday: 386.7,
};

// ---------------------------------------------------------------------------
// 2. 数据需求
// ---------------------------------------------------------------------------

export const mockRequirements: Requirement[] = [
  {
    id: 'req-001',
    title: '厨房场景双臂遥操作抓取',
    status: 'executing',
    dataType: 'teleoperation',
    scene: '家庭厨房标准间',
    device: '双臂遥操作台 A1',
    dataVolume: '约 2.4 TB',
    deliveryDate: '2025-04-15',
    createdAt: '2025-03-01T10:00:00+08:00',
    description: '覆盖开抽屉、倾倒、叠毛巾等长序列操作，需同步腕部力矩与第三视角视频。',
    owner: '张宇航',
    requirementGroup: 'CU6-家庭服务',
    priority: 'P0',
    targetType: 'duration',
    targetValue: '120 小时',
    keyRequirements: [
      '力矩同步误差 < 5ms',
      '第三视角需覆盖抓取瞬间无遮挡',
      '长序列单段 ≥ 3 分钟',
    ],
    deviceRequirement: '双臂遥操作台 A1（主站软件 v2.4+），含腕部六维力传感器',
    annotationRequirement: '按操作语义分段（开-取-放-归位），标签体系对齐 v1.2',
    sopLink: 'https://sop.example.com/kitchen-teleop-v2',
    approvals: [
      {
        level: 1,
        nodeName: '初审 · 可行性与资源',
        approverRole: '采集运营',
        approverName: '许明哲',
        decision: 'approved',
        evaluation: { feasibility: 'pass', cost: 'pass', efficiency: 'pass', resourceMatch: 'pass' },
        opinion: '设备与场景均就绪，建议列入本周排期。',
        actedAt: '2025-03-02T09:00:00+08:00',
      },
      {
        level: 2,
        nodeName: '终审 · 需求批复',
        approverRole: '采集运营 Leader',
        approverName: '胡明宇',
        decision: 'approved',
        evaluation: { feasibility: 'pass', cost: 'pass', efficiency: 'pass', resourceMatch: 'pass' },
        opinion: '批准进入拆解，优先级 P0。',
        actedAt: '2025-03-02T15:20:00+08:00',
      },
    ],
    linkedTaskIds: ['task-001'],
    progress: 42,
  },
  {
    id: 'req-002',
    title: '工业拧螺丝人体工效数据',
    status: 'reviewing',
    dataType: 'human_body',
    scene: '装配工位线体',
    device: '可穿戴惯性套装 W1',
    dataVolume: '约 860 GB',
    deliveryDate: '2025-04-28',
    createdAt: '2025-03-18T14:30:00+08:00',
    description: '采集肩肘腕角度与肌电参考，用于人机协作安全阈值建模。',
    owner: '王立',
    requirementGroup: 'CU17-工业协作',
    priority: 'P1',
    targetType: 'count',
    targetValue: '8,000 条',
    keyRequirements: [
      '覆盖 ≥ 3 种扭矩档位',
      '受试者至少 6 人、男女均衡',
      '肌电采样率 ≥ 1kHz',
    ],
    deviceRequirement: '可穿戴惯性套装 W1 × 2 套 + 肌电参考贴片',
    annotationRequirement: '关节角度区间标签 + 疲劳粗标签，复用 ann-006 规范',
    sopLink: 'https://sop.example.com/assembly-human-ergonomics',
    approvals: [
      {
        level: 1,
        nodeName: '初审 · 可行性与资源',
        approverRole: '采集运营',
        approverName: '许明哲',
        decision: 'approved',
        evaluation: { feasibility: 'pass', cost: 'pass', efficiency: 'warn', resourceMatch: 'pass' },
        opinion: '受试者招募周期较长，建议同步启动。',
        actedAt: '2025-03-19T11:00:00+08:00',
      },
      {
        level: 2,
        nodeName: '终审 · 需求批复',
        approverRole: '采集运营 Leader',
        approverName: '胡明宇',
        decision: 'pending',
      },
    ],
    linkedTaskIds: [],
    progress: 0,
  },
  {
    id: 'req-003',
    title: '商超拣货动捕基准库',
    status: 'completed',
    dataType: 'motion_capture',
    scene: '商超仿真卖场',
    device: '动捕套装 M3',
    dataVolume: '约 5.1 TB',
    deliveryDate: '2025-03-20',
    createdAt: '2025-02-10T09:00:00+08:00',
    description: 'SKU 取放、推车转向、低位拾取三类动作，已完成对齐与初剪。',
    owner: '李静',
    requirementGroup: 'CU5-零售物流',
    priority: 'P0',
    targetType: 'duration',
    targetValue: '80 小时',
    keyRequirements: [
      '标杆动作 SKU 覆盖 ≥ 200',
      '骨骼点位丢失率 < 1%',
      '三类动作每类样本 ≥ 500',
    ],
    deviceRequirement: '动捕套装 M3（24 相机标定通过）',
    annotationRequirement: '骨骼关键点 + 货位 SKU 框',
    sopLink: 'https://sop.example.com/retail-pickup-mocap',
    approvals: [
      {
        level: 1,
        nodeName: '初审 · 可行性与资源',
        approverRole: '采集运营',
        approverName: '许明哲',
        decision: 'approved',
        evaluation: { feasibility: 'pass', cost: 'pass', efficiency: 'pass', resourceMatch: 'pass' },
        opinion: '标杆项目，设备场景均就绪。',
        actedAt: '2025-02-11T09:30:00+08:00',
      },
      {
        level: 2,
        nodeName: '终审 · 需求批复',
        approverRole: '采集运营 Leader',
        approverName: '胡明宇',
        decision: 'approved',
        evaluation: { feasibility: 'pass', cost: 'pass', efficiency: 'pass', resourceMatch: 'pass' },
        opinion: '批准交付，优先级 P0。',
        actedAt: '2025-02-11T14:10:00+08:00',
      },
    ],
    linkedTaskIds: ['task-002'],
    progress: 100,
    actualFinishAt: '2025-03-19T18:00:00+08:00',
  },
  {
    id: 'req-004',
    title: '人形机器人过门槛遥操作',
    status: 'executing',
    dataType: 'teleoperation',
    scene: '室内外过渡区',
    device: '人形机器人 H2',
    dataVolume: '约 1.1 TB',
    deliveryDate: '2025-04-05',
    createdAt: '2025-03-12T11:20:00+08:00',
    description: '不同门槛高度与材质，记录足端压力与全身关节轨迹。',
    owner: '刘桓',
    requirementGroup: 'CU8-移动机器人',
    priority: 'P0',
    targetType: 'count',
    targetValue: '4,500 条',
    keyRequirements: [
      '门槛覆盖高度 5~20cm，≥ 4 档',
      '失败样本（受控）占比 ≥ 10%',
      '足端压力采样率 ≥ 500Hz',
    ],
    deviceRequirement: '人形机器人 H2（健康状态 warning 以上可上岗）+ 安全员 1 名',
    annotationRequirement: '动作分段 + 失败原因标签（ann-003 规范）',
    sopLink: 'https://sop.example.com/humanoid-threshold',
    approvals: [
      {
        level: 1,
        nodeName: '初审 · 可行性与资源',
        approverRole: '采集运营',
        approverName: '许明哲',
        decision: 'approved',
        evaluation: { feasibility: 'pass', cost: 'pass', efficiency: 'pass', resourceMatch: 'warn' },
        opinion: '需要安全员协同，排期避开早高峰。',
        actedAt: '2025-03-13T10:00:00+08:00',
      },
      {
        level: 2,
        nodeName: '终审 · 需求批复',
        approverRole: '采集运营 Leader',
        approverName: '胡明宇',
        decision: 'approved',
        evaluation: { feasibility: 'pass', cost: 'pass', efficiency: 'pass', resourceMatch: 'pass' },
        opinion: '批准执行。',
        actedAt: '2025-03-13T16:00:00+08:00',
      },
    ],
    linkedTaskIds: ['task-003'],
    progress: 28,
  },
  {
    id: 'req-005',
    title: '康复辅具穿戴人体姿态',
    status: 'draft',
    dataType: 'human_body',
    scene: '康复训练室',
    device: '柔性传感衣 S2',
    dataVolume: '约 420 GB',
    deliveryDate: '2025-05-10',
    createdAt: '2025-03-22T16:00:00+08:00',
    description: '坐站转移、平行杠内步态，需与理疗师口令时间轴对齐。',
    owner: '陈悦',
    requirementGroup: 'CU11-医疗康复',
    priority: 'P2',
    targetType: 'duration',
    targetValue: '60 小时',
    keyRequirements: [
      '受试者需签署伦理同意',
      '理疗师口令需转写为时间轴',
    ],
    deviceRequirement: '柔性传感衣 S2',
    annotationRequirement: '步态分段 + 口令对齐标签',
    approvals: [
      {
        level: 1,
        nodeName: '初审 · 可行性与资源',
        approverRole: '采集运营',
        approverName: '许明哲',
        decision: 'pending',
      },
      {
        level: 2,
        nodeName: '终审 · 需求批复',
        approverRole: '采集运营 Leader',
        approverName: '胡明宇',
        decision: 'pending',
      },
    ],
    linkedTaskIds: [],
    progress: 0,
  },
  {
    id: 'req-006',
    title: '双机协同搬运动捕',
    status: 'executing',
    dataType: 'motion_capture',
    scene: '仓储分拣区',
    device: '动捕套装 M3 + 移动底盘 C1',
    dataVolume: '约 3.6 TB',
    deliveryDate: '2025-04-22',
    createdAt: '2025-03-05T08:45:00+08:00',
    description: '两名操作员与两台 AGV 的时间同步标定与遮挡补帧方案已锁定。',
    owner: '周仁',
    requirementGroup: 'CU5-零售物流',
    priority: 'P1',
    targetType: 'count',
    targetValue: '3,200 条',
    keyRequirements: [
      '双机时间同步误差 < 20ms',
      '遮挡补帧不超过 10%',
      '协同节点动作打点齐全',
    ],
    deviceRequirement: '动捕套装 M3 + 移动底盘 C1（需双机联调完成）',
    annotationRequirement: '角色交互关系标注（ann-007 规范）',
    sopLink: 'https://sop.example.com/dual-robot-coop',
    approvals: [
      {
        level: 1,
        nodeName: '初审 · 可行性与资源',
        approverRole: '采集运营',
        approverName: '许明哲',
        decision: 'approved',
        evaluation: { feasibility: 'pass', cost: 'warn', efficiency: 'pass', resourceMatch: 'pass' },
        opinion: '双机协同成本偏高，但场景价值高。',
        actedAt: '2025-03-06T10:00:00+08:00',
      },
      {
        level: 2,
        nodeName: '终审 · 需求批复',
        approverRole: '采集运营 Leader',
        approverName: '胡明宇',
        decision: 'approved',
        evaluation: { feasibility: 'pass', cost: 'pass', efficiency: 'pass', resourceMatch: 'pass' },
        opinion: '批准，按 P1 排期。',
        actedAt: '2025-03-06T17:30:00+08:00',
      },
    ],
    linkedTaskIds: ['task-005'],
    progress: 15,
    blockReason: 'task-005 延期，AGV 定位跳变待修复',
  },
  {
    id: 'req-007',
    title: '精密插拔遥操作（电子）',
    status: 'closed',
    dataType: 'teleoperation',
    scene: '防静电工作台',
    device: '双臂遥操作台 A2',
    dataVolume: '约 980 GB',
    deliveryDate: '2025-03-18',
    createdAt: '2025-02-28T13:10:00+08:00',
    description: 'FPC 插拔、螺丝微扭力，含高帧指尖触觉。',
    owner: '郑行',
    requirementGroup: 'CU17-工业协作',
    priority: 'P1',
    targetType: 'count',
    targetValue: '2,000 条',
    keyRequirements: [
      '指尖触觉 ≥ 1kHz 采样',
      '微米级结果判定',
      '静电防护合规',
    ],
    deviceRequirement: '双臂遥操作台 A2 + 微米级显微工位',
    annotationRequirement: '微米级结果判定（ann-010 规范）',
    sopLink: 'https://sop.example.com/precision-fpc',
    approvals: [
      {
        level: 1,
        nodeName: '初审 · 可行性与资源',
        approverRole: '采集运营',
        approverName: '许明哲',
        decision: 'approved',
        evaluation: { feasibility: 'pass', cost: 'pass', efficiency: 'pass', resourceMatch: 'pass' },
        actedAt: '2025-03-01T09:00:00+08:00',
      },
      {
        level: 2,
        nodeName: '终审 · 需求批复',
        approverRole: '采集运营 Leader',
        approverName: '胡明宇',
        decision: 'approved',
        evaluation: { feasibility: 'pass', cost: 'pass', efficiency: 'pass', resourceMatch: 'pass' },
        actedAt: '2025-03-01T14:00:00+08:00',
      },
    ],
    linkedTaskIds: ['task-006'],
    progress: 100,
    actualFinishAt: '2025-03-18T12:00:00+08:00',
  },
  {
    id: 'req-008',
    title: '拥挤人群穿行人体流场',
    status: 'rejected',
    dataType: 'human_body',
    scene: '交通枢纽大厅',
    device: '多相机阵列 + W1',
    dataVolume: '约 6.8 TB',
    deliveryDate: '2025-06-01',
    createdAt: '2025-03-24T09:30:00+08:00',
    description: '匿名化行人轨迹与局部避让意图标注需求评审中。',
    owner: '吴梓',
    requirementGroup: 'CU9-公共场景',
    priority: 'P2',
    targetType: 'duration',
    targetValue: '200 小时',
    keyRequirements: [
      '隐私合规脱敏',
      '多机位同步',
      '高峰/平峰时段均需覆盖',
    ],
    deviceRequirement: '多相机阵列 + W1',
    annotationRequirement: '轨迹匿名化抽检（ann-005 规范）',
    approvals: [
      {
        level: 1,
        nodeName: '初审 · 可行性与资源',
        approverRole: '采集运营',
        approverName: '许明哲',
        decision: 'approved',
        evaluation: { feasibility: 'warn', cost: 'warn', efficiency: 'warn', resourceMatch: 'fail' },
        opinion: '合作场地审批未通过，场景 inactive 中。',
        actedAt: '2025-03-24T18:00:00+08:00',
      },
      {
        level: 2,
        nodeName: '终审 · 需求批复',
        approverRole: '采集运营 Leader',
        approverName: '胡明宇',
        decision: 'rejected',
        evaluation: { feasibility: 'warn', cost: 'warn', efficiency: 'warn', resourceMatch: 'fail' },
        opinion: '场景尚未开放采集，驳回；待场地合作完成后重新提交。',
        actedAt: '2025-03-25T10:00:00+08:00',
      },
    ],
    linkedTaskIds: [],
    progress: 0,
    blockReason: '场景 scene-008 尚未审批通过，无法开展采集',
  },
  {
    id: 'req-009',
    title: '乒乓球对打动捕',
    status: 'blocked',
    dataType: 'motion_capture',
    scene: '体育馆多功能场地',
    device: '动捕套装 M3',
    dataVolume: '约 2.0 TB',
    deliveryDate: '2025-04-12',
    createdAt: '2025-03-14T10:00:00+08:00',
    description: '高速挥拍与重心转移，200Hz 骨骼数据。',
    owner: '张宇航',
    requirementGroup: 'CU13-体育训练',
    priority: 'P1',
    targetType: 'duration',
    targetValue: '40 小时',
    keyRequirements: [
      '骨骼采样率 ≥ 200Hz',
      '击球事件点标注',
      '高速模糊场景需补拍方案',
    ],
    deviceRequirement: '动捕套装 M3（高速模式）',
    annotationRequirement: '击球事件点标注（ann-004 规范）',
    sopLink: 'https://sop.example.com/tabletennis-mocap',
    approvals: [
      {
        level: 1,
        nodeName: '初审 · 可行性与资源',
        approverRole: '采集运营',
        approverName: '许明哲',
        decision: 'approved',
        evaluation: { feasibility: 'pass', cost: 'pass', efficiency: 'pass', resourceMatch: 'pass' },
        actedAt: '2025-03-14T16:00:00+08:00',
      },
      {
        level: 2,
        nodeName: '终审 · 需求批复',
        approverRole: '采集运营 Leader',
        approverName: '胡明宇',
        decision: 'approved',
        evaluation: { feasibility: 'pass', cost: 'pass', efficiency: 'pass', resourceMatch: 'pass' },
        actedAt: '2025-03-15T09:00:00+08:00',
      },
    ],
    linkedTaskIds: ['task-007'],
    progress: 48,
    blockReason: '高速模糊导致自动关键点失败，质检打回补拍（qa-004）',
  },
  {
    id: 'req-010',
    title: '农业大棚遥操作修剪',
    status: 'completed',
    dataType: 'teleoperation',
    scene: '温室大棚示范区',
    device: '移动机械臂 R1',
    dataVolume: '约 1.5 TB',
    deliveryDate: '2025-03-10',
    createdAt: '2025-02-01T08:00:00+08:00',
    description: '湿度变化下的手套触觉漂移记录已完成质检验收。',
    owner: '孙墨',
    requirementGroup: 'CU14-农业',
    priority: 'P2',
    targetType: 'count',
    targetValue: '1,500 条',
    keyRequirements: [
      '湿度变化梯度覆盖',
      '户外设备每日烘干',
      '触觉漂移可溯源',
    ],
    deviceRequirement: '移动机械臂 R1（大棚改装套件）',
    annotationRequirement: '工具接触状态（ann-008 规范）',
    sopLink: 'https://sop.example.com/agri-teleop',
    approvals: [
      {
        level: 1,
        nodeName: '初审 · 可行性与资源',
        approverRole: '采集运营',
        approverName: '许明哲',
        decision: 'approved',
        evaluation: { feasibility: 'pass', cost: 'pass', efficiency: 'pass', resourceMatch: 'pass' },
        actedAt: '2025-02-02T09:00:00+08:00',
      },
      {
        level: 2,
        nodeName: '终审 · 需求批复',
        approverRole: '采集运营 Leader',
        approverName: '胡明宇',
        decision: 'approved',
        evaluation: { feasibility: 'pass', cost: 'pass', efficiency: 'pass', resourceMatch: 'pass' },
        actedAt: '2025-02-02T15:00:00+08:00',
      },
    ],
    linkedTaskIds: ['task-009'],
    progress: 100,
    actualFinishAt: '2025-03-09T17:00:00+08:00',
  },
  {
    id: 'req-011',
    title: '电梯内外人体进出',
    status: 'decomposed',
    dataType: 'human_body',
    scene: '写字楼电梯厅',
    device: '深度相机 + W1',
    dataVolume: '约 1.9 TB',
    deliveryDate: '2025-04-30',
    createdAt: '2025-03-19T15:00:00+08:00',
    description: '高峰/平峰时段客流，关注门区让行行为。',
    owner: '李静',
    requirementGroup: 'CU9-公共场景',
    priority: 'P1',
    targetType: 'duration',
    targetValue: '50 小时',
    keyRequirements: [
      '匿名化脱敏合规',
      '高峰/平峰各 ≥ 20 小时',
      '门区让行行为事件标签',
    ],
    deviceRequirement: '深度相机阵列 D4 + W1',
    annotationRequirement: '轨迹匿名化抽检 + 门区让行事件',
    sopLink: 'https://sop.example.com/elevator-human-flow',
    approvals: [
      {
        level: 1,
        nodeName: '初审 · 可行性与资源',
        approverRole: '采集运营',
        approverName: '许明哲',
        decision: 'approved',
        evaluation: { feasibility: 'pass', cost: 'pass', efficiency: 'pass', resourceMatch: 'pass' },
        opinion: '需与物业协同约定高峰时段。',
        actedAt: '2025-03-20T10:00:00+08:00',
      },
      {
        level: 2,
        nodeName: '终审 · 需求批复',
        approverRole: '采集运营 Leader',
        approverName: '胡明宇',
        decision: 'approved',
        evaluation: { feasibility: 'pass', cost: 'pass', efficiency: 'pass', resourceMatch: 'pass' },
        actedAt: '2025-03-20T16:00:00+08:00',
      },
    ],
    linkedTaskIds: ['task-010'],
    progress: 0,
  },
  {
    id: 'req-012',
    title: '舞蹈基础动作动捕教材',
    status: 'submitted',
    dataType: 'motion_capture',
    scene: '舞蹈排练厅',
    device: '动捕套装 M2',
    dataVolume: '约 780 GB',
    deliveryDate: '2025-05-20',
    createdAt: '2025-03-25T11:40:00+08:00',
    description: '面向青少年课程的标准动作分段与节拍对齐。',
    owner: '陈悦',
    requirementGroup: 'CU12-文娱教育',
    priority: 'P2',
    targetType: 'duration',
    targetValue: '30 小时',
    keyRequirements: [
      '节拍对齐误差 < 30ms',
      '标准动作分段颗粒度与教材一致',
    ],
    deviceRequirement: '动捕套装 M2（维护中，需等待上线）',
    annotationRequirement: '节拍对齐质检（ann-009 规范）',
    approvals: [
      {
        level: 1,
        nodeName: '初审 · 可行性与资源',
        approverRole: '采集运营',
        approverName: '许明哲',
        decision: 'pending',
      },
      {
        level: 2,
        nodeName: '终审 · 需求批复',
        approverRole: '采集运营 Leader',
        approverName: '胡明宇',
        decision: 'pending',
      },
    ],
    linkedTaskIds: [],
    progress: 0,
  },
  {
    id: 'req-013',
    title: '充电站插枪遥操作（雨天工况）',
    status: 'approved',
    dataType: 'teleoperation',
    scene: '充电站雨棚试验区',
    device: '双臂遥操作台 A1',
    dataVolume: '约 640 GB',
    deliveryDate: '2025-05-08',
    createdAt: '2025-03-26T09:15:00+08:00',
    description: '湿手/手套两种握持，插拔力曲线与视觉对齐；待拆解为采集单元与标定窗口。',
    owner: '刘桓',
    requirementGroup: 'CU8-移动机器人',
    priority: 'P1',
    targetType: 'count',
    targetValue: '2,400 条',
    keyRequirements: ['雨天工况与干燥基线各半', '插拔峰值力记录完整', '安全联锁全程录像'],
    deviceRequirement: '双臂遥操作台 A1 + 防水工位改造套件',
    annotationRequirement: '插拔阶段分段 + 失败类型（ann-011 草案）',
    sopLink: 'https://sop.example.com/ev-charge-rain-teleop',
    approvals: [
      {
        level: 1,
        nodeName: '初审 · 可行性与资源',
        approverRole: '采集运营',
        approverName: '许明哲',
        decision: 'approved',
        evaluation: { feasibility: 'pass', cost: 'pass', efficiency: 'pass', resourceMatch: 'pass' },
        opinion: '雨棚档期已锁，可进入拆解排期。',
        actedAt: '2025-03-26T10:00:00+08:00',
      },
      {
        level: 2,
        nodeName: '终审 · 需求批复',
        approverRole: '采集运营 Leader',
        approverName: '胡明宇',
        decision: 'approved',
        evaluation: { feasibility: 'pass', cost: 'pass', efficiency: 'pass', resourceMatch: 'pass' },
        opinion: '批准，拆解后走任务调度。',
        actedAt: '2025-03-26T14:30:00+08:00',
      },
    ],
    linkedTaskIds: [],
    progress: 0,
  },
  {
    id: 'req-014',
    title: '家庭餐桌收拾动捕（多餐具碰撞）',
    status: 'approved',
    dataType: 'motion_capture',
    scene: '家庭厨房标准间',
    device: '动捕套装 M3',
    dataVolume: '约 1.2 TB',
    deliveryDate: '2025-05-18',
    createdAt: '2025-03-27T11:00:00+08:00',
    description: '叠盘、收杯、擦桌三类子任务，需拆解为人时窗与场景占用。',
    owner: '张宇航',
    requirementGroup: 'CU6-家庭服务',
    priority: 'P0',
    targetType: 'duration',
    targetValue: '36 小时',
    keyRequirements: ['餐具碰撞声学与骨骼同步', '第三视角无遮挡', '每类子任务 ≥ 8 小时'],
    deviceRequirement: '动捕套装 M3（24 机位标定在有效期内）',
    annotationRequirement: '子任务边界 + 碰撞事件点',
    sopLink: 'https://sop.example.com/dining-cleanup-mocap',
    approvals: [
      {
        level: 1,
        nodeName: '初审 · 可行性与资源',
        approverRole: '采集运营',
        approverName: '许明哲',
        decision: 'approved',
        evaluation: { feasibility: 'pass', cost: 'pass', efficiency: 'pass', resourceMatch: 'pass' },
        actedAt: '2025-03-27T14:00:00+08:00',
      },
      {
        level: 2,
        nodeName: '终审 · 需求批复',
        approverRole: '采集运营 Leader',
        approverName: '胡明宇',
        decision: 'approved',
        evaluation: { feasibility: 'pass', cost: 'pass', efficiency: 'pass', resourceMatch: 'pass' },
        opinion: 'P0，拆解优先。',
        actedAt: '2025-03-27T16:00:00+08:00',
      },
    ],
    linkedTaskIds: [],
    progress: 0,
  },
  {
    id: 'req-015',
    title: '仓储高位货架人体攀爬姿态（安全绳）',
    status: 'approved',
    dataType: 'human_body',
    scene: '仓储分拣区',
    device: '可穿戴惯性套装 W1',
    dataVolume: '约 520 GB',
    deliveryDate: '2025-06-02',
    createdAt: '2025-03-28T08:20:00+08:00',
    description: '攀爬、够取、回身三类姿态，安全员在场；待拆解为受试批次与单次时长单元。',
    owner: '周仁',
    requirementGroup: 'CU5-零售物流',
    priority: 'P2',
    targetType: 'count',
    targetValue: '5,000 条',
    keyRequirements: ['安全绳姿态不打点丢失', '高位 ≥ 2.4m 样本占比 ≥ 25%', '受试者体检证明在有效期内'],
    deviceRequirement: '可穿戴惯性套装 W1 × 3 + 安全员双人岗',
    annotationRequirement: '姿态粗分段 + 疲劳自评量表对齐',
    approvals: [
      {
        level: 1,
        nodeName: '初审 · 可行性与资源',
        approverRole: '采集运营',
        approverName: '许明哲',
        decision: 'approved',
        evaluation: { feasibility: 'pass', cost: 'warn', efficiency: 'pass', resourceMatch: 'pass' },
        opinion: '安全预案已备案。',
        actedAt: '2025-03-28T10:30:00+08:00',
      },
      {
        level: 2,
        nodeName: '终审 · 需求批复',
        approverRole: '采集运营 Leader',
        approverName: '胡明宇',
        decision: 'approved',
        evaluation: { feasibility: 'pass', cost: 'pass', efficiency: 'pass', resourceMatch: 'pass' },
        actedAt: '2025-03-28T15:00:00+08:00',
      },
    ],
    linkedTaskIds: [],
    progress: 0,
  },
];

// ---------------------------------------------------------------------------
// 3. 任务与排期、台本
// ---------------------------------------------------------------------------

export const mockTasks: Task[] = [
  {
    id: 'task-001',
    device: '双臂遥操作台 A1',
    personnel: '陈思远',
    scene: '家庭厨房标准间',
    status: 'in_progress',
    startTime: '2025-03-26T09:00:00+08:00',
    endTime: '2025-03-26T12:00:00+08:00',
    type: '遥操作采集',
    requirementId: 'req-001',
    personnelId: 'per-001',
    deviceId: 'dev-001',
    sceneId: 'scene-001',
    scriptId: 'task-001',
    priority: 'high',
  },
  {
    id: 'task-002',
    device: '动捕套装 M3',
    personnel: '林婉清',
    scene: '商超仿真卖场',
    status: 'completed',
    startTime: '2025-03-25T14:00:00+08:00',
    endTime: '2025-03-25T18:30:00+08:00',
    type: '动捕采集',
    requirementId: 'req-003',
    personnelId: 'per-002',
    deviceId: 'dev-004',
    sceneId: 'scene-003',
    priority: 'high',
  },
  {
    id: 'task-003',
    device: '人形机器人 H2',
    personnel: '赵子墨',
    scene: '室内外过渡区',
    status: 'scheduled',
    startTime: '2025-03-26T13:30:00+08:00',
    endTime: '2025-03-26T17:00:00+08:00',
    type: '遥操作采集',
    requirementId: 'req-004',
    personnelId: 'per-003',
    deviceId: 'dev-006',
    sceneId: 'scene-004',
    scriptId: 'task-003',
    priority: 'high',
  },
  {
    id: 'task-004',
    device: '可穿戴惯性套装 W1',
    personnel: '周若彤',
    scene: '装配工位线体',
    status: 'to_schedule',
    startTime: '2025-03-27T08:30:00+08:00',
    endTime: '2025-03-27T11:30:00+08:00',
    type: '人体数据采集',
    personnelId: 'per-004',
    deviceId: 'dev-007',
    sceneId: 'scene-002',
    priority: 'medium',
    blockReason: '孤儿任务：未关联明确需求，需补录',
  },
  {
    id: 'task-005',
    device: '移动底盘 C1',
    personnel: '韩博文',
    scene: '仓储分拣区',
    status: 'to_schedule',
    startTime: '2025-03-25T10:00:00+08:00',
    endTime: '2025-03-25T16:00:00+08:00',
    type: '协同调度测试',
    requirementId: 'req-006',
    personnelId: 'per-005',
    deviceId: 'dev-008',
    sceneId: 'scene-006',
    priority: 'medium',
    blockReason: 'AGV 定位跳变导致会话中止，待修复后重排',
  },
  {
    id: 'task-006',
    device: '双臂遥操作台 A2',
    personnel: '沈佳怡',
    scene: '防静电工作台',
    status: 'completed',
    startTime: '2025-03-24T09:00:00+08:00',
    endTime: '2025-03-24T15:00:00+08:00',
    type: '遥操作采集',
    requirementId: 'req-007',
    personnelId: 'per-006',
    deviceId: 'dev-002',
    sceneId: 'scene-007',
    priority: 'medium',
  },
  {
    id: 'task-007',
    device: '动捕套装 M3',
    personnel: '林婉清',
    scene: '体育馆多功能场地',
    status: 'in_progress',
    startTime: '2025-03-26T08:00:00+08:00',
    endTime: '2025-03-26T11:00:00+08:00',
    type: '动捕采集',
    requirementId: 'req-009',
    personnelId: 'per-002',
    deviceId: 'dev-004',
    sceneId: 'scene-009',
    scriptId: 'task-007',
    priority: 'medium',
    blockReason: 'qa-004 打回：高速模糊自动关键点失败，待补拍方案',
  },
  {
    id: 'task-008',
    device: '柔性传感衣 S2',
    personnel: '何雨桐',
    scene: '康复训练室',
    status: 'closed',
    startTime: '2025-03-26T10:00:00+08:00',
    endTime: '2025-03-26T12:00:00+08:00',
    type: '人体数据采集',
    personnelId: 'per-007',
    deviceId: 'dev-005',
    sceneId: 'scene-005',
    priority: 'low',
    blockReason: '场景 scene-005 维护中，任务取消',
  },
  {
    id: 'task-009',
    device: '移动机械臂 R1',
    personnel: '邓宇航',
    scene: '温室大棚示范区',
    status: 'completed',
    startTime: '2025-03-22T07:00:00+08:00',
    endTime: '2025-03-22T12:00:00+08:00',
    type: '遥操作采集',
    requirementId: 'req-010',
    personnelId: 'per-008',
    deviceId: 'dev-009',
    sceneId: 'scene-010',
    priority: 'low',
  },
  {
    id: 'task-010',
    device: '深度相机 + W1',
    personnel: '蒋心怡',
    scene: '写字楼电梯厅',
    status: 'scheduled',
    startTime: '2025-03-27T17:00:00+08:00',
    endTime: '2025-03-27T19:30:00+08:00',
    type: '人体数据采集',
    requirementId: 'req-011',
    personnelId: 'per-009',
    deviceId: 'dev-010',
    sceneId: 'scene-011',
    priority: 'medium',
  },
  {
    id: 'task-011',
    device: '动捕套装 M2',
    personnel: '罗嘉诚',
    scene: '舞蹈排练厅',
    status: 'to_schedule',
    startTime: '2025-03-28T14:00:00+08:00',
    endTime: '2025-03-28T18:00:00+08:00',
    type: '动捕采集',
    personnelId: 'per-010',
    deviceId: 'dev-003',
    sceneId: 'scene-012',
    priority: 'low',
    blockReason: '设备 M2 维护中，装置未就绪',
  },
  {
    id: 'task-012',
    device: '多相机阵列 + W1',
    personnel: '许明哲',
    scene: '交通枢纽大厅',
    status: 'to_schedule',
    startTime: '2025-04-01T09:00:00+08:00',
    endTime: '2025-04-01T18:00:00+08:00',
    type: '人体数据采集',
    personnelId: 'per-011',
    deviceId: 'dev-007',
    sceneId: 'scene-008',
    priority: 'low',
    blockReason: '场景 scene-008 尚未开放，需求 req-008 已驳回',
  },
];

export const mockTaskSchedule: TaskScheduleSlot[] = [
  { taskId: 'task-001', startTime: '2025-03-26T09:00:00+08:00', endTime: '2025-03-26T12:00:00+08:00', sceneId: 'scene-001', priority: 'high' },
  { taskId: 'task-003', startTime: '2025-03-26T13:30:00+08:00', endTime: '2025-03-26T17:00:00+08:00', sceneId: 'scene-004', priority: 'high' },
  { taskId: 'task-007', startTime: '2025-03-26T08:00:00+08:00', endTime: '2025-03-26T11:00:00+08:00', sceneId: 'scene-009', priority: 'medium' },
  { taskId: 'task-004', startTime: '2025-03-27T08:30:00+08:00', endTime: '2025-03-27T11:30:00+08:00', sceneId: 'scene-002', priority: 'medium' },
  { taskId: 'task-010', startTime: '2025-03-27T17:00:00+08:00', endTime: '2025-03-27T19:30:00+08:00', sceneId: 'scene-011', priority: 'low' },
  { taskId: 'task-011', startTime: '2025-03-28T14:00:00+08:00', endTime: '2025-03-28T18:00:00+08:00', sceneId: 'scene-012', priority: 'low' },
  { taskId: 'task-002', startTime: '2025-03-25T14:00:00+08:00', endTime: '2025-03-25T18:30:00+08:00', sceneId: 'scene-003', priority: 'high' },
  { taskId: 'task-006', startTime: '2025-03-24T09:00:00+08:00', endTime: '2025-03-24T15:00:00+08:00', sceneId: 'scene-007', priority: 'medium' },
];

export const mockTaskScripts: TaskScript[] = [
  {
    taskId: 'task-001',
    title: '台本：厨房抽屉开合与餐具归位',
    scheduledTime: '2025-03-26T09:00:00+08:00',
    personnelIds: ['per-001'],
    deviceIds: ['dev-001'],
    steps: [
      { order: 1, operation: '标定起始位姿，确认力控阈值', durationMinutes: 10 },
      { order: 2, operation: '拉开抽屉至全开，停顿 2s', durationMinutes: 5 },
      { order: 3, operation: '抓取汤勺放入分隔盒', durationMinutes: 15 },
      { order: 4, operation: '推回抽屉，确认闭合到位', durationMinutes: 5 },
      { order: 5, operation: '第三视角镜头巡检与数据封包', durationMinutes: 15 },
    ],
  },
  {
    taskId: 'task-003',
    title: '台本：门槛跨越（15cm 木质）',
    scheduledTime: '2025-03-26T13:30:00+08:00',
    personnelIds: ['per-003'],
    deviceIds: ['dev-006'],
    steps: [
      { order: 1, operation: '双足站立标定，检查 IMU 温漂', durationMinutes: 12 },
      { order: 2, operation: '正向跨越 ×5 次', durationMinutes: 25 },
      { order: 3, operation: '侧向跨越 ×5 次', durationMinutes: 25 },
      { order: 4, operation: '失败样本刻意采集（受控）', durationMinutes: 20, notes: '需安全员在场' },
    ],
  },
  {
    taskId: 'task-007',
    title: '台本：乒乓球正手连续攻球',
    scheduledTime: '2025-03-26T08:00:00+08:00',
    personnelIds: ['per-002'],
    deviceIds: ['dev-004'],
    steps: [
      { order: 1, operation: '热身与骨骼绑定检查', durationMinutes: 15 },
      { order: 2, operation: '定点喂球机节奏 80/min', durationMinutes: 30 },
      { order: 3, operation: '移动中攻球（半场）', durationMinutes: 35 },
    ],
  },
];

// ---------------------------------------------------------------------------
// 4. 设备
// ---------------------------------------------------------------------------

export const mockDevices: Device[] = [
  { id: 'dev-001', name: '双臂遥操作台 A1', type: '遥操作主站', status: 'available', healthStatus: 'healthy', lastMaintenance: '2025-03-10', nextMaintenanceAt: '2025-04-10', nextCalibrationAt: '2025-04-05', location: '实验室 A 区' },
  { id: 'dev-002', name: '双臂遥操作台 A2', type: '遥操作主站', status: 'available', healthStatus: 'warning', lastMaintenance: '2025-02-28', nextMaintenanceAt: '2025-03-30', nextCalibrationAt: '2025-03-28', location: '实验室 A 区' },
  { id: 'dev-003', name: '动捕套装 M2', type: '光学动捕', status: 'unavailable', healthStatus: 'maintenance', lastMaintenance: '2025-03-25', nextMaintenanceAt: '2025-04-02', nextCalibrationAt: '2025-04-02', location: '动捕棚 1' },
  { id: 'dev-004', name: '动捕套装 M3', type: '光学动捕', status: 'available', healthStatus: 'healthy', lastMaintenance: '2025-03-18', nextMaintenanceAt: '2025-04-18', nextCalibrationAt: '2025-04-12', location: '动捕棚 2' },
  { id: 'dev-005', name: '柔性传感衣 S2', type: '可穿戴', status: 'available', healthStatus: 'healthy', lastMaintenance: '2025-03-20', nextMaintenanceAt: '2025-04-20', nextCalibrationAt: '2025-04-08', location: '康复场景配套间' },
  { id: 'dev-006', name: '人形机器人 H2', type: '人形机器人', status: 'available', healthStatus: 'warning', lastMaintenance: '2025-03-22', nextMaintenanceAt: '2025-04-01', nextCalibrationAt: '2025-03-29', location: '过渡区测试道' },
  { id: 'dev-007', name: '可穿戴惯性套装 W1', type: '可穿戴', status: 'available', healthStatus: 'healthy', lastMaintenance: '2025-03-15', nextMaintenanceAt: '2025-04-15', nextCalibrationAt: '2025-04-10', location: '人体数据工位' },
  { id: 'dev-008', name: '移动底盘 C1', type: 'AGV', status: 'unavailable', healthStatus: 'critical', lastMaintenance: '2025-03-24', nextMaintenanceAt: '2025-03-27', location: '仓储分拣区' },
  { id: 'dev-009', name: '移动机械臂 R1', type: '移动操纵', status: 'available', healthStatus: 'healthy', lastMaintenance: '2025-03-08', nextMaintenanceAt: '2025-04-08', nextCalibrationAt: '2025-04-06', location: '农业示范大棚' },
  { id: 'dev-010', name: '深度相机阵列 D4', type: '感知套件', status: 'available', healthStatus: 'healthy', lastMaintenance: '2025-03-12', nextMaintenanceAt: '2025-04-12', nextCalibrationAt: '2025-04-01', location: '电梯厅布设点' },
  { id: 'dev-011', name: '边缘采集网关 G2', type: '网络设备', status: 'available', healthStatus: 'healthy', lastMaintenance: '2025-03-01', nextMaintenanceAt: '2025-06-01', location: '机房机柜 R3' },
  { id: 'dev-012', name: '备份磁带库 T1', type: '存储', status: 'available', healthStatus: 'warning', lastMaintenance: '2025-02-15', nextMaintenanceAt: '2025-05-15', location: '异地灾备中心' },
];

// ---------------------------------------------------------------------------
// 5. 人员
// ---------------------------------------------------------------------------

export const mockPersonnel: Personnel[] = [
  {
    id: 'per-001',
    name: '陈思远',
    role: '遥操作员',
    status: 'busy',
    skills: ['双臂遥操作', '力控微调', '厨房长序列'],
    skillRatings: [
      { skill: '双臂遥操作', level: 3 },
      { skill: '力控微调', level: 3 },
      { skill: '厨房长序列', level: 2 },
    ],
    schedule: [
      { date: '2025-03-26', startTime: '09:00', endTime: '12:00', taskId: 'task-001', label: '厨房抽屉台本' },
      { date: '2025-03-27', startTime: '14:00', endTime: '17:00', taskId: 'task-001', label: '厨房补拍（预留）' },
    ],
  },
  {
    id: 'per-002',
    name: '林婉清',
    role: '动捕演员',
    status: 'busy',
    skills: ['体育类动作', '高强度连续动作'],
    skillRatings: [
      { skill: '体育类动作', level: 3 },
      { skill: '高强度连续动作', level: 2 },
    ],
    schedule: [
      { date: '2025-03-26', startTime: '08:00', endTime: '11:00', taskId: 'task-007', label: '乒乓球攻球' },
      { date: '2025-03-25', startTime: '14:00', endTime: '18:30', taskId: 'task-002', label: '商超拣货' },
    ],
  },
  {
    id: 'per-003',
    name: '赵子墨',
    role: '遥操作员',
    status: 'available',
    skills: ['人形机器人', '步态与越障'],
    skillRatings: [
      { skill: '人形机器人', level: 2 },
      { skill: '步态与越障', level: 3 },
    ],
    schedule: [
      { date: '2025-03-26', startTime: '13:30', endTime: '17:00', taskId: 'task-003', label: '门槛跨越' },
    ],
  },
  {
    id: 'per-004',
    name: '周若彤',
    role: '数据采集员',
    status: 'available',
    skills: ['工效学', '可穿戴标定'],
    skillRatings: [
      { skill: '工效学', level: 2 },
      { skill: '可穿戴标定', level: 3 },
    ],
    schedule: [{ date: '2025-03-27', startTime: '08:30', endTime: '11:30', taskId: 'task-004', label: '拧螺丝人体工效' }],
  },
  {
    id: 'per-005',
    name: '韩博文',
    role: '现场调度',
    status: 'busy',
    skills: ['多机协同', '安全预案'],
    skillRatings: [
      { skill: '多机协同', level: 3 },
      { skill: '安全预案', level: 2 },
    ],
    schedule: [{ date: '2025-03-25', startTime: '10:00', endTime: '16:00', taskId: 'task-005', label: 'AGV 协同（延期）' }],
  },
  {
    id: 'per-006',
    name: '沈佳怡',
    role: '遥操作员',
    status: 'available',
    skills: ['精密装配', '低力矩任务'],
    skillRatings: [
      { skill: '精密装配', level: 3 },
      { skill: '低力矩任务', level: 2 },
    ],
    schedule: [{ date: '2025-03-24', startTime: '09:00', endTime: '15:00', taskId: 'task-006', label: 'FPC 插拔' }],
  },
  {
    id: 'per-007',
    name: '何雨桐',
    role: '康复辅具专员',
    status: 'available',
    skills: ['康复流程', '伦理合规'],
    skillRatings: [
      { skill: '康复流程', level: 3 },
      { skill: '伦理合规', level: 2 },
    ],
    schedule: [],
  },
  {
    id: 'per-008',
    name: '邓宇航',
    role: '农业场景技师',
    status: 'available',
    skills: ['户外设备', '移动臂维护'],
    skillRatings: [
      { skill: '户外设备', level: 3 },
      { skill: '移动臂维护', level: 2 },
    ],
    schedule: [{ date: '2025-03-22', startTime: '07:00', endTime: '12:00', taskId: 'task-009', label: '大棚修剪' }],
  },
  {
    id: 'per-009',
    name: '蒋心怡',
    role: '人体数据采集员',
    status: 'available',
    skills: ['多相机同步', '隐私脱敏'],
    skillRatings: [
      { skill: '多相机同步', level: 3 },
      { skill: '隐私脱敏', level: 2 },
    ],
    schedule: [{ date: '2025-03-27', startTime: '17:00', endTime: '19:30', taskId: 'task-010', label: '电梯厅进出' }],
  },
  {
    id: 'per-010',
    name: '罗嘉诚',
    role: '动捕演员',
    status: 'available',
    skills: ['舞蹈基础', '节拍对齐'],
    skillRatings: [
      { skill: '舞蹈基础', level: 3 },
      { skill: '节拍对齐', level: 2 },
    ],
    schedule: [{ date: '2025-03-28', startTime: '14:00', endTime: '18:00', taskId: 'task-011', label: '舞蹈教材' }],
  },
  {
    id: 'per-011',
    name: '许明哲',
    role: '项目经理',
    status: 'busy',
    skills: ['排期', '跨部门沟通'],
    skillRatings: [
      { skill: '排期', level: 3 },
      { skill: '跨部门沟通', level: 3 },
    ],
    schedule: [{ date: '2025-04-01', startTime: '09:00', endTime: '18:00', taskId: 'task-012', label: '枢纽大厅预演' }],
  },
  {
    id: 'per-012',
    name: '丁雪儿',
    role: '质检工程师',
    status: 'available',
    skills: ['数据抽检', '自动检测规则'],
    skillRatings: [
      { skill: '数据抽检', level: 3 },
      { skill: '自动检测规则', level: 2 },
    ],
    schedule: [{ date: '2025-03-26', startTime: '15:00', endTime: '18:00', taskId: 'ann-004', label: '标注抽检会议' }],
  },
];

// ---------------------------------------------------------------------------
// 6. 场景
// ---------------------------------------------------------------------------

export const mockScenes: Scene[] = [
  { id: 'scene-001', name: '家庭厨房标准间', industry: '生活服务', type: '家庭服务', sceneSubtype: '标准成套厨房', status: 'active', location: 'B 栋 2 层', description: '标准化橱柜、灶具与常见餐具，支持多机位与力控遥操作。' },
  { id: 'scene-002', name: '装配工位线体', industry: '制造与工业', type: '工业制造', sceneSubtype: '线体单工位', status: 'active', location: 'C 栋产线模拟区', description: '螺丝工位、治具与工具车，适合工效与协作数据采集。' },
  { id: 'scene-003', name: '商超仿真卖场', industry: '零售与物流', type: '零售物流', sceneSubtype: '卖场拣选动线', status: 'active', location: 'D 栋大空间', description: '货架、推车与收银mock，动捕覆盖率高。' },
  { id: 'scene-004', name: '室内外过渡区', industry: '移动机器人', type: '移动机器人', sceneSubtype: '门槛与坡道组合', status: 'active', location: '户外连廊', description: '多种门槛与坡度组合，天气可控半开放。' },
  { id: 'scene-005', name: '康复训练室', industry: '医疗康复', type: '医疗康复', sceneSubtype: '步态与辅具', status: 'maintenance', location: 'E 栋 1 层', description: '平行杠、助行器；本周地胶更换中。' },
  { id: 'scene-006', name: '仓储分拣区', industry: '零售与物流', type: '物流仓储', sceneSubtype: 'AGV 拣选通道', status: 'active', location: '自动化仓模拟', description: 'AGV 通道、拣选站与异常口。' },
  { id: 'scene-007', name: '防静电工作台', industry: '制造与工业', type: '电子精密', sceneSubtype: '洁净间工位', status: 'active', location: '洁净间 2', description: '离子风机、显微镜工位。' },
  { id: 'scene-008', name: '交通枢纽大厅', industry: '出行与公共空间', type: '公共场景', sceneSubtype: '大客流通廊', status: 'inactive', location: '联合实验基地', description: '审批通过后开放采集，当前仅勘景。' },
  { id: 'scene-009', name: '体育馆多功能场地', industry: '文体教育', type: '体育训练', sceneSubtype: '球类半场布置', status: 'active', location: '综合馆', description: '羽毛球/乒乓球快速切换布置。' },
  { id: 'scene-010', name: '温室大棚示范区', industry: '农业与环境', type: '农业', sceneSubtype: '高湿温室', status: 'active', location: '南侧试验田', description: '湿度大，设备需每日烘干。' },
  { id: 'scene-011', name: '写字楼电梯厅', industry: '出行与公共空间', type: '公共场景', sceneSubtype: '电梯厅进出', status: 'active', location: '合作物业场地', description: '高峰时段需物业协同。' },
  { id: 'scene-012', name: '舞蹈排练厅', industry: '文体教育', type: '文娱教育', sceneSubtype: '镜面排练厅', status: 'active', location: '艺术中心分馆', description: '镜面墙、把杆与地胶维护良好。' },
];

// ---------------------------------------------------------------------------
// 7. 采集会话与传输
// ---------------------------------------------------------------------------

export const mockCollectionSessions: CollectionSession[] = [
  { id: 'col-001', device: '双臂遥操作台 A1', status: 'collecting', progress: 62, startTime: '2025-03-26T09:05:00+08:00', dataSize: '184 GB', anomalies: [] },
  { id: 'col-002', device: '动捕套装 M3', status: 'collecting', progress: 45, startTime: '2025-03-26T08:02:00+08:00', dataSize: '96 GB', anomalies: ['相机 #4 短暂丢帧 0.3s'] },
  { id: 'col-003', device: '人形机器人 H2', status: 'idle', progress: 0, startTime: '2025-03-26T07:30:00+08:00', dataSize: '0 GB', anomalies: [] },
  { id: 'col-004', device: '可穿戴惯性套装 W1', status: 'paused', progress: 38, startTime: '2025-03-25T16:10:00+08:00', dataSize: '52 GB', anomalies: ['受试者休息'] },
  { id: 'col-005', device: '移动底盘 C1', status: 'failed', progress: 12, startTime: '2025-03-25T10:05:00+08:00', dataSize: '8 GB', anomalies: ['定位跳变，会话中止'] },
  { id: 'col-006', device: '双臂遥操作台 A2', status: 'completed', progress: 100, startTime: '2025-03-24T09:00:00+08:00', dataSize: '312 GB', anomalies: [] },
  { id: 'col-007', device: '动捕套装 M3', status: 'completed', progress: 100, startTime: '2025-03-25T14:00:00+08:00', dataSize: '428 GB', anomalies: ['补录片段 2 段'] },
  { id: 'col-008', device: '深度相机阵列 D4', status: 'collecting', progress: 71, startTime: '2025-03-26T06:00:00+08:00', dataSize: '220 GB', anomalies: [] },
  { id: 'col-009', device: '移动机械臂 R1', status: 'completed', progress: 100, startTime: '2025-03-22T07:10:00+08:00', dataSize: '165 GB', anomalies: [] },
  { id: 'col-010', device: '柔性传感衣 S2', status: 'idle', progress: 0, startTime: '2025-03-26T10:00:00+08:00', dataSize: '0 GB', anomalies: ['任务取消'] },
  { id: 'col-011', device: '动捕套装 M2', status: 'idle', progress: 0, startTime: '', dataSize: '0 GB', anomalies: ['设备维护中'] },
  { id: 'col-012', device: '边缘采集网关 G2', status: 'collecting', progress: 88, startTime: '2025-03-26T00:00:00+08:00', dataSize: '聚合 1.02 TB', anomalies: [] },
];

export const mockTransmissionRecords: TransmissionRecord[] = [
  { id: 'tx-001', sessionId: 'col-001', destination: '中心对象存储 /embodied/raw', state: 'syncing', progress: 58, startedAt: '2025-03-26T09:30:00+08:00' },
  { id: 'tx-002', sessionId: 'col-007', destination: '标注预处理队列', state: 'synced', progress: 100, startedAt: '2025-03-25T19:00:00+08:00' },
  { id: 'tx-003', sessionId: 'col-005', destination: '中心对象存储 /embodied/raw', state: 'failed', progress: 12, startedAt: '2025-03-25T10:30:00+08:00', anomaly: '校验失败，待人工重传' },
  { id: 'tx-004', sessionId: 'col-008', destination: '边缘缓冲池', state: 'syncing', progress: 74, startedAt: '2025-03-26T06:15:00+08:00' },
  { id: 'tx-005', sessionId: 'col-012', destination: '异地灾备', state: 'queued', progress: 0, startedAt: '2025-03-26T10:00:00+08:00' },
  { id: 'tx-006', sessionId: 'col-006', destination: '中心对象存储 /embodied/raw', state: 'synced', progress: 100, startedAt: '2025-03-24T16:00:00+08:00' },
  { id: 'tx-007', sessionId: 'col-002', destination: '实时质检流', state: 'syncing', progress: 33, startedAt: '2025-03-26T08:30:00+08:00' },
  { id: 'tx-008', sessionId: 'col-009', destination: '中心对象存储 /embodied/raw', state: 'synced', progress: 100, startedAt: '2025-03-22T13:00:00+08:00' },
  { id: 'tx-009', sessionId: 'col-004', destination: '中心对象存储 /embodied/raw', state: 'offline', progress: 0, startedAt: '2025-03-25T17:00:00+08:00', anomaly: '采集暂停，传输挂起' },
  { id: 'tx-010', sessionId: 'col-003', destination: '中心对象存储 /embodied/raw', state: 'queued', progress: 0, startedAt: '' },
];

export const collectionTransmissionSummary = {
  onlineRatePercent: 94.2,
  activeSessions: 5,
  syncingCount: 4,
  failedLast24h: 2,
  avgProgressPercent: 56.8,
} as const;

// ---------------------------------------------------------------------------
// 8. 数据处理流水线阶段
// ---------------------------------------------------------------------------

export const mockPipelineStages: PipelineStage[] = [
  { name: '原始数据入库', status: 'completed', count: 1284, duration: '2.3h', datasetId: 'ds-001' },
  { name: '多模态对齐', status: 'completed', count: 1284, duration: '5.1h', datasetId: 'ds-001' },
  { name: '粗剪与分段', status: 'completed', count: 1188, duration: '3.8h', datasetId: 'ds-001' },
  { name: 'Clip 生成', status: 'running', count: 980, duration: '进行中', datasetId: 'ds-001' },
  { name: '标注任务派发', status: 'pending', count: 0, duration: '—', datasetId: 'ds-001' },
  { name: '归档存储', status: 'pending', count: 0, duration: '—', datasetId: 'ds-001' },
  { name: '原始数据入库', status: 'completed', count: 642, duration: '1.1h', datasetId: 'ds-004' },
  { name: '多模态对齐', status: 'running', count: 410, duration: '进行中', datasetId: 'ds-004' },
  { name: '粗剪与分段', status: 'pending', count: 0, duration: '—', datasetId: 'ds-004' },
  { name: 'Clip 生成', status: 'pending', count: 0, duration: '—', datasetId: 'ds-004' },
  { name: '标注任务派发', status: 'skipped', count: 0, duration: '—', datasetId: 'ds-004' },
  { name: '归档存储', status: 'pending', count: 0, duration: '—', datasetId: 'ds-004' },
];

// ---------------------------------------------------------------------------
// 9. 标注任务
// ---------------------------------------------------------------------------

export const mockAnnotationTasks: AnnotationTask[] = [
  { id: 'ann-001', dataset: '商超拣货动捕基准库 v1.2', status: 'completed', assignee: '标注一组', progress: 100, type: '骨骼关键点' },
  { id: 'ann-002', dataset: '厨房遥操作长序列 v0.9', status: 'in-progress', assignee: '标注二组', progress: 67, type: '操作语义分段' },
  { id: 'ann-003', dataset: '门槛跨越人形机 v0.4', status: 'not-started', assignee: '未分配', progress: 0, type: '失败原因标签' },
  { id: 'ann-004', dataset: '乒乓球动捕高速 v0.1', status: 'in-progress', assignee: '标注三组', progress: 24, type: '击球事件点' },
  { id: 'ann-005', dataset: '电梯厅人体流 v0.2', status: 'not-started', assignee: '标注一组', progress: 0, type: '轨迹匿名化抽检' },
  { id: 'ann-006', dataset: '拧螺丝工效 v0.3', status: 'completed', assignee: '标注四组', progress: 100, type: '关节角度区间' },
  { id: 'ann-007', dataset: '双机协同搬运 v0.5', status: 'in-progress', assignee: '标注二组', progress: 41, type: '角色交互关系' },
  { id: 'ann-008', dataset: '大棚修剪遥操作 v1.0', status: 'completed', assignee: '标注一组', progress: 100, type: '工具接触状态' },
  { id: 'ann-009', dataset: '舞蹈基础动作 v0.1', status: 'not-started', assignee: '未分配', progress: 0, type: '节拍对齐质检' },
  { id: 'ann-010', dataset: 'FPC 插拔精密 v1.1', status: 'completed', assignee: '标注三组', progress: 100, type: '微米级结果判定' },
  { id: 'ann-011', dataset: '仓储分拣场景 v0.8', status: 'in-progress', assignee: '标注四组', progress: 55, type: '货位与 SKU 框' },
  { id: 'ann-012', dataset: '装配线人体 v0.6', status: 'not-started', assignee: '标注二组', progress: 0, type: '疲劳状态粗标签' },
];

// ---------------------------------------------------------------------------
// 10. 数据质量
// ---------------------------------------------------------------------------

export const mockQualityResults: QualityResult[] = [
  { id: 'qa-001', dataset: '商超拣货动捕基准库 v1.2', passRate: 96.4, issues: ['2 段骨骼脚滑移'], checkTime: '2025-03-25T22:10:00+08:00' },
  { id: 'qa-002', dataset: '厨房遥操作长序列 v0.9', passRate: 88.7, issues: ['力矩标定漂移 3 次', '第三视角遮挡'], checkTime: '2025-03-26T07:40:00+08:00' },
  { id: 'qa-003', dataset: '门槛跨越人形机 v0.4', passRate: 91.2, issues: ['单足支撑帧不足'], checkTime: '2025-03-24T18:00:00+08:00' },
  { id: 'qa-004', dataset: '乒乓球动捕高速 v0.1', passRate: 82.5, issues: ['高速模糊导致自动关键点失败'], checkTime: '2025-03-26T08:05:00+08:00' },
  { id: 'qa-005', dataset: '电梯厅人体流 v0.2', passRate: 97.1, issues: [], checkTime: '2025-03-23T09:30:00+08:00' },
  { id: 'qa-006', dataset: '拧螺丝工效 v0.3', passRate: 94.0, issues: ['1 名受试者传感器松动'], checkTime: '2025-03-22T15:20:00+08:00' },
  { id: 'qa-007', dataset: '双机协同搬运 v0.5', passRate: 86.3, issues: ['时间轴偏差 >40ms 片段'], checkTime: '2025-03-26T06:50:00+08:00' },
  { id: 'qa-008', dataset: '大棚修剪遥操作 v1.0', passRate: 98.2, issues: ['雨天噪声略高'], checkTime: '2025-03-22T20:00:00+08:00' },
  { id: 'qa-009', dataset: '舞蹈基础动作 v0.1', passRate: 0, issues: ['尚未开始自动检测'], checkTime: '2025-03-25T12:00:00+08:00' },
  { id: 'qa-010', dataset: 'FPC 插拔精密 v1.1', passRate: 99.1, issues: ['1 段触觉基线异常'], checkTime: '2025-03-24T10:00:00+08:00' },
  { id: 'qa-011', dataset: '仓储分拣场景 v0.8', passRate: 90.5, issues: ['AGV 激光反光条干扰'], checkTime: '2025-03-26T09:00:00+08:00' },
  { id: 'qa-012', dataset: '装配线人体 v0.6', passRate: 93.3, issues: ['工位间串扰 Wi-Fi'], checkTime: '2025-03-21T17:45:00+08:00' },
];

export const dataQualityOverview = {
  overallPassRate: 92.6,
  autoDetectionRuns24h: 48,
  criticalIssuesOpen: 3,
  resolvedYesterday: 7,
  topIssueCategories: [
    { label: '时间同步', count: 12 },
    { label: '遮挡与丢帧', count: 9 },
    { label: '传感器漂移', count: 6 },
    { label: '标定残留误差', count: 4 },
  ],
} as const;

// ---------------------------------------------------------------------------
// 11. 数据发布（数据集）
// ---------------------------------------------------------------------------

export const mockDatasets: Dataset[] = [
  { id: 'ds-001', name: '商超拣货动捕基准库', version: 'v1.2', size: '5.1 TB', status: 'published', createdAt: '2025-03-20T00:00:00+08:00', records: 482000 },
  { id: 'ds-002', name: '厨房遥操作长序列', version: 'v0.9', size: '2.1 TB', status: 'reviewing', createdAt: '2025-03-18T00:00:00+08:00', records: 128400 },
  { id: 'ds-003', name: '门槛跨越人形机', version: 'v0.4', size: '640 GB', status: 'draft', createdAt: '2025-03-24T00:00:00+08:00', records: 31200 },
  { id: 'ds-004', name: '乒乓球动捕高速', version: 'v0.1', size: '380 GB', status: 'draft', createdAt: '2025-03-26T00:00:00+08:00', records: 18600 },
  { id: 'ds-005', name: '电梯厅人体流', version: 'v0.2', size: '1.2 TB', status: 'reviewing', createdAt: '2025-03-23T00:00:00+08:00', records: 95000 },
  { id: 'ds-006', name: '拧螺丝工效', version: 'v0.3', size: '860 GB', status: 'published', createdAt: '2025-03-22T00:00:00+08:00', records: 72400 },
  { id: 'ds-007', name: '双机协同搬运', version: 'v0.5', size: '2.8 TB', status: 'reviewing', createdAt: '2025-03-25T00:00:00+08:00', records: 201000 },
  { id: 'ds-008', name: '大棚修剪遥操作', version: 'v1.0', size: '1.5 TB', status: 'published', createdAt: '2025-03-10T00:00:00+08:00', records: 55800 },
  { id: 'ds-009', name: '舞蹈基础动作', version: 'v0.1', size: '120 GB', status: 'draft', createdAt: '2025-03-25T00:00:00+08:00', records: 8900 },
  { id: 'ds-010', name: 'FPC 插拔精密', version: 'v1.1', size: '980 GB', status: 'published', createdAt: '2025-03-18T00:00:00+08:00', records: 67200 },
  { id: 'ds-011', name: '仓储分拣场景', version: 'v0.8', size: '3.4 TB', status: 'reviewing', createdAt: '2025-03-26T00:00:00+08:00', records: 143500 },
  { id: 'ds-012', name: '装配线人体', version: 'v0.6', size: '1.0 TB', status: 'deprecated', createdAt: '2025-03-21T00:00:00+08:00', records: 61000 },
];

// ---------------------------------------------------------------------------
// 12. 监控图表数据
// ---------------------------------------------------------------------------

export const monitoringCharts: MonitoringCharts = {
  dataVolumeTrend: [
    { label: '3/15', value: 210, value2: 198 },
    { label: '3/16', value: 232, value2: 220 },
    { label: '3/17', value: 248, value2: 235 },
    { label: '3/18', value: 265, value2: 251 },
    { label: '3/19', value: 281, value2: 268 },
    { label: '3/20', value: 302, value2: 288 },
    { label: '3/21', value: 318, value2: 299 },
    { label: '3/22', value: 336, value2: 310 },
    { label: '3/23', value: 351, value2: 322 },
    { label: '3/24', value: 368, value2: 340 },
    { label: '3/25', value: 386, value2: 355 },
    { label: '3/26', value: 402, value2: 371 },
  ],
  taskCompletionTrend: [
    { label: '3/15', value: 78 },
    { label: '3/16', value: 80 },
    { label: '3/17', value: 79 },
    { label: '3/18', value: 82 },
    { label: '3/19', value: 83 },
    { label: '3/20', value: 85 },
    { label: '3/21', value: 84 },
    { label: '3/22', value: 86 },
    { label: '3/23', value: 87 },
    { label: '3/24', value: 88 },
    { label: '3/25', value: 87 },
    { label: '3/26', value: 89 },
  ],
  deviceUtilizationTrend: [
    { label: '周一', value: 72 },
    { label: '周二', value: 75 },
    { label: '周三', value: 78 },
    { label: '周四', value: 81 },
    { label: '周五', value: 84 },
    { label: '周六', value: 76 },
    { label: '周日', value: 70 },
  ],
  anomalyStatistics: [
    { label: '传输', value: 14 },
    { label: '设备', value: 9 },
    { label: '标定', value: 6 },
    { label: '标注', value: 4 },
    { label: '存储', value: 3 },
    { label: '权限', value: 2 },
    { label: '其他', value: 5 },
  ],
};

// ---------------------------------------------------------------------------
// 13. 一键问题提报
// ---------------------------------------------------------------------------

export const mockIssueReports: IssueReport[] = [
  {
    id: 'issue-001',
    source: 'task-workbench',
    status: 'processing',
    severity: 'high',
    title: 'AGV 定位漂移导致任务延期',
    description: 'task-005 在仓储分拣区出现定位跳变，建议优先处理底盘编码器和地图重建。',
    taskId: 'task-005',
    requirementId: 'req-006',
    reporter: '韩博文',
    reportedAt: '2025-03-25T15:40:00+08:00',
  },
  {
    id: 'issue-002',
    source: 'collection-app',
    status: 'open',
    severity: 'medium',
    title: '动捕相机 #4 短时丢帧',
    description: '采集员在 App 端上报，建议检查网线接触和相机时钟同步。',
    sessionId: 'col-002',
    reporter: '林婉清',
    reportedAt: '2025-03-26T08:36:00+08:00',
  },
];

/** 汇总导出，便于一次性注入演示页 */
export const mockDataBundle = {
  dashboardStats,
  mockRequirements,
  mockTasks,
  mockTaskSchedule,
  mockTaskScripts,
  mockDevices,
  mockPersonnel,
  mockScenes,
  mockCollectionSessions,
  mockTransmissionRecords,
  collectionTransmissionSummary,
  mockPipelineStages,
  mockAnnotationTasks,
  mockQualityResults,
  dataQualityOverview,
  mockDatasets,
  monitoringCharts,
  mockIssueReports,
} as const;
