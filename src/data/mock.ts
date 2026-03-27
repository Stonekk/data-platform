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

export type RequirementStatus = 'draft' | 'executing' | 'completed';
export type DataRequirementType = 'teleoperation' | 'human_body' | 'motion_capture';

export type TaskStatus =
  | 'pending'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'delayed';

export type DeviceStatus = 'available' | 'unavailable';
export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'maintenance';

export type PersonnelStatus = 'available' | 'busy';

export type SceneStatus = 'active' | 'inactive' | 'maintenance';

export type CollectionStatus = 'idle' | 'collecting' | 'paused' | 'completed' | 'failed';

export type PipelineStageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export type AnnotationTaskStatus = 'not-started' | 'in-progress' | 'completed';

export type DatasetStatus = 'draft' | 'reviewing' | 'published' | 'deprecated';

export type TransmissionState = 'synced' | 'syncing' | 'queued' | 'failed' | 'offline';

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
};

export type Device = {
  id: string;
  name: string;
  type: string;
  status: DeviceStatus;
  healthStatus: HealthStatus;
  lastMaintenance: string;
  location: string;
};

export type PersonnelScheduleEntry = {
  date: string;
  startTime: string;
  endTime: string;
  taskId: string;
  label: string;
};

export type Personnel = {
  id: string;
  name: string;
  role: string;
  status: PersonnelStatus;
  skills: string[];
  schedule: PersonnelScheduleEntry[];
};

