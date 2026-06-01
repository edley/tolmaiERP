import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Receipt,
  CreditCard,
  BarChart3,
  Scale,
  Calendar,
  Shield,
  ArrowDownToLine,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useRBAC } from '../../hooks/useRBAC'
import { ALL_MENUS, isGroup } from '../../lib/menus'
import type { MenuGroup } from '../../lib/menus'

const ICON_MAP: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  accountant: BookOpen,
  journal: FileText,
  ledger: Receipt,
  trialbalance: Scale,
  payments: CreditCard,
  receipts: ArrowDownToLine,
  reports: BarChart3,
  settings: Settings,
  accountingperiods: Calendar,
  allocationmappings: Settings,
  usermgmt: Shield,
}

function SidebarGroup({ group }: { group: MenuGroup }) {
  const [expanded, setExpanded] = useState(true)
  const { canAccessMenu } = useRBAC()
  const Icon = ICON_MAP[group.key] || Settings

  const visibleChildren = group.children.filter((child) => canAccessMenu(child.key))

  if (visibleChildren.length === 0) return null

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-5 py-2.5 text-xs font-bold text-[#514f4d] uppercase tracking-wider hover:bg-[#f3f3f3] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 shrink-0" />
          <span>{group.label}</span>
        </div>
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>
      {expanded && (
        <div>
          {visibleChildren.map((child) => {
            const ChildIcon = ICON_MAP[child.key] || LayoutDashboard
            return (
              <NavLink
                key={child.key}
                to={child.route}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-5 py-2 pl-12 text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-[#0070d2] bg-[#e8f4fe] border-l-3 border-[#0070d2]'
                      : 'text-[#16325c] hover:bg-[#f3f3f3] border-l-3 border-transparent'
                  }`
                }
              >
                <ChildIcon className="w-4 h-4 shrink-0" />
                {child.label}
              </NavLink>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const { canAccessMenu, isSuperuser } = useRBAC()

  const visibleItems = ALL_MENUS.filter((item) => {
    if (isGroup(item)) {
      const visible = item.children.some((child) => canAccessMenu(child.key))
      return visible
    }
    if (item.key === 'usermgmt') return isSuperuser
    return canAccessMenu(item.key)
  })

  return (
    <aside className="w-56 bg-white border-r border-[#dddbda] flex flex-col h-full">
      <div className="px-5 py-4 border-b border-[#dddbda] shrink-0">
        <NavLink to="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#0070d2] flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-bold text-[#16325c] block leading-tight">Tolmai ERP</span>
            <span className="text-[10px] text-[#514f4d]">Accounting</span>
          </div>
        </NavLink>
      </div>
      <nav className="flex-1 py-3 min-h-0">
        {visibleItems.map((item) => {
          if (isGroup(item)) {
            return <SidebarGroup key={item.key} group={item} />
          }
          const Icon = ICON_MAP[item.key] || LayoutDashboard
          return (
            <NavLink
              key={item.key}
              to={item.route}
              end={item.route === '/'}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-[#0070d2] bg-[#e8f4fe] border-l-3 border-[#0070d2]'
                    : 'text-[#16325c] hover:bg-[#f3f3f3] border-l-3 border-transparent'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
