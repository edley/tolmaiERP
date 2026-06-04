import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { LiveClock } from './ui/live-clock'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'md' | 'full'
  companyName?: string
}

export function Modal({ open, onClose, title, children, size = 'md', companyName }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  if (size === 'full') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white">
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#dddbda] bg-white shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-lg font-semibold text-[#16325c] truncate">{title}</h2>
            {companyName && (
              <span className="shrink-0 text-[11px] font-medium text-[#514f4d] bg-[#f3f3f3] px-2 py-0.5 rounded">Company : {companyName}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <LiveClock className="text-[11px] text-[#514f4d] font-medium" />
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden px-6 py-5">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto z-10 border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 truncate">{title}</h2>
            {companyName && (
              <span className="shrink-0 text-[11px] font-medium text-[#514f4d] bg-[#f3f3f3] px-2 py-0.5 rounded">Company : {companyName}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <LiveClock className="text-[11px] text-[#514f4d] font-medium" />
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  )
}
