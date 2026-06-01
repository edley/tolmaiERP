import { useState, useRef, useMemo } from 'react'
import { Plus, Trash2, Split } from 'lucide-react'
import { useAccounts } from '../hooks/useAccounts'
import { useReceipts } from '../hooks/useReceipts'
import { getPaymentModes } from '../lib/paymentModes'
import { generateReceiptNumber } from '../lib/receipts'
import { LookupField } from './LookupField'
import { EditableNumber } from './EditableNumber'
import { Modal } from './Modal'
import { getMappings } from '../lib/allocationMappings'
import { usePeriod } from '../contexts/PeriodContext'
import type { Receipt } from '../lib/receipts'

interface Line {
  id: number
  gl_account_id: string
  amount: string
  allocations: { code: string; amount: string }[]
}

interface CashReceiptFormProps {
  onClose: () => void
  onSuccess?: () => void
  receipt?: Receipt
}

const STATUS_BADGE: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  draft: { bg: '#fef7e0', text: '#6b5200', border: '#f9d84a', dot: '#ff9e00' },
  submitted: { bg: '#e8f4fe', text: '#0070d2', border: '#0070d2', dot: '#0070d2' },
  approved: { bg: '#f3e8fe', text: '#5a20a0', border: '#8b5cf6', dot: '#8b5cf6' },
  posted: { bg: '#d2f4e0', text: '#007a33', border: '#007a33', dot: '#007a33' },
  cancelled: { bg: '#fef0f0', text: '#c23934', border: '#c23934', dot: '#c23934' },
}

