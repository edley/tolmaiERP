import { useState, useEffect, useCallback } from 'react'
import { supabase, isOnline } from '../lib/supabase'
import { buildDemoAccounts, buildDemoJournalEntries, buildDemoLedger } from '../lib/demo'
import type { LedgerEntry } from '../types'

export function useLedger(accountId?: string, startDate?: string, endDate?: string) {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalDebit, setTotalDebit] = useState(0)
  const [totalCredit, setTotalCredit] = useState(0)
  const [closingBalance, setClosingBalance] = useState(0)
  const [isDemo, setIsDemo] = useState(false)

  const fetchLedger = useCallback(async () => {
    setLoading(true)

    if (!isOnline() || !supabase) {
      const accounts = buildDemoAccounts()
      const entries = buildDemoJournalEntries(accounts)
      const ledger = buildDemoLedger(entries)

      let filtered = ledger
      if (accountId) filtered = filtered.filter((e) => e.account_id === accountId)
      if (startDate) filtered = filtered.filter((e) => e.posting_date >= startDate)
      if (endDate) filtered = filtered.filter((e) => e.posting_date <= endDate)

      filtered.sort((a, b) => a.posting_date.localeCompare(b.posting_date) || a.created_at.localeCompare(b.created_at))

      const accountMap = new Map(accounts.map((a) => [a.id, a]))
      const enriched = filtered.map((e) => ({
        ...e,
        account: accountMap.get(e.account_id) as unknown as LedgerEntry['account'],
      }))

      let runningBalance = 0
      let runningDebit = 0
      let runningCredit = 0

      const withBalance = enriched.map((entry) => {
        const a = accountMap.get(entry.account_id)
        const isDebitPositive = a?.type === 'asset' || a?.type === 'expense'
        if (entry.debit) runningBalance += (isDebitPositive ? 1 : -1) * Number(entry.debit)
        if (entry.credit) runningBalance -= (isDebitPositive ? 1 : -1) * Number(entry.credit)
        runningDebit += Number(entry.debit)
        runningCredit += Number(entry.credit)
        return { ...entry, balance: runningBalance }
      })

      setEntries(withBalance)
      setTotalDebit(runningDebit)
      setTotalCredit(runningCredit)
      setClosingBalance(runningBalance)
      setIsDemo(true)
      setLoading(false)
      return
    }

    let query = supabase
      .from('ledger_entries')
      .select('*, account:accounts(*), journal_entry:journal_entries(*)')
      .order('posting_date', { ascending: true })
      .order('created_at', { ascending: true })

    if (accountId) query = query.eq('account_id', accountId)
    if (startDate) query = query.gte('posting_date', startDate)
    if (endDate) query = query.lte('posting_date', endDate)

    const { data, error } = await query

    if (error) {
      setError(error.message)
    } else {
      const ledgerData = data as unknown as LedgerEntry[]
      let runningBalance = 0
      let runningDebit = 0
      let runningCredit = 0

      const withBalance = ledgerData.map((entry) => {
        const accountType = (entry.account as unknown as { type: string })?.type
        const isDebitPositive = accountType === 'asset' || accountType === 'expense'
        if (entry.debit) runningBalance += (isDebitPositive ? 1 : -1) * Number(entry.debit)
        if (entry.credit) runningBalance -= (isDebitPositive ? 1 : -1) * Number(entry.credit)
        runningDebit += Number(entry.debit)
        runningCredit += Number(entry.credit)
        return { ...entry, balance: runningBalance }
      })

      setEntries(withBalance)
      setTotalDebit(runningDebit)
      setTotalCredit(runningCredit)
      setClosingBalance(runningBalance)
    }
    setIsDemo(false)
    setLoading(false)
  }, [accountId, startDate, endDate])

  useEffect(() => {
    fetchLedger()
  }, [fetchLedger])

  return { entries, loading, error, isDemo, totalDebit, totalCredit, closingBalance, refetch: fetchLedger }
}
