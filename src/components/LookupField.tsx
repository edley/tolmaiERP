import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'

interface LookupOption {
  id: string
  label: string
  sublabel?: string | null
}

interface LookupFieldProps {
  value: string
  onChange: (value: string) => void
  options: LookupOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  compact?: boolean
}

function BinocularsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="7" width="6" height="13" rx="1.5" />
      <rect x="16.5" y="7" width="6" height="13" rx="1.5" />
      <path d="M7.5 7c0-3 2.5-4.5 8.5-4.5" />
      <path d="M1.5 20h6" />
      <path d="M16.5 20h6" />
      <ellipse cx="4.5" cy="20" rx="1.8" ry="1.2" fill="currentColor" stroke="none" />
      <ellipse cx="19.5" cy="20" rx="1.8" ry="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function LookupField({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No matching records found',
  compact,
}: LookupFieldProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightedIdx, setHighlightedIdx] = useState(-1)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.id === value)

  const filtered = useMemo(() => {
    if (!search.trim()) return options
    const q = search.toLowerCase()
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.sublabel && o.sublabel.toLowerCase().includes(q))
    )
  }, [options, search])

  const openDropdown = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const panelH = 400
    let top: number
    if (spaceBelow >= panelH || spaceBelow >= rect.top) {
      top = rect.bottom + 4
    } else {
      top = rect.top - panelH - 4
    }
    setPanelStyle({
      position: 'fixed',
      top,
      left: rect.left,
      width: Math.max(rect.width, 360),
    })
    setHighlightedIdx(-1)
    setOpen(true)
  }, [])

  const closeDropdown = useCallback(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setSearch('')
      setHighlightedIdx(-1)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: Event) => {
      if (panelRef.current && panelRef.current.contains(e.target as Node)) return
      closeDropdown()
    }
    window.addEventListener('scroll', handler, true)
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('scroll', handler, true)
      window.removeEventListener('resize', handler)
    }
  }, [open, closeDropdown])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        panelRef.current && !panelRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        closeDropdown()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, closeDropdown])

  useEffect(() => {
    setHighlightedIdx(-1)
  }, [search])

  const handleSelect = (id: string) => {
    onChange(id)
    closeDropdown()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      e.stopPropagation()
      setHighlightedIdx((prev) => (prev < filtered.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      setHighlightedIdx((prev) => (prev > 0 ? prev - 1 : filtered.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      if (highlightedIdx >= 0) {
        handleSelect(filtered[highlightedIdx].id)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      closeDropdown()
    }
  }

  useEffect(() => {
    if (highlightedIdx < 0 || !listRef.current) return
    const item = listRef.current.children[highlightedIdx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [highlightedIdx])

  return (
    <div ref={triggerRef}>
      <div className="flex items-stretch gap-0">
        <div
          className={`flex-1 flex items-center ${compact ? 'h-7 px-2 text-xs' : 'h-8 px-2.5 text-sm'} border rounded-l cursor-pointer ${
            selected
              ? 'border-[#dddbda] text-[#16325c] bg-white hover:border-[#0070d2]'
              : 'border-[#dddbda] text-slate-400 bg-white hover:border-[#0070d2]'
          } transition-colors`}
          onClick={openDropdown}
        >
          {selected ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <BinocularsIcon className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-[#0070d2] shrink-0`} />
              <span className="truncate">{selected.label}{selected.sublabel ? <span className="text-slate-400 ml-1">· {selected.sublabel}</span> : null}</span>
            </div>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>
        {selected && (
          <button
            type="button"
            onClick={() => onChange('')}
            className={`${compact ? 'h-7 w-7' : 'h-8 w-8'} flex items-center justify-center border border-l-0 border-[#dddbda] rounded-r text-slate-400 hover:text-[#c23934] hover:bg-[#fef0f0] transition-colors`}
            title="Clear selection"
          >
            <X className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          </button>
        )}
        {!selected && (
          <button
            type="button"
            onClick={openDropdown}
            className={`${compact ? 'h-7 w-7' : 'h-8 w-8'} flex items-center justify-center border border-l-0 border-[#dddbda] rounded-r text-[#0070d2] hover:bg-[#e8f4fe] transition-colors`}
            title="Search"
          >
            <BinocularsIcon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          </button>
        )}
      </div>

      {open && createPortal(
        <div ref={panelRef} style={panelStyle} className="z-[9999] bg-white border border-[#dddbda] rounded-md shadow-lg">
          <div className="p-2 border-b border-[#dddbda]">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" strokeWidth="2" />
                <path strokeWidth="2" d="M21 21l-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full h-8 pl-8 pr-3 text-sm border border-[#dddbda] rounded text-[#16325c] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none"
                placeholder={searchPlaceholder}
              />
            </div>
          </div>
          <div ref={listRef} className="overflow-y-auto lookup-scrollbar" style={{ maxHeight: '50vh', scrollbarWidth: 'thin', scrollbarColor: '#c9c7c5 #f3f3f3', overflowY: 'scroll' }}>
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-sm text-slate-400 text-center">{emptyMessage}</div>
            )}
            {filtered.map((option, idx) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option.id)}
                onMouseEnter={() => setHighlightedIdx(idx)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                  idx === highlightedIdx
                    ? 'bg-[#0070d2] text-white'
                    : option.id === value
                    ? 'bg-[#e8f4fe] font-medium text-[#16325c]'
                    : 'text-[#16325c] hover:bg-[#e8f4fe]'
                }`}
              >
                <div className="min-w-0">
                  <span className="text-[#16325c]">{option.label}</span>
                  {option.sublabel && (
                    <span className="text-slate-400 ml-1.5 text-xs">{option.sublabel}</span>
                  )}
                </div>
                {option.id === value && (
                  <svg className="w-4 h-4 text-[#0070d2] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
