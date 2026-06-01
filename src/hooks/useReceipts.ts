import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, isOnline } from '../lib/supabase'
import { getReceipts, saveReceipt as persistReceipt, deleteReceiptById, generateReceiptNumber } from '../lib/receipts'
import { getPaymentModes } from '../lib/paymentModes'
import type { Receipt, ReceiptLine, ReceiptStatus } from '../lib/receipts'
import { useAuth } from '../contexts/AuthContext'

let demoReceipts: Receipt[] | null = null

export function useReceipts() {
  const { user } = useAuth()
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const nextSeq = useRef(1)

  const fetchReceipts = useCallback(async () => {
    setLoading(true)
    let fromDb = false
    if (isOnline() && supabase) {
      const { data, error } = await supabase
        .from('receipts')
        .select('*, lines:receipt_lines(*)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) {
        console.error('Failed to fetch receipts:', error.message)
      } else if (data && data.length > 0) {
        // Try to fetch allocations separately (best-effort)
        let allocMap: Record<string, { allocation_code: string; expense_type: string | null; amount: number }[]> = {}
        try {
          const { data: allocData } = await supabase
            .from('receipt_line_allocations')
            .select('receipt_line_id, allocation_code, expense_type, amount')
          if (allocData) {
            for (const a of allocData as any[]) {
              const lineId = a.receipt_line_id
              if (!allocMap[lineId]) allocMap[lineId] = []
              allocMap[lineId].push({ allocation_code: a.allocation_code, expense_type: a.expense_type ?? null, amount: Number(a.amount) })
            }
          }
        } catch { /* allocations table may not exist */ }

        const mapped: Receipt[] = data.map((r: any) => ({
          id: r.id,
          voucher_number: r.voucher_number,
          period_id: r.period_id,
          date: r.date,
          voucher_amount: Number(r.voucher_amount),
          mode_of_payment_id: r.mode_of_payment_id,
          received_from: r.received_from,
          invoice_no: r.invoice_no ?? '',
          description: r.description ?? '',
          lines: (r.lines ?? []).map((l: any) => ({
            id: l.id,
            gl_account_id: l.gl_account_id,
            amount: Number(l.amount),
            allocations: allocMap[l.id] ?? [],
          })),
          status: r.status,
          created_at: r.created_at,
          created_by: r.created_by ?? null,
          created_by_name: r.created_by_name ?? null,
          submitted_by: r.submitted_by ?? null,
          submitted_by_name: r.submitted_by_name ?? null,
          submitted_at: r.submitted_at ?? null,
          approved_by: r.approved_by ?? null,
          approved_by_name: r.approved_by_name ?? null,
          approved_at: r.approved_at ?? null,
          posted_by: r.posted_by ?? null,
          posted_by_name: r.posted_by_name ?? null,
          posted_at: r.posted_at ?? null,
        }))
        setReceipts(mapped)
        demoReceipts = mapped
        nextSeq.current = mapped.length + 1
        fromDb = true
      }
    }
    if (!fromDb) {
      if (!demoReceipts) {
        demoReceipts = getReceipts()
      }
      setReceipts([...demoReceipts])
      nextSeq.current = demoReceipts.length + 1
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchReceipts()
  }, [fetchReceipts])

  const persistToDb = useCallback(async (receipt: Receipt) => {
    if (!isOnline() || !supabase) {
      console.warn('Supabase not configured — receipt saved to localStorage only.')
      return
    }
    const { error } = await supabase.from('receipts').upsert({
      id: receipt.id,
      voucher_number: receipt.voucher_number,
      period_id: receipt.period_id,
      date: receipt.date,
      voucher_amount: receipt.voucher_amount,
      mode_of_payment_id: receipt.mode_of_payment_id,
      received_from: receipt.received_from,
      invoice_no: receipt.invoice_no || null,
      description: receipt.description || null,
      status: receipt.status,
      created_by: receipt.created_by,
      created_by_name: receipt.created_by_name,
      submitted_by: receipt.submitted_by,
      submitted_by_name: receipt.submitted_by_name,
      submitted_at: receipt.submitted_at,
      approved_by: receipt.approved_by,
      approved_by_name: receipt.approved_by_name,
      approved_at: receipt.approved_at,
      posted_by: receipt.posted_by,
      posted_by_name: receipt.posted_by_name,
      posted_at: receipt.posted_at,
    })
    if (error) throw new Error(error.message)
    const { error: delError } = await supabase
      .from('receipt_lines')
      .delete()
      .eq('receipt_id', receipt.id)
    if (delError) throw new Error(delError.message)
    if (receipt.lines.length > 0) {
      const { error: insError } = await supabase.from('receipt_lines').insert(
        receipt.lines.map((l) => ({
          id: l.id,
          receipt_id: receipt.id,
          gl_account_id: l.gl_account_id,
          amount: l.amount,
        }))
      )
      if (insError) throw new Error(insError.message)

      // Persist line-level allocations (best-effort)
      const allocData = receipt.lines.flatMap((l) =>
        (l.allocations ?? []).map((a) => ({
          receipt_line_id: l.id,
          allocation_code: a.allocation_code,
          expense_type: a.expense_type ?? null,
          amount: a.amount,
        }))
      )
      if (allocData.length > 0) {
        try {
          const { error: allocError } = await supabase.from('receipt_line_allocations').insert(allocData)
          if (allocError) console.warn('Failed to persist receipt allocations:', allocError.message)
        } catch (e) {
          console.warn('Receipt allocations table not available — skipping', e)
        }
      }
    }
  }, [])

  const syncAndRefresh = useCallback(async (receipt: Receipt) => {
    persistReceipt(receipt)
    demoReceipts = (demoReceipts ?? []).map((p) => (p.id === receipt.id ? receipt : p))
    setReceipts([...demoReceipts])
    await persistToDb(receipt)
  }, [persistToDb])

  const createReceipt = useCallback(async (
    header: Omit<Receipt, 'id' | 'voucher_number' | 'lines' | 'status' | 'created_at' | 'created_by' | 'created_by_name' | 'submitted_by' | 'submitted_by_name' | 'submitted_at' | 'approved_by' | 'approved_by_name' | 'approved_at' | 'posted_by' | 'posted_by_name' | 'posted_at'>,
    lines: Omit<ReceiptLine, 'id'>[]
  ) => {
    const seq = nextSeq.current++
    const now = new Date().toISOString()
    const receipt: Receipt = {
      id: crypto.randomUUID(),
      voucher_number: generateReceiptNumber(seq),
      ...header,
      lines: lines.map((l) => ({ id: crypto.randomUUID(), ...l })),
      status: 'draft',
      created_at: now,
      created_by: user?.id ?? null,
      created_by_name: user?.name ?? null,
      submitted_by: null,
      submitted_by_name: null,
      submitted_at: null,
      approved_by: null,
      approved_by_name: null,
      approved_at: null,
      posted_by: null,
      posted_by_name: null,
      posted_at: null,
    }
    persistReceipt(receipt)
    demoReceipts = [receipt, ...(demoReceipts ?? [])]
    setReceipts([...demoReceipts])
    await persistToDb(receipt)
    return receipt
  }, [persistToDb, user])

  const updateReceipt = useCallback(async (
    id: string,
    header: Omit<Receipt, 'id' | 'voucher_number' | 'lines' | 'status' | 'created_at' | 'created_by' | 'created_by_name' | 'submitted_by' | 'submitted_by_name' | 'submitted_at' | 'approved_by' | 'approved_by_name' | 'approved_at' | 'posted_by' | 'posted_by_name' | 'posted_at'>,
    lines: Omit<ReceiptLine, 'id'>[]
  ) => {
    const existing = (demoReceipts ?? []).find((p) => p.id === id)
    if (!existing) throw new Error('Receipt not found')
    if (existing.status !== 'draft') throw new Error('Only draft receipts can be edited')
    const updated: Receipt = {
      ...existing,
      ...header,
      lines: lines.map((l) => ({ id: crypto.randomUUID(), ...l })),
    }
    await syncAndRefresh(updated)
    return updated
  }, [syncAndRefresh])

  const transitionStatus = useCallback(async (
    id: string,
    newStatus: ReceiptStatus,
    auditField: 'submitted' | 'approved' | 'posted',
  ) => {
    const existing = (demoReceipts ?? []).find((p) => p.id === id)
    if (!existing) throw new Error('Receipt not found')
    const now = new Date().toISOString()
    const updated: Receipt = {
      ...existing,
      status: newStatus,
      [`${auditField}_by`]: user?.id ?? null,
      [`${auditField}_by_name`]: user?.name ?? null,
      [`${auditField}_at`]: now,
    }
    await syncAndRefresh(updated)
    return updated
  }, [syncAndRefresh, user])

  const submitReceipt = useCallback(async (id: string) => {
    const existing = (demoReceipts ?? []).find((p) => p.id === id)
    if (!existing) throw new Error('Receipt not found')
    if (existing.status !== 'draft') throw new Error('Only draft receipts can be submitted')
    return transitionStatus(id, 'submitted', 'submitted')
  }, [transitionStatus])

  const approveReceipt = useCallback(async (id: string) => {
    const existing = (demoReceipts ?? []).find((p) => p.id === id)
    if (!existing) throw new Error('Receipt not found')
    if (existing.status !== 'submitted') throw new Error('Only submitted receipts can be approved')
    if (!user?.role || !['Superuser', 'Manager'].includes(user.role)) {
      throw new Error('Only managers can approve receipts')
    }
    return transitionStatus(id, 'approved', 'approved')
  }, [transitionStatus, user])

  const postToLedger = useCallback(async (id: string) => {
    const existing = (demoReceipts ?? []).find((p) => p.id === id)
    if (!existing) throw new Error('Receipt not found')
    if (existing.status !== 'approved') throw new Error('Only approved receipts can be posted')
    if (!user?.role || !['Superuser', 'Manager'].includes(user.role)) {
      throw new Error('Only managers can post receipts to ledger')
    }

    const paymentModes = getPaymentModes()
    const mode = paymentModes.find((m) => m.id === existing.mode_of_payment_id)
    const contraAccountId = mode?.gl_account_id
    if (!contraAccountId) {
      throw new Error(`Receipt mode ${existing.mode_of_payment_id} has no GL account assigned. Configure it in Payment Settings.`)
    }

    const now = new Date().toISOString()
    const updated: Receipt = {
      ...existing,
      status: 'posted',
      posted_by: user?.id ?? null,
      posted_by_name: user?.name ?? null,
      posted_at: now,
    }

    if (isOnline() && supabase) {
      const { error: leError } = await supabase.from('ledger_entries').insert([
        {
          receipt_id: updated.id,
          source_type: 'receipt',
          account_id: contraAccountId,
          posting_date: existing.date,
          debit: 0,
          credit: existing.voucher_amount,
          description: `Receipt: ${existing.received_from}`,
          period_id: existing.period_id,
        },
        ...existing.lines.map((l) => ({
          receipt_id: updated.id,
          source_type: 'receipt',
          account_id: l.gl_account_id,
          posting_date: existing.date,
          debit: l.amount,
          credit: 0,
          description: l.allocations && l.allocations.length > 0
            ? `${existing.received_from} (${l.allocations.map((a) => `${a.allocation_code}: $${a.amount.toFixed(2)}`).join(', ')})`
            : `Receipt: ${existing.received_from}`,
          period_id: existing.period_id,
        })),
      ])
      if (leError) throw new Error(leError.message)
    }

    await syncAndRefresh(updated)
    return updated
  }, [syncAndRefresh, user])

  const cancelReceipt = useCallback(async (id: string) => {
    const existing = (demoReceipts ?? []).find((p) => p.id === id)
    if (!existing) throw new Error('Receipt not found')
    if (existing.status === 'posted') throw new Error('Posted receipts cannot be cancelled')
    if (existing.status === 'cancelled') throw new Error('Receipt is already cancelled')
    const updated: Receipt = { ...existing, status: 'cancelled' }
    await syncAndRefresh(updated)
    return updated
  }, [syncAndRefresh])

  const deleteReceipt = useCallback(async (id: string) => {
    const existing = (demoReceipts ?? []).find((p) => p.id === id)
    if (existing && existing.status !== 'draft') throw new Error('Only draft receipts can be deleted')
    deleteReceiptById(id)
    demoReceipts = (demoReceipts ?? []).filter((p) => p.id !== id)
    setReceipts([...demoReceipts])
    if (isOnline() && supabase) {
      await supabase.from('receipt_lines').delete().eq('receipt_id', id)
      await supabase.from('receipts').delete().eq('id', id)
    }
  }, [])

  const refetch = useCallback(() => {
    fetchReceipts()
  }, [fetchReceipts])

  return {
    receipts,
    loading,
    createReceipt,
    updateReceipt,
    submitReceipt,
    approveReceipt,
    postToLedger,
    cancelReceipt,
    deleteReceipt,
    refetch,
  }
}
