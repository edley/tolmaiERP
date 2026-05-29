import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { PeriodSwitcher } from '../PeriodSwitcher'

export function Header() {
  const { user, logout, isOnline } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  if (!user) return null

  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="h-12 bg-white border-b border-[#dddbda] shrink-0 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-[#16325c]">Tolmai ERP</span>
        <PeriodSwitcher />
      </div>
      <div className="flex items-center gap-2" ref={menuRef}>
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="h-8 w-8 flex items-center justify-center text-[#514f4d] hover:text-[#0070d2] hover:bg-[#e8f4fe] rounded transition-colors"
          title="Settings"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="h-8 w-8 rounded-full bg-[#0070d2] text-white text-xs font-bold flex items-center justify-center hover:bg-[#005fb2] transition-colors"
            title={user.name}
          >
            {initials}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-[#dddbda] rounded-md shadow-lg z-50">
              <div className="px-4 py-3 border-b border-[#dddbda]">
                <div className="text-sm font-semibold text-[#16325c] truncate">{user.name}</div>
                <div className="text-xs text-[#514f4d] truncate">{user.email}</div>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); navigate('/settings') }}
                  className="w-full text-left px-4 py-2 text-sm text-[#16325c] hover:bg-[#e8f4fe] transition-colors"
                >
                  Settings
                </button>
                {isOnline && (
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); logout() }}
                    className="w-full text-left px-4 py-2 text-sm text-[#c23934] hover:bg-[#fef0f0] transition-colors"
                  >
                    Log Out
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
