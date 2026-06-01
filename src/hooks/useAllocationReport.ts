import { useState, useCallback } from 'react'
import { supabase, isOnline } from '../lib/supabase'
import type { Account, AccountingPeriod } from '../types'

export interface AllocationReportRow {
  date: string
  doc_type: string
  doc_number: string
  gl_code: string
  gl_name: string
  allocation_code: string
  amount: number
}

const ALLOC_MAP: Record<string, { gl_name: string; codes: string[] }> = {
  '6110': { gl_name: 'Management Salaries', codes: ['ADMIN', 'SALES'] },
  '6310': { gl_name: 'Office Rent', codes: ['ADMIN', 'SALES', 'IT'] },
  '6320': { gl_name: 'Office Supplies', codes: ['ADMIN', 'SALES'] },
  '6330': { gl_name: 'Utilities', codes: ['ADMIN', 'PROD'] },
  '6410': { gl_name: 'Software Subscriptions', codes: ['IT', 'ADMIN'] },
  '6610': { gl_name: 'Digital Advertising', codes: ['SALES'] },
  '6710': { gl_name: 'Air Travel', codes: ['SALES', 'ADMIN'] },
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function buildDemoReport(periodId: string, glCode: string, _accounts: Account[], periods: AccountingPeriod[]): AllocationReportRow[] {
  const period = periods.find((p) => p.id === periodId)
  if (!period) return []

  const info = ALLOC_MAP[glCode]
  if (!info) return []

  const startDate = new Date(period.start_date)
  const endDate = new Date(period.end_date)
  const rows: AllocationReportRow[] = []
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
  const numTransactions = randInt(3, 6)

  for (let t = 0; t < numTransactions; t++) {
    const docType = docTypes[t % docTypes.length]
    const date = pickDate()

    const prefix = docType === 'Payment' ? 'PAY' : docType === 'Receipt' ? 'RCT' : 'JE'
    const docNum = nextDoc(prefix)

    const totalAmount = randInt(1, 20) * 100000

    const numAllocs = Math.min(info.codes.length, randInt(1, info.codes.length))
    const shuffled = [...info.codes].sort(() => Math.random() - 0.5).slice(0, numAllocs)

    let remaining = totalAmount
    for (let i = 0; i < shuffled.length; i++) {
      const isLast = i === shuffled.length - 1
      const amt = isLast ? remaining : Math.round((totalAmount / shuffled.length) * (0.5 + Math.random() * 0.5))
      remaining -= amt
      rows.push({
        date,
        doc_type: docType,
        doc_number: docNum,
        gl_code: glCode,
        gl_name: info.gl_name,
        allocation_code: shuffled[i],
        amount: amt,
      })
    }
  }

  rows.sort((a, b) => a.date.localeCompare(b.date))
  return rows
}

export function useAllocationReport() {
  const [rows, setRows] = useState<AllocationReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [totalAmount, setTotalAmount] = useState(0)

  const run = useCallback(async (periodId: string, glCode: string, accounts: Account[], periods: AccountingPeriod[]) => {
    setLoading(true)
    setError(null)

    if (!periodId || !glCode) {
      setRows([])
      setTotalAmount(0)
      setLoading(false)
      return
    }

    if (!isOnline() || !supabase) {
      const result = buildDemoReport(periodId, glCode, accounts, periods)
      setRows(result)
      setTotalAmount(result.reduce((s, r) => s + r.amount, 0))
      setIsDemo(true)
      setLoading(false)
      return
    }

    try {
      const glAccount = accounts.find((a) => a.code === glCode)
      if (!glAccount) {
        setError(`GL account with code ${glCode} not found`)
        setLoading(false)
        return
      }

      const results: AllocationReportRow[] = []

      const { data: payments } = await supabase
        .from('payment_line_allocations')
        .select('*, payment_line:payment_lines!inner(payment_id, gl_account_id, amount, payment:payments!inner(voucher_number, date, period_id))')
        .eq('payment_line.payment.period_id', periodId)
        .eq('payment_line.gl_account_id', glAccount.id)

      if (payments) {
        for (const a of payments as any[]) {
          const line = a.payment_line
          const payment = line.payment
          results.push({
            date: payment.date,
            doc_type: 'Payment',
            doc_number: payment.voucher_number,
            gl_code: glCode,
            gl_name: glAccount.name,
            allocation_code: a.allocation_code,
            amount: Number(a.amount),
          })
        }
      }

      const { data: receipts } = await supabase
        .from('receipt_line_allocations')
        .select('*, receipt_line:receipt_lines!inner(receipt_id, gl_account_id, amount, receipt:receipts!inner(voucher_number, date, period_id))')
        .eq('receipt_line.receipt.period_id', periodId)
        .eq('receipt_line.gl_account_id', glAccount.id)

      if (receipts) {
        for (const a of receipts as any[]) {
          const line = a.receipt_line
          const receipt = line.receipt
          results.push({
            date: receipt.date,
            doc_type: 'Receipt',
            doc_number: receipt.voucher_number,
            gl_code: glCode,
            gl_name: glAccount.name,
            allocation_code: a.allocation_code,
            amount: Number(a.amount),
          })
        }
      }

      const { data: jeAllocs } = await supabase
        .from('journal_entry_item_allocations')
        .select('*, item:journal_entry_items!inner(journal_entry_id, account_id, amount, entry:journal_entries!inner(entry_number, posting_date, period_id))')
        .eq('item.entry.period_id', periodId)
        .eq('item.account_id', glAccount.id)

      if (jeAllocs) {
        for (const a of jeAllocs as any[]) {
          const item = a.item
          const entry = item.entry
          results.push({
            date: entry.posting_date,
            doc_type: 'Journal Entry',
            doc_number: entry.entry_number,
            gl_code: glCode,
            gl_name: glAccount.name,
            allocation_code: a.allocation_code,
            amount: Number(a.amount),
          })
        }
      }

      results.sort((a, b) => a.date.localeCompare(b.date))
      setRows(results)
      setTotalAmount(results.reduce((s, r) => s + r.amount, 0))
      setIsDemo(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load allocation report')
      const result = buildDemoReport(periodId, glCode, accounts, periods)
      setRows(result)
      setTotalAmount(result.reduce((s, r) => s + r.amount, 0))
      setIsDemo(true)
    }
    setLoading(false)
  }, [])

  return { rows, loading, error, isDemo, totalAmount, run }
}