export function CashReceiptForm({ onClose, onSuccess, receipt }: CashReceiptFormProps) {
  const { accounts } = useAccounts()
  const { receipts, createReceipt, updateReceipt } = useReceipts()
  const { periods, currentPeriod } = usePeriod()

  const isEditing = !!receipt
  const readonly = isEditing && receipt && receipt.status !== 'draft'

  const existingLines: Line[] = useMemo(() =>
    (receipt?.lines ?? []).map((l, i) => ({
      id: i + 1,
      gl_account_id: l.gl_account_id,
      amount: String(l.amount),
      allocations: (l.allocations ?? []).map((a) => ({ code: a.allocation_code, amount: String(a.amount) })),
    })),
    [receipt]
  )

  const [selectedPeriodId, setSelectedPeriodId] = useState(receipt?.period_id ?? currentPeriod?.id ?? '')
  const [postingDate, setPostingDate] = useState(receipt?.date ?? new Date().toISOString().split('T')[0])
  const [voucherAmount, setVoucherAmount] = useState(receipt ? String(receipt.voucher_amount) : '')
  const [modeOfPaymentId, setModeOfPaymentId] = useState(receipt?.mode_of_payment_id ?? '')
  const [receivedFrom, setReceivedFrom] = useState(receipt?.received_from ?? '')
  const [invoiceNo, setInvoiceNo] = useState(receipt?.invoice_no ?? '')
  const [description, setDescription] = useState(receipt?.description ?? '')

  const paymentModes = useMemo(() => getPaymentModes(), [])

  const selectedMode = paymentModes.find((m) => m.id === modeOfPaymentId)

  const creditAccounts = accounts

  const defaultLines: Line[] = Array.from({ length: 3 }, (_, i) => ({
    id: i + 1, gl_account_id: '', amount: '', allocations: [],
  }))
  const [lines, setLines] = useState<Line[]>(
    existingLines.length > 0 ? existingLines : defaultLines
  )
  const nextLineId = useRef(existingLines.length + 1 || 4)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allocLineId, setAllocLineId] = useState<number | null>(null)
  const [allocError, setAllocError] = useState<string | null>(null)
  const linesEndRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const allMappings = useMemo(() => {
    if (accounts.length === 0) return []
    return getMappings(accounts)
  }, [accounts])

  const periodOptions = useMemo(() =>
    periods.map((p) => ({ id: p.id, label: p.name, sublabel: `${p.start_date} — ${p.end_date}${p.status === 'closed' ? ' (Closed)' : ''}` })),
    [periods]
  )

  const modeOptions = useMemo(() =>
    paymentModes.map((m) => {
      const acc = accounts.find((a) => a.id === m.gl_account_id)
      return { id: m.id, label: m.name, sublabel: acc ? `${acc.code} · ${acc.name}` : 'No GL code set' }
    }),
    [paymentModes, accounts]
  )

  const vt = parseFloat(voucherAmount) || 0
  let running = 0
  const linesWithRunning = lines.map((l) => {
    const amt = parseFloat(l.amount) || 0
    running += amt
    return { ...l, running }
  })
  const totalLines = linesWithRunning.length > 0 ? linesWithRunning[linesWithRunning.length - 1].running : 0
  const diff = Math.round((vt - totalLines) * 100) / 100
  const balanced = diff === 0 && vt > 0 && lines.some((l) => parseFloat(l.amount) > 0)
  const canSave = !readonly && balanced && modeOfPaymentId && lines.every((l) => !l.gl_account_id || parseFloat(l.amount) > 0)

  const addLine = () => {
    if (readonly) return
    setLines([...lines, { id: nextLineId.current++, gl_account_id: '', amount: '', allocations: [] }])
    setTimeout(() => linesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
  }

  const removeLine = (id: number) => {
    if (readonly) return
    if (lines.length <= 1) return
    setLines(lines.filter((l) => l.id !== id))
  }

  const updateLine = (id: number, field: keyof Line, value: string) => {
    if (readonly) return
    setLines(lines.map((l) => (l.id === id ? { ...l, [field]: value } : l)))
  }

  const updateAlloc = (lineId: number, code: string, amount: string) => {
    setLines(lines.map((l) =>
      l.id === lineId
        ? { ...l, allocations: l.allocations.map((a) => a.code === code ? { ...a, amount } : a) }
        : l
    ))
  }

  const openAllocModal = (lineId: number) => {
    const line = lines.find((l) => l.id === lineId)
    if (!line) return
    const glAccount = accounts.find((a) => a.id === line.gl_account_id)
    if (!glAccount || !glAccount.code) return

    const codes = allMappings
      .filter((m) => m.gl_code === glAccount.code && m.active)
      .map((m) => m.allocation_code)

    const existing = new Map(line.allocations.map((a) => [a.code, a.amount]))
    for (const code of codes) {
      if (!existing.has(code)) existing.set(code, '0')
    }

    setAllocLineId(lineId)
    setAllocError(null)
    setLines(lines.map((l) =>
      l.id === lineId
        ? { ...l, allocations: Array.from(existing.entries()).map(([c, amt]) => ({ code: c, amount: amt })) }
        : l
    ))
  }

  const closeAllocModal = () => {
    setAllocLineId(null)
    setAllocError(null)
  }

  const saveAllocModal = () => {
    const line = lines.find((l) => l.id === allocLineId)
    if (!line) return
    const lineAmount = parseFloat(line.amount) || 0
    const totalAlloc = line.allocations.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0)
    if (Math.abs(totalAlloc - lineAmount) > 0.01) {
      setAllocError(`Allocation total ($${totalAlloc.toFixed(2)}) must equal line amount ($${lineAmount.toFixed(2)})`)
      return
    }
    closeAllocModal()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (readonly) return
    if (!modeOfPaymentId) { setError('Select a mode of payment'); return }
    if (!selectedPeriodId) { setError('Select an accounting period'); return }
    if (!voucherAmount || vt <= 0) { setError('Enter a valid voucher amount'); return }
    if (!receivedFrom.trim()) { setError('Enter the payer name'); return }

    const selectedPeriod = periods.find((p) => p.id === selectedPeriodId)
    if (selectedPeriod && (postingDate < selectedPeriod.start_date || postingDate > selectedPeriod.end_date)) {
      setError(`Date must be between ${selectedPeriod.start_date} and ${selectedPeriod.end_date} for ${selectedPeriod.name}`)
      return
    }

    const header = {
      period_id: selectedPeriodId,
      date: postingDate,
      voucher_amount: vt,
      mode_of_payment_id: modeOfPaymentId,
      received_from: receivedFrom.trim(),
      invoice_no: invoiceNo.trim(),
      description: description.trim(),
    }
    const lineData = lines
      .filter((l) => l.gl_account_id && parseFloat(l.amount) > 0)
      .map((l) => ({
        gl_account_id: l.gl_account_id,
        amount: parseFloat(l.amount) || 0,
        allocations: l.allocations
          .filter((a) => parseFloat(a.amount) > 0)
          .map((a) => ({
            allocation_code: a.code,
            amount: parseFloat(a.amount) || 0,
          })),
      }))

    setSaving(true)
    setError(null)
    try {
      if (isEditing && receipt) {
        await updateReceipt(receipt.id, header, lineData)
      } else {
        await createReceipt(header, lineData)
      }
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create receipt')
    }
    setSaving(false)
  }

  const badge = receipt ? STATUS_BADGE[receipt.status] || STATUS_BADGE.draft : STATUS_BADGE.draft

  const inputClass = readonly
    ? 'w-full h-7 px-2 text-xs border border-[#dddbda] rounded text-[#16325c] bg-[#fafaf9] cursor-default'
    : 'w-full h-7 px-2 text-xs border border-[#dddbda] rounded text-[#16325c] bg-white hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full gap-0 max-w-7xl mx-auto w-full">
      {error && (
        <div className="mb-4 bg-[#fef0f0] border-l-4 border-[#c23934] p-4 rounded-r text-sm text-[#c23934] font-medium">
          {error}
        </div>
      )}

      {/* ── COMPACT HEADER (3 lines) ── */}
      <div className="shrink-0 mb-4 pb-3 border-b border-[#dddbda]">
        {/* Line 1: Title + Status + Actions */}
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-light text-[#16325c] truncate">
              {isEditing && receipt ? receipt.voucher_number : generateReceiptNumber(receipts.length + 1)}
            </h1>
            <div
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0"
              style={{ backgroundColor: badge.bg, color: badge.text, borderColor: badge.border, borderWidth: 1 }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: badge.dot }} />
              {receipt ? receipt.status : 'Draft'}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={onClose} className="h-7 px-3 text-xs font-medium text-[#514f4d] bg-white border border-[#dddbda] rounded hover:bg-[#f3f3f3] transition-colors">
              {readonly ? 'Close' : 'Cancel'}
            </button>
            {!readonly && (
              <button type="submit" disabled={saving || !canSave} className="h-7 px-4 text-xs font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5">
                {saving && (
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>

        {/* Line 2: Main fields row (4 cols) */}
        <div className="grid grid-cols-4 gap-x-3 gap-y-0">
          <div>
            <label className="text-[10px] font-bold text-[#514f4d] uppercase tracking-wider block leading-tight">Period <span className="text-[#c23934]">*</span></label>
            <LookupField compact value={selectedPeriodId} onChange={readonly ? () => {} : setSelectedPeriodId} options={periodOptions} placeholder="—" searchPlaceholder="Search periods..." />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#514f4d] uppercase tracking-wider block leading-tight">Date <span className="text-[#c23934]">*</span></label>
            <input type="date" value={postingDate} onChange={readonly ? undefined : (e) => setPostingDate(e.target.value)} className={inputClass} readOnly={readonly} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#514f4d] uppercase tracking-wider block leading-tight">Amount <span className="text-[#c23934]">*</span></label>
            <EditableNumber compact value={voucherAmount} onChange={readonly ? () => {} : setVoucherAmount} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#514f4d] uppercase tracking-wider block leading-tight">Mode <span className="text-[#c23934]">*</span></label>
            <LookupField compact value={modeOfPaymentId} onChange={readonly ? () => {} : setModeOfPaymentId} options={modeOptions} placeholder="—" searchPlaceholder="Search payment modes..." />
          </div>
        </div>

        {/* Line 3: Received From + Invoice No + Description/Contra */}
        <div className="grid grid-cols-2 gap-x-3 mt-1.5">
          <div>
            <label className="text-[10px] font-bold text-[#514f4d] uppercase tracking-wider block leading-tight">Received From <span className="text-[#c23934]">*</span></label>
            <input type="text" value={receivedFrom} onChange={readonly ? undefined : (e) => setReceivedFrom(e.target.value)} className={inputClass} readOnly={readonly} placeholder="Payer name" />
          </div>
          {selectedMode && selectedMode.gl_account_id && vt > 0 ? (
            <div className="grid grid-cols-3 gap-x-3">
              <div>
                <label className="text-[10px] font-bold text-[#514f4d] uppercase tracking-wider block leading-tight">Invoice No.</label>
                <input type="text" value={invoiceNo} onChange={readonly ? undefined : (e) => setInvoiceNo(e.target.value)} className={inputClass} readOnly={readonly} placeholder="e.g. INV-001" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#514f4d] uppercase tracking-wider block leading-tight">Description</label>
                <input type="text" value={description} onChange={readonly ? undefined : (e) => setDescription(e.target.value)} className={inputClass} readOnly={readonly} placeholder="Optional" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#514f4d] uppercase tracking-wider block leading-tight">Contra (CR)</label>
                <div className="h-7 px-2 bg-[#fef0f0] border border-[#c23934] rounded flex items-center gap-1.5 text-[11px] text-[#c23934] font-medium truncate">
                  <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span className="font-bold shrink-0">CR</span>
                  <span className="truncate">{accounts.find((a) => a.id === selectedMode.gl_account_id)?.code} · {accounts.find((a) => a.id === selectedMode.gl_account_id)?.name}</span>
                  <span className="font-mono shrink-0 ml-auto">${vt.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-3">
              <div>
                <label className="text-[10px] font-bold text-[#514f4d] uppercase tracking-wider block leading-tight">Invoice No.</label>
                <input type="text" value={invoiceNo} onChange={readonly ? undefined : (e) => setInvoiceNo(e.target.value)} className={inputClass} readOnly={readonly} placeholder="e.g. INV-001" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#514f4d] uppercase tracking-wider block leading-tight">Description</label>
                <input type="text" value={description} onChange={readonly ? undefined : (e) => setDescription(e.target.value)} className={inputClass} readOnly={readonly} placeholder="Optional reference" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── LINE ITEMS ── */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col min-h-0 border border-b-0 border-[#dddbda] rounded-t-lg bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#fafaf9] border-b border-[#dddbda] rounded-t-lg shrink-0">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-[#514f4d]">Line Items</h3>
              <div className="flex items-center gap-3 text-xs text-[#514f4d]">
                <span className="text-slate-400">|</span>
                <span className={lines.filter((l) => l.gl_account_id && parseFloat(l.amount) > 0).length > 0 ? 'font-semibold' : 'text-slate-400'}>
                  {lines.filter((l) => l.gl_account_id && parseFloat(l.amount) > 0).length} line{lines.filter((l) => l.gl_account_id && parseFloat(l.amount) > 0).length !== 1 ? 's' : ''}
                </span>
                <span className="text-slate-400">|</span>
                <span>Total <span className="font-mono">${totalLines.toFixed(2)}</span></span>
              </div>
            </div>
            {!readonly && (
              <button type="button" onClick={addLine} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-[#0070d2] hover:text-[#005fb2] hover:bg-[#e8f4fe] rounded transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Line
              </button>
            )}
          </div>

          <div className="hidden lg:grid grid-cols-[40px_1fr_60px_100px_120px_100px_80px] gap-0 px-4 py-2 bg-white border-b border-[#dddbda] text-[11px] font-bold text-[#514f4d] uppercase tracking-wider shrink-0">
            <span className="text-center">#</span>
            <span>GL Account <span className="text-[#c23934]">*</span></span>
            <span className="text-center">DR/CR</span>
            <span className="text-center">Allocation</span>
            <span className="text-right">Amount <span className="text-[#c23934]">*</span></span>
            <span className="text-right">Running Total</span>
            <span className="text-center">Actions</span>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
            {linesWithRunning.length === 0 && (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">No line items. Click &quot;Add Line&quot; to add one.</div>
            )}
            {linesWithRunning.map((line, idx) => (
              <div
                key={line.id}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[40px_1fr_60px_100px_120px_100px_80px] gap-2 sm:gap-2 lg:gap-0 px-2 sm:px-3 lg:px-4 py-2 border-b border-[#dddbda] last:border-b-0 hover:bg-[#fafaf9] transition-colors lg:border-l-2 lg:border-l-emerald-500"
              >
                <div className="hidden lg:flex items-center justify-center text-xs text-slate-400 font-mono select-none">{idx + 1}</div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="lg:hidden text-[10px] font-bold text-[#514f4d] uppercase tracking-wider mb-0.5 block">GL Account</label>
                  {readonly ? (
                    <div className="h-8 px-2.5 text-sm border border-[#dddbda] rounded text-[#16325c] bg-[#fafaf9] flex items-center truncate">
                      {accounts.find((a) => a.id === line.gl_account_id)?.code ?? '—'} · {accounts.find((a) => a.id === line.gl_account_id)?.name ?? ''}
                    </div>
                  ) : (
                    <LookupField
                      value={line.gl_account_id}
                      onChange={(v) => updateLine(line.id, 'gl_account_id', v)}
                      options={creditAccounts.map((a) => ({ id: a.id, label: a.code ? `${a.code} · ${a.name}` : a.name }))}
                      placeholder="— Select GL Account —"
                      searchPlaceholder="Search accounts by code or name..."
                    />
                  )}
                </div>
                <div className="flex items-center justify-center">
                  <label className="lg:hidden text-[10px] font-bold text-[#514f4d] uppercase tracking-wider mb-0.5 block">DR/CR</label>
                  <span className="inline-flex items-center justify-center w-full h-8 text-xs font-bold rounded bg-[#d2f4e0] text-[#007a33] border border-[#007a33]">
                    DR
                  </span>
                </div>
                <div className="flex items-center justify-center">
                  {(() => {
                    const glAccount = accounts.find((a) => a.id === line.gl_account_id)
                    const canAlloc = glAccount?.allocation_allow && glAccount.code && allMappings.some((m) => m.gl_code === glAccount.code && m.active)
                    const totalAlloc = line.allocations.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0)
                    const lineAmt = parseFloat(line.amount) || 0
                    const balanced = lineAmt > 0 && Math.abs(totalAlloc - lineAmt) < 0.01
                    return canAlloc ? (
                      <button
                        type="button"
                        onClick={() => openAllocModal(line.id)}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded border transition-colors ${
                          totalAlloc > 0
                            ? balanced
                              ? 'bg-[#d2f4e0] text-[#007a33] border-[#007a33]'
                              : 'bg-[#fef7e0] text-[#6b5200] border-[#f9d84a]'
                            : 'bg-white text-[#514f4d] border-[#dddbda] hover:border-[#0070d2] hover:text-[#0070d2]'
                        }`}
                        title="Allocate line amount"
                      >
                        <Split className="w-3 h-3" />
                        {totalAlloc > 0 ? `$${totalAlloc.toFixed(0)}` : 'Alloc'}
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-300">—</span>
                    )
                  })()}
                </div>
                <div>
                  <label className="lg:hidden text-[10px] font-bold text-[#514f4d] uppercase tracking-wider mb-0.5 block">Amount</label>
                  {readonly ? (
                    <div className="h-8 px-2.5 text-sm border border-[#dddbda] rounded text-[#16325c] bg-[#fafaf9] font-mono text-right flex items-center justify-end">
                      ${parseFloat(line.amount || '0').toFixed(2)}
                    </div>
                  ) : (
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                      <input
                        type="number" step="0.01" min="0"
                        value={line.amount}
                        onChange={(e) => updateLine(line.id, 'amount', e.target.value)}
                        className="w-full h-8 pl-5 pr-2.5 text-sm border border-[#dddbda] rounded text-[#16325c] font-mono text-right hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end">
                  <label className="lg:hidden text-[10px] font-bold text-[#514f4d] uppercase tracking-wider mb-0.5 block mr-2">Running</label>
                  <span className="font-mono text-sm text-[#16325c]">${line.running.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-center gap-0.5">
                  {readonly ? (
                    <span className="text-slate-300 text-xs">—</span>
                  ) : (
                    <>
                      <button type="button" onClick={() => { const nxt = [...lines]; [nxt[idx - 1], nxt[idx]] = [nxt[idx], nxt[idx - 1]]; setLines(nxt) }} disabled={idx === 0} className="p-1.5 text-slate-400 hover:text-[#0070d2] disabled:opacity-20 rounded hover:bg-[#e8f4fe] transition-colors" title="Move up">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                      </button>
                      <button type="button" onClick={() => { const nxt = [...lines]; [nxt[idx], nxt[idx + 1]] = [nxt[idx + 1], nxt[idx]]; setLines(nxt) }} disabled={idx === lines.length - 1} className="p-1.5 text-slate-400 hover:text-[#0070d2] disabled:opacity-20 rounded hover:bg-[#e8f4fe] transition-colors" title="Move down">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      <button type="button" onClick={() => removeLine(line.id)} disabled={lines.length <= 1} className="p-1.5 text-slate-400 hover:text-[#c23934] disabled:opacity-20 rounded hover:bg-[#fef0f0] transition-colors" title="Remove">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            <div ref={linesEndRef} />
          </div>
        </div>

        <div className="shrink-0 border border-t-0 border-[#dddbda] rounded-b-lg bg-white shadow-sm">
          {vt > 0 && (
            <div className={`grid grid-cols-3 gap-3 px-4 py-1.5 text-xs font-medium border-b ${balanced ? 'bg-[#d2f4e0] text-[#007a33] border-[#007a33]' : 'bg-[#fef0f0] text-[#c23934] border-[#c23934]'}`}>
              <span>{balanced ? '✓ Balanced' : '✕ Not Balanced'}</span>
              <span className="text-center">CR (Contra): <span className="font-mono">${vt.toFixed(2)}</span></span>
              <span className="text-right">DR (Allocations): <span className="font-mono">${totalLines.toFixed(2)}</span>{!balanced && ` (Diff $${Math.abs(diff).toFixed(2)})`}</span>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#f3f3f3] rounded-b-lg">
            <div className="flex items-center gap-3 text-sm text-[#514f4d]">
              {vt === 0 && <span className="text-xs text-slate-400">{readonly ? 'No voucher amount set.' : 'Enter a voucher amount and add lines with GL accounts to enable Save'}</span>}
              {vt > 0 && balanced && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#007a33]">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  CR = DR — {readonly ? 'Balanced entry' : 'Ready to post to ledger'}
                </span>
              )}
              {vt > 0 && !balanced && (
                <span className="text-xs text-slate-400">CR (contra) must equal DR (allocations) to balance</span>
              )}
            </div>
            <div className="text-xs text-[#514f4d] flex items-center gap-3">
              {selectedMode && (
                <span>
                  <span className="font-semibold capitalize">{selectedMode.name}</span>
                  {selectedMode.gl_account_id && (
                    <span className="text-slate-400"> · {accounts.find((a) => a.id === selectedMode.gl_account_id)?.code ?? ''} {accounts.find((a) => a.id === selectedMode.gl_account_id)?.name ?? ''}</span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── ALLOCATION MODAL ── */}
      <Modal
        open={allocLineId !== null}
        onClose={closeAllocModal}
        title="Line Allocation"
        size="md"
      >
        {(() => {
          const line = lines.find((l) => l.id === allocLineId)
          if (!line) return null
          const glAccount = accounts.find((a) => a.id === line.gl_account_id)
          const lineAmount = parseFloat(line.amount) || 0
          const totalAlloc = line.allocations.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0)
          return (
            <div className="space-y-4">
              {allocError && (
                <div className="p-3 bg-[#fef0f0] border border-[#c23934] rounded text-xs text-[#c23934]">{allocError}</div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <span className="font-medium text-[#16325c]">{glAccount?.code} — {glAccount?.name}</span>
                <span className="text-slate-400">|</span>
                <span className="font-mono font-medium text-[#16325c]">Line amount: ${lineAmount.toFixed(2)}</span>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_120px] gap-2 text-[10px] font-bold text-[#514f4d] uppercase tracking-wider px-1">
                  <span>Allocation Code</span>
                  <span className="text-right">Amount</span>
                </div>
                {line.allocations.length === 0 && (
                  <div className="text-sm text-slate-400 text-center py-4">
                    No allocation codes found for this GL account.
                  </div>
                )}
                {line.allocations.map((a) => (
                  <div key={a.code} className="grid grid-cols-[1fr_120px] gap-2 items-center">
                    <span className="inline-flex px-2 py-0.5 text-[11px] font-bold bg-[#e8f4fe] text-[#0070d2] rounded justify-self-start">
                      {a.code}
                    </span>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                      <input
                        type="number" step="0.01" min="0"
                        value={a.amount}
                        onChange={(e) => { updateAlloc(line.id, a.code, e.target.value); setAllocError(null) }}
                        className="w-full h-8 pl-5 pr-2.5 text-sm border border-[#dddbda] rounded text-[#16325c] font-mono text-right hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className={`text-xs font-semibold ${Math.abs(totalAlloc - lineAmount) < 0.01 ? 'text-[#007a33]' : 'text-[#c23934]'}`}>
                  Total allocated: <span className="font-mono">${totalAlloc.toFixed(2)}</span>
                  {lineAmount > 0 && Math.abs(totalAlloc - lineAmount) < 0.01 && ' ✓ Balanced'}
                  {lineAmount > 0 && Math.abs(totalAlloc - lineAmount) >= 0.01 && ` of $${lineAmount.toFixed(2)} (${(totalAlloc / lineAmount * 100).toFixed(0)}%)`}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeAllocModal}
                    className="px-3 py-1.5 text-xs font-medium text-[#514f4d] bg-white border border-[#dddbda] rounded hover:bg-[#f3f3f3] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveAllocModal}
                    disabled={lineAmount > 0 && Math.abs(totalAlloc - lineAmount) >= 0.01}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )
        })()}
      </Modal>
    </form>
  )
}
