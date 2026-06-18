#!/usr/bin/env node
/**
 * 从飞书表格生成冷启动 seed 数据：
 * - 场景库 + 道具：https://xiaopeng.feishu.cn/sheets/WhCdsm4wbhDmkXtMoqccxgtfnnb
 * - 原子动作：https://xiaopeng.feishu.cn/sheets/Zqxfs5W3thyjT8tPR0FcjYhfncd
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SEED_DIR = join(ROOT, 'src/data/seed')

const SCENES_PROPS_URL =
  'https://xiaopeng.feishu.cn/sheets/WhCdsm4wbhDmkXtMoqccxgtfnnb'
const SCENES_PROPS_SHEET = 'WsHXMv'
const ATOMIC_URL = 'https://xiaopeng.feishu.cn/sheets/Zqxfs5W3thyjT8tPR0FcjYhfncd'
const ATOMIC_SHEET = 'mtIZcl'

const SCENE_SLUG = {
  储物间: 'chuwujian',
  书房: 'shufang',
  主卧: 'zhuwo',
  餐厅: 'canting',
  厨房: 'chufang',
  客厅: 'keting',
  卫生间: 'weishengjian',
  儿童房: 'ertongfang',
  玄关: 'xuanguan',
  洗衣区: 'xiyiqu',
  阳台: 'yangtai',
}

const HIGHLIGHT_CATEGORIES = new Set([
  '餐具收纳',
  '餐后收纳',
  '厨房清洁',
  '物品收纳',
  '清理桌面',
  '地面清洁',
  '整理柔性物体',
])

function larkCsvGet(url, sheetId, range) {
  const out = execFileSync(
    'lark-cli',
    ['sheets', '+csv-get', '--url', url, '--sheet-id', sheetId, '--range', range],
    { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
  )
  const json = JSON.parse(out)
  if (!json.ok) throw new Error(`lark-cli failed: ${JSON.stringify(json.error)}`)
  return json.data.annotated_csv
}

function parseAnnotatedCsv(annotated) {
  const rows = []
  for (const line of annotated.split('\n')) {
    const m = line.match(/^\[row=\d+\] (.*)$/)
    if (!m) continue
    const cells = []
    let cur = ''
    let inQuote = false
    for (let i = 0; i < m[1].length; i++) {
      const ch = m[1][i]
      if (ch === '"') {
        inQuote = !inQuote
        continue
      }
      if (ch === ',' && !inQuote) {
        cells.push(cur)
        cur = ''
        continue
      }
      cur += ch
    }
    cells.push(cur)
    rows.push(cells)
  }
  return rows
}

function splitScenes(cell) {
  return cell
    .split(/[；;、]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function sceneIdFor(name) {
  const slug = SCENE_SLUG[name] ?? `room-${Buffer.from(name).toString('hex').slice(0, 8)}`
  return `scene-${slug}`
}

function slugifyCategory(name, index) {
  const safe = name.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')
  return safe ? `cat-${safe}` : `cat-${index}`
}

function tsString(s) {
  return JSON.stringify(s)
}

function buildScenesAndProps(rows) {
  const [, ...data] = rows
  const sceneNames = new Set()
  const props = []
  let propCounter = 1

  for (const [propName, scenesCell] of data) {
    if (!propName?.trim()) continue
    const scenes = splitScenes(scenesCell ?? '')
    for (const sceneName of scenes) {
      sceneNames.add(sceneName)
      const sceneId = sceneIdFor(sceneName)
      const id = `prop-${String(propCounter).padStart(3, '0')}`
      propCounter += 1
      props.push({
        id,
        name: propName.trim(),
        sceneId,
        category: '交互物体',
        requiresApproval: false,
        approvalStatus: 'none',
        assetCode: `${sceneId.replace('scene-', '').toUpperCase().slice(0, 4)}-${String(propCounter).padStart(3, '0')}`,
        quantity: 1,
      })
    }
  }

  const sceneNameList = [...sceneNames].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  const propsByScene = new Map()
  for (const p of props) {
    if (!propsByScene.has(p.sceneId)) propsByScene.set(p.sceneId, [])
    propsByScene.get(p.sceneId).push(p.id)
  }

  const scenes = sceneNameList.map((name) => {
    const id = sceneIdFor(name)
    const recommended = (propsByScene.get(id) ?? []).slice(0, 5)
    const status = name === '儿童房' ? 'maintenance' : 'active'
    return {
      id,
      name,
      venueId: 'venue-room-101',
      industry: '生活服务',
      type: '家庭服务',
      sceneSubtype: name,
      status,
      location: `家庭仿真-${name}`,
      description: `家庭场景「${name}」常见交互物体与日常操作采集。`,
      recommendedPropIds: recommended,
      defaultTemplateId: name === '厨房' ? 'tpl-001' : undefined,
    }
  })

  return { scenes, props }
}

function compositeCategoryId(sceneId, categoryName) {
  return `${sceneId}|${categoryName}`
}

function buildSceneActionCategories(rows) {
  const [, ...data] = rows
  const groups = new Map()

  for (const row of data) {
    const [sceneType, room, category, atomicAction] = row
    if (!room?.trim() || !category?.trim() || !atomicAction?.trim()) continue
    const sceneId = sceneIdFor(room.trim())
    const catName = category.trim()
    const id = compositeCategoryId(sceneId, catName)
    if (!groups.has(id)) {
      groups.set(id, {
        id,
        sceneId,
        sceneName: room.trim(),
        sceneType: sceneType?.trim() || '家庭场景',
        name: catName,
        primitives: new Set(),
        highlight: HIGHLIGHT_CATEGORIES.has(catName),
      })
    }
    groups.get(id).primitives.add(atomicAction.trim())
  }

  return [...groups.values()]
    .map((g) => ({
      id: g.id,
      sceneId: g.sceneId,
      sceneName: g.sceneName,
      sceneType: g.sceneType,
      name: g.name,
      primitives: [...g.primitives].sort((a, b) => a.localeCompare(b, 'zh-CN')),
      highlight: g.highlight,
    }))
    .sort((a, b) => {
      const sceneCmp = a.sceneName.localeCompare(b.sceneName, 'zh-CN')
      if (sceneCmp !== 0) return sceneCmp
      return a.name.localeCompare(b.name, 'zh-CN')
    })
}

function buildAtomicCategories(rows) {
  const [, ...data] = rows
  const groups = new Map()

  for (const row of data) {
    const [sceneType, room, category, atomicAction] = row
    if (!category?.trim() || !atomicAction?.trim()) continue
    const key = category.trim()
    if (!groups.has(key)) {
      groups.set(key, { actions: new Set(), rooms: new Set(), sceneTypes: new Set() })
    }
    const g = groups.get(key)
    g.actions.add(atomicAction.trim())
    if (room?.trim()) g.rooms.add(room.trim())
    if (sceneType?.trim()) g.sceneTypes.add(sceneType.trim())
  }

  const sorted = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh-CN'))
  const codes = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

  return sorted.map(([name, g], index) => ({
    id: slugifyCategory(name, index + 1),
    code: codes[index] ?? String(index + 1),
    name,
    actions: [...g.actions].sort((a, b) => a.localeCompare(b, 'zh-CN')).join('、'),
    typicalScenes: [...g.rooms].sort((a, b) => a.localeCompare(b, 'zh-CN')).join('、'),
    highlight: HIGHLIGHT_CATEGORIES.has(name),
  }))
}

function writeScenesFile(scenes) {
  const body = scenes
    .map(
      (s) =>
        `  { id: ${tsString(s.id)}, name: ${tsString(s.name)}, venueId: ${tsString(s.venueId)}, industry: ${tsString(s.industry)}, type: ${tsString(s.type)}, sceneSubtype: ${tsString(s.sceneSubtype)}, status: ${tsString(s.status)}, location: ${tsString(s.location)}, description: ${tsString(s.description)}, recommendedPropIds: ${JSON.stringify(s.recommendedPropIds)}, defaultTemplateId: ${s.defaultTemplateId ? tsString(s.defaultTemplateId) : 'undefined'} },`,
    )
    .join('\n')

  writeFileSync(
    join(SEED_DIR, 'coldStartScenes.ts'),
    `/** 冷启动场景库 — 来源：飞书场景/道具表 A=交互物体 B=出现房间 */\nimport type { Scene } from '@/data/mock'\n\nexport const coldStartScenes: Scene[] = [\n${body}\n]\n`,
    'utf8',
  )
}

function writePropsFile(props) {
  const body = props
    .map(
      (p) =>
        `  { id: ${tsString(p.id)}, name: ${tsString(p.name)}, sceneId: ${tsString(p.sceneId)}, category: ${tsString(p.category)}, requiresApproval: ${p.requiresApproval}, approvalStatus: ${tsString(p.approvalStatus)}, assetCode: ${tsString(p.assetCode)}, quantity: ${p.quantity} },`,
    )
    .join('\n')

  writeFileSync(
    join(SEED_DIR, 'coldStartProps.ts'),
    `/** 冷启动道具 — 来源：飞书场景/道具表；同物多场景各一条记录 */\nimport type { Prop } from '@/data/mock'\n\nexport const coldStartProps: Prop[] = [\n${body}\n]\n`,
    'utf8',
  )
}

function writeSceneActionFile(categories) {
  const body = categories
    .map((c) => {
      const highlight = c.highlight ? ',\n    highlight: true' : ''
      return `  {
    id: ${tsString(c.id)},
    sceneId: ${tsString(c.sceneId)},
    sceneName: ${tsString(c.sceneName)},
    sceneType: ${tsString(c.sceneType)},
    name: ${tsString(c.name)},
    primitives: ${JSON.stringify(c.primitives)}${highlight},
  }`
    })
    .join(',\n')

  writeFileSync(
    join(SEED_DIR, 'sceneActionIndex.ts'),
    `/** 场景×动作大类 — 来源：飞书任务拆解表；ID 格式 scene-xxx|动作大类名 */\nexport type SceneActionCategory = {
  id: string
  sceneId: string
  sceneName: string
  sceneType: string
  name: string
  primitives: string[]
  highlight?: boolean
}

