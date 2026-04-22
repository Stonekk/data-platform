import {
  mockDevices,
  mockPersonnel,
  mockScenes,
  mockTaskScripts,
  type Device,
  type Personnel,
  type Scene,
  type Task,
  type TaskScript,
} from '@/data/mock'

export type ReadinessState = 'ready' | 'warn' | 'missing'

export type ReadinessCheck = {
  state: ReadinessState
  reason?: string
}

export type TaskReadiness = {
  personnel: ReadinessCheck
  device: ReadinessCheck
  script: ReadinessCheck
  scene: ReadinessCheck
  /** 综合态：任一 missing → blocked；任一 warn → warn；否则 ready */
  overall: 'ready' | 'warn' | 'blocked'
}

export const READINESS_DIMENSIONS = ['personnel', 'device', 'script', 'scene'] as const
export type ReadinessDimension = (typeof READINESS_DIMENSIONS)[number]

export const DIMENSION_LABEL: Record<ReadinessDimension, string> = {
  personnel: '人',
  device: '设备',
  script: '事',
  scene: '场地',
}

function checkPersonnel(task: Task): ReadinessCheck {
  if (task.personnelId === undefined || task.personnelId === '') {
    return { state: 'missing', reason: '未指派人员' }
  }
  const p: Personnel | undefined = mockPersonnel.find((x) => x.id === task.personnelId)
  if (p === undefined) return { state: 'missing', reason: `人员 ${task.personnelId} 不存在` }
  if (p.status === 'busy') {
    const onThisTask = p.schedule.some((s) => s.taskId === task.id)
    if (onThisTask) return { state: 'ready' }
    return { state: 'warn', reason: `${p.name} 当前忙碌，需确认档期` }
  }
  return { state: 'ready' }
}

function checkDevice(task: Task): ReadinessCheck {
  if (task.deviceId === undefined || task.deviceId === '') {
    return { state: 'missing', reason: '未指派设备' }
  }
  const d: Device | undefined = mockDevices.find((x) => x.id === task.deviceId)
  if (d === undefined) return { state: 'missing', reason: `设备 ${task.deviceId} 不存在` }
  if (d.status === 'unavailable') {
    return { state: 'missing', reason: `${d.name} 当前不可用（${d.healthStatus}）` }
  }
  if (d.healthStatus === 'critical' || d.healthStatus === 'maintenance') {
    return { state: 'missing', reason: `${d.name} 健康状态：${d.healthStatus}` }
  }
  if (d.healthStatus === 'warning') {
    return { state: 'warn', reason: `${d.name} 健康状态告警，需巡检` }
  }
  return { state: 'ready' }
}

function checkScript(task: Task): ReadinessCheck {
  if (task.scriptId === undefined || task.scriptId === '') {
    return { state: 'warn', reason: '未绑定台本（"事"要素缺失）' }
  }
  const s: TaskScript | undefined = mockTaskScripts.find((x) => x.taskId === task.scriptId)
  if (s === undefined) return { state: 'missing', reason: `台本 ${task.scriptId} 不存在` }
  return { state: 'ready' }
}

function checkScene(task: Task): ReadinessCheck {
  if (task.sceneId === undefined || task.sceneId === '') {
    return { state: 'missing', reason: '未指派场地' }
  }
  const sc: Scene | undefined = mockScenes.find((x) => x.id === task.sceneId)
  if (sc === undefined) return { state: 'missing', reason: `场地 ${task.sceneId} 不存在` }
  if (sc.status === 'inactive') {
    return { state: 'missing', reason: `${sc.name} 尚未开放采集` }
  }
  if (sc.status === 'maintenance') {
    return { state: 'warn', reason: `${sc.name} 维护中，需确认可用窗口` }
  }
  return { state: 'ready' }
}

export function computeReadiness(task: Task): TaskReadiness {
  const personnel = checkPersonnel(task)
  const device = checkDevice(task)
  const script = checkScript(task)
  const scene = checkScene(task)
  const checks: ReadinessCheck[] = [personnel, device, script, scene]
  const overall: TaskReadiness['overall'] = checks.some((c) => c.state === 'missing')
    ? 'blocked'
    : checks.some((c) => c.state === 'warn')
      ? 'warn'
      : 'ready'
  return { personnel, device, script, scene, overall }
}
