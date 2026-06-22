#!/usr/bin/env node
/**
 * V2.3.0 台本优先工作流轻量验证（无 TS 运行时依赖）
 * 运行：node scripts/validate-script-batch-workflow.mjs
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function taskScriptIds(task) {
  if (task.scriptIds?.length) return [...task.scriptIds]
  if (task.scriptId) return [task.scriptId]
  return []
}

function sortedPropKey(propIds) {
  return [...propIds].sort().join(',')
}

function groupKeyForScript(script, taskType) {
  return `${script.sceneId}|${sortedPropKey(script.propIds)}|${taskType}`
}

function groupConfirmedScripts(scripts, allocations, taskType) {
  const confirmed = scripts.filter((s) => s.reviewStatus === 'confirmed' || s.status === 'confirmed')
  const byKey = new Map()
  for (const script of confirmed) {
    const key = groupKeyForScript(script, taskType)
    const list = byKey.get(key) ?? []
    list.push(script)
    byKey.set(key, list)
  }
  return [...byKey.entries()].map(([groupKey, groupScripts]) => ({
    groupKey,
    scriptIds: groupScripts.map((s) => s.taskId),
    totalTargetCount: groupScripts.reduce((sum, s) => {
      const a = allocations.find((x) => x.scriptId === s.taskId)
      return sum + (a?.targetCount ?? 30)
    }, 0),
  }))
}

const legacy = { scriptId: 'task-001' }
assert.deepEqual(taskScriptIds(legacy), ['task-001'])

const multi = {
  scriptIds: ['scr-a', 'scr-b'],
  scriptAllocations: [
    { scriptId: 'scr-a', targetCount: 20 },
    { scriptId: 'scr-b', targetCount: 30 },
  ],
}
assert.equal(
  multi.scriptAllocations.reduce((s, a) => s + a.targetCount, 0),
  50,
)

const scripts = [
  {
    taskId: 'scr-test-0',
    sceneId: 'scene-chufang',
    propIds: ['prop-005', 'prop-012'],
    status: 'confirmed',
    reviewStatus: 'confirmed',
  },
  {
    taskId: 'scr-test-1',
    sceneId: 'scene-chufang',
    propIds: ['prop-012', 'prop-005'],
    status: 'confirmed',
    reviewStatus: 'confirmed',
  },
]
const groups = groupConfirmedScripts(
  scripts,
  [
    { scriptId: 'scr-test-0', targetCount: 30 },
    { scriptId: 'scr-test-1', targetCount: 50 },
  ],
  '遥操作采集',
)
assert.equal(groups.length, 1)
assert.equal(groups[0].scriptIds.length, 2)
assert.equal(groups[0].totalTargetCount, 80)

const build = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', shell: true })
assert.equal(build.status, 0, 'npm run build should pass')

console.log('✓ script-batch-workflow validation passed')
