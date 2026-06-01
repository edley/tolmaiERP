import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, isOnline } from '../lib/supabase'
import { getPayments, savePayment as persistPayment, deletePaymentById, generatePaymentNumber } from '../lib/payments'
import { getPaymentModes } from '../lib/paymentModes'
import type { Payment, PaymentLine, PaymentStatus } from '../lib/payments'
import { useAuth } from '../contexts/AuthContext'

let demoPayments: Payment[] | null = null

export function usePayments() {
  const { user } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const nextSeq = useRef(1)

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    let fromDb = false
    if (isOnline() && supabase) {
      const { data, error } = await supabase
        .from('payments')
        .select('*, lines:payment_lines(*)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) {
        console.error('Failed to fetch payments:', error.message)
      } else if (data && data.length > 0) {
        // Try to fetch allocations separately (best-effort)
        let allocMap: Record<string, { allocation_code: string; amount: number }[]> = {}
        try {
          const { data: allocData } = await supabase
            .from('payment_line_allocations')
            .select('payment_line_id, allocation_code, amount')
          if (allocData) {
            for (const a of allocData as any[]) {
              const lineId = a.payment_line_id
              if (!allocMap[lineId]) allocMap[lineId] = []
              allocMap[lineId].push({ allocation_code: a.allocation_code, amount: Number(a.amount) })
            }
          }
        } catch { /* allocations table may not exist */ }

        const mapped: Payment[] = data.map((r: any) => ({
          id: r.id,
          voucher_number: r.voucher_number,
          period_id: r.period_id,
          date: r.date,
          voucher_amount: Number(r.voucher_amount),
          mode_of_payment_id: r.mode_of_payment_id,
          paid_to: r.paid_to,
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
        setPayments(mapped)
        demoPayments = mapped
        nextSeq.current = mapped.length + 1
        fromDb = true
      }
    }
    if (!fromDb) {
      if (!demoPayments) {
        demoPayments = getPayments()
      }
      setPayments([...demoPayments])
      nextSeq.current = demoPayments.length + 1
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const persistToDb = useCallback(async (payment: Payment) => {
    if (!isOnline() || !supabase) {
      console.warn('Supabase not configured — payment saved to localStorage only.')
      return
    }
    const { error } = await supabase.from('payments').upsert({
      id: payment.id,
      voucher_number: payment.voucher_number,
      period_id: payment.period_id,
      date: payment.date,
      voucher_amount: payment.voucher_amount,
      mode_of_payment_id: payment.mode_of_payment_id,
      paid_to: payment.paid_to,
      invoice_no: payment.invoice_no || null,
      description: payment.description || null,
      status: payment.status,
      created_by: payment.created_by,
      created_by_name: payment.created_by_name,
      submitted_by: payment.submitted_by,
      submitted_by_name: payment.submitted_by_name,
      submitted_at: payment.submitted_at,
      approved_by: payment.approved_by,
      approved_by_name: payment.approved_by_name,
      approved_at: payment.approved_at,
      posted_by: payment.posted_by,
      posted_by_name: payment.posted_by_name,
      posted_at: payment.posted_at,
    })
    if (error) throw new Error(error.message)
    const { error: delError } = await supabase
      .from('payment_lines')
      .delete()
      .eq('payment_id', payment.id)
    if (delError) throw new Error(delError.message)
    if (payment.lines.length > 0) {
      const { error: insError } = await supabase.from('payment_lines').insert(
        payment.lines.map((l) => ({
          id: l.id,
          payment_id: payment.id,
          gl_account_id: l.gl_account_id,
          amount: l.amount,
        }))
      )
      if (insError) throw new Error(insError.message)

      // Persist line-level allocations (best-effort — table may not exist yet)
      const allocData = payment.lines.flatMap((l) =>
        (l.allocations ?? []).map((a) => ({
          payment_line_id: l.id,
          allocation_code: a.allocation_code,
          amount: a.amount,
        }))
      )
      if (allocData.length > 0) {
        try {
          const { error: allocError } = await supabase.from('payment_line_allocations').insert(allocData)
          if (allocError) console.warn('Failed to persist allocations:', allocError.message)
        } catch (e) {
          console.warn('Allocations table not available — skipping allocation persistence', e)
        }
      }
    }
  }, [])

  const syncAndRefresh = useCallback(async (payment: Payment) => {
    persistPayment(payment)
    demoPayments = (demoPayments ?? []).map((p) => (p.id === payment.id ? payment : p))
    setPayments([...demoPayments])
    console.log('[payments] Syncing to DB...')
    await persistToDb(payment)
  }, [persistToDb])

  const createPayment = useCallback(async (
    header: Omit<Payment, 'id' | 'voucher_number' | 'lines' | 'status' | 'created_at' | 'created_by' | 'created_by_name' | 'submitted_by' | 'submitted_by_name' | 'submitted_at' | 'approved_by' | 'approved_by_name' | 'approved_at' | 'posted_by' | 'posted_by_name' | 'posted_at'>,
    lines: Omit<PaymentLine, 'id'>[]
  ) => {
    const seq = nextSeq.current++
    const now = new Date().toISOString()
    const payment: Payment = {
      id: crypto.randomUUID(),
      voucher_number: generatePaymentNumber(seq),
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
    persistPayment(payment)
    demoPayments = [payment, ...(demoPayments ?? [])]
    setPayments([...demoPayments])
    console.log('[payments] Saved to localStorage, now syncing to DB...')
    await persistToDb(payment)
    return payment
  }, [persistToDb, user])

  const updatePayment = useCallback(async (
    id: string,
    header: Omit<Payment, 'id' | 'voucher_number' | 'lines' | 'status' | 'created_at' | 'created_by' | 'created_by_name' | 'submitted_by' | 'submitted_by_name' | 'submitted_at' | 'approved_by' | 'approved_by_name' | 'approved_at' | 'posted_by' | 'posted_by_name' | 'posted_at'>,
    lines: Omit<PaymentLine, 'id'>[]
  ) => {
    const existing = (demoPayments ?? []).find((p) => p.id === id)
    if (!existing) throw new Error('Payment not found')
    if (existing.status !== 'draft') throw new Error('Only draft payments can be edited')
    const updated: Payment = {
      ...existing,
      ...header,
      lines: lines.map((l) => ({ id: crypto.randomUUID(), ...l })),
    }
    await syncAndRefresh(updated)
    return updated
  }, [syncAndRefresh])

  const transitionStatus = useCallback(async (
    id: string,
    newStatus: PaymentStatus,
    auditField: 'submitted' | 'approved' | 'posted',
  ) => {
    const existing = (demoPayments ?? []).find((p) => p.id === id)
    if (!existing) throw new Error('Payment not found')
    const now = new Date().toISOString()
    const updated: Payment = {
      ...existing,
      status: newStatus,
      [`${auditField}_by`]: user?.id ?? null,
      [`${auditField}_by_name`]: user?.name ?? null,
      [`${auditField}_at`]: now,
    }
    await syncAndRefresh(updated)
    return updated
  }, [syncAndRefresh, user])

  const submitPayment = useCallback(async (id: string) => {
    const existing = (demoPayments ?? []).find((p) => p.id === id)
    if (!existing) throw new Error('Payment not found')
    if (existing.status !== 'draft') throw new Error('Only draft payments can be submitted')
    return transitionStatus(id, 'submitted', 'submitted')
  }, [transitionStatus])

  const approvePayment = useCallback(async (id: string) => {
    const existing = (demoPayments ?? []).find((p) => p.id === id)
    if (!existing) throw new Error('Payment not found')
    if (existing.status !== 'submitted') throw new Error('Only submitted payments can be approved')
    if (!user?.role || !['Superuser', 'Manager'].includes(user.role)) {
      throw new Error('Only managers can approve payments')
    }
    return transitionStatus(id, 'approved', 'approved')
  }, [transitionStatus, user])

  const postToLedger = useCallback(async (id: string) => {
    const existing = (demoPayments ?? []).find((p) => p.id === id)
    if (!existing) throw new Error('Payment not found')
    if (existing.status !== 'approved') throw new Error('Only approved payments can be posted')
    if (!user?.role || !['Superuser', 'Manager'].includes(user.role)) {
      throw new Error('Only managers can post payments to ledger')
    }

    const paymentModes = getPaymentModes()
    const mode = paymentModes.find((m) => m.id === existing.mode_of_payment_id)
    const contraAccountId = mode?.gl_account_id
    if (!contraAccountId) {
      throw new Error(`Payment mode ${existing.mode_of_payment_id} has no GL account assigned. Configure it in Payment Settings.`)
    }

    const now = new Date().toISOString()
    const updated: Payment = {
      ...existing,
      status: 'posted',
      posted_by: user?.id ?? null,
      posted_by_name: user?.name ?? null,
      posted_at: now,
    }

    if (isOnline() && supabase) {
      const { error: leError } = await supabase.from('ledger_entries').insert([
        {
          payment_id: updated.id,
          account_id: contraAccountId,
          posting_date: existing.date,
          debit: existing.voucher_amount,
          credit: 0,
          description: `Payment: ${existing.paid_to}`,
          period_id: existing.period_id,
        },
        ...existing.lines.map((l) => ({
          payment_id: updated.id,
          account_id: l.gl_account_id,
          posting_date: existing.date,
          debit: 0,
          credit: l.amount,
          description: `Payment: ${existing.paid_to}`,
          period_id: existing.period_id,
        })),
      ])
      if (leError) throw new Error(leError.message)
    }

    await syncAndRefresh(updated)
    return updated
  }, [syncAndRefresh, user])

  const cancelPayment = useCallback(async (id: string) => {
    const existing = (demoPayments ?? []).find((p) => p.id === id)
    if (!existing) throw new Error('Payment not found')
    if (existing.status === 'posted') throw new Error('Posted payments cannot be cancelled')
    if (existing.status === 'cancelled') throw new Error('Payment is already cancelled')
    const updated: Payment = { ...existing, status: 'cancelled' }
    await syncAndRefresh(updated)
    return updated
  }, [syncAndRefresh])

  const deletePayment = useCallback(async (id: string) => {
    const existing = (demoPayments ?? []).find((p) => p.id === id)
    if (existing && existing.status !== 'draft') throw new Error('Only draft payments can be deleted')
    deletePaymentById(id)
    demoPayments = (demoPayments ?? []).filter((p) => p.id !== id)
    setPayments([...demoPayments])
    if (isOnline() && supabase) {
      await supabase.from('payment_lines').delete().eq('payment_id', id)
      await supabase.from('payments').delete().eq('id', id)
    }
  }, [])

  const refetch = useCallback(() => {
    fetchPayments()
  }, [fetchPayments])

  return {
    payments,
    loading,
    createPayment,
    updatePayment,
    submitPayment,
    approvePayment,
    postToLedger,
    cancelPayment,
    deletePayment,
    refetch,
  }
}
