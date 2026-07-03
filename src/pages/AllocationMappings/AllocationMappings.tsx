import { useState, useMemo, useRef } from 'react'
import { useCompany } from '../../contexts/CompanyContext'
import { Plus, Trash2, ToggleLeft, ToggleRight, Pencil, Save, X, ArrowLeft } from 'lucide-react'
import { PageLayout } from '../../components/PageLayout'
import { DataTable } from '../../components/DataTable'
import { LookupField } from '../../components/LookupField'
import { Modal } from '../../components/Modal'
import { ConfirmModal } from '../../components/ConfirmModal'
import { useAccounts } from '../../hooks/useAccounts'
import { useRBAC } from '../../hooks/useRBAC'
import { useAllocationMappings } from '../../hooks/useAllocationMappings'
import { resolveMappingAccounts } from '../../lib/allocationMappings'
import type { AllocationMapping } from '../../types'

type ViewMode = 'list' | 'detail' | 'new'

export function AllocationMappings() {
  const { currentCompany } = useCompany()
  const { accounts } = useAccounts()
  const { crud } = useRBAC()
  const canCreate = crud('allocation_mapping', 'create')
  const canUpdate = crud('allocation_mapping', 'update')
  const canDelete = crud('allocation_mapping', 'delete')
  const { mappings: rawMappings, addMapping, updateMapping, deleteMapping } = useAllocationMappings()
  const [view, setView] = useState<ViewMode>('list')

  // GL code selection
  const [selectedGlId, setSelectedGlId] = useState('')
  const [selectedGlCode, setSelectedGlCode] = useState('')

  // New code modal
  const [showNewModal, setShowNewModal] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)

  // Delete group
  const [showDeleteGroup, setShowDeleteGroup] = useState(false)
  const [deletingGroup, setDeletingGroup] = useState(false)

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDesc, setEditDesc] = useState('')

  const newGlRef = useRef<HTMLInputElement>(null)

  const allMappings = useMemo(() => resolveMappingAccounts(rawMappings, accounts), [rawMappings, accounts])

  const detailMappings = useMemo(() => {
    if (!selectedGlCode) return []
    return allMappings.filter((m) => m.gl_code === selectedGlCode)
  }, [allMappings, selectedGlCode])

  // Group mappings by GL code (for the list view)
  const groups = useMemo(() => {
    const map = new Map<string, AllocationMapping[]>()
    for (const m of allMappings) {
      if (!m.gl_code) continue
      if (!map.has(m.gl_code)) map.set(m.gl_code, [])
      map.get(m.gl_code)!.push(m)
    }
    return Array.from(map.entries()).map(([glCode, mappings]) => ({ glCode, mappings }))
  }, [allMappings])

  // GL LookupField options for the "New" flow
  const glOptions = useMemo(() => {
    const used = new Set<string>()
    const opts: { id: string; label: string; sublabel: string | null }[] = []

    for (const a of accounts) {
      if (!a.is_group && a.code && a.allocation_allow) {
        used.add(a.code)
        opts.push({ id: a.id, label: `${a.code} — ${a.name}`, sublabel: a.code })
      }
    }

    for (const m of allMappings) {
      if (m.gl_code && !used.has(m.gl_code)) {
        used.add(m.gl_code)
        opts.push({ id: `gl_${m.gl_code}`, label: `${m.gl_code} (not in chart)`, sublabel: m.gl_code })
      }
    }

    opts.sort((a, b) => (a.sublabel ?? '').localeCompare(b.sublabel ?? ''))
    return opts
  }, [accounts, allMappings])

  const openGroupDetail = (glCode: string) => {
    const match = glOptions.find((o) => o.sublabel === glCode && !o.id.startsWith('gl_'))
    if (match) {
      setSelectedGlId(match.id)
    } else {
      setSelectedGlId('')
    }
    setSelectedGlCode(glCode)
    setView('detail')
  }

  const openNewFlow = () => {
    setSelectedGlId('')
    setSelectedGlCode('')
    setView('new')
    setTimeout(() => newGlRef.current?.focus(), 100)
  }

  const handleGlChange = (value: string) => {
    setSelectedGlId('')
    setSelectedGlCode('')
    if (!value) return

    const opt = glOptions.find((o) => o.id === value)
    if (!opt) return

    if (value.startsWith('gl_')) {
      setSelectedGlCode(opt.sublabel ?? opt.label)
    } else {
      setSelectedGlId(value)
      setSelectedGlCode(opt.sublabel ?? '')
    }
  }

  const selectedOptionId = selectedGlId || (selectedGlCode ? `gl_${selectedGlCode}` : '')

  const openNewCode = () => {
    setNewCode('')
    setNewDesc('')
    setCodeError(null)
    setShowNewModal(true)
  }

  const handleAddCode = async () => {
    setCodeError(null)
    const code = newCode.trim().toUpperCase()
    if (!code) { setCodeError('Allocation code is required'); return }
    if (view === 'new' && !selectedGlCode) { setCodeError('Select a GL code first'); return }
    if (allMappings.some((m) => m.gl_code === selectedGlCode && m.allocation_code === code)) {
      setCodeError(`Code "${code}" already exists for this GL code`)
      return
    }
    try {
      await addMapping({
        gl_account_id: selectedGlId || null,
        gl_code: selectedGlCode,
        allocation_code: code,
        description: newDesc.trim() || null,
        active: true,
      })
      setShowNewModal(false)
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : 'Failed to add code')
    }
  }

  const handleDeleteCode = async (m: AllocationMapping) => {
    if (!confirm(`Delete allocation code "${m.allocation_code}"?`)) return
    try {
      await deleteMapping(m.id)
    } catch {}
  }

  const toggleActive = async (m: AllocationMapping) => {
    try {
      await updateMapping(m.id, { active: !m.active })
    } catch {}
  }

  const startEdit = (m: AllocationMapping) => {
    setEditingId(m.id)
    setEditDesc(m.description ?? '')
  }

  const saveEdit = async (m: AllocationMapping) => {
    try {
      await updateMapping(m.id, { description: editDesc.trim() || null })
      setEditingId(null)
    } catch {}
  }

  const cancelEdit = () => setEditingId(null)

  const handleDeleteGroup = async () => {
    setDeletingGroup(true)
    try {
      for (const m of detailMappings) {
        await deleteMapping(m.id)
      }
    } catch {}
    setDeletingGroup(false)
    setShowDeleteGroup(false)
    setSelectedGlId('')
    setSelectedGlCode('')
    setView('list')
  }

  const goToList = () => {
    setView('list')
    setSelectedGlId('')
    setSelectedGlCode('')
  }

  const allocationColumns = [
    {
      key: 'allocation_code',
      header: 'Code',
      render: (m: AllocationMapping) => (
        <span className="inline-flex px-2 py-0.5 text-[11px] font-bold bg-[#e8f4fe] text-[#0070d2] rounded">
          {m.allocation_code}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (m: AllocationMapping) => {
        if (editingId === m.id) {
          return (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(m); if (e.key === 'Escape') cancelEdit() }}
                className="w-48 h-7 px-2 text-sm border border-[#0070d2] rounded text-[#16325c] focus:outline-none"
                autoFocus
              />
              <button onClick={() => saveEdit(m)} className="p-1 text-[#0070d2] hover:bg-[#e8f4fe] rounded">
                <Save className="w-3.5 h-3.5" />
              </button>
              <button onClick={cancelEdit} className="p-1 text-[#514f4d] hover:bg-[#f3f3f3] rounded">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        }
        return <span className="text-sm text-[#514f4d]">{m.description ?? '-'}</span>
      },
    },
    {
      key: 'active',
      header: 'Active',
      render: (m: AllocationMapping) => (
        <button
          onClick={() => toggleActive(m)}
          className={`inline-flex items-center gap-1 text-xs font-semibold transition-colors ${
            m.active ? 'text-[#0070d2]' : 'text-[#514f4d]'
          }`}
        >
          {m.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          {m.active ? 'Yes' : 'No'}
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (m: AllocationMapping) => (
        <div className="flex items-center justify-end gap-1">
          {canUpdate && (
            <button
              onClick={() => startEdit(m)}
              className="p-1.5 text-[#514f4d] hover:text-[#0070d2] hover:bg-[#e8f4fe] rounded transition-colors"
              title="Edit description"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => handleDeleteCode(m)}
              className="p-1.5 text-[#514f4d] hover:text-[#c23934] hover:bg-[#fef0f0] rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <PageLayout
      title="Allocation Mappings"
      description="Manage allocation code lists for each GL code"
      docType="allocation_mapping"
      actions={
        view !== 'new' && canCreate ? (
          <button
            onClick={openNewFlow}
            className="h-8 px-4 text-sm font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        ) : undefined
      }
    >
      {/* New code modal */}
      <Modal open={showNewModal} onClose={() => setShowNewModal(false)} title="New Allocation Code" companyName={currentCompany?.name}>
        <div className="space-y-4">
          {codeError && (
            <div className="p-3 bg-[#fef0f0] border border-[#c23934] rounded text-xs text-[#c23934]">{codeError}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">GL Code</label>
            <div className="h-8 flex items-center px-3 text-sm font-mono font-medium text-[#16325c] bg-slate-50 border border-slate-200 rounded">
              {selectedGlCode || '-'}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Allocation Code <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={newCode}
              onChange={(e) => { setNewCode(e.target.value); setCodeError(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCode() } }}
              className="w-full h-8 px-3 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. ADMIN"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCode() } }}
              className="w-full h-8 px-3 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Optional description"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowNewModal(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddCode}
              className="px-4 py-2 text-sm font-medium text-white bg-[#0070d2] rounded-lg hover:bg-[#005fb2] inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete group confirmation */}
      <ConfirmModal
        open={showDeleteGroup}
        onClose={() => setShowDeleteGroup(false)}
        onConfirm={handleDeleteGroup}
        title="Delete GL Group"
        message={`Are you sure you want to delete all allocation codes for GL "${selectedGlCode}"? (${detailMappings.length} code${detailMappings.length !== 1 ? 's' : ''})`}
        confirmLabel={deletingGroup ? 'Deleting...' : 'Delete All'}
        destructive
      />

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <DataTable
            columns={[
              {
                key: 'glCode',
                header: 'GL Code',
                render: (g: { glCode: string; mappings: AllocationMapping[] }) => (
                  <button
                    onClick={() => openGroupDetail(g.glCode)}
                    className="font-mono text-sm font-medium text-[#0070d2] hover:underline"
                  >
                    {g.glCode}
                  </button>
                ),
              },
              {
                key: 'codes',
                header: 'Allocation Codes',
                render: (g: { glCode: string; mappings: AllocationMapping[] }) => (
                  <div className="flex flex-wrap gap-1">
                    {g.mappings.map((m) => (
                      <span
                        key={m.id}
                        className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded ${
                          m.active ? 'bg-[#e8f4fe] text-[#0070d2]' : 'bg-[#f3f3f3] text-[#514f4d]'
                        }`}
                      >
                        {m.allocation_code}
                      </span>
                    ))}
                  </div>
                ),
              },
              {
                key: 'active',
                header: 'Active',
                render: (g: { glCode: string; mappings: AllocationMapping[] }) => {
                  const total = g.mappings.length
                  const active = g.mappings.filter((m) => m.active).length
                  return <span className="text-sm text-[#514f4d]">{active}/{total}</span>
                },
              },
              {
              key: 'actions',
              header: 'Actions',
              className: 'text-right',
              render: (g: { glCode: string; mappings: AllocationMapping[] }) => (
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => openGroupDetail(g.glCode)}
                    className="p-1.5 text-[#514f4d] hover:text-[#0070d2] hover:bg-[#e8f4fe] rounded transition-colors"
                    title="View codes"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => {
                        openGroupDetail(g.glCode)
                        setShowDeleteGroup(true)
                      }}
                      className="p-1.5 text-[#514f4d] hover:text-[#c23934] hover:bg-[#fef0f0] rounded transition-colors"
                      title="Delete group"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ),
              },
            ]}
            data={groups}
            emptyMessage='No allocation mappings yet. Click "New" to create one.'
          />
        </div>
      )}

      {/* ── DETAIL VIEW ── */}
      {view === 'detail' && (
        <>
          <div className="flex items-center gap-4 mb-5">
            <button
              onClick={goToList}
              className="inline-flex items-center gap-1 text-sm text-[#0070d2] hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h2 className="text-lg font-bold text-[#16325c]">
              Allocation Codes for GL <span className="font-mono">{selectedGlCode}</span>
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
              {detailMappings.length} code{detailMappings.length !== 1 ? 's' : ''}
            </span>
            <div className="ml-auto flex items-center gap-2">
              {canCreate && (
                <button
                  onClick={openNewCode}
                  className="h-8 px-4 text-sm font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Code
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => setShowDeleteGroup(true)}
                  className="h-8 px-4 text-sm font-semibold text-white bg-[#c23934] rounded hover:bg-[#a12b27] transition-colors inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Group
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <DataTable
              columns={allocationColumns}
              data={detailMappings}
              emptyMessage={'No allocation codes yet. Click "New Code" to add one.'}
            />
          </div>
        </>
      )}

      {/* ── NEW FLOW ── */}
      {view === 'new' && (
        <>
          <div className="flex items-center gap-4 mb-5">
            <button
              onClick={goToList}
              className="inline-flex items-center gap-1 text-sm text-[#0070d2] hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h2 className="text-lg font-bold text-[#16325c]">New Allocation</h2>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-72">
                <label className="block text-xs font-medium text-slate-500 mb-1">GL Code <span className="text-red-500">*</span></label>
                <LookupField
                  value={selectedOptionId}
                  onChange={(v) => { handleGlChange(v); if (v) setTimeout(() => openNewCode(), 300) }}
                  options={glOptions}
                  placeholder="Search or select GL code..."
                  searchPlaceholder="Search by code or name..."
                />
              </div>
              {selectedGlCode && canCreate && (
                <button
                  onClick={openNewCode}
                  className="h-8 px-4 text-sm font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Code
                </button>
              )}
            </div>
          </div>

          {selectedGlCode && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <DataTable
                columns={allocationColumns}
                data={detailMappings}
                emptyMessage={'No allocation codes yet. Click "Add Code" to create one.'}
              />
            </div>
          )}
        </>
      )}
    </PageLayout>
  )
}
