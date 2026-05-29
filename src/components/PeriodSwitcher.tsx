import { useState, useRef, useEffect } from 'react'
import { usePeriod } from '../contexts/PeriodContext'
import { useNavigate } from 'react-router-dom'

export function PeriodSwitcher() {
  const { periods, currentPeriod, setCurrentPeriod } = usePeriod()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-8 flex items-center gap-1.5 px-3 text-xs font-semibold text-[#16325c] bg-white border border-[#dddbda] rounded hover:border-[#0070d2] hover:bg-[#fafaf9] transition-colors"
      >
        <svg className="w-3.5 h-3.5 text-[#514f4d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="1.5" />
          <path strokeWidth="1.5" d="M3 10h18" />
          <path strokeWidth="1.5" d="M8 2v4" />
          <path strokeWidth="1.5" d="M16 2v4" />
        </svg>
        <span>{currentPeriod?.name ?? 'Select Period'}</span>
        <svg className={`w-3 h-3 text-[#514f4d] transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeWidth={2} d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-72 bg-white border border-[#dddbda] rounded-md shadow-lg z-50">
          <div className="px-4 py-2.5 border-b border-[#dddbda] flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#514f4d] uppercase tracking-wider">Accounting Period</span>
            <button
              type="button"
              onClick={() => { setOpen(false); navigate('/accounting-periods') }}
              className="text-[11px] text-[#0070d2] font-semibold hover:underline"
            >
              Manage
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {periods.map((p) => {
              const isActive = p.id === currentPeriod?.id
              const isPast = new Date(p.end_date) < new Date()
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setCurrentPeriod(p.id); setOpen(false) }}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                    isActive
                      ? 'bg-[#e8f4fe]'
                      : 'hover:bg-[#f3f3f3]'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${isActive ? 'text-[#0070d2]' : 'text-[#16325c]'}`}>
                      {p.name}
                    </div>
                    <div className="text-[10px] text-[#514f4d] mt-0.5">
                      {p.start_date} — {p.end_date}
                    </div>
                  </div>
                  <div className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded ${
                    p.status === 'open'
                      ? 'bg-[#e8f4fe] text-[#0070d2]'
                      : 'bg-[#f3f3f3] text-[#514f4d]'
                  }`}>
                    {p.status === 'open' ? 'Open' : 'Closed'}
                  </div>
                  {isPast && p.status === 'open' && (
                    <div className="shrink-0 w-2 h-2 rounded-full bg-[#c23934]" title="Past due" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