export const SCENE_ACTION_CATEGORIES: SceneActionCategory[] = [
${body},
]
`,
    'utf8',
  )
}

function writeAtomicFile(categories, sceneCategories) {
  const body = categories
    .map((c) => {
      const highlight = c.highlight ? ',\n    highlight: true' : ''
      return `  {
    id: ${tsString(c.id)},
    code: ${tsString(c.code)},
    name: ${tsString(c.name)},
    actions: ${tsString(c.actions)},
    typicalScenes: ${tsString(c.typicalScenes)}${highlight},
  }`
    })
    .join(',\n')

  writeFileSync(
    join(ROOT, 'src/data/atomicActions.ts'),
    `/** 原子动作库 API — 数据见 seed/sceneActionIndex.ts */\nimport { SCENE_ACTION_CATEGORIES, type SceneActionCategory } from '@/data/seed/sceneActionIndex'

export type { SceneActionCategory }

/** @deprecated 使用 categoriesForScene / SCENE_ACTION_CATEGORIES */
export type AtomicActionCategory = SceneActionCategory & {
  actions: string
  typicalScenes: string
  code?: string
}

function withLegacyFields(cat: SceneActionCategory, index: number): AtomicActionCategory {
  const codes = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  return {
    ...cat,
    actions: cat.primitives.join('、'),
    typicalScenes: cat.sceneName,
    code: codes[index] ?? String(index + 1),
  }
}

