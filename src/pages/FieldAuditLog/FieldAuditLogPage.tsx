import { useState, useEffect, useMemo } from 'react'
import { supabase, isOnline } from '../../lib/supabase'
import { PageLayout } from '../../components/PageLayout'
import { AuditTrail } from '../../components/AuditTrail'
import { AuditFieldChanges } from '../../components/AuditFieldChanges'
import { Modal } from '../../components/Modal'
import { getFieldAuditEntries, fieldLabel } from '../../lib/fieldAuditLog'
import { getJournalEntries } from '../../lib/journalEntries'
import { getPayments } from '../../lib/payments'
import { getReceipts } from '../../lib/receipts'
import type { FieldAuditEntry, RecordType } from '../../lib/fieldAuditLog'
import { Clock, FileText, CreditCard, ArrowDownToLine, Search } from 'lucide-react'
import { useCompany } from '../../contexts/CompanyContext'

interface FlatFieldEntry {
  audit: FieldAuditEntry
  ref_number: string
  date: string
}

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

const TYPE_LABELS: Record<string, string> = {
  journal_entry: 'JE',
  payment: 'PMT',
  receipt: 'RCT',
}

const LABEL_TO_TYPE: Record<string, string> = {
  JE: 'journal_entry',
  PMT: 'payment',
  RCT: 'receipt',
}

const TYPE_OPTIONS = ['All', 'JE', 'PMT', 'RCT'] as const
type TypeFilter = (typeof TYPE_OPTIONS)[number]

