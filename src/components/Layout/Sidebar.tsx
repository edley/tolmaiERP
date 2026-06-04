import { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
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
  Building2,
  Check,
  ChevronRight,
} from 'lucide-react'
import { useRBAC } from '../../hooks/useRBAC'
import { useCompany } from '../../contexts/CompanyContext'
import { ALL_MENUS, isGroup } from '../../lib/menus'
import type { MenuGroup } from '../../lib/menus'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

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
  allocationtypes: Settings,
  paymentmodes: Settings,
  usermgmt: Shield,
  'user-sessions': Shield,
  companies: Building2,
  'audit-trail': Shield,
}

function CompanySwitcher() {
  const { currentCompany, availableCompanies, switchCompany } = useCompany()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery('') }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  if (!currentCompany || availableCompanies.length === 0) return null

  const filtered = query
    ? availableCompanies.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : availableCompanies

  return (
    <div ref={ref} className="relative px-3 pb-3 border-b border-[#dddbda] shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-[#f3f3f3] transition-colors text-[#514f4d]"
      >
        <Building2 className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate flex-1 text-left font-medium text-[#16325c]">{currentCompany.name}</span>
        <ChevronDown className="w-3 h-3 shrink-0" />
      </button>
      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-[#dddbda] rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-[#dddbda]">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search companies..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-[#dddbda] rounded outline-none focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2]"
            />
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-xs text-[#514f4d] italic text-center">No companies found</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { switchCompany(c.id); setOpen(false); setQuery('') }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:bg-[#f3f3f3] transition-colors text-[#16325c]"
                >
                  <span className="flex-1 truncate">{c.name}</span>
                  {c.id === currentCompany.id && <Check className="w-3 h-3 text-[#0070d2] shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SidebarGroup({ group }: { group: MenuGroup }) {
  const { canAccessMenu } = useRBAC()
  const location = useLocation()
  const Icon = ICON_MAP[group.key] || Settings

  const visibleChildren = group.children.filter((child) => canAccessMenu(child.key))

  if (visibleChildren.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center justify-between w-full px-5 py-2.5 text-xs font-bold text-[#514f4d] uppercase tracking-wider hover:bg-[#f3f3f3] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Icon className="w-4 h-4 shrink-0" />
            <span>{group.label}</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="right"
        align="start"
        sideOffset={-4}
        className="w-56 rounded-lg border border-slate-200 bg-white shadow-lg p-1.5 data-[side=right]:animate-in data-[side=right]:slide-in-from-left-2"
      >
        {visibleChildren.map((child) => {
          const ChildIcon = ICON_MAP[child.key] || LayoutDashboard
          const isActive = location.pathname === child.route
          return (
            <DropdownMenuItem key={child.key} asChild>
              <NavLink
                to={child.route}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer w-full ${
                  isActive
                    ? 'text-[#0070d2] bg-[#e8f4fe]'
                    : 'text-[#16325c] hover:bg-slate-50'
                }`}
              >
                <ChildIcon className="w-4 h-4 shrink-0" />
                {child.label}
              </NavLink>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Sidebar() {
  const { canAccessMenu, isSuperuser } = useRBAC()

  const visibleItems = ALL_MENUS.filter((item) => {
    if (isGroup(item)) {
      const visible = item.children.some((child) => canAccessMenu(child.key))
      return visible
    }
    if (item.key === 'usermgmt' || item.key === 'companies' || item.key === 'audit-trail') return isSuperuser
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
      <CompanySwitcher />
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
