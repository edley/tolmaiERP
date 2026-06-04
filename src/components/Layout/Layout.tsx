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
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <div
          className={`${
            sidebarOpen
              ? 'fixed left-0 top-0 z-50 h-full'
              : 'hidden lg:block'
          } shrink-0`}
        >
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>

        <main className="flex-1 overflow-y-auto min-w-0">
          <Outlet />
        </main>
      </div>
      <HelpButton />
    </div>
  )
}
