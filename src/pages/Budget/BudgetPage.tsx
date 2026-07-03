import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Plus, DollarSign, Trash2, ListTree, Pencil } from 'lucide-react'
import { PageLayout } from '../../components/PageLayout'
import { DataTable } from '../../components/DataTable'
import { Modal } from '../../components/Modal'
import { LookupField } from '../../components/LookupField'
import { ConfirmModal } from '../../components/ConfirmModal'
import { useCompany } from '../../contexts/CompanyContext'
import { useAccounts } from '../../hooks/useAccounts'
import { usePeriod } from '../../contexts/PeriodContext'
import { useRBAC } from '../../hooks/useRBAC'
import { useAllocationMappings } from '../../hooks/useAllocationMappings'
import { useAllocationTypes } from '../../hooks/useAllocationTypes'
import {
  getGlAccountBudgets,
  upsertGlAccountBudget,
  deleteGlAccountBudget,
  getAllocationCodeBudgets,
  upsertAllocationCodeBudget,
} from '../../lib/budget'
import type { BudgetGlAccount, BudgetAllocationCode, AllocationMapping } from '../../types'

export function BudgetPage() {
  const { currentCompany } = useCompany()
  const { accounts } = useAccounts()
  const { mappings: allMappings } = useAllocationMappings()
  const { types: allTypes } = useAllocationTypes()
  const { periods, currentPeriod, setCurrentPeriod } = usePeriod()
  const { crud } = useRBAC()
  const canDelete = crud('budget', 'delete')

  const companyId = currentCompany?.id ?? ''
  const periodId = currentPeriod?.id ?? ''

  const [budgets, setBudgets] = useState<BudgetGlAccount[]>([])
  const [loading, setLoading] = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addGlAccountId, setAddGlAccountId] = useState('')
  const [addAmount, setAddAmount] = useState('')

  const [allocGlId, setAllocGlId] = useState<string | null>(null)
  const [allocBudgets, setAllocBudgets] = useState<BudgetAllocationCode[]>([])
  const [allocDirty, setAllocDirty] = useState(false)
  const [allocLoading, setAllocLoading] = useState(false)
  const [allocMappings, setAllocMappings] = useState<AllocationMapping[]>([])
  const [allocTypes, setAllocTypes] = useState<string[]>([])
  const [allocAddCode, setAllocAddCode] = useState('')
  const [allocAddType, setAllocAddType] = useState('')
  const [allocAddAmount, setAllocAddAmount] = useState('')
  const [allocDeleteId, setAllocDeleteId] = useState<string | null>(null)
  const allocTempId = useRef(0)

  const [editingGlId, setEditingGlId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const editingGlIdRef = useRef<string | null>(null)
  const editValueRef = useRef('')

  const handleSaveEdit = async () => {
    const glId = editingGlIdRef.current
    const val = parseFloat(editValueRef.current)
    if (!glId || isNaN(val)) return
    setBudgets((prev) => prev.map((b) => (b.gl_account_id === glId ? { ...b, amount: val } : b)))
    editingGlIdRef.current = null
    editValueRef.current = ''
    setEditingGlId(null)
    setEditValue('')
    try {
      await upsertGlAccountBudget(companyId, periodId, glId, val)
    } catch (err) {
      console.error('Failed to save budget:', err)
    }
  }

  const handleCancelEdit = () => {
    editingGlIdRef.current = null
    editValueRef.current = ''
    setEditingGlId(null)
    setEditValue('')
  }

  const fetchBudgets = useCallback(async () => {
    if (!companyId || !periodId) return
    setLoading(true)
    const data = await getGlAccountBudgets(companyId, periodId)
    setBudgets(data)
    setLoading(false)
  }, [companyId, periodId])

  useEffect(() => { fetchBudgets() }, [fetchBudgets])

  const glOptions = useMemo(() => {
    const existingIds = new Set(budgets.map((b) => b.gl_account_id))
    return accounts
      .filter((a) => !a.is_group && !existingIds.has(a.id))
      .map((a) => ({
        id: a.id,
        label: `${a.code ?? ''} — ${a.name}`,
        sublabel: a.type,
      }))
  }, [accounts, budgets])

  const columns = useMemo(
    () => [
      {
        key: 'account',
        header: 'GL Account',
        render: (row: BudgetGlAccount) => {
          const acct = accounts.find((a) => a.id === row.gl_account_id)
          const code = row.gl_code ?? acct?.code
          const name = acct?.name
          return code && name ? `${code} — ${name}` : code ?? name ?? row.gl_account_id
        },
      },
      {
        key: 'type',
        header: 'Type',
        render: (row: BudgetGlAccount) => {
          const acct = accounts.find((a) => a.id === row.gl_account_id)
          return acct ? (
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-[#f3f3f3] text-[#514f4d]">
              {acct.type}
            </span>
          ) : '-'
        },
      },
      {
        key: 'amount',
        header: 'Budget Amount',
        render: (row: BudgetGlAccount) =>
          editingGlId === row.gl_account_id ? (
            <div className="flex items-center justify-end gap-1">
              <input
                type="number"
                step="0.01"
                value={editValue}
                onChange={(e) => { editValueRef.current = e.target.value; setEditValue(e.target.value) }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit() }}
                autoFocus
                className="w-28 px-2 py-1 text-xs text-right border border-[#0070d2] rounded bg-white outline-none"
              />
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-2 py-1 text-[10px] font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-2 py-1 text-[10px] font-semibold text-[#514f4d] bg-white border border-[#dddbda] rounded hover:bg-[#f3f3f3] transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-1">
              <span>{row.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              <button
                type="button"
                onClick={() => { editingGlIdRef.current = row.gl_account_id; editValueRef.current = String(row.amount); setEditingGlId(row.gl_account_id); setEditValue(String(row.amount)) }}
                className="p-1 text-[#514f4d] hover:bg-[#f3f3f3] rounded transition-colors"
                title="Edit"
              >
                <Pencil size={12} />
              </button>
            </div>
          ),
        className: 'text-right',
      },
      {
        key: 'actions' as const,
        header: '',
        render: (row: BudgetGlAccount) => {
          const acct = accounts.find((a) => a.id === row.gl_account_id)
          return (
            <div className="flex items-center justify-end gap-1">
              {acct?.allocation_allow ? (
                <button
                  type="button"
                  onClick={() => openAllocations(row.gl_account_id)}
                  className="p-1 text-[#0070d2] hover:bg-[#e8f4fd] rounded transition-colors"
                  title="Allocation codes"
                >
                  <ListTree size={14} />
                </button>
              ) : null}
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => setDeleteId(row.id)}
                  className="p-1 text-[#c23934] hover:bg-[#fce8e6] rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              ) : null}
            </div>
          )
        },
        className: 'text-right',
      },
    ],
    [accounts, companyId, periodId, canDelete, editingGlId, editValue, handleSaveEdit, handleCancelEdit],
  )

  const total = useMemo(() => budgets.reduce((s, b) => s + b.amount, 0), [budgets])

  const glBudgetAmt = useMemo(
    () => budgets.find((b) => b.gl_account_id === allocGlId)?.amount ?? 0,
    [budgets, allocGlId],
  )

  const handleAdd = async () => {
    if (!addGlAccountId) return
    const val = parseFloat(addAmount) || 0
    const created = await upsertGlAccountBudget(companyId, periodId, addGlAccountId, val)
    setBudgets((prev) => {
      const idx = prev.findIndex((b) => b.id === created.id)
      if (idx !== -1) {
        const next = [...prev]
        next[idx] = created
        return next
      }
      return [...prev, created]
    })
    setShowAdd(false)
    setAddGlAccountId('')
    setAddAmount('')
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await deleteGlAccountBudget(deleteId)
    setBudgets((prev) => prev.filter((b) => b.id !== deleteId))
    setDeleteId(null)
  }

  const openAllocations = async (glAccountId: string) => {
    if (!companyId || !periodId) return
    setAllocGlId(glAccountId)
    setAllocLoading(true)
    const acct = accounts.find((a) => a.id === glAccountId)
    const code = acct?.code
    console.log('openAllocations — glAccountId:', glAccountId, 'code:', code, 'accounts count:', accounts.length)
    if (code) {
      setAllocMappings(allMappings.filter((m) => m.gl_code === code))
      setAllocTypes(allTypes.filter((t) => t.gl_code === code && t.active).map((t) => t.name))
    } else {
      setAllocMappings([])
      setAllocTypes([])
    }
    const data = await getAllocationCodeBudgets(companyId, periodId, glAccountId)
    console.log('existing allocation budgets:', data)
    setAllocBudgets(data)
    setAllocDirty(false)
    setAllocLoading(false)
    setAllocAddCode('')
    setAllocAddType('')
    setAllocAddAmount('')
    allocTempId.current = 0
  }

  const handleAllocAdd = () => {
    if (!allocGlId || !allocAddCode || !allocAddType) return
    const val = parseFloat(allocAddAmount) || 0
    allocTempId.current += 1
    const now = new Date().toISOString()
    const newRow: BudgetAllocationCode = {
      id: `_new_${allocTempId.current}`,
      company_id: companyId,
      period_id: periodId,
      gl_account_id: allocGlId,
      allocation_code: allocAddCode,
      allocation_type: allocAddType,
      amount: val,
      description: null,
      created_at: now,
      updated_at: now,
    }
    setAllocBudgets((prev) => [...prev, newRow])
    setAllocDirty(true)
    setAllocAddCode('')
    setAllocAddType('')
    setAllocAddAmount('')
  }

  const handleAllocAmountChange = (id: string, amount: string) => {
    const val = parseFloat(amount)
    if (isNaN(val)) return
    setAllocBudgets((prev) => prev.map((b) => (b.id === id ? { ...b, amount: val } : b)))
    setAllocDirty(true)
  }

  const handleAllocDelete = (id: string) => {
    setAllocBudgets((prev) => prev.filter((b) => b.id !== id))
    setAllocDirty(true)
    setAllocDeleteId(null)
  }

  const handleAllocSaveAll = async () => {
    if (!allocGlId || !allocDirty) return
    const totalAlloc = allocBudgets.reduce((s, b) => s + b.amount, 0)
    if (totalAlloc > glBudgetAmt) return
    for (const b of allocBudgets) {
      await upsertAllocationCodeBudget(companyId, periodId, allocGlId, b.allocation_code, b.allocation_type, b.amount)
    }
    setAllocDirty(false)
    const data = await getAllocationCodeBudgets(companyId, periodId, allocGlId)
    setAllocBudgets(data)
  }

  return (
    <PageLayout
      title="Budget"
      description="Set and manage budgets per accounting period"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setAddGlAccountId(''); setAddAmount(''); setShowAdd(true) }}
            className="h-8 flex items-center gap-1.5 px-3 text-xs font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] transition-colors"
          >
            <Plus size={14} />
            New
          </button>
          <select
            value={periodId}
            onChange={(e) => setCurrentPeriod(e.target.value)}
            className="h-8 text-xs font-semibold text-[#16325c] bg-white border border-[#dddbda] rounded px-2 focus:outline-none focus:border-[#0070d2]"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-[#514f4d] bg-[#f3f3f3] border border-[#dddbda] rounded px-2.5 py-1">
            <DollarSign size={12} />
            <span>{total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      }
    >
      <div className="flex items-center gap-4 mb-3 text-[11px] text-[#514f4d]">
        <span><span className="font-semibold">{budgets.length}</span> items</span>
        <span><span className="font-semibold">{budgets.filter((b) => b.amount !== 0).length}</span> with budget</span>
      </div>

      <DataTable<BudgetGlAccount>
        columns={columns}
        data={budgets}
        loading={loading}
        emptyMessage="No budgets set for this period."
      />

      <div className="mt-4 pt-3 border-t border-[#dddbda] flex items-center justify-between text-xs text-[#514f4d]">
        <span className="font-semibold">
          Total Budget: {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      </div>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="New Budget"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#514f4d] mb-1">GL Account</label>
            <LookupField
              value={addGlAccountId}
              onChange={setAddGlAccountId}
              options={glOptions}
              placeholder="Search GL account..."
              emptyMessage="All accounts already have budgets"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#514f4d] mb-1">Budget Amount</label>
            <input
              type="number"
              step="0.01"
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm border border-[#dddbda] rounded focus:outline-none focus:border-[#0070d2]"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-xs font-semibold text-[#514f4d] bg-white border border-[#dddbda] rounded hover:bg-[#f3f3f3] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!addGlAccountId}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Budget Entry"
        message="Are you sure you want to delete this budget entry? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />

      <Modal
        open={allocGlId !== null}
        onClose={() => { if (!allocDirty) { setAllocGlId(null) } }}
        title="Allocation Code Budgets"
      >
        {(() => {
          const acct = allocGlId ? accounts.find((a) => a.id === allocGlId) : null
          return acct ? (
            <div className="flex items-center justify-between text-[11px] text-[#514f4d] mb-3">
              <span>{acct.code} — {acct.name}</span>
              <span className="font-semibold">
                GL Budget: {glBudgetAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })} |
                Allocated: {allocBudgets.reduce((s, b) => s + b.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} |
                Remaining: <span className={(allocBudgets.reduce((s, b) => s + b.amount, 0)) > glBudgetAmt ? 'text-[#c23934]' : ''}>{(glBudgetAmt - allocBudgets.reduce((s, b) => s + b.amount, 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </span>
            </div>
          ) : null
        })()}
        {allocLoading ? (
          <div className="py-6 text-center text-xs text-[#514f4d]">Loading...</div>
        ) : (
          <div className="space-y-3">
            {allocBudgets.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#dddbda]">
                    <th className="text-left font-semibold text-[#514f4d] pb-2">Allocation Code</th>
                    <th className="text-left font-semibold text-[#514f4d] pb-2">Allocation Type</th>
                    <th className="text-right font-semibold text-[#514f4d] pb-2">Amount</th>
                    <th className="text-right w-8 pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {allocBudgets.map((b) => {
                    const mapping = allocMappings.find((m) => m.allocation_code === b.allocation_code)
                    return (
                      <tr key={b.id} className="border-b border-[#e8e8e8]">
                        <td className="py-1.5 pr-2">{mapping ? `${b.allocation_code} — ${mapping.description ?? ''}` : b.allocation_code}</td>
                        <td className="py-1.5 pr-2">{b.allocation_type || '-'}</td>
                        <td className="text-right py-1.5">
                          <input
                            type="number"
                            step="0.01"
                            defaultValue={b.amount}
                            onChange={(e) => handleAllocAmountChange(b.id, e.target.value)}
                            className="w-24 px-2 py-1 text-xs text-right border border-transparent hover:border-[#dddbda] focus:border-[#0070d2] focus:outline-none rounded bg-transparent"
                          />
                        </td>
                        <td className="text-right py-1.5">
                          {canDelete ? (
                            <button
                              type="button"
                              onClick={() => setAllocDeleteId(b.id)}
                              className="p-1 text-[#c23934] hover:bg-[#fce8e6] rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={12} />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-3 text-center text-xs text-[#514f4d]">No allocation budgets set yet.</div>
            )}

            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[#dddbda]">
              <select
                value={allocAddCode}
                onChange={(e) => setAllocAddCode(e.target.value)}
                className="flex-1 min-w-[140px] h-8 text-xs border border-[#dddbda] rounded px-2 focus:outline-none focus:border-[#0070d2]"
              >
                <option value="">Allocation code...</option>
                {(() => {
                  const seen = new Set<string>()
                  const allCodes: { allocation_code: string; description: string | null }[] = []
                  for (const m of allocMappings) {
                    if (!seen.has(m.allocation_code)) {
                      seen.add(m.allocation_code)
                      allCodes.push({ allocation_code: m.allocation_code, description: m.description })
                    }
                  }
                  for (const b of allocBudgets) {
                    if (!seen.has(b.allocation_code)) {
                      seen.add(b.allocation_code)
                      const m = allocMappings.find((x) => x.allocation_code === b.allocation_code)
                      allCodes.push({ allocation_code: b.allocation_code, description: m?.description ?? null })
                    }
                  }
                  return allCodes.map((c) => (
                    <option key={c.allocation_code} value={c.allocation_code}>
                      {c.allocation_code}{c.description ? ` — ${c.description}` : ''}
                    </option>
                  ))
                })()}
              </select>
              <select
                value={allocAddType}
                onChange={(e) => setAllocAddType(e.target.value)}
                className="flex-1 min-w-[120px] h-8 text-xs border border-[#dddbda] rounded px-2 focus:outline-none focus:border-[#0070d2]"
              >
                <option value="">Allocation type...</option>
                {(() => {
                  const seen = new Set<string>()
                  const allTypes: string[] = []
                  for (const t of allocTypes) {
                    if (!seen.has(t)) { seen.add(t); allTypes.push(t) }
                  }
                  for (const b of allocBudgets) {
                    if (b.allocation_type && !seen.has(b.allocation_type)) {
                      seen.add(b.allocation_type)
                      allTypes.push(b.allocation_type)
                    }
                  }
                  return allTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))
                })()}
              </select>
              <input
                type="number"
                step="0.01"
                value={allocAddAmount}
                onChange={(e) => setAllocAddAmount(e.target.value)}
                placeholder="0.00"
                className="w-24 h-8 px-2 text-xs text-right border border-[#dddbda] rounded focus:outline-none focus:border-[#0070d2]"
              />
              <button
                type="button"
                onClick={handleAllocAdd}
                disabled={!allocAddCode || !allocAddType}
                className="h-8 flex items-center gap-1 px-2.5 text-xs font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={12} />
                Add
              </button>
            </div>

            {(allocBudgets.reduce((s, b) => s + b.amount, 0)) > glBudgetAmt ? (
              <div className="text-[11px] text-[#c23934] text-center">
                Total allocation ({allocBudgets.reduce((s, b) => s + b.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}) exceeds GL budget ({glBudgetAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })})
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#dddbda]">
              <button
                type="button"
                onClick={() => { setAllocGlId(null) }}
                className="px-4 py-2 text-xs font-semibold text-[#514f4d] bg-white border border-[#dddbda] rounded hover:bg-[#f3f3f3] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAllocSaveAll}
                disabled={!allocDirty || (allocBudgets.reduce((s, b) => s + b.amount, 0)) > glBudgetAmt}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save All
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={allocDeleteId !== null}
        onClose={() => setAllocDeleteId(null)}
        title="Delete Allocation Budget"
        message="Are you sure you want to delete this allocation code budget entry?"
        confirmLabel="Delete"
        destructive
        onConfirm={() => handleAllocDelete(allocDeleteId!)}
      />
    </PageLayout>
  )
}
