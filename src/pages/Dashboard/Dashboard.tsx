import { useMemo } from 'react'
import { FileText, CreditCard, ArrowDownToLine, Database, Clock, ListChecks, Loader2, ChevronRight, ShieldCheck } from 'lucide-react'
import { PageLayout } from '../../components/PageLayout'
import { usePeriod } from '../../contexts/PeriodContext'
import { useJournalEntries } from '../../hooks/useJournalEntries'
import { usePayments } from '../../hooks/usePayments'
import { useReceipts } from '../../hooks/useReceipts'
import { useAuth } from '../../contexts/AuthContext'
import { getTasks } from '../../lib/tasks'
import { getAllSessions } from '../../lib/sessionTracker'

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtLastLogin(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `Today, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  if (diff < 172_800_000) return `Yesterday, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function Dashboard() {
  const { user } = useAuth()
  const { currentPeriod } = usePeriod()
  const { entries, loading: loadingJE } = useJournalEntries()
  const { payments, loading: loadingPMT } = usePayments()
  const { receipts, loading: loadingRCT } = useReceipts()

  const loading = loadingJE || loadingPMT || loadingRCT

  const periodEntries = useMemo(
    () => entries.filter((e) => currentPeriod && e.period_id === currentPeriod?.id),
    [entries, currentPeriod]
  )
  const periodPayments = useMemo(
    () => payments.filter((p) => currentPeriod && p.period_id === currentPeriod?.id),
    [payments, currentPeriod]
  )
  const periodReceipts = useMemo(
    () => receipts.filter((r) => currentPeriod && r.period_id === currentPeriod?.id),
    [receipts, currentPeriod]
  )

  const canApprove = user?.role && ['Superuser', 'Manager', 'Team Leader'].includes(user.role)

  const pendingPosting =
    periodEntries.filter((e) => e.status === 'approved').length +
    periodPayments.filter((p) => p.status === 'approved').length +
    periodReceipts.filter((r) => r.status === 'approved').length

  const pendingApproval = useMemo(() => {
    const items: { type: string; voucherNumber: string; date: string; description: string; submittedBy: string }[] = []
    for (const je of entries) {
      if (je.status === 'submitted') items.push({ type: 'JE', voucherNumber: je.entry_number, date: je.posting_date, description: je.description ?? '', submittedBy: je.submitted_by_name ?? '' })
    }
    for (const pmt of payments) {
      if (pmt.status === 'submitted') items.push({ type: 'PMT', voucherNumber: pmt.voucher_number, date: pmt.date, description: pmt.paid_to, submittedBy: pmt.submitted_by_name ?? '' })
    }
    for (const rct of receipts) {
      if (rct.status === 'submitted') items.push({ type: 'RCT', voucherNumber: rct.voucher_number, date: rct.date, description: rct.received_from, submittedBy: rct.submitted_by_name ?? '' })
    }
    items.sort((a, b) => b.date.localeCompare(a.date))
    return items
  }, [entries, payments, receipts])

  const totalJeAmount = periodEntries.reduce((s, e) => s + e.total_debit, 0)
  const totalPmtAmount = periodPayments.reduce((s, p) => s + p.voucher_amount, 0)
  const totalRctAmount = periodReceipts.reduce((s, r) => s + r.voucher_amount, 0)

  const lastLogin = useMemo(() => {
    if (!user) return null
    const sessions = getAllSessions()
    const mine = sessions.find((s) => s.id === user.id)
    return mine ? mine.lastActive : null
  }, [user])

  const recentTransactions = useMemo(() => {
    const tagged: { type: string; ref: string; date: string; description: string; voucherNumber: string }[] = []
    for (const je of entries) {
      tagged.push({ type: 'JE', ref: je.entry_number, date: je.posting_date, description: je.description ?? '', voucherNumber: je.entry_number })
    }
    for (const pmt of payments) {
      tagged.push({ type: 'PMT', ref: pmt.voucher_number, date: pmt.date, description: pmt.paid_to, voucherNumber: pmt.voucher_number })
    }
    for (const rct of receipts) {
      tagged.push({ type: 'RCT', ref: rct.voucher_number, date: rct.date, description: rct.received_from, voucherNumber: rct.voucher_number })
    }
    tagged.sort((a, b) => b.date.localeCompare(a.date))
    return tagged.slice(0, 8)
  }, [entries, payments, receipts])

  const pendingTasks = useMemo(() => {
    const all = getTasks()
    return all.filter((t) => t.completion_percentage < 100).slice(0, 5)
  }, [])

  const statPills = [
    { label: 'JE', count: periodEntries.length, amount: totalJeAmount, icon: FileText, color: 'text-blue-600 bg-blue-50' },
    { label: 'PMT', count: periodPayments.length, amount: totalPmtAmount, icon: CreditCard, color: 'text-amber-600 bg-amber-50' },
    { label: 'RCT', count: periodReceipts.length, amount: totalRctAmount, icon: ArrowDownToLine, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Post', count: pendingPosting, amount: null, icon: Database, color: 'text-purple-600 bg-purple-50' },
    ...(canApprove ? [{ label: 'Approve', count: pendingApproval.length, amount: null, icon: ShieldCheck, color: 'text-orange-600 bg-orange-50' as const }] : []),
  ]

  return (
    <PageLayout title="Home" description={currentPeriod?.name ? `Period: ${currentPeriod.name}` : undefined}>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-4 h-4 animate-spin text-[#0070d2]" />
        </div>
      ) : (
        <div className="max-w-4xl space-y-3">
          {/* ── Greeting + Last Login ── */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#16325c]">
              Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </h2>
            {lastLogin && (
              <p className="text-[11px] text-[#514f4d] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last login: {fmtLastLogin(lastLogin)}
              </p>
            )}
          </div>

          {/* ── Stat Pills ── */}
          <div className="flex flex-wrap gap-2">
            {statPills.map((s) => {
              const Icon = s.icon
              return (
                <div key={s.label} className="flex items-center gap-2 bg-white border border-[#dddbda] rounded-md px-3 py-1.5 shadow-sm">
                  <Icon className={`w-3.5 h-3.5 ${s.color.split(' ')[0]}`} />
                  <span className="text-xs font-semibold text-[#16325c]">{s.count}</span>
                  <span className="text-[10px] text-[#514f4d] font-medium">{s.label}</span>
                </div>
              )
            })}
          </div>

          {/* ── Pending Approval ── */}
          {canApprove && pendingApproval.length > 0 && (
            <div className="bg-white rounded-lg border border-[#dddbda] shadow-sm">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#dddbda]">
                <h3 className="text-[10px] font-bold text-[#514f4d] uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-orange-500" />
                  Pending Approval
                </h3>
                <span className="text-[10px] text-[#0070d2] font-semibold">{pendingApproval.length}</span>
              </div>
              <ul className="divide-y divide-[#dddbda]">
                {pendingApproval.map((item, i) => (
                  <li key={`pa-${item.type}-${item.voucherNumber}-${i}`} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#f3f3f3] transition-colors">
                    <span className={`shrink-0 text-[9px] font-bold px-1 py-0.5 rounded ${
                      item.type === 'JE' ? 'bg-blue-50 text-blue-700' :
                      item.type === 'PMT' ? 'bg-amber-50 text-amber-700' :
                      'bg-emerald-50 text-emerald-700'
                    }`}>{item.type}</span>
                    <span className="text-[11px] font-medium text-[#16325c] min-w-[70px]">{item.voucherNumber}</span>
                    <span className="text-[11px] text-[#514f4d] flex-1 truncate">{item.description}</span>
                    <span className="text-[10px] text-[#514f4d] shrink-0">by {item.submittedBy || 'Unknown'}</span>
                    <span className="text-[10px] text-[#514f4d] shrink-0">{fmtDate(item.date)}</span>
                    <ChevronRight className="w-2.5 h-2.5 text-[#c9c7c5] shrink-0" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Recent Transactions + Pending Tasks ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2 bg-white rounded-lg border border-[#dddbda] shadow-sm">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#dddbda]">
                <h3 className="text-[10px] font-bold text-[#514f4d] uppercase tracking-wider">Recent Transactions</h3>
              </div>
              {recentTransactions.length === 0 ? (
                <p className="text-xs text-[#514f4d] text-center py-4">No transactions yet.</p>
              ) : (
                <ul className="divide-y divide-[#dddbda]">
                  {recentTransactions.map((t, i) => (
                    <li key={`${t.type}-${t.ref}-${i}`} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#f3f3f3] transition-colors">
                      <span className={`shrink-0 text-[9px] font-bold px-1 py-0.5 rounded ${
                        t.type === 'JE' ? 'bg-blue-50 text-blue-700' :
                        t.type === 'PMT' ? 'bg-amber-50 text-amber-700' :
                        'bg-emerald-50 text-emerald-700'
                      }`}>{t.type}</span>
                      <span className="text-[11px] font-medium text-[#16325c] min-w-[70px]">{t.voucherNumber}</span>
                      <span className="text-[11px] text-[#514f4d] flex-1 truncate">{t.description}</span>
                      <span className="text-[10px] text-[#514f4d] shrink-0">{fmtDate(t.date)}</span>
                      <ChevronRight className="w-2.5 h-2.5 text-[#c9c7c5] shrink-0" />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-lg border border-[#dddbda] shadow-sm">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#dddbda]">
                <h3 className="text-[10px] font-bold text-[#514f4d] uppercase tracking-wider flex items-center gap-1">
                  <ListChecks className="w-3 h-3" />
                  Pending Tasks
                </h3>
                <span className="text-[10px] text-[#0070d2] font-semibold">{pendingTasks.length}</span>
              </div>
              {pendingTasks.length === 0 ? (
                <p className="text-xs text-[#514f4d] text-center py-4">No pending tasks.</p>
              ) : (
                <ul className="divide-y divide-[#dddbda]">
                  {pendingTasks.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#f3f3f3] transition-colors">
                      <span className="shrink-0 w-3 h-3 rounded-sm border-1.5 border-slate-300" />
                      <span className="text-[11px] text-[#16325c] flex-1 truncate">{t.text}</span>
                      {t.due_date && (
                        <span className={`text-[10px] shrink-0 ${
                          new Date(t.due_date) < new Date() ? 'text-red-600 font-semibold' : 'text-[#514f4d]'
                        }`}>
                          {fmtDate(t.due_date)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
