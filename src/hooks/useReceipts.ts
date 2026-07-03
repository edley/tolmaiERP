import { useState, useEffect, useCallback } from 'react'
import { supabase, isOnline } from '../lib/supabase'
import { getReceipts, saveReceipt as persistReceipt, deleteReceiptById, generateReceiptNumber } from '../lib/receipts'
import { usePaymentModes } from './usePaymentModes'
import type { Receipt, ReceiptLine, ReceiptStatus } from '../lib/receipts'
import { useAuth } from '../contexts/AuthContext'
import { detectFieldChanges, saveFieldAuditEntries, persistFieldAuditToDb, setAuditCompanyId } from '../lib/fieldAuditLog'
import type { FieldAuditEntry } from '../lib/fieldAuditLog'
import { useCompany } from '../contexts/CompanyContext'
import { useViewFilter } from '../contexts/ViewFilterContext'

function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function replaceReceiptIds(receipt: Receipt): Receipt {
  if (UUID_RE.test(receipt.id)) return receipt
  const newId = crypto.randomUUID()
  return {
    ...receipt,
    id: newId,
    lines: receipt.lines.map((l) => ({ ...l, id: crypto.randomUUID(), receipt_id: newId })),
  }
}

let demoReceipts: Receipt[] | null = null

export function useReceipts() {
  const { user } = useAuth()
  const { currentCompany } = useCompany()
  const { modes: paymentModes } = usePaymentModes()
  const viewFilter = useViewFilter()
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)

  const getNextReceiptSequence = useCallback(async (): Promise<number> => {
    const year = new Date().getFullYear()
    const companyId = currentCompany?.id
    if (companyId && isOnline() && supabase) {
      const prefix = `RCT-${year}-`
      const { data } = await supabase
        .from('receipts')
        .select('voucher_number')
        .like('voucher_number', `${prefix}%`)
        .eq('company_id', companyId)
        .order('voucher_number', { ascending: false })
        .limit(1)
      if (data && data.length > 0) {
        const parts = (data[0] as any).voucher_number.split('-')
        const num = parseInt(parts[2], 10)
        if (!isNaN(num)) return num + 1
      }
      return 1
    }
    return (receipts.length || demoReceipts?.length || 0) + 1
  }, [currentCompany?.id, receipts.length])

  const fetchReceipts = useCallback(async () => {
    setLoading(true)
    const companyId = currentCompany?.id
    if (companyId) setAuditCompanyId(companyId)
    let fromDb = false
    if (companyId && isOnline() && supabase) {
      let query = supabase
        .from('receipts')
        .select('*, lines:receipt_lines(*)')
        .eq('company_id', companyId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (viewFilter === 'recent') {
        query = query.limit(20)
      } else if (viewFilter === '10days') {
        query = query.gte('date', daysAgo(10))
      }

      const { data, error } = await query
      if (error) {
        console.error('Failed to fetch receipts:', error.message)
      } else if (data && data.length > 0) {
        // Try to fetch allocations separately (best-effort)
        let allocMap: Record<string, { allocation_code: string; expense_type: string | null; amount: number }[]> = {}
        try {
          const { data: allocData } = await supabase
            .from('receipt_line_allocations')
            .select('receipt_line_id, allocation_code, expense_type, amount')
            .eq('company_id', companyId)
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
        fromDb = true
      }
    }
    if (!fromDb) {
      if (!demoReceipts) {
        demoReceipts = getReceipts()
      }
      setReceipts([...demoReceipts])
    }
    setLoading(false)
  }, [currentCompany?.id, viewFilter])

  useEffect(() => {
    fetchReceipts()
  }, [fetchReceipts])

  const persistToDb = useCallback(async (receipt: Receipt) => {
    if (!isOnline() || !supabase) {
      console.warn('Supabase not configured — receipt saved to localStorage only.')
      return
    }

    // Ensure the selected payment mode exists in the DB
    const localModes: { id: string; name: string; gl_account_id: string | null }[] = (() => {
      try {
        const raw = localStorage.getItem(`payment_modes_${currentCompany?.id ?? ''}`)
        return raw ? JSON.parse(raw) : []
      } catch { return [] }
    })()
    const localMode = localModes.find((m) => m.id === receipt.mode_of_payment_id)

    if (localMode) {
      const modeCid = currentCompany?.id
      if (modeCid) {
        await supabase.from('payment_modes').upsert({
          id: localMode.id,
          name: localMode.name,
          gl_account_id: localMode.gl_account_id,
          company_id: modeCid,
        }).select()
          .then(({ data: fresh }) => {
            if (fresh && fresh.length > 0) {
              localStorage.setItem(`payment_modes_${modeCid}`, JSON.stringify(fresh))
            }
          })
      }
    } else if (!paymentModes.some(
      (m) => m.id === receipt.mode_of_payment_id || m.name.toLowerCase() === receipt.mode_of_payment_id?.toLowerCase()
    )) {
      const modeCid = currentCompany?.id
      const modeName = receipt.mode_of_payment_id?.toLowerCase() === 'bank' || receipt.mode_of_payment_id === '11111111-1111-4111-8111-111111111111' ? 'Bank' : 'Cash'
      if (modeCid) {
        const ledgerCode = modeName === 'Bank' ? '1120' : '1110'
        const { data: acct } = await supabase.from('accounts').select('id').eq('code', ledgerCode).eq('company_id', modeCid).maybeSingle()
        const modeId = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'].includes(receipt.mode_of_payment_id)
          ? receipt.mode_of_payment_id
          : undefined
        await supabase.from('payment_modes').upsert({
          id: modeId,
          name: modeName,
          gl_account_id: acct?.id ?? null,
          company_id: modeCid,
        }).select()
          .then(({ data: fresh }) => {
            if (fresh && fresh.length > 0) {
              localStorage.setItem(`payment_modes_${modeCid}`, JSON.stringify(fresh))
            }
          })
      }
    }

    const cid = currentCompany?.id ?? receipt.company_id
    if (!cid) throw new Error('Cannot persist receipt: no company selected.')
    const { error } = await supabase.from('receipts').upsert({
      id: receipt.id,
      voucher_number: receipt.voucher_number,
      period_id: receipt.period_id,
      company_id: cid,
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
          company_id: cid,
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
          company_id: cid,
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
  }, [paymentModes, currentCompany?.id])

  const syncAndRefresh = useCallback(async (receipt: Receipt) => {
    const dbReceipt = replaceReceiptIds(receipt)
    persistReceipt(dbReceipt)
    const idx = (demoReceipts ?? []).findIndex((r) => r.id === receipt.id)
    if (idx >= 0) {
      demoReceipts = [...demoReceipts!]
      demoReceipts[idx] = dbReceipt
    } else {
      demoReceipts = [...(demoReceipts ?? []), dbReceipt]
    }
    setReceipts([...demoReceipts])
    await persistToDb(dbReceipt)
  }, [persistToDb])

  const createReceipt = useCallback(async (
    header: Omit<Receipt, 'id' | 'voucher_number' | 'lines' | 'status' | 'created_at' | 'created_by' | 'created_by_name' | 'submitted_by' | 'submitted_by_name' | 'submitted_at' | 'approved_by' | 'approved_by_name' | 'approved_at' | 'posted_by' | 'posted_by_name' | 'posted_at'>,
    lines: Omit<ReceiptLine, 'id'>[]
  ) => {
    const companyId = currentCompany?.id
    if (!companyId) throw new Error('No company selected')
    const seq = await getNextReceiptSequence()
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
      company_id: companyId,
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
  }, [getNextReceiptSequence, persistToDb, user, currentCompany?.id])

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

    const changes = detectFieldChanges('receipt', existing, updated)
    if (changes.length > 0 && user && currentCompany?.id) {
      const now2 = new Date().toISOString()
      const auditEntries: FieldAuditEntry[] = changes.map((c) => ({
        id: crypto.randomUUID(),
        company_id: currentCompany.id,
        record_type: 'receipt',
        record_id: id,
        field_name: c.field_name,
        old_value: c.old_value,
        new_value: c.new_value,
        changed_by: user.id ?? '',
        changed_by_name: user.name ?? '',
        changed_at: now2,
      }))
      saveFieldAuditEntries(auditEntries)
      persistFieldAuditToDb(auditEntries)
    }

    await syncAndRefresh(updated)
    return updated
  }, [syncAndRefresh, user, currentCompany?.id])

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

    const changes = detectFieldChanges('receipt', existing, updated)
    if (changes.length > 0 && user && currentCompany?.id) {
      const auditEntries: FieldAuditEntry[] = changes.map((c) => ({
        id: crypto.randomUUID(),
        company_id: currentCompany.id,
        record_type: 'receipt',
        record_id: id,
        field_name: c.field_name,
        old_value: c.old_value,
        new_value: c.new_value,
        changed_by: user.id ?? '',
        changed_by_name: user.name ?? '',
        changed_at: now,
      }))
      saveFieldAuditEntries(auditEntries)
      persistFieldAuditToDb(auditEntries)
    }

    await syncAndRefresh(updated)
    return updated
  }, [syncAndRefresh, user, currentCompany?.id])

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

    const mode = paymentModes.find(
      (m) => m.id === existing.mode_of_payment_id || m.name.toLowerCase() === existing.mode_of_payment_id?.toLowerCase()
    )
    let contraAccountId = mode?.gl_account_id
    if (!contraAccountId) {
      const targetCode = existing.mode_of_payment_id?.toLowerCase() === 'bank' || existing.mode_of_payment_id === '11111111-1111-4111-8111-111111111111' ? '1120' : '1110'
      if (isOnline() && supabase) {
        const { data: acct } = await supabase.from('accounts').select('id').eq('code', targetCode).eq('company_id', currentCompany?.id).maybeSingle()
        contraAccountId = acct?.id ?? null
      }
      if (!contraAccountId) {
        throw new Error(`Receipt mode "${existing.mode_of_payment_id}" has no GL account assigned. Go to Company Settings to configure it.`)
      }
    }

    const now = new Date().toISOString()
    const dbReceipt = replaceReceiptIds({
      ...existing,
      status: 'posted',
      posted_by: user?.id ?? null,
      posted_by_name: user?.name ?? null,
      posted_at: now,
    })

    if (isOnline() && supabase) {
      const cid = currentCompany?.id ?? null
      const { error: leError } = await supabase.from('ledger_entries').insert([
        {
          receipt_id: dbReceipt.id,
          source_type: 'receipt',
          account_id: contraAccountId,
          posting_date: existing.date,
          debit: 0,
          credit: existing.voucher_amount,
          description: `Receipt: ${existing.received_from}`,
          period_id: existing.period_id,
          company_id: cid,
        },
        ...dbReceipt.lines.map((l) => ({
          receipt_id: dbReceipt.id,
          source_type: 'receipt',
          account_id: l.gl_account_id,
          posting_date: existing.date,
          debit: l.amount,
          credit: 0,
          description: l.allocations && l.allocations.length > 0
            ? `${existing.received_from} (${l.allocations.map((a) => `${a.allocation_code}: $${a.amount.toFixed(2)}`).join(', ')})`
            : `Receipt: ${existing.received_from}`,
          period_id: existing.period_id,
          company_id: cid,
        })),
      ])
      if (leError) throw new Error(leError.message)
    }

    await syncAndRefresh(dbReceipt)
    return dbReceipt
  }, [syncAndRefresh, user])

  const cancelReceipt = useCallback(async (id: string) => {
    const existing = (demoReceipts ?? []).find((p) => p.id === id)
    if (!existing) throw new Error('Receipt not found')
    if (existing.status === 'posted') throw new Error('Posted receipts cannot be cancelled')
    if (existing.status === 'cancelled') throw new Error('Receipt is already cancelled')
    const updated: Receipt = { ...existing, status: 'cancelled' }

    const changes = detectFieldChanges('receipt', existing, updated)
    if (changes.length > 0 && user && currentCompany?.id) {
      const t = new Date().toISOString()
      const auditEntries: FieldAuditEntry[] = changes.map((c) => ({
        id: crypto.randomUUID(),
        company_id: currentCompany.id,
        record_type: 'receipt',
        record_id: id,
        field_name: c.field_name,
        old_value: c.old_value,
        new_value: c.new_value,
        changed_by: user.id ?? '',
        changed_by_name: user.name ?? '',
        changed_at: t,
      }))
      saveFieldAuditEntries(auditEntries)
      persistFieldAuditToDb(auditEntries)
    }

    await syncAndRefresh(updated)
    return updated
  }, [syncAndRefresh, user, currentCompany?.id])

  const deleteReceipt = useCallback(async (id: string) => {
    const existing = (demoReceipts ?? []).find((p) => p.id === id)
    if (existing && existing.status !== 'draft') throw new Error('Only draft receipts can be deleted')
    deleteReceiptById(id)
    demoReceipts = (demoReceipts ?? []).filter((p) => p.id !== id)
    setReceipts([...demoReceipts])
    const companyId = currentCompany?.id
    if (companyId && isOnline() && supabase) {
      await supabase.from('receipt_lines').delete().eq('receipt_id', id)
      await supabase.from('receipts').delete().eq('id', id).eq('company_id', companyId)
    }
  }, [currentCompany?.id])

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
