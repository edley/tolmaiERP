import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { PageLayout } from '../../components/PageLayout'
import { DataTable } from '../../components/DataTable'
import { LookupField } from '../../components/LookupField'
import { Modal } from '../../components/Modal'
import { ConfirmModal } from '../../components/ConfirmModal'
import { useRBAC } from '../../hooks/useRBAC'
import { useAccounts } from '../../hooks/useAccounts'
import { useCompany } from '../../contexts/CompanyContext'
import { getPaymentModes, savePaymentMode, deletePaymentMode } from '../../lib/paymentModes'
import type { PaymentMode } from '../../lib/paymentModes'

function FormFields({
  name,
  onNameChange,
  glId,
  onGlIdChange,
  bankAccountNo,
  onBankAccountNoChange,
  address,
  onAddressChange,
  location,
  onLocationChange,
  accountType,
  onAccountTypeChange,
  glOptions,
}: {
  name: string
  onNameChange: (v: string) => void
  glId: string
  onGlIdChange: (v: string) => void
  bankAccountNo: string
  onBankAccountNoChange: (v: string) => void
  address: string
  onAddressChange: (v: string) => void
  location: string
  onLocationChange: (v: string) => void
  accountType: string
  onAccountTypeChange: (v: string) => void
  glOptions: { id: string; label: string }[]
}) {
  const inputCls = 'w-full h-9 px-3 text-sm border border-[#dddbda] rounded text-[#16325c] hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none'
  const labelCls = 'block text-xs font-semibold text-[#514f4d] mb-1'

  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-3">
      <div>
        <label className={labelCls}>Name</label>
        <input type="text" value={name} onChange={(e) => onNameChange(e.target.value)} className={inputCls} placeholder="e.g. Bank BPI" />
      </div>
      <div>
        <label className={labelCls}>Bank Account No.</label>
        <input type="text" value={bankAccountNo} onChange={(e) => onBankAccountNoChange(e.target.value)} className={inputCls} placeholder="e.g. 123456789" />
      </div>
      <div>
        <label className={labelCls}>Account Type</label>
        <select value={accountType} onChange={(e) => onAccountTypeChange(e.target.value)} className={inputCls}>
          <option value="">— Select —</option>
          <option value="Savings">Savings</option>
          <option value="Checking">Checking</option>
          <option value="Payroll">Payroll</option>
          <option value="Cash">Cash</option>
        </select>
      </div>
      <div>
        <label className={labelCls}>GL Account</label>
        <LookupField value={glId} onChange={onGlIdChange} options={glOptions} placeholder="— Select GL Account —" searchPlaceholder="Search by code or name..." />
      </div>
      <div>
        <label className={labelCls}>Address</label>
        <input type="text" value={address} onChange={(e) => onAddressChange(e.target.value)} className={inputCls} placeholder="Branch address" />
      </div>
      <div>
        <label className={labelCls}>Location</label>
        <input type="text" value={location} onChange={(e) => onLocationChange(e.target.value)} className={inputCls} placeholder="City / Region" />
      </div>
    </div>
  )
}

