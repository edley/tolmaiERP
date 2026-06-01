import { useState, useMemo, useCallback } from 'react'
import { Database, CheckSquare, Square, Loader2, ThumbsUp } from 'lucide-react'
import { PageLayout } from '../../components/PageLayout'
import { DataTable } from '../../components/DataTable'
import { useJournalEntries } from '../../hooks/useJournalEntries'
import { usePayments } from '../../hooks/usePayments'
import { useReceipts } from '../../hooks/useReceipts'
import { usePeriod } from '../../contexts/PeriodContext'
import { useRBAC } from '../../hooks/useRBAC'
import { LookupField } from '../../components/LookupField'

type PendingRow = {
  id: string
  type: 'Journal Entry' | 'Payment' | 'Receipt'
  typeCode: string
  number: string
  date: string
  description: string
  amount: number
  status: string
  period_id: string | null
}

const TYPE_STYLES: Record<string, string> = {
  JE: 'bg-[#e8f4fe] text-[#0070d2]',
  PMT: 'bg-[#fef7e0] text-[#6b5200]',
  RCT: 'bg-[#f3e8fe] text-[#5a20a0]',
}

export function PendingPosting() {
  const { entries, loading: loadingJE, postEntry, refetch: refetchJE } = useJournalEntries()
  const { payments, loading: loadingPMT, postToLedger: postPayment, refetch: refetchPMT } = usePayments()
  const { receipts, loading: loadingRCT, postToLedger: postReceipt, refetch: refetchRCT } = useReceipts()
  const { userType } = useRBAC()
  const { periods, currentPeriod, setCurrentPeriod } = usePeriod()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [posting, setPosting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingType, setPendingType] = useState<'posting' | 'approval'>('posting')

  const canPost = userType === 'Superuser' || userType === 'Manager'

  const periodOptions = useMemo(() =>
    periods.map((p) => ({ id: p.id, label: p.name, sublabel: p.status === 'closed' ? 'Closed' : null })),
    [periods]
  )

  const targetStatus = pendingType === 'posting' ? 'approved' : 'submitted'

  const pendingRows: PendingRow[] = useMemo(() => {
    const rows: PendingRow[] = []

    for (const e of entries) {
      if (e.status !== targetStatus) continue
      rows.push({
        id: e.id,
        type: 'Journal Entry',
        typeCode: 'JE',
        number: e.entry_number,
        date: e.posting_date,
        description: e.description ?? '-',
        amount: e.total_debit,
        status: e.status,
        period_id: e.period_id ?? null,
      })
    }

    for (const p of payments) {
      if (p.status !== targetStatus) continue
      rows.push({
        id: p.id,
        type: 'Payment',
        typeCode: 'PMT',
        number: p.voucher_number,
        date: p.date,
        description: p.paid_to,
        amount: p.voucher_amount,
        status: p.status,
        period_id: p.period_id ?? null,
      })
    }

    for (const r of receipts) {
      if (r.status !== targetStatus) continue
      rows.push({
        id: r.id,
        type: 'Receipt',
        typeCode: 'RCT',
        number: r.voucher_number,
        date: r.date,
        description: r.received_from,
        amount: r.voucher_amount,
        status: r.status,
        period_id: r.period_id ?? null,
      })
    }

    rows.sort((a, b) => b.date.localeCompare(a.date))
    return rows
  }, [entries, payments, receipts, targetStatus])

  const filtered = useMemo(() => {
    if (!currentPeriod) return pendingRows
    return pendingRows.filter((r) => r.period_id === currentPeriod.id)
  }, [pendingRows, currentPeriod])

  const toggleAll = useCallback(() => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((r) => r.id)))
    }
  }, [selected, filtered])

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const postAll = useCallback(async () => {
    setActionError(null)
    setPosting(true)
    const toPost = filtered.filter((r) => r.id)
    const errors: string[] = []
    for (const row of toPost) {
      try {
        if (row.typeCode === 'JE') await postEntry(row.id)
        else if (row.typeCode === 'PMT') await postPayment(row.id)
        else if (row.typeCode === 'RCT') await postReceipt(row.id)
      } catch (err) {
        errors.push(`${row.number}: ${err instanceof Error ? err.message : 'Post failed'}`)
      }
    }
    if (errors.length > 0) {
      setActionError(`${errors.length} of ${toPost.length} failed:\n${errors.join('\n')}`)
    }
    refetchJE()
    refetchPMT()
    refetchRCT()
    setSelected(new Set())
    setPosting(false)
  }, [filtered, postEntry, postPayment, postReceipt, refetchJE, refetchPMT, refetchRCT])

  const postSelected = useCallback(async () => {
    setActionError(null)
    setPosting(true)
    const toPost = filtered.filter((r) => selected.has(r.id))
    const errors: string[] = []
    for (const row of toPost) {
      try {
        if (row.typeCode === 'JE') await postEntry(row.id)
        else if (row.typeCode === 'PMT') await postPayment(row.id)
        else if (row.typeCode === 'RCT') await postReceipt(row.id)
      } catch (err) {
        errors.push(`${row.number}: ${err instanceof Error ? err.message : 'Post failed'}`)
      }
    }
    if (errors.length > 0) {
      setActionError(`${errors.length} of ${toPost.length} failed:\n${errors.join('\n')}`)
    }
    refetchJE()
    refetchPMT()
    refetchRCT()
    setSelected(new Set())
    setPosting(false)
  }, [filtered, selected, postEntry, postPayment, postReceipt, refetchJE, refetchPMT, refetchRCT])

  const loading = loadingJE || loadingPMT || loadingRCT

  return (
    <PageLayout
      title="Post to Ledger"
      description={pendingType === 'posting' ? 'Review and post approved transactions to the General Ledger' : 'Review and approve submitted transactions'}
      docType="ledger_entry"
      actions={
        canPost && pendingType === 'posting' && filtered.length > 0 ? (
          <div className="flex items-center gap-2">
            <button
              onClick={postSelected}
              disabled={posting || selected.size === 0}
              className="h-8 px-4 text-sm font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
            >
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              Post Selected ({selected.size})
            </button>
            <button
              onClick={postAll}
              disabled={posting || filtered.length === 0}
              className="h-8 px-4 text-sm font-semibold text-white bg-[#007a33] rounded hover:bg-[#006028] disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
            >
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              Post All ({filtered.length})
            </button>
          </div>
        ) : undefined
      }
    >
      {actionError && (
        <div className="mb-4 bg-[#fef0f0] border-l-4 border-[#c23934] p-4 rounded-r text-sm text-[#c23934] font-medium whitespace-pre-line">
          {actionError}
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 bg-white border border-[#dddbda] rounded-lg px-4 py-3 shadow-sm flex-wrap">
        <svg className="w-4 h-4 text-[#514f4d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="1.5" />
          <path strokeWidth="1.5" d="M3 10h18" />
          <path strokeWidth="1.5" d="M8 2v4" />
          <path strokeWidth="1.5" d="M16 2v4" />
        </svg>
        <span className="text-[11px] font-bold text-[#514f4d] uppercase tracking-wider shrink-0">Accounting Period</span>
        <div className="w-64">
          <LookupField
            value={currentPeriod?.id ?? ''}
            onChange={setCurrentPeriod}
            options={periodOptions}
            placeholder="Select period..."
            searchPlaceholder="Search periods..."
          />
        </div>
        {currentPeriod && (
          <span className="text-xs text-[#514f4d] flex items-center gap-2">
            <span className="whitespace-nowrap">{currentPeriod.start_date} — {currentPeriod.end_date}</span>
            <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded ${
              currentPeriod.status === 'open' ? 'bg-[#e8f4fe] text-[#0070d2]' : 'bg-[#f3f3f3] text-[#514f4d]'
            }`}>
              {currentPeriod.status === 'open' ? 'Open' : 'Closed'}
            </span>
          </span>
        )}
        <div className="flex items-center gap-1 ml-2 bg-[#f3f3f3] rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setPendingType('posting')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${
              pendingType === 'posting'
                ? 'bg-white text-[#0070d2] shadow-sm'
                : 'text-[#514f4d] hover:text-[#0070d2]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Pending for Posting
          </button>
          <button
            type="button"
            onClick={() => setPendingType('approval')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${
              pendingType === 'approval'
                ? 'bg-white text-[#0070d2] shadow-sm'
                : 'text-[#514f4d] hover:text-[#0070d2]'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            Pending for Approval
          </button>
        </div>
        <span className="text-xs text-[#514f4d] ml-auto">
          {filtered.length} transaction{filtered.length !== 1 ? 's' : ''} {pendingType === 'posting' ? 'pending posting' : 'pending approval'}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <DataTable
          columns={[
            {
              key: 'select',
              header: '',
              render: (row: PendingRow) => (
                <button
                  type="button"
                  onClick={() => toggle(row.id)}
                  className="p-1 text-slate-400 hover:text-[#0070d2] transition-colors"
                >
                  {selected.has(row.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>
              ),
            },
            {
              key: 'select_all',
              header: '',
              render: () => (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="p-1 text-slate-400 hover:text-[#0070d2] transition-colors"
                >
                  {selected.size === filtered.length && filtered.length > 0
                    ? <CheckSquare className="w-4 h-4" />
                    : <Square className="w-4 h-4" />}
                </button>
              ),
            },
            {
              key: 'type',
              header: 'Type',
              render: (row: PendingRow) => (
                <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded ${TYPE_STYLES[row.typeCode]}`}>
                  {row.typeCode}
                </span>
              ),
            },
            {
              key: 'number',
              header: 'Voucher #',
              render: (row: PendingRow) => (
                <span className="font-mono font-medium text-slate-900">{row.number}</span>
              ),
            },
            {
              key: 'date',
              header: 'Date',
              render: (row: PendingRow) => (
                <span>{new Date(row.date).toLocaleDateString('en-GB')}</span>
              ),
            },
            {
              key: 'description',
              header: 'Description',
              render: (row: PendingRow) => (
                <span className="text-slate-500 truncate block max-w-[200px]">{row.description}</span>
              ),
            },
            {
              key: 'amount',
              header: 'Amount',
              render: (row: PendingRow) => (
                <span className="font-mono">{row.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              ),
            },
          ]}
          data={filtered}
          loading={loading}
          emptyMessage={
            currentPeriod
              ? `No ${pendingType === 'posting' ? 'approved' : 'submitted'} transactions found for this period.`
              : `No ${pendingType === 'posting' ? 'approved' : 'submitted'} transactions found.`
          }
          pageSize={25}
        />
      </div>
    </PageLayout>
  )
}
