import { useState, useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import { useTrialBalance } from '../../hooks/useTrialBalance'
import { usePeriod } from '../../contexts/PeriodContext'
import { DataTable } from '../../components/DataTable'
import { DemoBanner } from '../../components/DemoBanner'
import { PageLayout } from '../../components/PageLayout'
import { LookupField } from '../../components/LookupField'
import type { TrialBalanceRow } from '../../types'

export function TrialBalance() {
  const { periods, currentPeriod } = usePeriod()
  const [selectedPeriodId, setSelectedPeriodId] = useState(currentPeriod?.id ?? '')
  const [label, setLabel] = useState('')
  const { rows, loading, generating, error, isDemo, totalDebit, totalCredit, generate } = useTrialBalance()

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId)

  const periodOptions = useMemo(() =>
    periods.map((p) => ({ id: p.id, label: p.name, sublabel: `${p.start_date} — ${p.end_date}` })),
    [periods]
  )

  const handleGenerate = () => {
    if (!selectedPeriod) return
    setLabel(selectedPeriod.name)
    generate(selectedPeriod.id, selectedPeriod.start_date, selectedPeriod.end_date)
  }

  const diff = totalDebit - totalCredit

  return (
    <PageLayout
      title="Trial Balance"
      description="Period-end summary of all general ledger account balances"
      docType="trial_balance"
      actions={
        <button
          onClick={handleGenerate}
          disabled={generating || !currentPeriod}
          className="h-8 px-4 text-sm font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
          {generating ? 'Generating...' : label ? `Refresh — ${label}` : 'Generate Trial Balance'}
        </button>
      }
    >
      <div className="flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
      <div className="shrink-0 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-72">
              <label className="block text-xs font-medium text-slate-500 mb-1">Accounting Period</label>
              <LookupField
                value={selectedPeriodId}
                onChange={(v) => setSelectedPeriodId(v)}
                options={periodOptions}
                placeholder="Select accounting period..."
                searchPlaceholder="Search periods..."
              />
            </div>
            {selectedPeriod && (
              <div className="flex items-end">
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                  {generating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            )}
          </div>
        </div>

        <DemoBanner visible={isDemo} error={error} />

        {(totalDebit > 0 || totalCredit > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-medium text-slate-500 uppercase">Total Debit</p>
              <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
                {totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-medium text-slate-500 uppercase">Total Credit</p>
              <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
                {totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-medium text-slate-500 uppercase">Difference</p>
              <p className={`text-lg font-bold mt-1 font-mono ${diff === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {diff.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-medium text-slate-500 uppercase">Status</p>
              <p className={`text-lg font-bold mt-1 ${diff === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {diff === 0 ? 'In Balance' : 'Out of Balance'}
              </p>
            </div>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto mt-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <DataTable
              columns={[
                {
                  key: 'account_code',
                  header: 'Code',
                  render: (row: TrialBalanceRow) => (
                    <span className="font-mono text-xs text-slate-500">{row.account_code ?? '-'}</span>
                  ),
                },
                {
                  key: 'account_name',
                  header: 'Account',
                  render: (row: TrialBalanceRow) => (
                    <span className="font-medium text-slate-900">{row.account_name}</span>
                  ),
                },
                {
                  key: 'account_type',
                  header: 'Type',
                  render: (row: TrialBalanceRow) => (
                    <span className="text-xs uppercase text-slate-400">{row.account_type}</span>
                  ),
                },
                {
                  key: 'debit',
                  header: 'Debit',
                  className: 'text-right',
                  render: (row: TrialBalanceRow) => (
                    <span className="font-mono text-sm">
                      {row.debit > 0 ? row.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                    </span>
                  ),
                },
                {
                  key: 'credit',
                  header: 'Credit',
                  className: 'text-right',
                  render: (row: TrialBalanceRow) => (
                    <span className="font-mono text-sm">
                      {row.credit > 0 ? row.credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                    </span>
                  ),
                },
                {
                  key: 'balance',
                  header: 'Balance',
                  className: 'text-right',
                  render: (row: TrialBalanceRow) => (
                    <span className={`font-mono text-sm font-semibold ${row.balance < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                      {row.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  ),
                },
                {
                  key: 'normal',
                  header: 'Normal',
                  render: (row: TrialBalanceRow) => {
                    const isDr = row.account_type === 'asset' || row.account_type === 'expense'
                    return (
                      <span className={`text-xs font-medium ${isDr ? 'text-blue-500' : 'text-amber-600'}`}>
                        {isDr ? 'Dr' : 'Cr'}
                      </span>
                    )
                  },
                },
              ]}
              data={rows}
              loading={loading}
              emptyMessage="Click 'Generate' above to create the trial balance for the selected period."
            />
          </div>
        </div>
      )}
      </div>
    </PageLayout>
  )
}