export type Scene = {
  id: string;
  name: string;
  type: string;
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
  },
  {
    id: 'req-002',
    title: '工业拧螺丝人体工效数据',
    status: 'draft',
    dataType: 'human_body',
    scene: '装配工位线体',
    device: '可穿戴惯性套装 W1',
    dataVolume: '约 860 GB',
    deliveryDate: '2025-04-28',
    createdAt: '2025-03-18T14:30:00+08:00',
    description: '采集肩肘腕角度与肌电参考，用于人机协作安全阈值建模。',
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
  },
  {
    id: 'req-007',
    title: '精密插拔遥操作（电子）',
    status: 'completed',
    dataType: 'teleoperation',
    scene: '防静电工作台',
    device: '双臂遥操作台 A2',
    dataVolume: '约 980 GB',
    deliveryDate: '2025-03-18',
    createdAt: '2025-02-28T13:10:00+08:00',
    description: 'FPC 插拔、螺丝微扭力，含高帧指尖触觉。',
  },
  {
    id: 'req-008',
    title: '拥挤人群穿行人体流场',
    status: 'draft',
    dataType: 'human_body',
    scene: '交通枢纽大厅',
    device: '多相机阵列 + W1',
    dataVolume: '约 6.8 TB',
    deliveryDate: '2025-06-01',
    createdAt: '2025-03-24T09:30:00+08:00',
    description: '匿名化行人轨迹与局部避让意图标注需求评审中。',
  },
  {
    id: 'req-009',
    title: '乒乓球对打动捕',
    status: 'executing',
    dataType: 'motion_capture',
    scene: '体育馆多功能场地',
    device: '动捕套装 M3',
    dataVolume: '约 2.0 TB',
    deliveryDate: '2025-04-12',
    createdAt: '2025-03-14T10:00:00+08:00',
    description: '高速挥拍与重心转移，200Hz 骨骼数据。',
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
  },
  {
    id: 'req-011',
    title: '电梯内外人体进出',
    status: 'executing',
    dataType: 'human_body',
    scene: '写字楼电梯厅',
    device: '深度相机 + W1',
    dataVolume: '约 1.9 TB',
    deliveryDate: '2025-04-30',
    createdAt: '2025-03-19T15:00:00+08:00',
    description: '高峰/平峰时段客流，关注门区让行行为。',
  },
  {
    id: 'req-012',
    title: '舞蹈基础动作动捕教材',
    status: 'draft',
    dataType: 'motion_capture',
    scene: '舞蹈排练厅',
    device: '动捕套装 M2',
    dataVolume: '约 780 GB',
    deliveryDate: '2025-05-20',
    createdAt: '2025-03-25T11:40:00+08:00',
    description: '面向青少年课程的标准动作分段与节拍对齐。',
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
  },
  {
    id: 'task-004',
    device: '可穿戴惯性套装 W1',
    personnel: '周若彤',
    scene: '装配工位线体',
    status: 'pending',
    startTime: '2025-03-27T08:30:00+08:00',
    endTime: '2025-03-27T11:30:00+08:00',
    type: '人体数据采集',
  },
  {
    id: 'task-005',
    device: '移动底盘 C1',
    personnel: '韩博文',
    scene: '仓储分拣区',
    status: 'delayed',
    startTime: '2025-03-25T10:00:00+08:00',
    endTime: '2025-03-25T16:00:00+08:00',
    type: '协同调度测试',
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
  },
  {
    id: 'task-008',
    device: '柔性传感衣 S2',
    personnel: '何雨桐',
    scene: '康复训练室',
    status: 'cancelled',
    startTime: '2025-03-26T10:00:00+08:00',
    endTime: '2025-03-26T12:00:00+08:00',
    type: '人体数据采集',
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
  },
  {
    id: 'task-011',
    device: '动捕套装 M2',
    personnel: '罗嘉诚',
    scene: '舞蹈排练厅',
    status: 'pending',
    startTime: '2025-03-28T14:00:00+08:00',
    endTime: '2025-03-28T18:00:00+08:00',
    type: '动捕采集',
  },
  {
    id: 'task-012',
    device: '多相机阵列 + W1',
    personnel: '许明哲',
    scene: '交通枢纽大厅',
    status: 'pending',
    startTime: '2025-04-01T09:00:00+08:00',
    endTime: '2025-04-01T18:00:00+08:00',
    type: '人体数据采集',
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
  { id: 'dev-001', name: '双臂遥操作台 A1', type: '遥操作主站', status: 'available', healthStatus: 'healthy', lastMaintenance: '2025-03-10', location: '实验室 A 区' },
  { id: 'dev-002', name: '双臂遥操作台 A2', type: '遥操作主站', status: 'available', healthStatus: 'warning', lastMaintenance: '2025-02-28', location: '实验室 A 区' },
  { id: 'dev-003', name: '动捕套装 M2', type: '光学动捕', status: 'unavailable', healthStatus: 'maintenance', lastMaintenance: '2025-03-25', location: '动捕棚 1' },
  { id: 'dev-004', name: '动捕套装 M3', type: '光学动捕', status: 'available', healthStatus: 'healthy', lastMaintenance: '2025-03-18', location: '动捕棚 2' },
  { id: 'dev-005', name: '柔性传感衣 S2', type: '可穿戴', status: 'available', healthStatus: 'healthy', lastMaintenance: '2025-03-20', location: '康复场景配套间' },
  { id: 'dev-006', name: '人形机器人 H2', type: '人形机器人', status: 'available', healthStatus: 'warning', lastMaintenance: '2025-03-22', location: '过渡区测试道' },
  { id: 'dev-007', name: '可穿戴惯性套装 W1', type: '可穿戴', status: 'available', healthStatus: 'healthy', lastMaintenance: '2025-03-15', location: '人体数据工位' },
  { id: 'dev-008', name: '移动底盘 C1', type: 'AGV', status: 'unavailable', healthStatus: 'critical', lastMaintenance: '2025-03-24', location: '仓储分拣区' },
  { id: 'dev-009', name: '移动机械臂 R1', type: '移动操纵', status: 'available', healthStatus: 'healthy', lastMaintenance: '2025-03-08', location: '农业示范大棚' },
  { id: 'dev-010', name: '深度相机阵列 D4', type: '感知套件', status: 'available', healthStatus: 'healthy', lastMaintenance: '2025-03-12', location: '电梯厅布设点' },
  { id: 'dev-011', name: '边缘采集网关 G2', type: '网络设备', status: 'available', healthStatus: 'healthy', lastMaintenance: '2025-03-01', location: '机房机柜 R3' },
  { id: 'dev-012', name: '备份磁带库 T1', type: '存储', status: 'available', healthStatus: 'warning', lastMaintenance: '2025-02-15', location: '异地灾备中心' },
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
    schedule: [{ date: '2025-03-27', startTime: '08:30', endTime: '11:30', taskId: 'task-004', label: '拧螺丝人体工效' }],
  },
  {
    id: 'per-005',
    name: '韩博文',
    role: '现场调度',
    status: 'busy',
    skills: ['多机协同', '安全预案'],
    schedule: [{ date: '2025-03-25', startTime: '10:00', endTime: '16:00', taskId: 'task-005', label: 'AGV 协同（延期）' }],
  },
  {
    id: 'per-006',
    name: '沈佳怡',
    role: '遥操作员',
    status: 'available',
    skills: ['精密装配', '低力矩任务'],
    schedule: [{ date: '2025-03-24', startTime: '09:00', endTime: '15:00', taskId: 'task-006', label: 'FPC 插拔' }],
  },
  {
    id: 'per-007',
    name: '何雨桐',
    role: '康复辅具专员',
    status: 'available',
    skills: ['康复流程', '伦理合规'],
    schedule: [],
  },
  {
    id: 'per-008',
    name: '邓宇航',
    role: '农业场景技师',
    status: 'available',
    skills: ['户外设备', '移动臂维护'],
    schedule: [{ date: '2025-03-22', startTime: '07:00', endTime: '12:00', taskId: 'task-009', label: '大棚修剪' }],
  },
  {
    id: 'per-009',
    name: '蒋心怡',
    role: '人体数据采集员',
    status: 'available',
    skills: ['多相机同步', '隐私脱敏'],
    schedule: [{ date: '2025-03-27', startTime: '17:00', endTime: '19:30', taskId: 'task-010', label: '电梯厅进出' }],
  },
  {
    id: 'per-010',
    name: '罗嘉诚',
    role: '动捕演员',
    status: 'available',
    skills: ['舞蹈基础', '节拍对齐'],
    schedule: [{ date: '2025-03-28', startTime: '14:00', endTime: '18:00', taskId: 'task-011', label: '舞蹈教材' }],
  },
  {
    id: 'per-011',
    name: '许明哲',
    role: '项目经理',
    status: 'busy',
    skills: ['排期', '跨部门沟通'],
    schedule: [{ date: '2025-04-01', startTime: '09:00', endTime: '18:00', taskId: 'task-012', label: '枢纽大厅预演' }],
  },
  {
    id: 'per-012',
    name: '丁雪儿',
    role: '质检工程师',
    status: 'available',
    skills: ['数据抽检', '自动检测规则'],
    schedule: [{ date: '2025-03-26', startTime: '15:00', endTime: '18:00', taskId: 'ann-004', label: '标注抽检会议' }],
  },
];

