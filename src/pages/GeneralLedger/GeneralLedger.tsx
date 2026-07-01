import { useState, useMemo, useCallback } from 'react'
import { Search, Download } from 'lucide-react'
import { useLedger } from '../../hooks/useLedger'
import { useAccounts } from '../../hooks/useAccounts'
import { usePeriod } from '../../contexts/PeriodContext'
import { DataTable } from '../../components/DataTable'
import { DemoBanner } from '../../components/DemoBanner'
import { PageLayout } from '../../components/PageLayout'
import { LookupField } from '../../components/LookupField'
import { exportToExcel } from '../../lib/exportToExcel'
import type { LedgerEntry } from '../../types'

export function GeneralLedger() {
  const { accounts } = useAccounts()
  const { periods, currentPeriod, setCurrentPeriod } = usePeriod()
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [startDate, setStartDate] = useState(currentPeriod?.start_date ?? '')
  const [endDate, setEndDate] = useState(currentPeriod?.end_date ?? '')

  const periodOptions = useMemo(() =>
    periods.map((p) => ({ id: p.id, label: p.name })),
    [periods]
  )

  const handlePeriodChange = (id: string) => {
    setCurrentPeriod(id)
    const p = periods.find((x) => x.id === id)
    if (p) {
      setStartDate(p.start_date)
      setEndDate(p.end_date)
    }
  }

  const { entries, loading, error, isDemo, totalDebit, totalCredit, closingBalance, refetch } = useLedger(
    selectedAccount || undefined,
    startDate || undefined,
    endDate || undefined
  )

  const handleFilter = () => {
    refetch()
  }

  const handleExport = useCallback(() => {
    if (entries.length === 0) return
    const accountLabel = selectedAccount
      ? accounts.find((a) => a.id === selectedAccount)?.code ?? 'account'
      : 'all'
    exportToExcel(
      entries,
      [
        { header: 'Date', accessor: (r) => new Date(r.posting_date).toLocaleDateString('en-GB') },
        { header: 'Account', accessor: (r) => {
          const acc = r.account as unknown as { name: string; code: string } | undefined
          return acc ? `${acc.name} (${acc.code})` : 'Unknown'
        }},
        { header: 'Description', accessor: (r) => r.description || '-' },
        { header: 'Debit', accessor: (r) => r.debit },
        { header: 'Credit', accessor: (r) => r.credit },
        { header: 'Balance', accessor: (r) => r.balance },
      ],
      `general-ledger-${accountLabel}`
    )
  }, [entries, selectedAccount, accounts])

  return (
    <PageLayout
      title="General Ledger"
      description="Comprehensive view of all ledger postings"
      docType="ledger_entry"
      actions={
        <button
          onClick={handleExport}
          disabled={entries.length === 0}
          className="h-8 px-4 text-sm font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      }
    >

      <div className="flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
      <div className="shrink-0 space-y-3">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Period</label>
              <LookupField
                value={currentPeriod?.id ?? ''}
                onChange={handlePeriodChange}
                options={periodOptions}
                placeholder="Select period..."
                searchPlaceholder="Search periods..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Account</label>
              <LookupField
                value={selectedAccount}
                onChange={setSelectedAccount}
                options={[
                  { id: '', label: 'All Accounts' },
                  ...accounts.map((a) => ({ id: a.id, label: a.name, sublabel: a.code })),
                ]}
                placeholder="All Accounts"
                searchPlaceholder="Search accounts..."
                emptyMessage="No accounts found"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleFilter}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                Filter
              </button>
            </div>
          </div>
        </div>

        <DemoBanner visible={isDemo} error={error} />
        {error && !isDemo && (
          <div className="rounded-lg px-4 py-3 bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {(totalDebit > 0 || totalCredit > 0) && (
          <div className="flex items-center gap-4 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm text-[11px]">
            <span className="text-slate-500 font-medium uppercase tracking-wider">Totals</span>
            <div className="h-3 w-px bg-slate-200" />
            <span>
              <span className="text-slate-500">Debit:</span>{' '}
              <span className="font-mono font-semibold text-slate-800">
                {totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </span>
            <div className="h-3 w-px bg-slate-200" />
            <span>
              <span className="text-slate-500">Credit:</span>{' '}
              <span className="font-mono font-semibold text-slate-800">
                {totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </span>
            <div className="h-3 w-px bg-slate-200" />
            <span>
              <span className="text-slate-500">Closing Balance:</span>{' '}
              <span className="font-mono font-semibold text-slate-800">
                {closingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto mt-3">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <DataTable
            columns={[
              {
                key: 'posting_date',
                header: 'Date',
                render: (row: LedgerEntry) => (
                  <span className="text-slate-500 text-xs">{new Date(row.posting_date).toLocaleDateString('en-GB')}</span>
                ),
              },
              {
                key: 'account',
                header: 'Account',
                render: (row: LedgerEntry) => {
                  const acc = row.account as unknown as { name: string; code: string; type: string } | undefined
                  return (
                    <div>
                      <span className="font-medium text-slate-900">{acc?.name ?? 'Unknown'}</span>
                      {acc?.code && <span className="text-slate-400 text-xs ml-1">({acc.code})</span>}
                    </div>
                  )
                },
              },
              {
                key: 'description',
                header: 'Description',
                render: (row: LedgerEntry) => (
                  <span className="text-slate-500">{row.description || '-'}</span>
                ),
              },
              {
                key: 'debit',
                header: 'Debit',
                render: (row: LedgerEntry) => (
                  <span className="font-mono text-sm">
                    {row.debit > 0 ? Number(row.debit).toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                  </span>
                ),
              },
              {
                key: 'credit',
                header: 'Credit',
                render: (row: LedgerEntry) => (
                  <span className="font-mono text-sm">
                    {row.credit > 0 ? Number(row.credit).toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                  </span>
                ),
              },
              {
                key: 'balance',
                header: 'Balance',
                render: (row: LedgerEntry) => (
                  <span className="font-mono text-sm font-medium">
                    {Number(row.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                ),
              },
            ]}
            data={entries}
            loading={loading}
            emptyMessage="No ledger entries found for the selected filters."
          />
        </div>
      </div>
      </div>
    </PageLayout>
  )
}
