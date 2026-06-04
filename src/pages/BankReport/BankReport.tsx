import { useState, useMemo, useCallback } from 'react'
import { Download } from 'lucide-react'
import { usePeriod } from '../../contexts/PeriodContext'
import { useReceipts } from '../../hooks/useReceipts'
import { usePayments } from '../../hooks/usePayments'
import { usePaymentModes } from '../../hooks/usePaymentModes'
import { useAccounts } from '../../hooks/useAccounts'
import { PageLayout } from '../../components/PageLayout'
import { LookupField } from '../../components/LookupField'
import { DemoBanner } from '../../components/DemoBanner'
import { exportToExcel } from '../../lib/exportToExcel'

interface TransactionRow {
  id: string
  date: string
  voucherNumber: string
  type: 'RCT' | 'PMT'
  counterparty: string
  description: string
  debit: number
  credit: number
}

export function BankReport() {
  const { periods, currentPeriod } = usePeriod()
  const { receipts, loading: receiptsLoading } = useReceipts()
  const { payments, loading: paymentsLoading } = usePayments()
  const { modes: paymentModes } = usePaymentModes()
  const { accounts } = useAccounts()

  const [selectedPeriodId, setSelectedPeriodId] = useState(currentPeriod?.id ?? '')
  const [selectedModeId, setSelectedModeId] = useState('')

  const periodOptions = useMemo(() =>
    periods.map((p) => ({
      id: p.id,
      label: p.name,
      sublabel: `${p.start_date} — ${p.end_date}${p.status === 'closed' ? ' (Closed)' : ''}`,
    })),
    [periods]
  )

  const bankOptions = useMemo(() =>
    paymentModes.map((m) => {
      const acc = accounts.find((a) => a.id === m.gl_account_id)
      return { id: m.id, label: m.name, sublabel: acc ? `${acc.code} — ${acc.name}` : 'No GL code' }
    }),
    [paymentModes, accounts]
  )

  const selectedBank = useMemo(
    () => paymentModes.find((m) => m.id === selectedModeId),
    [paymentModes, selectedModeId]
  )

  const transactions: TransactionRow[] = useMemo(() => {
    if (!selectedPeriodId || !selectedModeId) return []

    const rows: TransactionRow[] = []

    for (const r of receipts) {
      if (r.period_id !== selectedPeriodId || r.mode_of_payment_id !== selectedModeId) continue
      rows.push({
        id: r.id + '-rct',
        date: r.date,
        voucherNumber: r.voucher_number,
        type: 'RCT',
        counterparty: r.received_from,
        description: r.description || r.invoice_no || '',
        debit: 0,
        credit: r.voucher_amount,
      })
    }

    for (const p of payments) {
      if (p.period_id !== selectedPeriodId || p.mode_of_payment_id !== selectedModeId) continue
      rows.push({
        id: p.id + '-pmt',
        date: p.date,
        voucherNumber: p.voucher_number,
        type: 'PMT',
        counterparty: p.paid_to,
        description: p.description || p.invoice_no || '',
        debit: p.voucher_amount,
        credit: 0,
      })
    }

    rows.sort((a, b) => a.date.localeCompare(b.date) || a.voucherNumber.localeCompare(b.voucherNumber))
    return rows
  }, [receipts, payments, selectedPeriodId, selectedModeId])

  const totals = useMemo(() => {
    const debit = transactions.reduce((s, t) => s + t.debit, 0)
    const credit = transactions.reduce((s, t) => s + t.credit, 0)
    return { debit, credit, balance: credit - debit }
  }, [transactions])

  const loading = receiptsLoading || paymentsLoading

  const handleExport = useCallback(() => {
    if (transactions.length === 0) return
    exportToExcel(
      transactions,
      [
        { header: 'Date', accessor: (r) => new Date(r.date).toLocaleDateString('en-GB') },
        { header: 'Voucher #', accessor: (r) => r.voucherNumber },
        { header: 'Type', accessor: (r) => r.type },
        { header: 'Counterparty', accessor: (r) => r.counterparty },
        { header: 'Description', accessor: (r) => r.description },
        { header: 'Debit', accessor: (r) => r.debit },
        { header: 'Credit', accessor: (r) => r.credit },
      ],
      `bank-report-${selectedBank?.name ?? 'unknown'}-${selectedPeriodId?.slice(0, 8)}`
    )
  }, [transactions, selectedBank, selectedPeriodId])

  return (
    <PageLayout
      title="Bank Report"
      description={selectedBank ? `${selectedBank.name} — ${selectedBank.bank_account_no || ''}` : 'Select a bank account to view transactions'}
      docType="bank_report"
      actions={
        <button type="button" onClick={handleExport} disabled={transactions.length === 0} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
      }
    >
      <DemoBanner visible={false} />

      {/* ── Filters + Mini Stats (single row) ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto_auto_auto_auto] items-end gap-3">
          <div>
            <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-0.5">Period</label>
            <LookupField
              compact
              value={selectedPeriodId}
              onChange={setSelectedPeriodId}
              options={periodOptions}
              placeholder="— Select —"
              searchPlaceholder="Search periods..."
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-0.5">Bank Account</label>
            <LookupField
              compact
              value={selectedModeId}
              onChange={setSelectedModeId}
              options={bankOptions}
              placeholder="— Select —"
              searchPlaceholder="Search banks..."
            />
          </div>
          {selectedPeriodId && selectedModeId && !loading && (
            <>
              <div className="text-right">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">CR</p>
                <p className="text-xs font-bold text-[#007a33] whitespace-nowrap">
                  ${totals.credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">DR</p>
                <p className="text-xs font-bold text-[#c23934] whitespace-nowrap">
                  ${totals.debit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Net</p>
                <p className={`text-xs font-bold whitespace-nowrap ${totals.balance >= 0 ? 'text-[#007a33]' : 'text-[#c23934]'}`}>
                  ${totals.balance.toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Count</p>
                <p className="text-xs font-bold text-[#16325c] whitespace-nowrap">{transactions.length}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Transaction Table (fixed header, scrollable body) ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
            {selectedPeriodId && selectedModeId ? 'No transactions found for the selected filters.' : 'Select a period and bank account to view transactions.'}
          </div>
        ) : (
          <>
            {/* Fixed Header */}
            <div className="grid grid-cols-[100px_minmax(0,1fr)_60px_minmax(0,1fr)_minmax(0,1fr)_100px_100px] gap-0 px-4 py-3 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Date</span>
              <span>Voucher #</span>
              <span>Type</span>
              <span>Counterparty</span>
              <span>Description</span>
              <span className="text-right">Debit</span>
              <span className="text-right">Credit</span>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 420px)' }}>
              {transactions.map((t) => (
                <div
                  key={t.id}
                  className="grid grid-cols-[100px_minmax(0,1fr)_60px_minmax(0,1fr)_minmax(0,1fr)_100px_100px] gap-0 px-4 py-2.5 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors text-sm"
                >
                  <span className="text-slate-600">{new Date(t.date).toLocaleDateString('en-GB')}</span>
                  <span className="font-medium text-[#16325c] truncate">{t.voucherNumber}</span>
                  <span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      t.type === 'RCT' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {t.type}
                    </span>
                  </span>
                  <span className="text-slate-600 truncate">{t.counterparty}</span>
                  <span className="text-slate-500 truncate">{t.description || '—'}</span>
                  <span className="text-right font-mono text-[#c23934]">{t.debit > 0 ? `$${t.debit.toFixed(2)}` : ''}</span>
                  <span className="text-right font-mono text-[#007a33]">{t.credit > 0 ? `$${t.credit.toFixed(2)}` : ''}</span>
                </div>
              ))}
            </div>

            {/* Footer Totals */}
            <div className="grid grid-cols-[100px_minmax(0,1fr)_60px_minmax(0,1fr)_minmax(0,1fr)_100px_100px] gap-0 px-4 py-3 bg-slate-50 border-t border-slate-200 text-sm font-bold text-slate-700">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span className="text-right">Total</span>
              <span className="text-right font-mono text-[#c23934]">${totals.debit.toFixed(2)}</span>
              <span className="text-right font-mono text-[#007a33]">${totals.credit.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  )
}
