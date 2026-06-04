import { useState, useCallback } from 'react'
import { supabase, isOnline } from '../lib/supabase'
import { useCompany } from '../contexts/CompanyContext'
import type { Account, AccountingPeriod } from '../types'

export interface ExpenseTypeReportRow {
  date: string
  doc_type: string
  doc_number: string
  gl_code: string
  gl_name: string
  allocation_code: string
  expense_type: string
  amount: number
}

const DEMO_TYPES = ['Category A', 'Category B', 'Category C', 'Category D']

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function buildDemoReport(periodId: string, glCode: string, allocCode: string, accounts: Account[], periods: AccountingPeriod[]): ExpenseTypeReportRow[] {
  const period = periods.find((p) => p.id === periodId)
  if (!period) return []

  const glAccount = accounts.find((a) => a.code === glCode)
  if (!glAccount) return []

  const types = DEMO_TYPES

  const startDate = new Date(period.start_date)
  const endDate = new Date(period.end_date)
  const rows: ExpenseTypeReportRow[] = []
  const usedNumbers = new Set<string>()

  function pickDate(): string {
    const d = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()))
    return d.toISOString().split('T')[0]
  }

  function nextDoc(prefix: string): string {
    let n: string
    do { n = `${prefix}-${randInt(1, 9999)}` } while (usedNumbers.has(n))
    usedNumbers.add(n)
    return n
  }

  const docTypes = ['Payment', 'Receipt', 'Journal Entry']
  const numTransactions = randInt(4, 8)

  for (let t = 0; t < numTransactions; t++) {
    const docType = docTypes[t % docTypes.length]
    const date = pickDate()
    const prefix = docType === 'Payment' ? 'PAY' : docType === 'Receipt' ? 'RCT' : 'JE'
    const docNum = nextDoc(prefix)
    const typesUsed = randInt(1, Math.min(types.length, 3))
    const shuffled = [...types].sort(() => Math.random() - 0.5).slice(0, typesUsed)
    const totalAmounts = randInt(1, 10) * 50000

    let remaining = totalAmounts
    for (let i = 0; i < shuffled.length; i++) {
      const isLast = i === shuffled.length - 1
      const amt = isLast ? remaining : Math.round((totalAmounts / shuffled.length) * (0.5 + Math.random() * 0.5))
      remaining -= amt
      rows.push({
        date,
        doc_type: docType,
        doc_number: docNum,
        gl_code: glCode,
        gl_name: glAccount.name,
        allocation_code: allocCode,
        expense_type: shuffled[i],
        amount: amt,
      })
    }
  }

  rows.sort((a, b) => a.date.localeCompare(b.date))
  return rows
}

