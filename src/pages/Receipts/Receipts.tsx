import { useState, useMemo } from 'react'
import { Plus, CreditCard, Pencil, Trash2, Send, CheckCircle, Upload, XCircle, Clock } from 'lucide-react'
import { useCompany } from '../../contexts/CompanyContext'
import { useReceipts } from '../../hooks/useReceipts'
import { useRBAC } from '../../hooks/useRBAC'
import { usePeriod } from '../../contexts/PeriodContext'
import { DataTable } from '../../components/DataTable'
import { DemoBanner } from '../../components/DemoBanner'
import { Modal } from '../../components/Modal'
import { PageLayout } from '../../components/PageLayout'
import { LookupField } from '../../components/LookupField'
import { CashReceiptForm } from '../../components/CashReceiptForm'
import { AuditTrail } from '../../components/AuditTrail'
import { getPaymentModes } from '../../lib/paymentModes'
import type { Receipt } from '../../lib/receipts'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-amber-50 text-amber-700 border-amber-200',
  submitted: 'bg-blue-50 text-blue-700 border-blue-200',
  approved: 'bg-purple-50 text-purple-700 border-purple-200',
  posted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}

export function Receipts() {
  const { currentCompany } = useCompany()
  const { receipts, loading, submitReceipt, approveReceipt, postToLedger, cancelReceipt, deleteReceipt, refetch } = useReceipts()
  const { userType } = useRBAC()
  const { periods, currentPeriod, setCurrentPeriod } = usePeriod()
  const [showForm, setShowForm] = useState(false)
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null)
  const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null)
  const [auditReceipt, setAuditReceipt] = useState<Receipt | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const canApprove = userType === 'Superuser' || userType === 'Manager'

  const paymentModes = useMemo(() => getPaymentModes(), [])

  const periodOptions = useMemo(() =>
    periods.map((p) => ({ id: p.id, label: p.name, sublabel: `${p.start_date} — ${p.end_date}` })),
    [periods]
  )

  const filtered = useMemo(() => {
    if (!currentPeriod) return receipts
    return receipts.filter((p) => p.period_id === currentPeriod.id)
  }, [receipts, currentPeriod])

  const handleAction = async (_label: string, fn: () => Promise<unknown>) => {
    setActionError(null)
    try {
      await fn()
      refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed')
    }
  }

  return (
    <PageLayout
      title="Receipts"
      description="Record and manage all receipt vouchers"
      docType="receipt"
      actions={
        <button
          onClick={() => setShowForm(true)}
          className="h-8 px-4 text-sm font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] transition-colors inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Receipt
        </button>
      }
    >
      {actionError && (
        <div className="mb-4 bg-[#fef0f0] border-l-4 border-[#c23934] p-4 rounded-r text-sm text-[#c23934] font-medium">
          {actionError}
        </div>
      )}

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditingReceipt(null) }} title={editingReceipt ? 'Edit Receipt' : 'New Receipt'} size="full" companyName={currentCompany?.name}>
        <CashReceiptForm receipt={editingReceipt ?? undefined} onClose={() => { setShowForm(false); setEditingReceipt(null) }} onSuccess={refetch} />
      </Modal>

      <Modal open={!!viewingReceipt} onClose={() => setViewingReceipt(null)} title={`Receipt ${viewingReceipt?.voucher_number ?? ''}`} size="full">
        {viewingReceipt && (
          <div className="flex flex-col h-full gap-6">
            <CashReceiptForm receipt={viewingReceipt} onClose={() => setViewingReceipt(null)} onSuccess={refetch} />
            <AuditTrail data={viewingReceipt} />
          </div>
        )}
      </Modal>

      <Modal open={!!auditReceipt} onClose={() => setAuditReceipt(null)} title={`Audit Trail — ${auditReceipt?.voucher_number ?? ''}`} size="md">
        {auditReceipt && <AuditTrail data={auditReceipt} />}
      </Modal>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="w-56">
            <label className="block text-xs font-medium text-slate-500 mb-1">Accounting Period</label>
            <LookupField
              value={currentPeriod?.id ?? ''}
              onChange={setCurrentPeriod}
              options={periodOptions}
              placeholder="Select period..."
              searchPlaceholder="Search periods..."
            />
          </div>
          <div className="flex items-end gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
              <CreditCard className="w-3 h-3" />
              {filtered.length} receipt{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      <DemoBanner visible={false} />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <DataTable
          columns={[
            {
              key: 'voucher_number',
              header: 'Voucher No.',
              render: (row: Receipt) => (
                <button onClick={() => setViewingReceipt(row)} className="font-mono text-xs text-[#0070d2] font-semibold hover:underline">
                  {row.voucher_number}
                </button>
              ),
            },
            {
              key: 'date',
              header: 'Date',
              render: (row: Receipt) => (
                <span className="text-xs">{new Date(row.date).toLocaleDateString('en-GB')}</span>
              ),
            },
            {
              key: 'mode_of_payment_id',
              header: 'Mode',
              render: (row: Receipt) => {
                const mode = paymentModes.find((m) => m.id === row.mode_of_payment_id)
                return (
                  <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-full capitalize">
                    {mode?.name ?? row.mode_of_payment_id}
                  </span>
                )
              },
            },
            {
              key: 'received_from',
              header: 'Received From',
              render: (row: Receipt) => <span className="text-sm">{row.received_from || '-'}</span>,
            },
            {
              key: 'voucher_amount',
              header: 'Amount',
              className: 'text-right',
              render: (row: Receipt) => (
                <span className="font-mono text-sm font-medium">
                  {row.voucher_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (row: Receipt) => (
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border capitalize ${STATUS_COLORS[row.status] || 'bg-slate-50 text-slate-600'}`}>
                  {row.status}
                </span>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (row: Receipt) => (
                <div className="flex items-center gap-1">
                  {row.status === 'draft' && (
                    <>
                      <button
                        onClick={() => { setEditingReceipt(row); setShowForm(true) }}
                        className="p-1.5 text-slate-400 hover:text-[#0070d2] rounded transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleAction('submit', () => submitReceipt(row.id))}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors"
                        title="Submit for approval"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { if (confirm('Delete this receipt?')) handleAction('delete', () => deleteReceipt(row.id)) }}
                        className="p-1.5 text-slate-400 hover:text-[#c23934] rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {row.status === 'submitted' && canApprove && (
                    <>
                      <button
                        onClick={() => handleAction('approve', () => approveReceipt(row.id))}
                        className="p-1.5 text-slate-400 hover:text-purple-600 rounded transition-colors"
                        title="Approve"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { if (confirm('Cancel this receipt?')) handleAction('cancel', () => cancelReceipt(row.id)) }}
                        className="p-1.5 text-slate-400 hover:text-[#c23934] rounded transition-colors"
                        title="Cancel"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {row.status === 'approved' && canApprove && (
                    <>
                      <button
                        onClick={() => handleAction('post', () => postToLedger(row.id))}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 rounded transition-colors"
                        title="Post to Ledger"
                      >
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { if (confirm('Cancel this receipt?')) handleAction('cancel', () => cancelReceipt(row.id)) }}
                        className="p-1.5 text-slate-400 hover:text-[#c23934] rounded transition-colors"
                        title="Cancel"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setAuditReceipt(row)}
                    className="p-1.5 text-slate-400 hover:text-amber-600 rounded transition-colors"
                    title="Audit trail"
                  >
                    <Clock className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewingReceipt(row)}
                    className="p-1.5 text-slate-400 hover:text-[#0070d2] rounded transition-colors"
                    title="View details"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
              ),
            },
          ]}
          data={filtered}
          loading={loading}
          emptyMessage="No receipts found for the selected period."
        />
      </div>
    </PageLayout>
  )
}
