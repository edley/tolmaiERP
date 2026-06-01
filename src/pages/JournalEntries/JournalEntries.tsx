import { useState, useMemo } from 'react'
import {
  Plus,
  XCircle,
  Send,
  ThumbsUp,
  Database,
  Eye,
  Pencil,
  Trash2,
  Clock,
} from 'lucide-react'
import { DemoBanner } from '../../components/DemoBanner'
import { Modal } from '../../components/Modal'
import { PageLayout } from '../../components/PageLayout'
import { LookupField } from '../../components/LookupField'
import { JournalEntryForm } from '../../components/JournalEntryForm'
import { AuditTrail } from '../../components/AuditTrail'
import { useJournalEntries } from '../../hooks/useJournalEntries'
import { useRBAC } from '../../hooks/useRBAC'
import { usePeriod } from '../../contexts/PeriodContext'
import { DataTable } from '../../components/DataTable'
import type { JournalEntry, JournalEntryStatus } from '../../types'

const STATUS_STYLES: Record<JournalEntryStatus, string> = {
  draft: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  submitted: 'bg-blue-50 text-blue-700 border-blue-300',
  approved: 'bg-purple-50 text-purple-700 border-purple-300',
  posted: 'bg-green-50 text-green-700 border-green-300',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}

const STATUS_LABELS: Record<JournalEntryStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  posted: 'Posted to GL',
  cancelled: 'Cancelled',
}

