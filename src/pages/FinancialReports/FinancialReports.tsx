import { useState, useMemo, type ReactNode } from 'react'
import { FileText, Download, RefreshCw } from 'lucide-react'
import { useAccounts } from '../../hooks/useAccounts'
import { usePeriod } from '../../contexts/PeriodContext'
import { useTrialBalance } from '../../hooks/useTrialBalance'
import { buildAccountTree } from '../../lib/accounting'
import { PageLayout } from '../../components/PageLayout'
import { LookupField } from '../../components/LookupField'
import type { Account, AccountType, TrialBalanceRow } from '../../types'

type ReportType = 'trial_balance' | 'balance_sheet' | 'profit_loss'

const REPORTS: { key: ReportType; label: string; description: string }[] = [
  { key: 'trial_balance', label: 'Trial Balance', description: 'Summary of all account balances' },
  { key: 'balance_sheet', label: 'Balance Sheet', description: 'Assets, Liabilities, and Equity' },
  { key: 'profit_loss', label: 'Profit & Loss', description: 'Income and Expenses' },
]

const ACCOUNT_TYPE_ORDER: AccountType[] = ['asset', 'liability', 'equity', 'income', 'expense']

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

function flattenLeaves(accounts: Account[]): Account[] {
  const result: Account[] = []
  for (const acc of accounts) {
    if (acc.is_group && acc.children && acc.children.length > 0) {
      result.push(...flattenLeaves(acc.children))
    } else if (!acc.is_group) {
      result.push(acc)
    }
  }
  return result
}

function renderTreeRows(accounts: Account[], balances: Map<string, TrialBalanceRow>, depth = 0): ReactNode[] {
  const rows: ReactNode[] = []
  for (const acc of accounts) {
    const bal = balances.get(acc.id)
    const debt = bal?.debit ?? 0
    const cred = bal?.credit ?? 0
    const indent = depth * 20
    rows.push(
      <tr key={acc.id} className={`${acc.is_group ? 'bg-slate-50 font-semibold' : 'hover:bg-slate-50'}`}>
        <td className="px-4 py-2 text-sm text-slate-900" style={{ paddingLeft: `${16 + indent}px` }}>
          {acc.code ? `${acc.code} - ` : ''}{acc.name}
        </td>
        <td className="px-4 py-2 text-sm font-mono text-right">{fmt(debt)}</td>
        <td className="px-4 py-2 text-sm font-mono text-right">{fmt(cred)}</td>
      </tr>
    )
    if (acc.children && acc.children.length > 0) {
      rows.push(...renderTreeRows(acc.children, balances, depth + 1))
    }
  }
  return rows
}

