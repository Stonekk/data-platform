import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout'
import Dashboard from '@/pages/Dashboard'
import Requirements from '@/pages/Requirements'
import Tasks from '@/pages/Tasks'
import Resources from '@/pages/Resources'
import Devices from '@/pages/Devices'
import Personnel from '@/pages/Personnel'
import Scenes from '@/pages/Scenes'
import Collection from '@/pages/Collection'
import CollectionApp from '@/pages/CollectionApp'
import Processing from '@/pages/Processing'
import Annotation from '@/pages/Annotation'
import Quality from '@/pages/Quality'
import MonitorDashboard from '@/pages/MonitorDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout notificationCount={3} userName="管理员" userSubtitle="数据平台" />}>
          <Route index element={<Dashboard />} />
          <Route path="requirements" element={<Requirements />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="resources" element={<Resources />}>
            <Route index element={<Navigate to="devices" replace />} />
            <Route path="devices" element={<Devices />} />
            <Route path="personnel" element={<Personnel />} />
            <Route path="scenes" element={<Scenes />} />
          </Route>
          <Route path="collection" element={<Collection />} />
          <Route path="collection/app-demo" element={<CollectionApp />} />
          <Route path="processing" element={<Processing />} />
          <Route path="annotation" element={<Annotation />} />
          <Route path="quality" element={<Quality />} />
          <Route path="monitor" element={<MonitorDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
