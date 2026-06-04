import type { ViewFilterValue } from '../../contexts/ViewFilterContext'

interface ViewFilterProps {
  value: ViewFilterValue
  onChange: (v: ViewFilterValue) => void
}

const OPTIONS: { value: ViewFilterValue; label: string }[] = [
  { value: 'recent', label: 'Recent' },
  { value: '10days', label: 'Past 10 Days' },
  { value: 'all', label: 'All' },
]

export function ViewFilter({ value, onChange }: ViewFilterProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-medium text-[#514f4d] uppercase tracking-wider shrink-0">
        View
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as ViewFilterValue)}
          className="appearance-none text-xs border border-[#dddbda] rounded px-2.5 py-1.5 pr-7 bg-white text-[#16325c] cursor-pointer hover:border-[#0070d2] focus:outline-none focus:ring-1 focus:ring-[#0070d2] focus:border-[#0070d2] min-w-[125px]"
        >
          {OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#514f4d] pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}
