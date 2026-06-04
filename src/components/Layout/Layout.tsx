import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { HelpButton } from '../ui/help-button'

export function Layout() {
  return (
    <div className="flex flex-col h-screen bg-[#f3f3f3]">
      <Header />
      <div className="flex flex-1 min-h-0">
        <div className="sticky top-0 h-full shrink-0">
          <Sidebar />
        </div>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <HelpButton />
    </div>
  )
}