export const SCENE_ACTION_INDEX = SCENE_ACTION_CATEGORIES

export function categoriesForScene(sceneId: string): SceneActionCategory[] {
  return SCENE_ACTION_CATEGORIES.filter((c) => c.sceneId === sceneId)
}

export function categoryById(id: string): SceneActionCategory | undefined {
  return SCENE_ACTION_CATEGORIES.find((c) => c.id === id)
}

export function defaultCategoryIdsForScene(sceneId: string): string[] {
  const highlighted = categoriesForScene(sceneId).filter((c) => c.highlight)
  if (highlighted.length > 0) return highlighted.map((c) => c.id)
  return categoriesForScene(sceneId).slice(0, 2).map((c) => c.id)
}

export function sceneIdsWithActions(): string[] {
  return [...new Set(SCENE_ACTION_CATEGORIES.map((c) => c.sceneId))]
}

/** @deprecated 管理页请用 categoriesForScene */
export const ATOMIC_ACTION_CATEGORIES: AtomicActionCategory[] = SCENE_ACTION_CATEGORIES.map(
  withLegacyFields,
)

export const HIGHLIGHT_ATOMIC_IDS = SCENE_ACTION_CATEGORIES.filter((c) => c.highlight).map(
  (c) => c.id,
)
`,
    'utf8',
  )
}

function main() {
  mkdirSync(SEED_DIR, { recursive: true })

  console.log('Fetching scenes & props…')
  const scenesCsv = larkCsvGet(SCENES_PROPS_URL, SCENES_PROPS_SHEET, 'A1:B260')
  const scenesRows = parseAnnotatedCsv(scenesCsv)
  const { scenes, props } = buildScenesAndProps(scenesRows)
  console.log(`  ${scenes.length} scenes, ${props.length} props`)

  console.log('Fetching atomic actions…')
  const atomicCsv = larkCsvGet(ATOMIC_URL, ATOMIC_SHEET, 'A1:H289')
  const atomicRows = parseAnnotatedCsv(atomicCsv)
  const sceneCategories = buildSceneActionCategories(atomicRows)
  const categories = buildAtomicCategories(atomicRows)
  console.log(`  ${sceneCategories.length} scene×category entries (${categories.length} global legacy groups)`)

  writeScenesFile(scenes)
  writePropsFile(props)
  writeSceneActionFile(sceneCategories)
  writeAtomicFile(categories, sceneCategories)

  const kitchenProps = props.filter((p) => p.sceneId === 'scene-chufang' && p.name === '汤勺')
  const kitchenCats = sceneCategories.filter((c) => c.sceneId === 'scene-chufang' && c.highlight)

  console.log('\nDemo mapping hints:')
  console.log(`  task-001 sceneId: scene-chufang`)
  console.log(`  task-001 prop 汤勺: ${kitchenProps[0]?.id ?? 'N/A'}`)
  console.log(`  default atomic: ${kitchenCats.map((c) => c.id).join(', ')}`)
}

main()