// ---------------------------------------------------------------------------
// 6. 场景
// ---------------------------------------------------------------------------

export const mockScenes: Scene[] = [
  { id: 'scene-001', name: '家庭厨房标准间', type: '家庭服务', status: 'active', location: 'B 栋 2 层', description: '标准化橱柜、灶具与常见餐具，支持多机位与力控遥操作。' },
  { id: 'scene-002', name: '装配工位线体', type: '工业制造', status: 'active', location: 'C 栋产线模拟区', description: '螺丝工位、治具与工具车，适合工效与协作数据采集。' },
  { id: 'scene-003', name: '商超仿真卖场', type: '零售物流', status: 'active', location: 'D 栋大空间', description: '货架、推车与收银mock，动捕覆盖率高。' },
  { id: 'scene-004', name: '室内外过渡区', type: '移动机器人', status: 'active', location: '户外连廊', description: '多种门槛与坡度组合，天气可控半开放。' },
  { id: 'scene-005', name: '康复训练室', type: '医疗康复', status: 'maintenance', location: 'E 栋 1 层', description: '平行杠、助行器；本周地胶更换中。' },
  { id: 'scene-006', name: '仓储分拣区', type: '物流仓储', status: 'active', location: '自动化仓模拟', description: 'AGV 通道、拣选站与异常口。' },
  { id: 'scene-007', name: '防静电工作台', type: '电子精密', status: 'active', location: '洁净间 2', description: '离子风机、显微镜工位。' },
  { id: 'scene-008', name: '交通枢纽大厅', type: '公共场景', status: 'inactive', location: '联合实验基地', description: '审批通过后开放采集，当前仅勘景。' },
  { id: 'scene-009', name: '体育馆多功能场地', type: '体育训练', status: 'active', location: '综合馆', description: '羽毛球/乒乓球快速切换布置。' },
  { id: 'scene-010', name: '温室大棚示范区', type: '农业', status: 'active', location: '南侧试验田', description: '湿度大，设备需每日烘干。' },
  { id: 'scene-011', name: '写字楼电梯厅', type: '公共场景', status: 'active', location: '合作物业场地', description: '高峰时段需物业协同。' },
  { id: 'scene-012', name: '舞蹈排练厅', type: '文娱教育', status: 'active', location: '艺术中心分馆', description: '镜面墙、把杆与地胶维护良好。' },
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
} as const;
