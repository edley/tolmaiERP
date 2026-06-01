import { useState, useCallback } from 'react'
import { supabase, isOnline } from '../lib/supabase'
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
      setLoading(false)
      return
    }

    const glAccount = accounts.find((a) => a.code === glCode)
    if (!glAccount) {
      setError(`GL account with code ${glCode} not found`)
      setLoading(false)
      return
    }

    const results: ExpenseTypeReportRow[] = []

    async function fetchPayments() {
      try {
        const { data } = await supabase!
          .from('payment_line_allocations')
          .select('expense_type, amount, payment_line:payment_lines!inner(payment_id, gl_account_id, payment:payments!inner(voucher_number, date, period_id))')
          .eq('payment_line.payment.period_id', periodId)
          .eq('payment_line.gl_account_id', glAccount.id)
          .eq('allocation_code', allocCode)
        if (!data) return
        for (const a of data as any[]) {
          const p = a.payment_line.payment
          results.push({ date: p.date, doc_type: 'Payment', doc_number: p.voucher_number, gl_code: glCode, gl_name: glAccount.name, allocation_code: allocCode, expense_type: a.expense_type ?? '', amount: Number(a.amount) })
        }
      } catch {}
    }

    async function fetchReceipts() {
      try {
        const { data } = await supabase!
          .from('receipt_line_allocations')
          .select('expense_type, amount, receipt_line:receipt_lines!inner(receipt_id, gl_account_id, receipt:receipts!inner(voucher_number, date, period_id))')
          .eq('receipt_line.receipt.period_id', periodId)
          .eq('receipt_line.gl_account_id', glAccount.id)
          .eq('allocation_code', allocCode)
        if (!data) return
        for (const a of data as any[]) {
          const r = a.receipt_line.receipt
          results.push({ date: r.date, doc_type: 'Receipt', doc_number: r.voucher_number, gl_code: glCode, gl_name: glAccount.name, allocation_code: allocCode, expense_type: a.expense_type ?? '', amount: Number(a.amount) })
        }
      } catch {}
    }

    async function fetchJournalEntries() {
      try {
        const { data } = await supabase!
          .from('journal_entry_item_allocations')
          .select('expense_type, amount, item:journal_entry_items!inner(journal_entry_id, account_id, entry:journal_entries!inner(entry_number, posting_date, period_id))')
          .eq('item.entry.period_id', periodId)
          .eq('item.account_id', glAccount.id)
          .eq('allocation_code', allocCode)
        if (!data) return
        for (const a of data as any[]) {
          const e = a.item.entry
          results.push({ date: e.posting_date, doc_type: 'Journal Entry', doc_number: e.entry_number, gl_code: glCode, gl_name: glAccount.name, allocation_code: allocCode, expense_type: a.expense_type ?? '', amount: Number(a.amount) })
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
    } else {
      setRows(results)
      setTotalAmount(results.reduce((s, r) => s + r.amount, 0))
      setIsDemo(false)
    }
    setLoading(false)
  }, [])

  return { rows, loading, error, isDemo, totalAmount, run }
}
