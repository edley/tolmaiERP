import { useState, useMemo } from 'react'
import { Plus, Lock, Unlock, Trash2 } from 'lucide-react'
import { PageLayout } from '../../components/PageLayout'
import { getPeriods, addPeriod, updatePeriod, deletePeriod } from '../../lib/periods'
import { usePeriod } from '../../contexts/PeriodContext'
import type { AccountingPeriod } from '../../types'

export function AccountingPeriods() {
  const { refresh } = usePeriod()
  const [tick, setTick] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const periods = useMemo(() => getPeriods(), [tick])

  const rerender = () => { setTick((t) => t + 1); refresh() }

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    addPeriod({
      name: fd.get('name') as string,
      start_date: fd.get('start_date') as string,
      end_date: fd.get('end_date') as string,
      status: 'open',
    })
    setShowAdd(false)
    rerender()
  }

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editId) return
    const fd = new FormData(e.currentTarget)
    updatePeriod(editId, {
      name: fd.get('name') as string,
      start_date: fd.get('start_date') as string,
      end_date: fd.get('end_date') as string,
    })
    setEditId(null)
    rerender()
  }

  const toggleStatus = (p: AccountingPeriod) => {
    updatePeriod(p.id, { status: p.status === 'open' ? 'closed' : 'open' })
    rerender()
  }

  const handleDelete = (id: string) => {
    if (!confirm('Delete this accounting period?')) return
    deletePeriod(id)
    rerender()
  }

  const editing = editId ? periods.find((p) => p.id === editId) : null

  return (
    <PageLayout
      title="Accounting Periods"
      description="Manage fiscal periods — define date ranges and open/close periods for transaction posting"
      actions={
        <button
          onClick={() => setShowAdd(true)}
          className="h-8 px-4 text-sm font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] transition-colors inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Period
        </button>
      }
    >
      {/* Add / Edit form */}
      {(showAdd || editing) && (
        <div className="bg-white border border-[#dddbda] rounded-lg shadow-sm p-5 mb-5">
          <h3 className="text-sm font-bold text-[#16325c] mb-4">{editing ? 'Edit Period' : 'New Period'}</h3>
          <form onSubmit={editing ? handleEdit : handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#514f4d] uppercase tracking-wider mb-1">Name</label>
              <input
                type="text"
                name="name"
                defaultValue={editing?.name ?? ''}
                required
                className="w-full h-8 px-3 text-sm border border-[#dddbda] rounded text-[#16325c] hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none"
                placeholder="e.g. January 2026"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#514f4d] uppercase tracking-wider mb-1">Start Date</label>
              <input
                type="date"
                name="start_date"
                defaultValue={editing?.start_date ?? ''}
                required
                className="w-full h-8 px-3 text-sm border border-[#dddbda] rounded text-[#16325c] hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#514f4d] uppercase tracking-wider mb-1">End Date</label>
              <input
                type="date"
                name="end_date"
                defaultValue={editing?.end_date ?? ''}
                required
                className="w-full h-8 px-3 text-sm border border-[#dddbda] rounded text-[#16325c] hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="h-8 px-4 text-sm font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] transition-colors"
              >
                {editing ? 'Save' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => { setShowAdd(false); setEditId(null) }}
                className="h-8 px-4 text-sm font-semibold text-[#514f4d] bg-white border border-[#dddbda] rounded hover:bg-[#f3f3f3] transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Periods table */}
      <div className="bg-white border border-[#dddbda] rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-[#dddbda]">
          <thead>
            <tr className="bg-[#f3f3f3] text-[11px] font-bold text-[#514f4d] uppercase tracking-wider">
              <th className="text-left px-5 py-3">Period Name</th>
              <th className="text-left px-5 py-3">Start Date</th>
              <th className="text-left px-5 py-3">End Date</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-right px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#dddbda]">
            {periods.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-[#514f4d]">
                  No accounting periods yet. Click &ldquo;New Period&rdquo; to create one.
                </td>
              </tr>
            )}
            {[...periods].reverse().map((p) => (
              <tr key={p.id} className="hover:bg-[#fafaf9] transition-colors">
                <td className="px-5 py-3 text-sm font-medium text-[#16325c]">{p.name}</td>
                <td className="px-5 py-3 text-sm text-[#514f4d]">{p.start_date}</td>
                <td className="px-5 py-3 text-sm text-[#514f4d]">{p.end_date}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded ${
                    p.status === 'open'
                      ? 'bg-[#e8f4fe] text-[#0070d2]'
                      : 'bg-[#f3f3f3] text-[#514f4d]'
                  }`}>
                    {p.status === 'open' ? 'Open' : 'Closed'}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => toggleStatus(p)}
                      className="p-1.5 text-[#514f4d] hover:text-[#0070d2] hover:bg-[#e8f4fe] rounded transition-colors"
                      title={p.status === 'open' ? 'Close Period' : 'Open Period'}
                    >
                      {p.status === 'open' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditId(p.id); setShowAdd(false) }}
                      className="p-1.5 text-[#514f4d] hover:text-[#0070d2] hover:bg-[#e8f4fe] rounded transition-colors text-[11px] font-semibold"
                      title="Edit"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 text-[#514f4d] hover:text-[#c23934] hover:bg-[#fef0f0] rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageLayout>
  )
}
