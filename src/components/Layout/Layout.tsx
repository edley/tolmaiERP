import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { HelpButton } from '../ui/help-button'

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex flex-col h-screen bg-[#f3f3f3]">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 min-h-0">
        <div className={`fixed inset-0 z-40 lg:static lg:z-auto ${sidebarOpen ? '' : 'pointer-events-none'}`}>
          <div
            className={`absolute inset-0 bg-black/30 transition-opacity duration-200 lg:hidden ${
              sidebarOpen ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={() => setSidebarOpen(false)}
          />
          <div
            className={`absolute left-0 top-0 h-full transition-transform duration-200 lg:static lg:transform-none ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
        <main className="flex-1 overflow-y-auto min-w-0">
          <Outlet />
        </main>
      </div>
      <HelpButton />
    </div>
  )
}
