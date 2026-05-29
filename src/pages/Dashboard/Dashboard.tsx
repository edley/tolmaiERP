import { Wallet, Receipt, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { StatCard } from '../../components/StatCard'
import { PageLayout } from '../../components/PageLayout'
import { usePeriod } from '../../contexts/PeriodContext'
import { Link } from 'react-router-dom'

const quickLinks = [
  { label: 'New Journal Entry', to: '/journal-entries', description: 'Record a new accounting transaction' },
  { label: 'Chart of Accounts', to: '/accounts', description: 'Manage your account structure' },
  { label: 'General Ledger', to: '/general-ledger', description: 'View all ledger postings' },
]

export function Dashboard() {
  const { currentPeriod } = usePeriod()
  return (
    <PageLayout title="Dashboard" description={`${currentPeriod?.name ?? 'No period selected'} — Welcome to Tolmai ERP`}>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Cash Balance"
          value="Rp 0"
          icon={<Wallet className="w-5 h-5" />}
          subtitle="All cash accounts"
        />
        <StatCard
          title="Total Assets"
          value="Rp 0"
          icon={<ArrowUpCircle className="w-5 h-5" />}
        />
        <StatCard
          title="Total Liabilities"
          value="Rp 0"
          icon={<ArrowDownCircle className="w-5 h-5" />}
        />
        <StatCard
          title="Ledger Entries"
          value="0"
          icon={<Receipt className="w-5 h-5" />}
          subtitle="This period"
        />
      </div>

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
