import { useState, useMemo, useCallback, useEffect } from 'react'
import { BarChart3, Download } from 'lucide-react'
import { useAccounts } from '../../hooks/useAccounts'
import { useExpenseTypeReport } from '../../hooks/useExpenseTypeReport'
import { usePeriod } from '../../contexts/PeriodContext'
import { DataTable } from '../../components/DataTable'
import { DemoBanner } from '../../components/DemoBanner'
import { PageLayout } from '../../components/PageLayout'
import { getMappings } from '../../lib/allocationMappings'
import { supabase, isOnline } from '../../lib/supabase'
import { exportToExcel } from '../../lib/exportToExcel'
import type { ExpenseTypeReportRow } from '../../hooks/useExpenseTypeReport'

export function ExpenseTypeAnalysis() {
  const { accounts } = useAccounts()
  const { periods, currentPeriod } = usePeriod()
  const { rows, loading, error, isDemo, run } = useExpenseTypeReport()

  const [selectedPeriodId, setSelectedPeriodId] = useState(currentPeriod?.id ?? '')
  const [selectedGlCode, setSelectedGlCode] = useState('')
  const [selectedAllocCode, setSelectedAllocCode] = useState('')
  const [supabaseCodes, setSupabaseCodes] = useState<string[]>([])

  const allMappings = useMemo(() => {
    if (accounts.length === 0) return []
    return getMappings(accounts)
  }, [accounts])

  const allocAccounts = useMemo(() =>
    accounts.filter((a) => a.allocation_allow && !a.is_group).sort((a, b) => (a.code ?? '').localeCompare(b.code ?? '')),
    [accounts]
  )

  useEffect(() => {
    if (!selectedGlCode || !isOnline() || !supabase) {
      setSupabaseCodes([])
      return
    }
    const glAccount = accounts.find((a) => a.code === selectedGlCode)
    if (!glAccount) { setSupabaseCodes([]); return }
    const allCodes = new Set<string>()
    Promise.allSettled([
      supabase.from('payment_line_allocations').select('allocation_code, payment_line:payment_lines!inner(gl_account_id)').eq('payment_line.gl_account_id', glAccount.id),
      supabase.from('receipt_line_allocations').select('allocation_code, receipt_line:receipt_lines!inner(gl_account_id)').eq('receipt_line.gl_account_id', glAccount.id),
      supabase.from('journal_entry_item_allocations').select('allocation_code, item:journal_entry_items!inner(account_id)').eq('item.account_id', glAccount.id),
    ]).then((results) => {
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.data) {
          for (const row of r.value.data) {
            if (row.allocation_code) allCodes.add(row.allocation_code)
          }
        }
      }
      setSupabaseCodes([...allCodes].sort())
    })
  }, [selectedGlCode, accounts])

  const allocCodeOptions = useMemo(() => {
    if (!selectedGlCode) return []
    const local = allMappings
      .filter((m) => m.gl_code === selectedGlCode && m.active)
      .map((m) => m.allocation_code)
    return [...new Set([...local, ...supabaseCodes])].sort()
  }, [allMappings, selectedGlCode, supabaseCodes])

  const periodOptions = useMemo(() =>
    periods.map((p) => ({ id: p.id, label: p.name, sublabel: `${p.start_date} — ${p.end_date}${p.status === 'closed' ? ' (Closed)' : ''}` })),
    [periods]
  )

  const handleRun = () => {
    if (!selectedPeriodId || !selectedGlCode || !selectedAllocCode) return
    run(selectedPeriodId, selectedGlCode, selectedAllocCode, accounts, periods)
  }

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId)

  const hasData = selectedPeriod && selectedGlCode && selectedAllocCode

  const handleExport = useCallback(() => {
    if (rows.length === 0) return
    const suffix = selectedAllocCode ? `-${selectedAllocCode}` : ''
    exportToExcel(
      rows,
      [
        { header: 'Date', accessor: (r) => r.date },
        { header: 'Doc Type', accessor: (r) => r.doc_type },
        { header: 'Document #', accessor: (r) => r.doc_number },
        { header: 'GL Code', accessor: (r) => r.gl_code },
        { header: 'GL Account', accessor: (r) => r.gl_name },
        { header: 'Allocation Code', accessor: (r) => r.allocation_code },
        { header: 'Expense Type', accessor: (r) => r.expense_type },
        { header: 'Amount', accessor: (r) => r.amount },
      ],
      `expense-type${suffix}`
    )
  }, [rows, selectedAllocCode])

  return (
    <PageLayout
      title="Expense Type Analysis"
      description="View allocation amounts broken down by expense type"
      docType="allocation_mapping"
      actions={
        rows.length > 0 ? (
          <button
            onClick={handleExport}
            className="h-8 px-4 text-sm font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] transition-colors inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-col" style={{ height: 'calc(100vh - 210px)' }}>
        <div className="shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Accounting Period</label>
                <select
                  value={selectedPeriodId}
                  onChange={(e) => { setSelectedPeriodId(e.target.value); setSelectedGlCode(''); setSelectedAllocCode('') }}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none"
                >
                  <option value="">— Select Period —</option>
                  {periodOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">GL Account</label>
                <select
                  value={selectedGlCode}
                  onChange={(e) => { setSelectedGlCode(e.target.value); setSelectedAllocCode('') }}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none"
                  disabled={!selectedPeriodId}
                >
                  <option value="">— Select GL Account —</option>
                  {allocAccounts.map((a) => (
                    <option key={a.id} value={a.code ?? ''}>{a.code} · {a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Allocation Code</label>
                <select
                  value={selectedAllocCode}
                  onChange={(e) => setSelectedAllocCode(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none"
                  disabled={!selectedGlCode}
                >
                  <option value="">— Select Allocation Code —</option>
                  {allocCodeOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <button
                  onClick={handleRun}
                  disabled={!selectedPeriodId || !selectedGlCode || !selectedAllocCode || loading}
                  className="w-full h-9 flex items-center justify-center gap-2 px-4 text-sm font-semibold text-white bg-[#0070d2] rounded-lg hover:bg-[#005fb2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <BarChart3 className="w-4 h-4" />
                  {loading ? 'Loading...' : 'Run Report'}
                </button>
              </div>
            </div>
          </div>

          {hasData && (
            <div className="mt-3 text-sm text-slate-500">
              GL Account: <span className="font-semibold text-slate-700">{selectedGlCode}</span>
              {' · '}
              Allocation Code: <span className="font-semibold text-slate-700">{selectedAllocCode}</span>
              {' · '}
              Period: <span className="font-semibold text-slate-700">{selectedPeriod.name}</span>
            </div>
          )}

          <DemoBanner visible={isDemo} error={error} />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto mt-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <DataTable
              columns={[
                {
                  key: 'date',
                  header: 'Date',
                  render: (row: ExpenseTypeReportRow) => (
                    <span className="text-xs text-slate-500 font-mono">{row.date}</span>
                  ),
                },
                {
                  key: 'doc_type',
                  header: 'Doc Type',
                  render: (row: ExpenseTypeReportRow) => {
                    const colors: Record<string, string> = {
                      'Payment': 'bg-[#fef0f0] text-[#c23934]',
                      'Receipt': 'bg-[#d2f4e0] text-[#007a33]',
                      'Journal Entry': 'bg-[#e8f4fe] text-[#0070d2]',
                    }
                    return (
                      <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded ${colors[row.doc_type] ?? 'bg-slate-100 text-slate-600'}`}>
                        {row.doc_type}
                      </span>
                    )
                  },
                },
                {
                  key: 'doc_number',
                  header: 'Document #',
                  render: (row: ExpenseTypeReportRow) => (
                    <span className="text-sm font-mono text-slate-700">{row.doc_number}</span>
                  ),
                },
                {
                  key: 'gl_code',
                  header: 'GL Code',
                  render: (row: ExpenseTypeReportRow) => (
                    <span className="font-mono text-xs text-slate-500">{row.gl_code}</span>
                  ),
                },
                {
                  key: 'allocation_code',
                  header: 'Allocation Code',
                  render: (row: ExpenseTypeReportRow) => (
                    <span className="inline-flex px-2 py-0.5 text-[11px] font-bold bg-[#e8f4fe] text-[#0070d2] rounded">
                      {row.allocation_code}
                    </span>
                  ),
                },
                {
                  key: 'expense_type',
                  header: 'Expense Type',
                  render: (row: ExpenseTypeReportRow) => (
                    <span className="inline-flex px-2 py-0.5 text-[11px] font-bold bg-[#fef0f0] text-[#c23934] rounded">
                      {row.expense_type || '(Unspecified)'}
                    </span>
                  ),
                },
                {
                  key: 'amount',
                  header: 'Amount',
                  className: 'text-right',
                  render: (row: ExpenseTypeReportRow) => (
                    <span className="font-mono text-sm">
                      ${row.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  ),
                },
              ]}
              data={rows}
              loading={loading}
              emptyMessage="Select a period, GL account, and allocation code, then click 'Run Report'."
            />
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
