import { useEffect, useState, type ReactElement } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Bot,
  Boxes,
  Building2,
  Calendar,
  Cpu,
  FileText,
  GitBranch,
  Layers,
  LayoutDashboard,
  List,
  ListChecks,
  MapPin,
  Menu,
  Monitor,
  Package,
  Radio,
  ShieldCheck,
  Tag,
  Users,
  Workflow,
  X,
  ChevronDown,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

export type NavItem = {
  label: string
  path: string
  icon: LucideIcon
}

export type NavGroup = {
  id: string
  label: string
  icon: LucideIcon
  basePath: string
  children: NavItem[]
}

export type NavEntry =
  | ({ type: 'link' } & NavItem)
  | ({ type: 'group' } & NavGroup)

/** Primary sidebar navigation with nested groups for 任务管理 / 资源管理. */
export const NAV_ENTRIES: readonly NavEntry[] = [
  { type: 'link', label: '首页', path: '/', icon: LayoutDashboard },
  { type: 'link', label: '数据需求', path: '/requirements', icon: FileText },
  {
    type: 'group',
    id: 'tasks',
    label: '任务管理',
    icon: ListChecks,
    basePath: '/tasks',
    children: [
      { label: '任务列表', path: '/tasks/list', icon: List },
      { label: '任务拆解', path: '/tasks/decomposition', icon: GitBranch },
      { label: '任务调度', path: '/tasks/schedule', icon: Calendar },
    ],
  },
  {
    type: 'group',
    id: 'resources',
    label: '资源管理',
    icon: Boxes,
    basePath: '/resources',
    children: [
      { label: '场地管理', path: '/resources/venues', icon: Building2 },
      { label: '场景库', path: '/resources/scenes', icon: MapPin },
      { label: '台本模板', path: '/resources/script-templates', icon: FileText },
      { label: '设备管理', path: '/resources/devices', icon: Cpu },
      { label: '人员管理', path: '/resources/personnel', icon: Users },
      { label: '道具管理', path: '/resources/props', icon: Package },
      { label: '原子动作库', path: '/resources/atomic-actions', icon: Layers },
    ],
  },
  { type: 'link', label: '数据采集', path: '/collection', icon: Radio },
  { type: 'link', label: '数据处理', path: '/processing', icon: Workflow },
  { type: 'link', label: '数据标注', path: '/annotation', icon: Tag },
  { type: 'link', label: '质量准出', path: '/quality', icon: ShieldCheck },
  { type: 'link', label: '监控大屏', path: '/monitor', icon: Monitor },
] as const

/** Flat links for page title lookup (top-level only). */
export const NAV_ITEMS: readonly NavItem[] = NAV_ENTRIES.filter(
  (e): e is { type: 'link' } & NavItem => e.type === 'link',
)

export const BRAND = {
  title: '具身数据平台',
  icon: Bot,
} as const

const RESOURCE_SUB_TITLES: Record<string, string> = {
  venues: '场地管理',
  devices: '设备管理',
  personnel: '人员管理',
  scenes: '场景库',
  props: '道具管理',
  'atomic-actions': '原子动作库',
}

const TASK_SUB_TITLES: Record<string, string> = {
  list: '任务列表',
  decomposition: '任务拆解',
  schedule: '任务调度',
}

/** Resolve main heading from pathname; supports nested segments under a section. */
export function getPageTitleFromPath(pathname: string): string {
  const flat = NAV_ITEMS.find((item) => item.path === pathname)
  if (flat) return flat.label

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return '首页'

  if (segments[0] === 'resources' && segments[1]) {
    return RESOURCE_SUB_TITLES[segments[1]] ?? '资源管理'
  }
  if (segments[0] === 'tasks' && segments[1]) {
    return TASK_SUB_TITLES[segments[1]] ?? '任务管理'
  }

  const prefix = `/${segments[0]}`
  const top = NAV_ITEMS.find((item) => item.path === prefix)
  return top?.label ?? '具身数据平台'
}

