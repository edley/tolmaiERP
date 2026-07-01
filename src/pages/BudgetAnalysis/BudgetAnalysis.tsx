import { useState, useMemo, useCallback } from 'react'
import { BarChart3, Download } from 'lucide-react'
import { usePeriod } from '../../contexts/PeriodContext'
import { useCompany } from '../../contexts/CompanyContext'
import { getBudgetActuals } from '../../lib/budget'
import { DataTable } from '../../components/DataTable'
import { DemoBanner } from '../../components/DemoBanner'
import { PageLayout } from '../../components/PageLayout'
import { exportToExcel } from '../../lib/exportToExcel'
import type { BudgetActualRow } from '../../lib/budget'

export function BudgetAnalysis() {
  const { currentCompany } = useCompany()
  const { periods, currentPeriod } = usePeriod()
  const [selectedPeriodId, setSelectedPeriodId] = useState(currentPeriod?.id ?? '')
  const [rows, setRows] = useState<BudgetActualRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const periodOptions = useMemo(() =>
    periods.map((p) => ({ id: p.id, label: p.name, sublabel: `${p.start_date} — ${p.end_date}${p.status === 'closed' ? ' (Closed)' : ''}` })),
    [periods]
  )

  const handleRun = useCallback(async () => {
    if (!selectedPeriodId) return
    const companyId = currentCompany?.id
    if (!companyId) return
    setLoading(true)
    setError(null)
    const result = await getBudgetActuals(companyId, selectedPeriodId)
    if (result.length === 0) {
      setError('No budget data found for the selected period. Set up budgets first on the Budget page.')
    }
    setRows(result)
    setLoading(false)
  }, [selectedPeriodId, currentCompany?.id])

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId)

  const totalBudget = useMemo(() => rows.reduce((s, r) => s + r.budget_amount, 0), [rows])
  const totalActual = useMemo(() => {
    return rows.reduce((s, r) => {
      const isExpense = r.account_type === 'expense'
      const isIncome = r.account_type === 'income'
      let net = 0
      if (isExpense) net = r.actual_debit - r.actual_credit
      else if (isIncome) net = r.actual_credit - r.actual_debit
      else net = r.actual_debit - r.actual_credit
      return s + net
    }, 0)
  }, [rows])
  const totalVariance = totalBudget - totalActual

  const handleExport = useCallback(() => {
    if (rows.length === 0) return
    exportToExcel(
      rows,
      [
        { header: 'Account Code', accessor: (r) => r.account_code ?? '' },
        { header: 'Account Name', accessor: (r) => r.account_name },
        { header: 'Type', accessor: (r) => r.account_type },
        { header: 'Budget', accessor: (r) => r.budget_amount },
        { header: 'Actual Debit', accessor: (r) => r.actual_debit },
        { header: 'Actual Credit', accessor: (r) => r.actual_credit },
        { header: 'Variance', accessor: (r) => r.variance },
        { header: 'Variance %', accessor: (r) => r.variance_pct ?? 0 },
      ],
      'budget-analysis'
    )
  }, [rows])

  return (
    <PageLayout
      title="Budget vs Actual"
      description="Compare budgeted amounts against actual transactions per GL account"
      docType="budget"
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Accounting Period</label>
                <select
                  value={selectedPeriodId}
                  onChange={(e) => { setSelectedPeriodId(e.target.value); setRows([]); setError(null) }}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none"
                >
                  <option value="">— Select Period —</option>
                  {periodOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <button
                  onClick={handleRun}
                  disabled={!selectedPeriodId || loading}
                  className="w-full h-9 flex items-center justify-center gap-2 px-4 text-sm font-semibold text-white bg-[#0070d2] rounded-lg hover:bg-[#005fb2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <BarChart3 className="w-4 h-4" />
                  {loading ? 'Loading...' : 'Run Report'}
                </button>
              </div>
            </div>
          </div>

          {rows.length > 0 && selectedPeriod && (
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="text-slate-500">
                Period: <span className="font-semibold text-slate-700">{selectedPeriod.name}</span>
              </span>
              <span className="text-slate-500">
                Total Budget: <span className="font-mono font-semibold text-slate-700">${totalBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </span>
              <span className="text-slate-500">
                Total Actual: <span className="font-mono font-semibold text-slate-700">${totalActual.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </span>
              <span className="text-slate-500">
                Variance: <span className={`font-mono font-semibold ${totalVariance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ${totalVariance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </span>
            </div>
          )}

          <DemoBanner visible={false} error={error && !loading ? error : null} />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto mt-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <DataTable
              columns={[
                {
                  key: 'account_code',
                  header: 'Code',
                  render: (row: BudgetActualRow) => (
                    <span className="font-mono text-xs text-slate-500">{row.account_code ?? ''}</span>
                  ),
                },
                {
                  key: 'account_name',
                  header: 'Account',
                  render: (row: BudgetActualRow) => (
                    <span className="text-sm text-slate-700">{row.account_name}</span>
                  ),
                },
                {
                  key: 'account_type',
                  header: 'Type',
                  render: (row: BudgetActualRow) => {
                    const colors: Record<string, string> = {
                      expense: 'bg-[#fef0f0] text-[#c23934]',
                      income: 'bg-[#d2f4e0] text-[#007a33]',
                      asset: 'bg-[#e8f4fe] text-[#0070d2]',
                      liability: 'bg-[#faf0e6] text-[#a8640a]',
                      equity: 'bg-[#e8f4fe] text-[#0070d2]',
                    }
                    return (
                      <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded ${colors[row.account_type] ?? 'bg-slate-100 text-slate-600'}`}>
                        {row.account_type}
                      </span>
                    )
                  },
                },
                {
                  key: 'budget_amount',
                  header: 'Budget',
                  className: 'text-right',
                  render: (row: BudgetActualRow) => (
                    <span className="font-mono text-sm">${row.budget_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  ),
                },
                {
                  key: 'actual',
                  header: 'Actual',
                  className: 'text-right',
                  render: (row: BudgetActualRow) => {
                    const isExpense = row.account_type === 'expense'
                    const isIncome = row.account_type === 'income'
                    let net = 0
                    if (isExpense) net = row.actual_debit - row.actual_credit
                    else if (isIncome) net = row.actual_credit - row.actual_debit
                    else net = row.actual_debit - row.actual_credit
                    return (
                      <span className="font-mono text-sm">${net.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    )
                  },
                },
                {
                  key: 'variance',
                  header: 'Variance',
                  className: 'text-right',
                  render: (row: BudgetActualRow) => (
                    <span className={`font-mono text-sm ${row.variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      ${row.variance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  ),
                },
                {
                  key: 'variance_pct',
                  header: '%',
                  className: 'text-right',
                  render: (row: BudgetActualRow) => (
                    <span className={`font-mono text-sm ${row.variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {row.variance_pct !== null ? `${row.variance_pct.toFixed(1)}%` : '—'}
                    </span>
                  ),
                },
              ]}
              data={rows}
              loading={loading}
              emptyMessage="Select a period and click 'Run Report'."
            />
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
