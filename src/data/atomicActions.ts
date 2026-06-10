/** §4.7 全量原子动作集 — 对齐需求文档 XA 203075 */
export type AtomicActionCategory = {
  id: string
  code: string
  name: string
  actions: string
  typicalScenes: string
  /** 高价值重点覆盖项 */
  highlight?: boolean
}

export const ATOMIC_ACTION_CATEGORIES: AtomicActionCategory[] = [
  {
    id: 'cat-a',
    code: 'A',
    name: '抓取与放置',
    actions:
      '取放、摆正/对位归位、堆叠摞齐；多抓握类型（力抓/柱状/精捏三指/侧捏/勾握/球抓/毫米级小物捏取）；手内操作（重定向/换握/移位/翻面小物）',
    typicalScenes: '全场景；精细抓握重点：厨房/维修工坊/中药房/药店/花店',
    highlight: true,
  },
  {
    id: 'cat-b',
    code: 'B',
    name: '关节物体操作',
    actions: '开合（门/柜/冰箱/抽屉/盖/箱/后备箱）、推/拉、旋拧（瓶盖/阀/灯泡/螺丝）、按按钮/感应触发',
    typicalScenes: '厨房、玄关、家庭车库、会议室、电梯间、便利店',
  },
  {
    id: 'cat-c',
    code: 'C',
    name: '工具使用与书写',
    actions: '切/切配、裁剪/剪、书写签字/板书/打字/盖章、螺丝刀/扳手/钳/夹/戥子/药碾/刷、万用表/血压计/扫码枪/电子秤、拆装/装配',
    typicalScenes: '厨房、维修工坊、中药房、办公、教室、社区诊所',
  },
  {
    id: 'cat-d',
    code: 'D',
    name: '接触丰富与受力',
    actions: '倾倒/控量、按压/挤压、涂抹/刮平、擦拭（干布）、揉/擀/压、打蜡/抛光、吸尘',
    typicalScenes: '厨房、咖啡/饮品店、烘焙、面点坊、后厨、画室、洗车',
  },
  {
    id: 'cat-e',
    code: 'E',
    name: '插接与扣合',
    actions: '插接对位（插头/USB/线缆/积木/插卡）、扣合（纽扣/拉链/魔术贴）、打结/系带、装订/封口/封箱',
    typicalScenes: '书房、维修工坊、办公、服装店、衣帽间、玄关、洗衣店、物流分拣',
    highlight: true,
  },
  {
    id: 'cat-f',
    code: 'F',
    name: '可变形物操作',
    actions: '叠、挂、铺展、卷、理线/缠绕、翻页、撕揭/剥离、包扎、包馅/捏造型/裱花、修剪花枝/插花',
    typicalScenes: '主卧室、客厅、餐厅、阳台、服装店、面点坊、花店、仓库',
  },
  {
    id: 'cat-g',
    code: 'G',
    name: '搬运·分拣·递交',
    actions: '搬运/装卸/上下架/补货、端托、双手协同、双手交接/递交、分拣/归类/翻找、打包/装箱/装袋、称重/称量',
    typicalScenes: '仓库、物流分拣、餐厅、茶室、便利店、收发室',
  },
  {
    id: 'cat-h',
    code: 'H',
    name: '全身移动（locomotion）',
    actions: '行走（直行/转弯/转身）、避障、上下楼梯/扶扶手、上下坡、扶梯、进出/等候、坐下/站起、爬梯',
    typicalScenes: '过渡/交通 6 场景；爬梯：书店/图书馆',
  },
  {
    id: 'cat-i',
    code: 'I',
    name: '移动-操作耦合',
    actions: '边走边搬运、蹲下取物起身、弯腰够取/踮脚举高放置',
    typicalScenes: '玄关、仓库/档案室、便利店、物流分拣、家庭车库、书店',
    highlight: true,
  },
]

export const HIGHLIGHT_ATOMIC_IDS = ATOMIC_ACTION_CATEGORIES.filter((c) => c.highlight).map(
  (c) => c.id,
)
