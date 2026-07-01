import type { FieldAuditEntry } from '../lib/fieldAuditLog'
import { fieldLabel } from '../lib/fieldAuditLog'
import { Pencil } from 'lucide-react'

interface Props {
  entries: FieldAuditEntry[]
}

export function AuditFieldChanges({ entries }: Props) {
  if (entries.length === 0) return null

  return (
    <div className="border border-[#dddbda] rounded-lg overflow-hidden bg-white">
      <div className="px-3 py-1.5 bg-[#f3f3f3] text-[11px] font-bold text-[#514f4d] uppercase tracking-wider border-b border-[#dddbda]">
        Field Changes
      </div>
      <div className="divide-y divide-[#dddbda]">
        {entries.map((entry) => (
          <div key={entry.id} className="px-3 py-2 text-xs space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Pencil className="w-3 h-3" />
              </div>
              <span className="font-semibold text-[#16325c]">{fieldLabel(entry.field_name)}</span>
              <span className="text-slate-400 ml-auto">
                by <span className="font-medium text-[#514f4d]">{entry.changed_by_name}</span>
                {' '}
                {new Date(entry.changed_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="ml-8 flex items-center gap-2 text-[11px]">
              {entry.old_value !== null ? (
                <span className="line-through text-[#c23934] bg-red-50 px-1.5 py-0.5 rounded max-w-[200px] truncate" title={entry.old_value}>
                  {entry.old_value}
                </span>
              ) : (
                <span className="text-slate-400 italic">(empty)</span>
              )}
              <span className="text-slate-300">→</span>
              {entry.new_value !== null ? (
                <span className="text-[#2e844a] bg-green-50 px-1.5 py-0.5 rounded font-medium max-w-[200px] truncate" title={entry.new_value}>
                  {entry.new_value}
                </span>
              ) : (
                <span className="text-slate-400 italic">(empty)</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
