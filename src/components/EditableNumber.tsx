import { useState, useRef, useEffect } from 'react'
import { Edit3 } from 'lucide-react'

interface EditableNumberProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  compact?: boolean
}

export function EditableNumber({ value, onChange, placeholder = '0.00', compact }: EditableNumberProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setDraft(value)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [editing])

  const displayValue = value ? parseFloat(value).toFixed(2) : ''

  const commit = () => {
    const trimmed = draft.trim()
    if (!trimmed) { onChange(''); setEditing(false); return }
    const num = parseFloat(trimmed)
    if (!isNaN(num) && num >= 0) { onChange(trimmed) }
    else { setDraft(value) }
    setEditing(false)
  }

  const cancel = () => {
    setDraft(value)
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') cancel()
  }

  if (editing) {
    return (
      <div className="relative">
        <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${compact ? 'text-xs' : 'text-sm'} text-slate-400 pointer-events-none`}>$</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className={`w-full ${compact ? 'h-7 pl-5 pr-2 text-xs' : 'h-8 pl-6 pr-2.5 text-sm'} border border-[#0070d2] rounded text-[#16325c] font-mono text-right ring-1 ring-[#0070d2] outline-none`}
          placeholder={placeholder}
        />
      </div>
    )
  }

  return (
    <div
      className="relative group cursor-pointer"
      onClick={() => setEditing(true)}
    >
      <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${compact ? 'text-xs' : 'text-sm'} text-slate-400 pointer-events-none select-none`}>$</span>
      <div className={`w-full ${compact ? 'h-7 pl-5 pr-7 text-xs' : 'h-8 pl-6 pr-8 text-sm'} border border-[#dddbda] rounded text-[#16325c] font-mono text-right flex items-center justify-end truncate bg-white hover:border-[#0070d2] transition-colors select-none`}>
        {displayValue || <span className="text-slate-400 font-sans font-normal">{placeholder}</span>}
      </div>
      <div className={`absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 hover:text-[#0070d2] transition-opacity pointer-events-none ${compact ? 'w-5 h-5' : 'w-6 h-6'}`}>
        <Edit3 className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      </div>
    </div>
  )
}
