import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export type LayoutProps = {
  /** Passed through to `Header` when set. */
  pageTitle?: string
  notificationCount?: number
  userName?: string
  userSubtitle?: string
  className?: string
}

export function Layout({
  pageTitle,
  notificationCount,
  userName,
  userSubtitle,
  className,
}: LayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className={cn('min-h-screen bg-slate-100', className)}>
      <Sidebar
        mobileOpen={mobileNavOpen}
        onMobileOpenChange={setMobileNavOpen}
      />

      <div className="flex min-h-screen flex-col md:ml-60">
        <Header
          title={pageTitle}
          notificationCount={notificationCount}
          userName={userName}
          userSubtitle={userSubtitle}
          onMenuClick={() => setMobileNavOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