export function FinancialReports() {
  const { accounts } = useAccounts()
  const { periods, currentPeriod, setCurrentPeriod } = usePeriod()
  const [activeReport, setActiveReport] = useState<ReportType>('trial_balance')
  const [selectedPeriodId, setSelectedPeriodId] = useState(currentPeriod?.id ?? '')
  const { rows, generating, generate } = useTrialBalance()
  const [label, setLabel] = useState('')

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId)

  const periodOptions = useMemo(() =>
    periods.map((p) => ({ id: p.id, label: p.name, sublabel: p.status === 'closed' ? 'Closed' : undefined })),
    [periods]
  )

  const handleGenerate = () => {
    if (!selectedPeriod) return
    setLabel(selectedPeriod.name)
    setCurrentPeriod(selectedPeriod.id)
    generate(selectedPeriod.id, selectedPeriod.start_date, selectedPeriod.end_date)
  }

  const tree = useMemo(() => buildAccountTree(accounts), [accounts])

  const balanceMap = useMemo(() => {
    const map = new Map<string, TrialBalanceRow>()
    for (const r of rows) {
      map.set(r.account_id, r)
    }
    return map
  }, [rows])

  const leafAccounts = useMemo(() => flattenLeaves(tree), [tree])

  const groupTotal = (type: AccountType): number => {
    let total = 0
    for (const acc of leafAccounts) {
      if (acc.type === type) {
        total += balanceMap.get(acc.id)?.balance ?? 0
      }
    }
    return total
  }

  const renderTrialBalance = () => {
    const tDebit = leafAccounts.reduce((s, a) => s + (balanceMap.get(a.id)?.debit ?? 0), 0)
    const tCredit = leafAccounts.reduce((s, a) => s + (balanceMap.get(a.id)?.credit ?? 0), 0)

    return (
      <div>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Account</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Debit</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {ACCOUNT_TYPE_ORDER.map((type) => {
              const typeAccounts = tree.filter((a) => a.type === type)
              if (typeAccounts.length === 0) return null
              return (
                <tbody key={type}>
                  <tr className="bg-slate-100/50">
                    <td className="px-4 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider" colSpan={3}>
                      {type}
                    </td>
                  </tr>
                  {renderTreeRows(typeAccounts, balanceMap)}
                </tbody>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-semibold">
              <td className="px-4 py-3 text-sm text-slate-900">Total</td>
              <td className="px-4 py-3 text-sm font-mono text-right">{fmt(tDebit)}</td>
              <td className="px-4 py-3 text-sm font-mono text-right">{fmt(tCredit)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    )
  }

  const renderBalanceSheet = () => {
    const assetTotal = groupTotal('asset')
    const liabilityTotal = groupTotal('liability')
    const equityTotal = groupTotal('equity')
    const totalLE = liabilityTotal + equityTotal

    const renderGroup = (type: AccountType, label: string) => {
      const items = leafAccounts.filter((a) => a.type === type)
      const total = items.reduce((s, a) => s + (balanceMap.get(a.id)?.balance ?? 0), 0)
      return (
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase">{label}</h3>
          <table className="w-full">
            <tbody className="divide-y divide-slate-100">
              {items.map((acc) => (
                <tr key={acc.id}>
                  <td className="py-2 text-sm text-slate-700">{acc.code ? `${acc.code} - ` : ''}{acc.name}</td>
                  <td className="py-2 text-sm font-mono text-right">{fmt(balanceMap.get(acc.id)?.balance ?? 0)}</td>
                </tr>
              ))}
              <tr className="font-semibold border-t-2 border-slate-300">
                <td className="py-2 text-sm text-slate-900">Total {label}</td>
                <td className="py-2 text-sm font-mono text-right">{fmt(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          {renderGroup('asset', 'Assets')}
          {assetTotal !== totalLE && (
            <p className="text-xs text-slate-400 mt-2">
              Difference: {fmt(assetTotal - totalLE)}
            </p>
          )}
        </div>
        <div className="space-y-6">
          {renderGroup('liability', 'Liabilities')}
          {renderGroup('equity', 'Equity')}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex justify-between text-sm font-semibold text-slate-900">
              <span>Total Liabilities & Equity</span>
              <span className="font-mono">{fmt(totalLE)}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderProfitLoss = () => {
    const incomeTotal = groupTotal('income')
    const expenseTotal = groupTotal('expense')
    const netIncome = incomeTotal - expenseTotal

    const renderGroup = (type: AccountType, label: string) => {
      const items = leafAccounts.filter((a) => a.type === type)
      const total = items.reduce((s, a) => s + (balanceMap.get(a.id)?.balance ?? 0), 0)
      return (
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase">{label}</h3>
          <table className="w-full">
            <tbody className="divide-y divide-slate-100">
              {items.map((acc) => (
                <tr key={acc.id}>
                  <td className="py-2 text-sm text-slate-700">{acc.code ? `${acc.code} - ` : ''}{acc.name}</td>
                  <td className="py-2 text-sm font-mono text-right">{fmt(balanceMap.get(acc.id)?.balance ?? 0)}</td>
                </tr>
              ))}
              <tr className="font-semibold border-t-2 border-slate-300">
                <td className="py-2 text-sm text-slate-900">Total {label}</td>
                <td className="py-2 text-sm font-mono text-right">{fmt(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>{renderGroup('income', 'Income')}</div>
        <div className="space-y-6">
          {renderGroup('expense', 'Expenses')}
          <div className={`rounded-lg p-4 ${netIncome >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <div className="flex justify-between text-sm font-semibold">
              <span className={netIncome >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                Net {netIncome >= 0 ? 'Income' : 'Loss'}
              </span>
              <span className={`font-mono ${netIncome >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {fmt(Math.abs(netIncome))}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <PageLayout
      title="Financial Reports"
      description="View Trial Balance, Balance Sheet, and Profit & Loss"
      docType="trial_balance"
      actions={
        <div className="flex items-center gap-2">
          {selectedPeriod && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="h-8 px-4 text-sm font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Generating...' : label ? `Refresh — ${label}` : 'Generate'}
            </button>
          )}
          <button disabled={rows.length === 0} className="h-8 px-4 text-sm font-semibold text-white bg-[#007a33] rounded hover:bg-[#006028] disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      }
    >

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
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
            <div className="flex items-center gap-2 text-xs text-slate-500 pb-1">
              {selectedPeriod.start_date} — {selectedPeriod.end_date}
              <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                selectedPeriod.status === 'open' ? 'bg-[#e8f4fe] text-[#0070d2]' : 'bg-[#f3f3f3] text-[#514f4d]'
              }`}>
                {selectedPeriod.status === 'open' ? 'Open' : 'Closed'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {REPORTS.map((report) => (
          <button
            key={report.key}
            onClick={() => setActiveReport(report.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeReport === report.key
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            {report.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {REPORTS.find((r) => r.key === activeReport)?.label}
          </h2>
          {label && (
            <span className="text-xs text-slate-400">{label}</span>
          )}
        </div>
        <p className="text-xs text-slate-400 mb-4">
          {REPORTS.find((r) => r.key === activeReport)?.description}
          {rows.length === 0 && !generating && ' Click Generate above to load data.'}
        </p>
        {generating ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
          </div>
        ) : rows.length === 0 ? null : (
          <div className="border-t border-slate-200 pt-4">
            {activeReport === 'trial_balance' && renderTrialBalance()}
            {activeReport === 'balance_sheet' && renderBalanceSheet()}
            {activeReport === 'profit_loss' && renderProfitLoss()}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
