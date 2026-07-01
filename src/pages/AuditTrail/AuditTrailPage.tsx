import { useState, useEffect, useMemo } from 'react'
import { supabase, isOnline } from '../../lib/supabase'
import { PageLayout } from '../../components/PageLayout'
import { AuditTrail } from '../../components/AuditTrail'
import { AuditFieldChanges } from '../../components/AuditFieldChanges'
import { Modal } from '../../components/Modal'
import { Clock, FileText, CreditCard, ArrowDownToLine, Search } from 'lucide-react'
import { getFieldAuditEntries } from '../../lib/fieldAuditLog'
import type { RecordType } from '../../lib/fieldAuditLog'

interface AuditRecord {
  id: string
  type: 'JE' | 'PMT' | 'RCT'
  ref_number: string
  date: string
  description: string
  status: string
  created_by_name: string | null
  created_at: string
  submitted_by_name: string | null
  submitted_at: string | null
  approved_by_name: string | null
  approved_at: string | null
  posted_by_name: string | null
  posted_at: string | null
}

const TYPE_OPTIONS = ['All', 'JE', 'PMT', 'RCT'] as const
type TypeFilter = (typeof TYPE_OPTIONS)[number]

const TYPE_RECORD_MAP: Record<string, RecordType> = {
  JE: 'journal_entry',
  PMT: 'payment',
  RCT: 'receipt',
}

const TYPE_STYLES: Record<string, string> = {
  JE: 'bg-blue-50 text-blue-700',
  PMT: 'bg-amber-50 text-amber-700',
  RCT: 'bg-emerald-50 text-emerald-700',
}

function fmtAudit(iso: string | null, name: string | null) {
  if (!name || !iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function AuditTrailPage() {
  const [records, setRecords] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<AuditRecord | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All')

  useEffect(() => {
    if (!isOnline()) { setLoading(false); return }
    const fetchAll = async () => {
      setLoading(true)
      setError(null)
      try {
        const [je, pmt, rct] = await Promise.all([
          supabase!.from('journal_entries').select('id, entry_number, posting_date, description, status, created_by_name, created_at, submitted_by_name, submitted_at, approved_by_name, approved_at, posted_by_name, posted_at'),
          supabase!.from('payments').select('id, voucher_number, date, paid_to, status, created_by_name, created_at, submitted_by_name, submitted_at, approved_by_name, approved_at, posted_by_name, posted_at'),
          supabase!.from('receipts').select('id, voucher_number, date, received_from, status, created_by_name, created_at, submitted_by_name, submitted_at, approved_by_name, approved_at, posted_by_name, posted_at'),
        ])

        if (je.error) throw je.error
        if (pmt.error) throw pmt.error
        if (rct.error) throw rct.error

        const mapped: AuditRecord[] = [
          ...(je.data ?? []).map((r: any) => ({
            id: r.id,
            type: 'JE' as const,
            ref_number: r.entry_number,
            date: r.posting_date,
            description: r.description ?? '',
            status: r.status,
            created_by_name: r.created_by_name,
            created_at: r.created_at,
            submitted_by_name: r.submitted_by_name,
            submitted_at: r.submitted_at,
            approved_by_name: r.approved_by_name,
            approved_at: r.approved_at,
            posted_by_name: r.posted_by_name,
            posted_at: r.posted_at,
          })),
          ...(pmt.data ?? []).map((r: any) => ({
            id: r.id,
            type: 'PMT' as const,
            ref_number: r.voucher_number,
            date: r.date,
            description: r.paid_to ?? '',
            status: r.status,
            created_by_name: r.created_by_name,
            created_at: r.created_at,
            submitted_by_name: r.submitted_by_name,
            submitted_at: r.submitted_at,
            approved_by_name: r.approved_by_name,
            approved_at: r.approved_at,
            posted_by_name: r.posted_by_name,
            posted_at: r.posted_at,
          })),
          ...(rct.data ?? []).map((r: any) => ({
            id: r.id,
            type: 'RCT' as const,
            ref_number: r.voucher_number,
            date: r.date,
            description: r.received_from ?? '',
            status: r.status,
            created_by_name: r.created_by_name,
            created_at: r.created_at,
            submitted_by_name: r.submitted_by_name,
            submitted_at: r.submitted_at,
            approved_by_name: r.approved_by_name,
            approved_at: r.approved_at,
            posted_by_name: r.posted_by_name,
            posted_at: r.posted_at,
          })),
        ]

        mapped.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setRecords(mapped)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit records')
      }
      setLoading(false)
    }
    fetchAll()
  }, [])

  const filtered = useMemo(() => {
    let result = records
    if (typeFilter !== 'All') {
      result = result.filter((r) => r.type === typeFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((r) =>
        r.ref_number.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.created_by_name?.toLowerCase().includes(q) ||
        r.approved_by_name?.toLowerCase().includes(q) ||
        r.posted_by_name?.toLowerCase().includes(q)
      )
    }
    return result
  }, [records, search, typeFilter])

  return (
    <PageLayout title="Audit Trail" description="View audit trail for all journal entries, payments, and receipts">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Clock className="w-5 h-5 animate-spin text-[#0070d2]" />
        </div>
      ) : error ? (
        <div className="bg-[#fef0f0] border-l-4 border-[#c23934] p-4 rounded-r text-sm text-[#c23934] font-medium">
          {error}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setTypeFilter(opt)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    typeFilter === opt
                      ? 'bg-white text-[#16325c] shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {opt === 'All' ? 'All' : opt}
                </button>
              ))}
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search ref, description, user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs border border-[#dddbda] rounded text-[#16325c] hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-2.5 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Voucher</th>
                  <th className="text-left px-2.5 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Created</th>
                  <th className="text-left px-2.5 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Approved</th>
                  <th className="text-left px-2.5 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Posted</th>
                  <th className="text-left px-2.5 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={`${r.type}-${r.id}`}
                    onClick={() => setSelected(r)}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-2.5 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded ${TYPE_STYLES[r.type]}`}>
                          {r.type === 'JE' ? <FileText className="w-2.5 h-2.5" /> : r.type === 'PMT' ? <CreditCard className="w-2.5 h-2.5" /> : <ArrowDownToLine className="w-2.5 h-2.5" />}
                          {r.type}
                        </span>
                        <span className="text-xs font-medium text-[#16325c]">{r.ref_number}</span>
                      </div>
                    </td>
                    <td className="px-2.5 py-2 text-xs text-slate-500 whitespace-nowrap">{fmtAudit(r.created_at, r.created_by_name)}</td>
                    <td className="px-2.5 py-2 text-xs text-slate-500 whitespace-nowrap">{fmtAudit(r.approved_at, r.approved_by_name)}</td>
                    <td className="px-2.5 py-2 text-xs text-slate-500 whitespace-nowrap">{fmtAudit(r.posted_at, r.posted_by_name)}</td>
                    <td className="px-2.5 py-2 whitespace-nowrap">
                      <button onClick={(e) => { e.stopPropagation(); setSelected(r); }} className="text-[10px] font-semibold text-[#0070d2] hover:text-[#005fb2] hover:underline">
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm">No audit records found.</div>
            )}
          </div>
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Audit Trail — ${selected?.ref_number ?? ''}`} size="md">
        {selected && (
          <div className="flex flex-col gap-4">
            <AuditTrail data={selected} />
            <AuditFieldChanges entries={getFieldAuditEntries(TYPE_RECORD_MAP[selected.type], selected.id)} />
          </div>
        )}
      </Modal>
    </PageLayout>
  )
}
