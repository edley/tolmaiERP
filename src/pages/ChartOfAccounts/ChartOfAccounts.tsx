import { useState } from 'react'
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown } from 'lucide-react'
import { useCompany } from '../../contexts/CompanyContext'
import { useAccounts } from '../../hooks/useAccounts'
import { buildAccountTree, ACCOUNT_TYPE_LABELS } from '../../lib/accounting'
import { DemoBanner } from '../../components/DemoBanner'
import { Modal } from '../../components/Modal'
import { ConfirmModal } from '../../components/ConfirmModal'
import { PageLayout } from '../../components/PageLayout'
import { AccountForm } from '../../components/AccountForm'
import type { Account, AccountType } from '../../types'

const TYPE_COLORS: Record<AccountType, string> = {
  asset: 'text-blue-600 bg-blue-50',
  liability: 'text-orange-600 bg-orange-50',
  equity: 'text-purple-600 bg-purple-50',
  income: 'text-green-600 bg-green-50',
  expense: 'text-red-600 bg-red-50',
}

function AccountRow({ account, depth = 0, onEdit, onDelete }: { account: Account; depth?: number; onEdit: (a: Account) => void; onDelete: (a: Account) => void }) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = account.children && account.children.length > 0

  return (
    <>
      <tr className="hover:bg-slate-50 transition-colors">
        <td className="px-4 py-3 text-sm">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
            {hasChildren ? (
              <button onClick={() => setExpanded(!expanded)} className="text-slate-400">
                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <span className="w-4" />
            )}
            <span className={`font-medium ${account.is_group ? 'text-slate-900' : 'text-slate-700'}`}>
              {account.name}
            </span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-slate-500 font-mono">{account.code ?? '-'}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${TYPE_COLORS[account.type]}`}>
            {ACCOUNT_TYPE_LABELS[account.type]}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-slate-500">
          {account.is_group ? (
            <span className="text-slate-400 text-xs">Group</span>
          ) : account.is_cash_account ? (
            <span className="text-emerald-600 text-xs font-medium">Cash</span>
          ) : (
            <span className="text-slate-400 text-xs">Detail</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm">
          {account.allocation_allow ? (
            <span className="text-emerald-600 text-xs font-medium">Yes</span>
          ) : (
            <span className="text-slate-400 text-xs">No</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <button onClick={() => onEdit(account)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(account)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
      {hasChildren && expanded && account.children!.map((child) => (
        <AccountRow key={child.id} account={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </>
  )
}

export function ChartOfAccounts() {
  const { currentCompany } = useCompany()
  const { accounts, loading, error, isDemo, deleteAccount } = useAccounts()
  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null)
  const [deleting, setDeleting] = useState(false)
  const tree = buildAccountTree(accounts)

  const handleDelete = async () => {
    if (!deletingAccount) return
    setDeleting(true)
    try {
      await deleteAccount(deletingAccount.id)
      setDeletingAccount(null)
    } catch {
      // error handled by hook
    }
    setDeleting(false)
  }

  return (
    <PageLayout
      title="Chart of Accounts"
      description="Manage your accounting framework"
      docType="account"
      actions={
        <button
          onClick={() => setShowForm(true)}
          className="h-8 px-4 text-sm font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] transition-colors inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Account
        </button>
      }
    >

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Account" companyName={currentCompany?.name}>
        <AccountForm onClose={() => setShowForm(false)} />
      </Modal>

      <Modal open={!!editingAccount} onClose={() => setEditingAccount(null)} title="Edit Account" companyName={currentCompany?.name}>
        {editingAccount && <AccountForm key={editingAccount.id} account={editingAccount} onClose={() => setEditingAccount(null)} />}
      </Modal>

      <ConfirmModal
        open={!!deletingAccount}
        onClose={() => !deleting && setDeletingAccount(null)}
        onConfirm={handleDelete}
        title="Delete Account"
        message={`Are you sure you want to delete "${deletingAccount?.name}"? This action cannot be undone.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        destructive
      />

      <DemoBanner visible={isDemo} error={error} />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Account</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nature</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Allocation</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-sm">Loading...</td>
              </tr>
            ) : tree.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-sm">
                  No accounts yet. Create your first account to get started.
                </td>
              </tr>
            ) : (
              tree.map((account) => (
                <AccountRow key={account.id} account={account} onEdit={setEditingAccount} onDelete={setDeletingAccount} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </PageLayout>
  )
}
