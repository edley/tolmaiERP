import { useState, useMemo } from 'react'
import { Search, Download } from 'lucide-react'
import { useLedger } from '../../hooks/useLedger'
import { useAccounts } from '../../hooks/useAccounts'
import { usePeriod } from '../../contexts/PeriodContext'
import { DataTable } from '../../components/DataTable'
import { DemoBanner } from '../../components/DemoBanner'
import { PageLayout } from '../../components/PageLayout'
import { LookupField } from '../../components/LookupField'
import type { LedgerEntry } from '../../types'

export function GeneralLedger() {
  const { accounts } = useAccounts()
  const { periods, currentPeriod, setCurrentPeriod } = usePeriod()
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [startDate, setStartDate] = useState(currentPeriod?.start_date ?? '')
  const [endDate, setEndDate] = useState(currentPeriod?.end_date ?? '')

  const periodOptions = useMemo(() =>
    periods.map((p) => ({ id: p.id, label: p.name, sublabel: `${p.start_date} — ${p.end_date}` })),
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

  return (
    <PageLayout
      title="General Ledger"
      description="Comprehensive view of all ledger postings"
      docType="ledger_entry"
      actions={
        <button className="h-8 px-4 text-sm font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] transition-colors inline-flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export
        </button>
      }
    >

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Search className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>
      </div>

      <DemoBanner visible={isDemo} error={error} />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs font-medium text-slate-500 uppercase">Total Debit</p>
          <p className="text-lg font-bold text-slate-900 mt-1">
            {totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs font-medium text-slate-500 uppercase">Total Credit</p>
          <p className="text-lg font-bold text-slate-900 mt-1">
            {totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs font-medium text-slate-500 uppercase">Closing Balance</p>
          <p className="text-lg font-bold text-slate-900 mt-1">
            {closingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </PageLayout>
  )
}
