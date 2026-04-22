import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Cpu, MapPin, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const SUB_TABS = [
  { label: '设备管理', path: '/resources/devices', icon: Cpu },
  { label: '人员管理', path: '/resources/personnel', icon: Users },
  { label: '场景管理', path: '/resources/scenes', icon: MapPin },
] as const

export default function Resources() {
  const { pathname } = useLocation()
  const isRoot = pathname === '/resources' || pathname === '/resources/'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">资源管理</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            设备维保与校准计划、人员技能矩阵、场景三层分类（行业 → 类型 → 子类型）统一纳管
          </p>
        </div>
      </div>

      <nav className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {SUB_TABS.map(({ label, path, icon: Icon }) => {
          const isActive =
            pathname.startsWith(path) || (isRoot && path === SUB_TABS[0].path)

          return (
            <NavLink
              key={path}
              to={path}
              replace={isRoot}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </NavLink>
          )
        })}
      </nav>

      <div className="mt-2">
        <Outlet />
      </div>
    </div>
  )
}
