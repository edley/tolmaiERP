import { useState, useMemo, useCallback } from 'react'
import { BarChart3, Download } from 'lucide-react'
import { useAccounts } from '../../hooks/useAccounts'
import { useAllocationReport } from '../../hooks/useAllocationReport'
import { usePeriod } from '../../contexts/PeriodContext'
import { DataTable } from '../../components/DataTable'
import { DemoBanner } from '../../components/DemoBanner'
import { PageLayout } from '../../components/PageLayout'
import { exportToExcel } from '../../lib/exportToExcel'
import type { AllocationReportRow } from '../../hooks/useAllocationReport'

export function AllocationReportAnalysis() {
  const { accounts } = useAccounts()
  const { periods, currentPeriod } = usePeriod()
  const { rows, loading, error, isDemo, totalAmount, run } = useAllocationReport()

  const [selectedPeriodId, setSelectedPeriodId] = useState(currentPeriod?.id ?? '')
  const [selectedGlCode, setSelectedGlCode] = useState('')
  const [activeTab, setActiveTab] = useState<'detail' | 'summary'>('detail')

  const allocAccounts = useMemo(() =>
    accounts.filter((a) => a.allocation_allow && !a.is_group).sort((a, b) => (a.code ?? '').localeCompare(b.code ?? '')),
    [accounts]
  )

  const periodOptions = useMemo(() =>
    periods.map((p) => ({ id: p.id, label: p.name, sublabel: `${p.start_date} — ${p.end_date}${p.status === 'closed' ? ' (Closed)' : ''}` })),
    [periods]
  )

  const handleRun = () => {
    if (!selectedPeriodId || !selectedGlCode) return
    run(selectedPeriodId, selectedGlCode, accounts, periods)
  }

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId)

  const hasData = selectedPeriod && selectedGlCode

  const totalsByCode = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rows) {
      map.set(r.allocation_code, (map.get(r.allocation_code) || 0) + r.amount)
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [rows])

  const handleExport = useCallback(() => {
    if (rows.length === 0) return
    const prefix = activeTab === 'summary' ? 'allocation-summary' : 'allocation-detail'
    const suffix = selectedGlCode ? `-${selectedGlCode}` : ''
    exportToExcel(
      rows,
      [
        { header: 'Date', accessor: (r) => r.date },
        { header: 'Doc Type', accessor: (r) => r.doc_type },
        { header: 'Document #', accessor: (r) => r.doc_number },
        { header: 'GL Code', accessor: (r) => r.gl_code },
        { header: 'GL Account', accessor: (r) => r.gl_name },
        { header: 'Allocation Code', accessor: (r) => r.allocation_code },
        { header: 'Amount', accessor: (r) => r.amount },
      ],
      `${prefix}${suffix}`
    )
  }, [rows, activeTab, selectedGlCode])

  const TABS: { key: 'detail' | 'summary'; label: string }[] = [
    { key: 'detail', label: 'Detail' },
    { key: 'summary', label: 'Summary' },
  ]

  return (
    <PageLayout
      title="Allocation Report Analysis"
      description="View allocation amounts by GL account and period"
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
        {/* ── Fixed Header: Filters + Summary bar ── */}
        <div className="shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Accounting Period</label>
                <select
                  value={selectedPeriodId}
                  onChange={(e) => { setSelectedPeriodId(e.target.value); setSelectedGlCode('') }}
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
                  onChange={(e) => setSelectedGlCode(e.target.value)}
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
                <button
                  onClick={handleRun}
                  disabled={!selectedPeriodId || !selectedGlCode || loading}
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
              Period: <span className="font-semibold text-slate-700">{selectedPeriod.name}</span>
              {' · '}
              Total Allocated: <span className="font-mono font-semibold text-slate-700">${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          )}

          <DemoBanner visible={isDemo} error={error} />
        </div>

        {/* ── Tab Bar ── */}
        <div className="shrink-0 mt-3 border-b border-slate-200">
          <div className="flex gap-0">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#0070d2] text-[#0070d2]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Scrollable Middle ── */}
        <div className="flex-1 min-h-0 overflow-y-auto mt-3">
          {activeTab === 'detail' ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <DataTable
                columns={[
                  {
                    key: 'date',
                    header: 'Date',
                    render: (row: AllocationReportRow) => (
                      <span className="text-xs text-slate-500 font-mono">{row.date}</span>
                    ),
                  },
                  {
                    key: 'doc_type',
                    header: 'Doc Type',
                    render: (row: AllocationReportRow) => {
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
                    render: (row: AllocationReportRow) => (
                      <span className="text-sm font-mono text-slate-700">{row.doc_number}</span>
                    ),
                  },
                  {
                    key: 'gl_code',
                    header: 'GL Code',
                    render: (row: AllocationReportRow) => (
                      <span className="font-mono text-xs text-slate-500">{row.gl_code}</span>
                    ),
                  },
                  {
                    key: 'gl_name',
                    header: 'GL Account',
                    render: (row: AllocationReportRow) => (
                      <span className="text-sm text-slate-700">{row.gl_name}</span>
                    ),
                  },
                  {
                    key: 'allocation_code',
                    header: 'Allocation Code',
                    render: (row: AllocationReportRow) => (
                      <span className="inline-flex px-2 py-0.5 text-[11px] font-bold bg-[#e8f4fe] text-[#0070d2] rounded">
                        {row.allocation_code}
                      </span>
                    ),
                  },
                  {
                    key: 'amount',
                    header: 'Amount',
                    className: 'text-right',
                    render: (row: AllocationReportRow) => (
                      <span className="font-mono text-sm">
                        ${row.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    ),
                  },
                ]}
                data={rows}
                loading={loading}
                emptyMessage="Select a period and GL account, then click 'Run Report'."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {totalsByCode.length === 0 && (
                <p className="text-sm text-slate-400 col-span-full text-center py-8">
                  No data available. Select a period and GL account, then click 'Run Report'.
                </p>
              )}
              {totalsByCode.map(([code, amt]) => (
                <div key={code} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Allocation Code</p>
                  <p className="inline-flex px-3 py-1 text-sm font-bold bg-[#e8f4fe] text-[#0070d2] rounded mt-2">
                    {code}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-3 font-mono">
                    ${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <div className="mt-2 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#0070d2] h-full rounded-full transition-all"
                      style={{ width: `${(amt / totalAmount) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    {((amt / totalAmount) * 100).toFixed(1)}% of total
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  )
}
