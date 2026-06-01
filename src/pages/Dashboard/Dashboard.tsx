import { FileText, CreditCard, ArrowDownToLine, Database, Loader2 } from 'lucide-react'
import { StatCard } from '../../components/StatCard'
import { PageLayout } from '../../components/PageLayout'
import { usePeriod } from '../../contexts/PeriodContext'
import { useJournalEntries } from '../../hooks/useJournalEntries'
import { usePayments } from '../../hooks/usePayments'
import { useReceipts } from '../../hooks/useReceipts'
import { Link } from 'react-router-dom'
import { useMemo } from 'react'

const quickLinks = [
  { label: 'New Journal Entry', to: '/journal-entries', description: 'Record a new accounting transaction' },
  { label: 'Chart of Accounts', to: '/accounts', description: 'Manage your account structure' },
  { label: 'General Ledger', to: '/general-ledger', description: 'View all ledger postings' },
]

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

export function Dashboard() {
  const { currentPeriod } = usePeriod()
  const { entries, loading: loadingJE } = useJournalEntries()
  const { payments, loading: loadingPMT } = usePayments()
  const { receipts, loading: loadingRCT } = useReceipts()

  const loading = loadingJE || loadingPMT || loadingRCT

  const periodEntries = useMemo(
    () => entries.filter((e) => currentPeriod && e.period_id === currentPeriod.id),
    [entries, currentPeriod]
  )
  const periodPayments = useMemo(
    () => payments.filter((p) => currentPeriod && p.period_id === currentPeriod.id),
    [payments, currentPeriod]
  )
  const periodReceipts = useMemo(
    () => receipts.filter((r) => currentPeriod && r.period_id === currentPeriod.id),
    [receipts, currentPeriod]
  )

  const pendingPosting =
    periodEntries.filter((e) => e.status === 'approved').length +
    periodPayments.filter((p) => p.status === 'approved').length +
    periodReceipts.filter((r) => r.status === 'approved').length

  const totalJeAmount = periodEntries.reduce((s, e) => s + e.total_debit, 0)
  const totalPmtAmount = periodPayments.reduce((s, p) => s + p.voucher_amount, 0)
  const totalRctAmount = periodReceipts.reduce((s, r) => s + r.voucher_amount, 0)

  return (
    <PageLayout title="Dashboard" description={`${currentPeriod?.name ?? 'No period selected'} — Welcome to Tolmai ERP`}>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Journal Entries"
            value={periodEntries.length.toString()}
            icon={<FileText className="w-5 h-5" />}
            subtitle={`Total: ${fmt(totalJeAmount)}`}
          />
          <StatCard
            title="Payments"
            value={periodPayments.length.toString()}
            icon={<CreditCard className="w-5 h-5" />}
            subtitle={`Total: ${fmt(totalPmtAmount)}`}
          />
          <StatCard
            title="Receipts"
            value={periodReceipts.length.toString()}
            icon={<ArrowDownToLine className="w-5 h-5" />}
            subtitle={`Total: ${fmt(totalRctAmount)}`}
          />
          <StatCard
            title="Pending Posting"
            value={pendingPosting.toString()}
            icon={<Database className="w-5 h-5" />}
            subtitle="Awaiting ledger posting"
          />
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="block p-4 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all"
            >
              <h3 className="font-medium text-slate-900">{link.label}</h3>
              <p className="text-sm text-slate-500 mt-1">{link.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </PageLayout>
  )
}