export function JournalEntries() {
  const { entries, loading, submitEntry, approveEntry, postEntry, cancelEntry, deleteEntry, refetch } = useJournalEntries()
  const { userType, crud } = useRBAC()
  const { periods, currentPeriod, setCurrentPeriod } = usePeriod()
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null)
  const [auditEntry, setAuditEntry] = useState<JournalEntry | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const periodOptions = useMemo(() =>
    periods.map((p) => ({ id: p.id, label: p.name, sublabel: p.status === 'closed' ? 'Closed' : null })),
    [periods]
  )

  const filtered = useMemo(() => {
    if (!currentPeriod) return entries
    return entries.filter((e) => e.posting_date >= currentPeriod.start_date && e.posting_date <= currentPeriod.end_date)
  }, [entries, currentPeriod])

  const canSubmit = (row: JournalEntry) => row.status === 'draft' && crud('journal_entry', 'update')
  const canApprove = (row: JournalEntry) => row.status === 'submitted' && (userType === 'Superuser' || userType === 'Manager')
  const canPost = (row: JournalEntry) => row.status === 'approved' && (userType === 'Superuser' || userType === 'Manager')
  const canCancel = (row: JournalEntry) => (row.status === 'draft' || row.status === 'submitted') && crud('journal_entry', 'update')
  const canEdit = (row: JournalEntry) => row.status === 'draft' && crud('journal_entry', 'update')
  const canDelete = (row: JournalEntry) => row.status === 'draft' && crud('journal_entry', 'delete')

  const handleAction = async (action: string, id: string) => {
    const confirmMsg: Record<string, string> = {
      submit: 'Submit this entry for approval?',
      approve: 'Approve this entry? It will be queued for posting.',
      post: 'Post this entry to the General Ledger? This is irreversible.',
      cancel: 'Cancel this journal entry?',
      delete: 'Delete this draft entry?',
    }
    if (!confirm(confirmMsg[action] ?? 'Proceed?')) return
    setActionError(null)
    try {
      if (action === 'submit') await submitEntry(id)
      else if (action === 'approve') await approveEntry(id)
      else if (action === 'post') await postEntry(id)
      else if (action === 'cancel') await cancelEntry(id)
      else if (action === 'delete') await deleteEntry(id)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed')
    }
  }

  return (
    <PageLayout
      title="Journal Entries"
      description="Record and manage double-entry transactions"
      docType="journal_entry"
      actions={
        <button
          onClick={() => setShowForm(true)}
          className="h-8 px-4 text-sm font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] transition-colors inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Entry
        </button>
      }
    >

      {actionError && (
        <div className="mb-4 bg-[#fef0f0] border-l-4 border-[#c23934] p-4 rounded-r text-sm text-[#c23934] font-medium">
          {actionError}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Journal Entry" size="full">
        <JournalEntryForm onClose={() => setShowForm(false)} onSuccess={refetch} />
      </Modal>

      <Modal open={!!editingEntry} onClose={() => setEditingEntry(null)} title={`Edit — ${editingEntry?.entry_number ?? ''}`} size="full">
        {editingEntry && <JournalEntryForm entry={editingEntry} onClose={() => setEditingEntry(null)} onSuccess={refetch} />}
      </Modal>

      <Modal open={!!viewingEntry} onClose={() => setViewingEntry(null)} title={`${viewingEntry?.entry_number ?? ''}`} size="full">
        {viewingEntry && <JournalEntryForm entry={viewingEntry} onClose={() => setViewingEntry(null)} />}
      </Modal>

      <Modal open={!!auditEntry} onClose={() => setAuditEntry(null)} title={`Audit Trail — ${auditEntry?.entry_number ?? ''}`} size="md">
        {auditEntry && <AuditTrail data={auditEntry} />}
      </Modal>

      <DemoBanner visible={false} error={null} />

      <div className="flex items-center gap-3 mb-4 bg-white border border-[#dddbda] rounded-lg px-4 py-3 shadow-sm flex-wrap">
        <svg className="w-4 h-4 text-[#514f4d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="1.5" />
          <path strokeWidth="1.5" d="M3 10h18" />
          <path strokeWidth="1.5" d="M8 2v4" />
          <path strokeWidth="1.5" d="M16 2v4" />
        </svg>
        <span className="text-[11px] font-bold text-[#514f4d] uppercase tracking-wider shrink-0">Accounting Period</span>
        <div className="w-64">
          <LookupField
            value={currentPeriod?.id ?? ''}
            onChange={setCurrentPeriod}
            options={periodOptions}
            placeholder="Select period..."
            searchPlaceholder="Search periods..."
          />
        </div>
        {currentPeriod && (
          <span className="text-xs text-[#514f4d] flex items-center gap-2">
            <span className="whitespace-nowrap">{currentPeriod.start_date} — {currentPeriod.end_date}</span>
            <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded ${
              currentPeriod.status === 'open' ? 'bg-[#e8f4fe] text-[#0070d2]' : 'bg-[#f3f3f3] text-[#514f4d]'
            }`}>
              {currentPeriod.status === 'open' ? 'Open' : 'Closed'}
            </span>
          </span>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <DataTable
          columns={[
            {
              key: 'entry_number',
              header: 'Entry #',
              render: (row: JournalEntry) => (
                <span className="font-mono font-medium text-slate-900">{row.entry_number}</span>
              ),
            },
            {
              key: 'posting_date',
              header: 'Date',
              render: (row: JournalEntry) => (
                <span>{new Date(row.posting_date).toLocaleDateString('en-GB')}</span>
              ),
            },
            {
              key: 'description',
              header: 'Description',
              render: (row: JournalEntry) => (
                <span className="text-slate-500">{row.description || '-'}</span>
              ),
            },
            {
              key: 'total_debit',
              header: 'Debit',
              render: (row: JournalEntry) => (
                <span className="font-mono">{Number(row.total_debit).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              ),
            },
            {
              key: 'total_credit',
              header: 'Credit',
              render: (row: JournalEntry) => (
                <span className="font-mono">{Number(row.total_credit).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (row: JournalEntry) => (
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${STATUS_STYLES[row.status]}`}>
                  {STATUS_LABELS[row.status]}
                </span>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (row: JournalEntry) => (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewingEntry(row)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors"
                    title="View"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  {canEdit(row) && (
                    <button
                      onClick={() => setEditingEntry(row)}
                      className="p-1.5 text-slate-400 hover:text-amber-600 rounded transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canSubmit(row) && (
                    <button
                      onClick={() => handleAction('submit', row.id)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors"
                      title="Submit for Approval"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canApprove(row) && (
                    <button
                      onClick={() => handleAction('approve', row.id)}
                      className="p-1.5 text-slate-400 hover:text-purple-600 rounded transition-colors"
                      title="Approve"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canPost(row) && (
                    <button
                      onClick={() => handleAction('post', row.id)}
                      className="p-1.5 text-slate-400 hover:text-green-600 rounded transition-colors"
                      title="Post to General Ledger"
                    >
                      <Database className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canCancel(row) && (
                    <button
                      onClick={() => handleAction('cancel', row.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                      title="Cancel"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canDelete(row) && (
                    <button
                      onClick={() => handleAction('delete', row.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setAuditEntry(row)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
                    title="Audit Trail"
                  >
                    <Clock className="w-3.5 h-3.5" />
                  </button>
                </div>
              ),
            },
          ]}
          data={filtered}
          loading={loading}
          emptyMessage="No journal entries created yet. Click 'New Entry' to create one."
        />
      </div>
    </PageLayout>
  )
}