export function useExpenseTypeReport() {
  const { currentCompany } = useCompany()
  const [rows, setRows] = useState<ExpenseTypeReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [totalAmount, setTotalAmount] = useState(0)

  const run = useCallback(async (
    periodId: string,
    glCode: string,
    allocCode: string,
    accounts: Account[],
    periods: AccountingPeriod[]
  ) => {
    setLoading(true)
    setError(null)

    if (!periodId || !glCode || !allocCode) {
      setRows([])
      setTotalAmount(0)
      setLoading(false)
      return
    }

    if (!isOnline() || !supabase) {
      const result = buildDemoReport(periodId, glCode, allocCode, accounts, periods)
      setRows(result)
      setTotalAmount(result.reduce((s, r) => s + r.amount, 0))
      setIsDemo(true)
      setError(null)
      setLoading(false)
      return
    }

    const glAccount = accounts.find((a) => a.code === glCode)
    if (!glAccount) {
      setError(`GL account with code ${glCode} not found`)
      setLoading(false)
      return
    }
    const accId = glAccount.id
    const accName = glAccount.name

    const cid = currentCompany?.id
    const results: ExpenseTypeReportRow[] = []

    async function fetchPayments() {
      try {
        const { data: payments } = await supabase!
          .from('payments')
          .select('id, voucher_number, date')
          .eq('company_id', cid)
          .eq('period_id', periodId)
        if (!payments || payments.length === 0) return
        const paymentIds = payments.map(p => p.id)

        const { data: lines } = await supabase!
          .from('payment_lines')
          .select('id, payment_id')
          .in('payment_id', paymentIds)
          .eq('gl_account_id', accId)
        if (!lines || lines.length === 0) return
        const lineIds = lines.map(l => l.id)
        const linePaymentMap = new Map(lines.map(l => [l.id, l.payment_id]))

        const { data: allocs } = await supabase!
          .from('payment_line_allocations')
          .select('expense_type, amount, payment_line_id')
          .in('payment_line_id', lineIds)
          .eq('allocation_code', allocCode)
        if (!allocs) return

        const paymentMap = new Map(payments.map(p => [p.id, p]))
        for (const a of allocs) {
          const pid = linePaymentMap.get(a.payment_line_id)
          const p = pid ? paymentMap.get(pid) : undefined
          if (!p) continue
          results.push({ date: p.date, doc_type: 'Payment', doc_number: p.voucher_number, gl_code: glCode, gl_name: accName, allocation_code: allocCode, expense_type: a.expense_type ?? '', amount: Number(a.amount) })
        }
      } catch {}
    }

    async function fetchReceipts() {
      try {
        const { data: receipts } = await supabase!
          .from('receipts')
          .select('id, voucher_number, date')
          .eq('company_id', cid)
          .eq('period_id', periodId)
        if (!receipts || receipts.length === 0) return
        const receiptIds = receipts.map(r => r.id)

        const { data: lines } = await supabase!
          .from('receipt_lines')
          .select('id, receipt_id')
          .in('receipt_id', receiptIds)
          .eq('gl_account_id', accId)
        if (!lines || lines.length === 0) return
        const lineIds = lines.map(l => l.id)
        const lineReceiptMap = new Map(lines.map(l => [l.id, l.receipt_id]))

        const { data: allocs } = await supabase!
          .from('receipt_line_allocations')
          .select('expense_type, amount, receipt_line_id')
          .in('receipt_line_id', lineIds)
          .eq('allocation_code', allocCode)
        if (!allocs) return

        const receiptMap = new Map(receipts.map(r => [r.id, r]))
        for (const a of allocs) {
          const rid = lineReceiptMap.get(a.receipt_line_id)
          const r = rid ? receiptMap.get(rid) : undefined
          if (!r) continue
          results.push({ date: r.date, doc_type: 'Receipt', doc_number: r.voucher_number, gl_code: glCode, gl_name: accName, allocation_code: allocCode, expense_type: a.expense_type ?? '', amount: Number(a.amount) })
        }
      } catch {}
    }

    async function fetchJournalEntries() {
      try {
        const { data: entries } = await supabase!
          .from('journal_entries')
          .select('id, entry_number, posting_date')
          .eq('company_id', cid)
          .eq('period_id', periodId)
        if (!entries || entries.length === 0) return
        const entryIds = entries.map(e => e.id)

        const { data: items } = await supabase!
          .from('journal_entry_items')
          .select('id, journal_entry_id')
          .in('journal_entry_id', entryIds)
          .eq('account_id', accId)
        if (!items || items.length === 0) return
        const itemIds = items.map(i => i.id)
        const itemEntryMap = new Map(items.map(i => [i.id, i.journal_entry_id]))

        const { data: allocs } = await supabase!
          .from('journal_entry_item_allocations')
          .select('expense_type, amount, journal_entry_item_id')
          .in('journal_entry_item_id', itemIds)
          .eq('allocation_code', allocCode)
        if (!allocs) return

        const entryMap = new Map(entries.map(e => [e.id, e]))
        for (const a of allocs) {
          const eid = itemEntryMap.get(a.journal_entry_item_id)
          const e = eid ? entryMap.get(eid) : undefined
          if (!e) continue
          results.push({ date: e.posting_date, doc_type: 'Journal Entry', doc_number: e.entry_number, gl_code: glCode, gl_name: accName, allocation_code: allocCode, expense_type: a.expense_type ?? '', amount: Number(a.amount) })
        }
      } catch {}
    }

    await Promise.allSettled([fetchPayments(), fetchReceipts(), fetchJournalEntries()])

    results.sort((a, b) => a.date.localeCompare(b.date))
    const hasTypes = results.some((r) => r.expense_type)

    if (results.length === 0 || !hasTypes) {
      const result = buildDemoReport(periodId, glCode, allocCode, accounts, periods)
      setRows(result)
      setTotalAmount(result.reduce((s, r) => s + r.amount, 0))
      setIsDemo(true)
      setError('No matching data found in Supabase for the selected filters. Showing sample demo data instead.')
    } else {
      setRows(results)
      setTotalAmount(results.reduce((s, r) => s + r.amount, 0))
      setIsDemo(false)
      setError(null)
    }
    setLoading(false)
  }, [currentCompany?.id])

  return { rows, loading, error, isDemo, totalAmount, run }
}
