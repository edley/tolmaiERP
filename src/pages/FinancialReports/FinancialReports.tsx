import { useState } from 'react'
import { FileText, Download } from 'lucide-react'
import { useAccounts } from '../../hooks/useAccounts'
import { buildAccountTree } from '../../lib/accounting'
import { PageLayout } from '../../components/PageLayout'
type ReportType = 'trial_balance' | 'balance_sheet' | 'profit_loss'

const REPORTS: { key: ReportType; label: string; description: string }[] = [
  { key: 'trial_balance', label: 'Trial Balance', description: 'Summary of all account balances' },
  { key: 'balance_sheet', label: 'Balance Sheet', description: 'Assets, Liabilities, and Equity' },
  { key: 'profit_loss', label: 'Profit & Loss', description: 'Income and Expenses' },
]

export function FinancialReports() {
  const { accounts } = useAccounts()
  const [activeReport, setActiveReport] = useState<ReportType>('trial_balance')

  const tree = buildAccountTree(accounts)

  const renderTrialBalance = () => (
    <table className="min-w-full divide-y divide-slate-200">
      <thead className="bg-slate-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Account</th>
          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Debit</th>
          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Credit</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200">
        {tree.filter((a) => !a.is_group).map((acc) => {
          const isDebitSide = acc.type === 'asset' || acc.type === 'expense'
          return (
            <tr key={acc.id} className="hover:bg-slate-50">
              <td className="px-4 py-2 text-sm text-slate-900">{acc.code ? `${acc.code} - ` : ''}{acc.name}</td>
              <td className="px-4 py-2 text-sm font-mono text-right">
                {isDebitSide ? '0.00' : ''}
              </td>
              <td className="px-4 py-2 text-sm font-mono text-right">
                {!isDebitSide ? '0.00' : ''}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )

  const renderBalanceSheet = () => {
    const assetAccounts = tree.filter((a) => a.type === 'asset' && !a.is_group)
    const liabilityAccounts = tree.filter((a) => a.type === 'liability' && !a.is_group)
    const equityAccounts = tree.filter((a) => a.type === 'equity' && !a.is_group)

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase">Assets</h3>
          <table className="w-full">
            <tbody className="divide-y divide-slate-100">
              {assetAccounts.map((acc) => (
                <tr key={acc.id}>
                  <td className="py-2 text-sm text-slate-700">{acc.code ? `${acc.code} - ` : ''}{acc.name}</td>
                  <td className="py-2 text-sm font-mono text-right">0.00</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase">Liabilities & Equity</h3>
          <table className="w-full">
            <tbody className="divide-y divide-slate-100">
              {[...liabilityAccounts, ...equityAccounts].map((acc) => (
                <tr key={acc.id}>
                  <td className="py-2 text-sm text-slate-700">{acc.code ? `${acc.code} - ` : ''}{acc.name}</td>
                  <td className="py-2 text-sm font-mono text-right">0.00</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderProfitLoss = () => {
    const incomeAccounts = tree.filter((a) => a.type === 'income' && !a.is_group)
    const expenseAccounts = tree.filter((a) => a.type === 'expense' && !a.is_group)

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase">Income</h3>
          <table className="w-full">
            <tbody className="divide-y divide-slate-100">
              {incomeAccounts.map((acc) => (
                <tr key={acc.id}>
                  <td className="py-2 text-sm text-slate-700">{acc.code ? `${acc.code} - ` : ''}{acc.name}</td>
                  <td className="py-2 text-sm font-mono text-right">0.00</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase">Expenses</h3>
          <table className="w-full">
            <tbody className="divide-y divide-slate-100">
              {expenseAccounts.map((acc) => (
                <tr key={acc.id}>
                  <td className="py-2 text-sm text-slate-700">{acc.code ? `${acc.code} - ` : ''}{acc.name}</td>
                  <td className="py-2 text-sm font-mono text-right">0.00</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <PageLayout
      title="Financial Reports"
      description="View Trial Balance, Balance Sheet, and Profit & Loss"
      actions={
        <button className="h-8 px-4 text-sm font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] transition-colors inline-flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export
        </button>
      }
    >

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
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          {REPORTS.find((r) => r.key === activeReport)?.label}
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          {REPORTS.find((r) => r.key === activeReport)?.description}
          {activeReport === 'balance_sheet' && ' — Connect Supabase to see live data.'}
        </p>
        <div className="border-t border-slate-200 pt-4">
          {activeReport === 'trial_balance' && renderTrialBalance()}
          {activeReport === 'balance_sheet' && renderBalanceSheet()}
          {activeReport === 'profit_loss' && renderProfitLoss()}
        </div>
      </div>
    </PageLayout>
  )
}