export function PaymentModes() {
  const { accounts } = useAccounts()
  const { crud } = useRBAC()
  const { currentCompany } = useCompany()
  const canCreate = crud('payment_mode', 'create')
  const canUpdate = crud('payment_mode', 'update')
  const canDelete = crud('payment_mode', 'delete')
  const [, forceRender] = useState(0)
  const rerender = () => forceRender((t) => t + 1)

  const modes = getPaymentModes()

  const glOptions = useMemo(() => {
    return accounts
      .filter((a) => !a.is_group)
      .map((a) => ({ id: a.id, label: a.code ? `${a.code} — ${a.name}` : a.name }))
  }, [accounts])

  const [editing, setEditing] = useState<PaymentMode | null>(null)
  const [editName, setEditName] = useState('')
  const [editGlId, setEditGlId] = useState('')
  const [editBankNo, setEditBankNo] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editAcctType, setEditAcctType] = useState('')

  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGlId, setNewGlId] = useState('')
  const [newBankNo, setNewBankNo] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newAcctType, setNewAcctType] = useState('')

  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState<PaymentMode | null>(null)

  const openEdit = (m: PaymentMode) => {
    setEditing(m)
    setEditName(m.name)
    setEditGlId(m.gl_account_id ?? '')
    setEditBankNo(m.bank_account_no ?? '')
    setEditAddress(m.address ?? '')
    setEditLocation(m.location ?? '')
    setEditAcctType(m.account_type ?? '')
  }

  const saveEdit = async () => {
    if (!editing || !editName.trim()) return
    await savePaymentMode(editing.id, {
      name: editName.trim(),
      gl_account_id: editGlId || null,
      bank_account_no: editBankNo,
      address: editAddress,
      location: editLocation,
      account_type: editAcctType,
    })
    setEditing(null)
    rerender()
  }

  const saveNew = async () => {
    if (!newName.trim()) return
    await savePaymentMode(crypto.randomUUID(), {
      name: newName.trim(),
      gl_account_id: newGlId || null,
      bank_account_no: newBankNo,
      address: newAddress,
      location: newLocation,
      account_type: newAcctType,
    })
    setShowNew(false)
    rerender()
  }

  const doDelete = () => {
    if (!deleting) return
    deletePaymentMode(deleting.id)
    setShowDelete(false)
    setDeleting(null)
    rerender()
  }

  const columns = useMemo(() => [
    {
      key: 'name',
      header: 'Name',
      render: (m: PaymentMode) => <span className="font-medium text-[#16325c]">{m.name}</span>,
    },
    {
      key: 'bank_account_no',
      header: 'Account No.',
      render: (m: PaymentMode) => (
        <span className="text-[#514f4d]">{m.bank_account_no || <span className="text-slate-300 italic">—</span>}</span>
      ),
    },
    {
      key: 'account_type',
      header: 'Type',
      render: (m: PaymentMode) => (
        <span className="text-[#514f4d]">{m.account_type || <span className="text-slate-300 italic">—</span>}</span>
      ),
    },
    {
      key: 'gl_account',
      header: 'GL Account',
      render: (m: PaymentMode) => {
        const acc = m.gl_account_id ? accounts.find((a) => a.id === m.gl_account_id) : null
        return acc ? (
          <span className="text-[#514f4d]">{acc.code} — {acc.name}</span>
        ) : (
          <span className="text-slate-400 italic">Not assigned</span>
        )
      },
    },
    {
      key: 'location',
      header: 'Location',
      render: (m: PaymentMode) => (
        <span className="text-[#514f4d]">{m.location || <span className="text-slate-300 italic">—</span>}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24 text-right',
      render: (m: PaymentMode) => (
        <div className="flex items-center justify-end gap-1">
          {canUpdate && (
            <button type="button" onClick={() => openEdit(m)} className="p-1.5 text-slate-400 hover:text-[#0070d2] rounded hover:bg-[#e8f4fe] transition-colors" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {canDelete && (
            <button type="button" onClick={() => { setDeleting(m); setShowDelete(true) }} className="p-1.5 text-slate-400 hover:text-[#c23934] rounded hover:bg-[#fef0f0] transition-colors" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ], [accounts, canUpdate, canDelete])

  return (
    <PageLayout
      title="Bank Accounts"
      description="Manage bank accounts with GL account assignments — isolated per company"
      docType="payment_mode"
      actions={canCreate ? (
        <button type="button" onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] transition-colors">
          <Plus className="w-3.5 h-3.5" />
          New Bank Account
        </button>
      ) : undefined}
    >
      <DataTable columns={columns} data={modes} emptyMessage="No bank accounts found" />

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Edit Bank Account" size="md" companyName={currentCompany?.name}>
        <FormFields
          name={editName} onNameChange={setEditName}
          glId={editGlId} onGlIdChange={setEditGlId}
          bankAccountNo={editBankNo} onBankAccountNoChange={setEditBankNo}
          address={editAddress} onAddressChange={setEditAddress}
          location={editLocation} onLocationChange={setEditLocation}
          accountType={editAcctType} onAccountTypeChange={setEditAcctType}
          glOptions={glOptions}
        />
        <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-[#dddbda]">
          <button type="button" onClick={() => setEditing(null)} className="px-3 py-1.5 text-xs font-medium text-[#514f4d] bg-white border border-[#dddbda] rounded hover:bg-[#f3f3f3] transition-colors">Cancel</button>
          <button type="button" onClick={saveEdit} disabled={!editName.trim()} className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Save</button>
        </div>
      </Modal>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Bank Account" size="md" companyName={currentCompany?.name}>
        <FormFields
          name={newName} onNameChange={setNewName}
          glId={newGlId} onGlIdChange={setNewGlId}
          bankAccountNo={newBankNo} onBankAccountNoChange={setNewBankNo}
          address={newAddress} onAddressChange={setNewAddress}
          location={newLocation} onLocationChange={setNewLocation}
          accountType={newAcctType} onAccountTypeChange={setNewAcctType}
          glOptions={glOptions}
        />
        <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-[#dddbda]">
          <button type="button" onClick={() => setShowNew(false)} className="px-3 py-1.5 text-xs font-medium text-[#514f4d] bg-white border border-[#dddbda] rounded hover:bg-[#f3f3f3] transition-colors">Cancel</button>
          <button type="button" onClick={saveNew} disabled={!newName.trim()} className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Create</button>
        </div>
      </Modal>

      <ConfirmModal
        open={showDelete}
        onClose={() => { setShowDelete(false); setDeleting(null) }}
        onConfirm={doDelete}
        title="Delete Bank Account"
        message={`Are you sure you want to delete "${deleting?.name ?? ''}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
      />
    </PageLayout>
  )
}
