import type { LucideIcon } from 'lucide-react'
import {
  Bot,
  Boxes,
  FileText,
  LayoutDashboard,
  ListChecks,
  Menu,
  Monitor,
  Radio,
  ShieldCheck,
  Tag,
  Workflow,
  X,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

export type NavItem = {
  label: string
  path: string
  icon: LucideIcon
}

/** Primary sidebar navigation (order preserved). */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: '首页', path: '/', icon: LayoutDashboard },
  { label: '数据需求', path: '/requirements', icon: FileText },
  { label: '任务管理', path: '/tasks', icon: ListChecks },
  { label: '资源管理', path: '/resources', icon: Boxes },
  { label: '数据采集', path: '/collection', icon: Radio },
  { label: '数据处理', path: '/processing', icon: Workflow },
  { label: '数据标注', path: '/annotation', icon: Tag },
  { label: '质量准出', path: '/quality', icon: ShieldCheck },
  { label: '监控大屏', path: '/monitor', icon: Monitor },
] as const

export const BRAND = {
  title: '具身数据平台',
  icon: Bot,
} as const

const PATH_TO_TITLE: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.map((item) => [item.path, item.label]),
)

const RESOURCE_SUB_TITLES: Record<string, string> = {
  devices: '设备管理',
  personnel: '人员管理',
  scenes: '场景管理',
}

/** Resolve main heading from pathname; supports nested segments under a section. */
export function getPageTitleFromPath(pathname: string): string {
  if (PATH_TO_TITLE[pathname]) {
    return PATH_TO_TITLE[pathname]
  }
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) {
    return PATH_TO_TITLE['/'] ?? '首页'
  }
  if (segments[0] === 'resources' && segments[1]) {
    return RESOURCE_SUB_TITLES[segments[1]] ?? '资源管理'
  }
  const prefix = `/${segments[0]}`
  return PATH_TO_TITLE[prefix] ?? '具身数据平台'
}

export type SidebarProps = {
  /** When true, sidebar drawer is visible on small screens. */
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
  className?: string
}

export function Sidebar({
  mobileOpen = false,
  onMobileOpenChange,
  className,
}: SidebarProps) {
  const BrandIcon = BRAND.icon

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/'}
          onClick={() => onMobileOpenChange?.(false)}
          className={({ isActive }) =>
            cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              'text-slate-300 hover:bg-white/5 hover:text-white',
              isActive &&
                'border-l-[3px] border-cyan-400 bg-cyan-500/10 pl-[9px] text-white shadow-sm shadow-cyan-500/5',
              !isActive && 'border-l-[3px] border-transparent pl-[9px]',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                className={cn(
                  'size-[18px] shrink-0 transition-colors',
                  isActive
                    ? 'text-cyan-300'
                    : 'text-slate-400 group-hover:text-slate-200',
                )}
                aria-hidden
              />
              <span className="truncate">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <>
      {/* Mobile overlay */}
      <button
        type="button"
        aria-label={mobileOpen ? '关闭导航' : '打开导航'}
        className={cn(
          'fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity md:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => onMobileOpenChange?.(false)}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-screen w-60 flex-col border-r border-slate-800/80 bg-[#0f172a] text-slate-100 shadow-xl transition-transform duration-200 ease-out md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          className,
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-slate-800/80 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/30 ring-1 ring-cyan-500/20">
              <BrandIcon className="size-5 text-cyan-400" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-white">
                {BRAND.title}
              </p>
              <p className="truncate text-[11px] text-slate-500">
                Embodied Intelligence
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-slate-400 hover:bg-white/10 hover:text-white md:hidden"
            onClick={() => onMobileOpenChange?.(false)}
            aria-label="关闭菜单"
          >
            <X className="size-5" />
          </button>
        </div>

        {nav}

        <div className="mt-auto border-t border-slate-800/80 px-4 py-3 text-[11px] leading-relaxed text-slate-500">
          具身智能数据平台 · 内部使用
        </div>
      </aside>
    </>
  )
}

/** Mobile-only control to open the sidebar; place in header row. */
export function SidebarMenuButton({
  onClick,
  className,
}: {
  onClick?: () => void
  className?: string
}) {
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