export type SidebarProps = {
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
  className?: string
}

function NavLinkItem({
  item,
  nested = false,
  onNavigate,
}: {
  item: NavItem
  nested?: boolean
  onNavigate?: () => void
}): ReactElement {
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors',
          nested ? 'px-3 py-2' : 'px-3 py-2.5',
          nested
            ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
          isActive &&
            (nested
              ? 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/15'
              : 'bg-primary/10 text-primary'),
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'shrink-0 transition-colors',
              nested ? 'size-4' : 'size-[18px]',
              isActive
                ? 'text-primary'
                : 'text-slate-400 group-hover:text-slate-600',
            )}
            aria-hidden
          />
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  )
}

export function Sidebar({
  mobileOpen = false,
  onMobileOpenChange,
  className,
}: SidebarProps): ReactElement {
  const BrandIcon = BRAND.icon
  const { pathname } = useLocation()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    tasks: pathname.startsWith('/tasks'),
    resources: pathname.startsWith('/resources'),
  })

  useEffect(() => {
    setExpanded((prev) => ({
      ...prev,
      ...(pathname.startsWith('/tasks') ? { tasks: true } : {}),
      ...(pathname.startsWith('/resources') ? { resources: true } : {}),
    }))
  }, [pathname])

  function toggleGroup(id: string): void {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const closeMobile = (): void => onMobileOpenChange?.(false)

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
      {NAV_ENTRIES.map((entry) => {
        if (entry.type === 'link') {
          return (
            <NavLinkItem key={entry.path} item={entry} onNavigate={closeMobile} />
          )
        }

        const isSectionActive = pathname.startsWith(entry.basePath)
        const isOpen = expanded[entry.id] ?? isSectionActive
        const GroupIcon = entry.icon

        return (
          <div key={entry.id} className="flex flex-col">
            <button
              type="button"
              onClick={() => toggleGroup(entry.id)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
                isSectionActive
                  ? 'bg-slate-50 text-primary'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <GroupIcon
                className={cn(
                  'size-[18px] shrink-0',
                  isSectionActive ? 'text-primary' : 'text-slate-400',
                )}
                aria-hidden
              />
              <span className="flex-1 truncate">{entry.label}</span>
              <ChevronDown
                className={cn(
                  'size-4 shrink-0 text-slate-400 transition-transform',
                  isOpen && 'rotate-180',
                )}
                aria-hidden
              />
            </button>

            {isOpen && (
              <div className="mb-1 ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-slate-200 pl-2">
                {entry.children.map((child) => (
                  <NavLinkItem
                    key={child.path}
                    item={child}
                    nested
                    onNavigate={closeMobile}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )

  return (
    <>
      <button
        type="button"
        aria-label={mobileOpen ? '关闭导航' : '打开导航'}
        className={cn(
          'fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm transition-opacity md:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => onMobileOpenChange?.(false)}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-screen w-60 flex-col border-r border-slate-200 bg-white text-slate-900 shadow-sm transition-transform duration-200 ease-out md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          className,
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/15">
              <BrandIcon className="size-5 text-primary" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-slate-900">
                {BRAND.title}
              </p>
              <p className="truncate text-[11px] text-slate-500">
                Embodied Intelligence
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 md:hidden"
            onClick={() => onMobileOpenChange?.(false)}
            aria-label="关闭菜单"
          >
            <X className="size-5" />
          </button>
        </div>

        {nav}

        <div className="mt-auto border-t border-slate-200 px-4 py-3 text-[11px] leading-relaxed text-slate-400">
          具身智能数据平台 · v{__APP_VERSION__}
        </div>
      </aside>
    </>
  )
}

export function SidebarMenuButton({
  onClick,
  className,
}: {
  onClick?: () => void
  className?: string
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:hidden',
        className,
      )}
      aria-label="打开导航菜单"
    >
      <Menu className="size-5" />
    </button>
  )
}
