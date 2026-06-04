import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useCompany } from '../../contexts/CompanyContext'
import { PeriodSwitcher } from '../PeriodSwitcher'
import { AccountMenu } from '../ui/account-menu'
import { LiveClock } from '../ui/live-clock'
import { Menu } from 'lucide-react'

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user } = useAuth()
  const { currentCompany, availableCompanies, switchCompany } = useCompany()
  const [companyOpen, setCompanyOpen] = useState(false)
  const [companyQuery, setCompanyQuery] = useState('')
  const companyRef = useRef<HTMLDivElement>(null)
  const companyInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) { setCompanyOpen(false); setCompanyQuery('') }
    }
    if (companyOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [companyOpen])

  useEffect(() => {
    if (companyOpen && companyInputRef.current) {
      companyInputRef.current.focus()
    }
  }, [companyOpen])

  if (!user) return null

  return (
    <div className="h-12 bg-white border-b border-[#dddbda] shrink-0 flex items-center justify-between px-2 sm:px-4 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded hover:bg-[#f3f3f3] transition-colors text-[#514f4d] shrink-0"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-bold text-[#16325c] truncate">Tolmai ERP</span>
        <PeriodSwitcher />
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {currentCompany && (
          <div className="relative hidden sm:block" ref={companyRef}>
            <button
              type="button"
              onClick={() => setCompanyOpen(!companyOpen)}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#16325c] border-r border-[#dddbda] pr-3 hover:text-[#0070d2] transition-colors"
              title="Switch company"
            >
              <span className="hidden md:inline truncate max-w-[120px]">{currentCompany.name}</span>
              <span className="md:hidden truncate max-w-[80px]">{currentCompany.name}</span>
              <svg className={`w-3 h-3 transition-transform shrink-0 ${companyOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {companyOpen && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-[#dddbda] rounded-md shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-2 border-b border-[#dddbda] text-[11px] font-bold text-[#514f4d] uppercase tracking-wider">
                  Switch Company
                </div>
                <div className="p-2 border-b border-[#dddbda]">
                  <input
                    ref={companyInputRef}
                    type="text"
                    placeholder="Search companies..."
                    value={companyQuery}
                    onChange={(e) => setCompanyQuery(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-[#dddbda] rounded outline-none focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2]"
                  />
                </div>
                <div className="py-1 max-h-52 overflow-y-auto">
                  {(() => {
                    const filtered = companyQuery
                      ? availableCompanies.filter((c) => c.name.toLowerCase().includes(companyQuery.toLowerCase()))
                      : availableCompanies
                    if (filtered.length === 0) {
                      return <div className="px-4 py-3 text-sm text-slate-400 italic">No companies found</div>
                    }
                    return filtered.map((c) => {
                      const isActive = currentCompany?.id === c.id
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            if (!isActive) switchCompany(c.id)
                            setCompanyOpen(false)
                            setCompanyQuery('')
                          }}
                          className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between transition-colors ${
                            isActive
                              ? 'bg-[#e8f4fe] text-[#0070d2] font-semibold'
                              : 'text-[#16325c] hover:bg-[#f3f3f3]'
                          }`}
                          disabled={isActive}
                        >
                          <span>{c.name}</span>
                          {isActive && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      )
                    })
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 sm:gap-3">
          <LiveClock className="text-[11px] text-[#514f4d] font-medium hidden sm:inline" />
          <AccountMenu userName={user.name} userEmail={user.email} userId={user.id} userAvatarUrl={user.avatar_url} />
        </div>
      </div>
    </div>
  )
}
