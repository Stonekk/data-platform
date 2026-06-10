import { Outlet } from 'react-router-dom'
import type { ReactElement } from 'react'

export default function Resources(): ReactElement {
  return (
    <div className="space-y-4">
      <Outlet />
    </div>
  )
}
