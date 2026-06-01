import { useState } from 'react'
import { useAccounts } from '../hooks/useAccounts'
import { ACCOUNT_TYPE_LABELS } from '../lib/accounting'
import { LookupField } from './LookupField'
import type { Account, AccountType } from '../types'

interface AccountFormProps {
  onClose: () => void
  account?: Account
}

const TYPES: AccountType[] = ['asset', 'liability', 'equity', 'income', 'expense']

export function AccountForm({ onClose, account }: AccountFormProps) {
  const { accounts, createAccount, updateAccount } = useAccounts()
  const [name, setName] = useState(account?.name ?? '')
  const [code, setCode] = useState(account?.code ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'asset')
  const [parentId, setParentId] = useState(account?.parent_id ?? '')
  const [isGroup, setIsGroup] = useState(account?.is_group ?? false)
  const [isCash, setIsCash] = useState(account?.is_cash_account ?? false)
  const [allocationAllow, setAllocationAllow] = useState(account?.allocation_allow ?? false)
  const [description, setDescription] = useState(account?.description ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const groupAccounts = accounts.filter((a) => a.is_group && a.id !== account?.id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Account name is required'); return }

    setSaving(true)
    setError(null)
    try {
      if (account) {
        await updateAccount(account.id, {
          name: name.trim(),
          code: code.trim() || null,
          type,
          parent_id: parentId || null,
          is_group: isGroup,
          is_cash_account: isCash,
          allocation_allow: allocationAllow,
          description: description.trim() || null,
        })
      } else {
        await createAccount({
          name: name.trim(),
          code: code.trim() || null,
          type,
          parent_id: parentId || null,
          is_group: isGroup,
          is_cash_account: isCash,
          allocation_allow: allocationAllow,
          description: description.trim() || null,
        })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save account')
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-medium text-slate-500 mb-1">Account Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="e.g. Petty Cash"
            autoFocus
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-medium text-slate-500 mb-1">Account Code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            placeholder="e.g. 1110"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Type *</label>
          <LookupField
            value={type}
            onChange={(v) => setType(v as AccountType)}
            options={TYPES.map((t) => ({ id: t, label: ACCOUNT_TYPE_LABELS[t] }))}
            placeholder="Select type..."
            searchPlaceholder="Search types..."
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Parent Account</label>
          <LookupField
            value={parentId}
            onChange={setParentId}
            options={[
              { id: '', label: 'None (top level)' },
              ...groupAccounts.map((a) => ({ id: a.id, label: a.name, sublabel: a.code })),
            ]}
            placeholder="None (top level)"
            searchPlaceholder="Search accounts..."
          />
        </div>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isGroup}
            onChange={(e) => setIsGroup(e.target.checked)}
            className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
          />
          <span className="text-sm text-slate-700">Group (can have children)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isCash}
            onChange={(e) => setIsCash(e.target.checked)}
            className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
          />
          <span className="text-sm text-slate-700">Cash/Bank Account</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={allocationAllow}
            onChange={(e) => setAllocationAllow(e.target.checked)}
            className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
          />
          <span className="text-sm text-slate-700">Allocation Allowed</span>
        </label>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Optional description"
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : account ? 'Save Changes' : 'Create Account'}
        </button>
      </div>
    </form>
  )
}
