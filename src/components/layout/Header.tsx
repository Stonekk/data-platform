import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, Settings, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND, getPageTitleFromPath, SidebarMenuButton } from './Sidebar'

export type HeaderProps = {
  /** Overrides title derived from the current route. */
  title?: string
  notificationCount?: number
  userName?: string
  userSubtitle?: string
  onMenuClick?: () => void
  className?: string
}

export function Header({
  title: titleProp,
  notificationCount = 0,
  userName = '管理员',
  userSubtitle = '数据平台',
  onMenuClick,
  className,
}: HeaderProps) {
  const { pathname } = useLocation()
  const pageTitle = titleProp ?? getPageTitleFromPath(pathname)
  const [userOpen, setUserOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setUserOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  return (
    <header
      className={cn(
        'flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 md:px-6',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {onMenuClick ? <SidebarMenuButton onClick={onMenuClick} /> : null}
        <div className="min-w-0">
          <nav
            className="mb-0.5 flex items-center gap-1.5 text-xs text-slate-500"
            aria-label="面包屑"
          >
            <span className="truncate">{BRAND.title}</span>
            <span className="text-slate-300" aria-hidden>
              /
            </span>
            <span className="truncate font-medium text-slate-600">
              {pageTitle}
            </span>
          </nav>
          <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900">
            {pageTitle}
          </h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          className="relative rounded-lg p-2.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          aria-label="通知"
        >
          <Bell className="size-5" />
          {notificationCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          ) : null}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setUserOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg py-1.5 pl-2 pr-2 text-left transition-colors hover:bg-slate-100 sm:pr-3"
            aria-expanded={userOpen}
            aria-haspopup="menu"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700 ring-2 ring-white">
              <User className="size-[18px]" aria-hidden />
            </span>
            <span className="hidden min-w-0 flex-col sm:flex">
              <span className="truncate text-sm font-medium text-slate-900">
                {userName}
              </span>
              <span className="truncate text-xs text-slate-500">
                {userSubtitle}
              </span>
            </span>
            <ChevronDown
              className={cn(
                'hidden size-4 text-slate-400 sm:block',
                userOpen && 'rotate-180',
              )}
              aria-hidden
            />
          </button>

          {userOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-1 w-52 rounded-lg border border-slate-200 bg-white py-1 shadow-lg shadow-slate-200/50"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                <Settings className="size-4 text-slate-400" aria-hidden />
                个人设置
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                <LogOut className="size-4 text-slate-400" aria-hidden />
                退出登录
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