const TYPE_STYLES: Record<string, string> = {
  JE: 'bg-blue-50 text-blue-700',
  PMT: 'bg-amber-50 text-amber-700',
  RCT: 'bg-emerald-50 text-emerald-700',
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  JE: <FileText className="w-2.5 h-2.5" />,
  PMT: <CreditCard className="w-2.5 h-2.5" />,
  RCT: <ArrowDownToLine className="w-2.5 h-2.5" />,
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function FieldAuditLogPage() {
  const { currentCompany } = useCompany()
  const [entries, setEntries] = useState<FlatFieldEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<FlatFieldEntry | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      const refMap: Record<string, { ref: string; date: string }> = {}

      if (isOnline() && supabase && currentCompany?.id) {
        try {
          const [jeRes, pmtRes, rctRes, auditRes] = await Promise.all([
            supabase.from('journal_entries').select('id, entry_number, posting_date').eq('company_id', currentCompany.id),
            supabase.from('payments').select('id, voucher_number, date').eq('company_id', currentCompany.id),
            supabase.from('receipts').select('id, voucher_number, date').eq('company_id', currentCompany.id),
            supabase.from('field_audit_log').select('*').eq('company_id', currentCompany.id).order('changed_at', { ascending: false }),
          ])

          if (jeRes.data) for (const r of jeRes.data) refMap[r.id] = { ref: r.entry_number, date: r.posting_date }
          if (pmtRes.data) for (const r of pmtRes.data) refMap[r.id] = { ref: r.voucher_number, date: r.date }
          if (rctRes.data) for (const r of rctRes.data) refMap[r.id] = { ref: r.voucher_number, date: r.date }

          if (auditRes.data && auditRes.data.length > 0) {
            const mapped: FlatFieldEntry[] = (auditRes.data as any[]).map((r) => ({
              audit: {
                id: r.id,
                company_id: r.company_id,
                record_type: r.record_type as RecordType,
                record_id: r.record_id,
                field_name: r.field_name,
                old_value: r.old_value ?? null,
                new_value: r.new_value ?? null,
                changed_by: r.changed_by,
                changed_by_name: r.changed_by_name,
                changed_at: r.changed_at,
              },
              ref_number: refMap[r.record_id]?.ref ?? r.record_id.slice(0, 8),
              date: refMap[r.record_id]?.date ?? '',
            }))
            setEntries(mapped)
            setLoading(false)
            return
          }
        } catch (err) {
          console.warn('Failed to fetch field audit log from DB:', err)
        }
      }

      const local = getFieldAuditEntries()
      if (local.length > 0) {
        const mapped: FlatFieldEntry[] = local.map((a) => ({
          audit: a,
          ref_number: a.record_id.slice(0, 8),
          date: a.changed_at.split('T')[0],
        }))
        setEntries(mapped)
      } else {
        setEntries([])
      }
      setLoading(false)
    }
    load()
  }, [currentCompany?.id])

  const filtered = useMemo(() => {
    let result = entries
    if (typeFilter !== 'All') {
      const rt = LABEL_TO_TYPE[typeFilter]
      result = result.filter((e) => e.audit.record_type === rt)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((e) =>
        e.ref_number.toLowerCase().includes(q) ||
        fieldLabel(e.audit.field_name).toLowerCase().includes(q) ||
        e.audit.changed_by_name.toLowerCase().includes(q) ||
        (e.audit.old_value ?? '').toLowerCase().includes(q) ||
        (e.audit.new_value ?? '').toLowerCase().includes(q)
      )
    }
    return result
  }, [entries, search, typeFilter])

  const selectedGroup = useMemo(() => {
    if (!selected) return []
    const recordId = selected.audit.record_id
    return entries
      .filter((e) => e.audit.record_id === recordId)
      .map((e) => e.audit)
      .sort((a, b) => a.changed_at.localeCompare(b.changed_at))
  }, [selected, entries])

  const selectedAuditData = useMemo((): AuditData | null => {
    if (!selected) return null
    const { record_type, record_id } = selected.audit
    let records: any[] = []
    if (record_type === 'journal_entry') records = getJournalEntries()
    else if (record_type === 'payment') records = getPayments()
    else if (record_type === 'receipt') records = getReceipts()
    const rec = records.find((r) => r.id === record_id)
    if (!rec) return null
    return {
      created_at: rec.created_at,
      created_by_name: rec.created_by_name,
      submitted_by_name: rec.submitted_by_name,
      submitted_at: rec.submitted_at,
      approved_by_name: rec.approved_by_name,
      approved_at: rec.approved_at,
      posted_by_name: rec.posted_by_name,
      posted_at: rec.posted_at,
    }
  }, [selected])

  return (
    <PageLayout title="Field Audit Log" description="View field-level changes across all transactions">
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
                placeholder="Search field, value, user..."
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
                  <th className="text-left px-2.5 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Type</th>
                  <th className="text-left px-2.5 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Ref</th>
                  <th className="text-left px-2.5 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Field</th>
                  <th className="text-left px-2.5 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Old Value</th>
                  <th className="text-left px-2.5 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">New Value</th>
                  <th className="text-left px-2.5 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Changed By</th>
                  <th className="text-left px-2.5 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Changed At</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => {
                  const label = TYPE_LABELS[entry.audit.record_type] ?? '—'
                  return (
                    <tr
                      key={entry.audit.id}
                      onClick={() => setSelected(entry)}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="px-2.5 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded ${TYPE_STYLES[label]}`}>
                          {TYPE_ICONS[label]}
                          {label}
                        </span>
                      </td>
                      <td className="px-2.5 py-2 whitespace-nowrap">
                        <span className="text-xs font-medium text-[#16325c]">{entry.ref_number}</span>
                      </td>
                      <td className="px-2.5 py-2 whitespace-nowrap">
                        <span className="text-xs text-[#16325c]">{fieldLabel(entry.audit.field_name)}</span>
                      </td>
                      <td className="px-2.5 py-2 whitespace-nowrap max-w-[160px]">
                        <span className="text-xs text-[#c23934] line-through truncate block" title={entry.audit.old_value ?? undefined}>
                          {entry.audit.old_value ?? <span className="text-slate-400 italic">empty</span>}
                        </span>
                      </td>
                      <td className="px-2.5 py-2 whitespace-nowrap max-w-[160px]">
                        <span className="text-xs text-[#2e844a] font-medium truncate block" title={entry.audit.new_value ?? undefined}>
                          {entry.audit.new_value ?? <span className="text-slate-400 italic">empty</span>}
                        </span>
                      </td>
                      <td className="px-2.5 py-2 whitespace-nowrap">
                        <span className="text-xs text-[#514f4d]">{entry.audit.changed_by_name}</span>
                      </td>
                      <td className="px-2.5 py-2 whitespace-nowrap">
                        <span className="text-xs text-slate-500">{fmtTime(entry.audit.changed_at)}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm">No field audit entries found.</div>
            )}
          </div>
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Record Audit — ${selected?.ref_number ?? ''}`} size="md">
        {selected && (
          <div className="flex flex-col gap-4">
            {selectedAuditData && <AuditTrail data={selectedAuditData} />}
            {selectedGroup.length > 0 && <AuditFieldChanges entries={selectedGroup} />}
            {selectedGroup.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">No field changes recorded for this record.</div>
            )}
          </div>
        )}
      </Modal>
    </PageLayout>
  )
}
