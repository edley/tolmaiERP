import { Plus, Send, CheckCircle, Upload } from 'lucide-react'

interface AuditData {
  created_at: string
  created_by_name: string | null
  submitted_by_name: string | null
  submitted_at: string | null
  approved_by_name: string | null
  approved_at: string | null
  posted_by_name: string | null
  posted_at: string | null
}

export function AuditTrail({ data }: { data: AuditData }) {
  const entries: { label: string; by: string | null; at: string | null; icon: React.ReactNode }[] = [
    {
      label: 'Created',
      by: data.created_by_name,
      at: data.created_at,
      icon: <Plus className="w-3 h-3" />,
    },
    {
      label: 'Submitted',
      by: data.submitted_by_name,
      at: data.submitted_at,
      icon: <Send className="w-3 h-3" />,
    },
    {
      label: 'Approved',
      by: data.approved_by_name,
      at: data.approved_at,
      icon: <CheckCircle className="w-3 h-3" />,
    },
    {
      label: 'Posted',
      by: data.posted_by_name,
      at: data.posted_at,
      icon: <Upload className="w-3 h-3" />,
    },
  ]

  return (
    <div className="border border-[#dddbda] rounded-lg overflow-hidden bg-white">
      <div className="px-3 py-1.5 bg-[#f3f3f3] text-[11px] font-bold text-[#514f4d] uppercase tracking-wider border-b border-[#dddbda]">
        Audit Trail
      </div>
      <div className="divide-y divide-[#dddbda]">
        {entries.map((entry) => (
          <div key={entry.label} className="flex items-center gap-3 px-3 py-2 text-xs">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              entry.at ? 'bg-[#e8f4fe] text-[#0070d2]' : 'bg-[#f3f3f3] text-[#c9c7c5]'
            }`}>
              {entry.icon}
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-[#16325c]">{entry.label}</span>
              {entry.at ? (
                <span className="text-[#514f4d] ml-1">
                  by <span className="font-medium">{entry.by ?? 'Unknown'}</span>
                  <span className="text-slate-400 ml-1">
                    {new Date(entry.at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </span>
              ) : (
                <span className="text-slate-400 ml-1">— Pending</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
