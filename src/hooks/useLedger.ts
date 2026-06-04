import { useState, useEffect, useCallback } from 'react'
import { supabase, isOnline } from '../lib/supabase'
import { buildDemoAccounts, buildDemoJournalEntries, buildDemoLedger } from '../lib/demo'
import { getJournalEntries } from '../lib/journalEntries'
import { useCompany } from '../contexts/CompanyContext'
import type { LedgerEntry } from '../types'

function buildVirtualLedger(entries: { id: string; posting_date: string; description: string | null; created_at: string; items?: { id: string; account_id: string; debit: number; credit: number; description?: string | null }[] }[]): LedgerEntry[] {
  const result: LedgerEntry[] = []
  for (const je of entries) {
    if (!je.items) continue
    for (const item of je.items) {
      result.push({
        id: item.id,
        journal_entry_id: je.id,
        account_id: item.account_id,
        posting_date: je.posting_date,
        debit: item.debit,
        credit: item.credit,
        balance: 0,
        description: item.description ?? je.description,
        created_at: je.created_at,
      })
    }
  }

  const byAccount: Record<string, LedgerEntry[]> = {}
  for (const le of result) {
    if (!byAccount[le.account_id]) byAccount[le.account_id] = []
    byAccount[le.account_id].push(le)
  }

  for (const les of Object.values(byAccount)) {
    les.sort((a, b) => a.posting_date.localeCompare(b.posting_date) || a.created_at.localeCompare(b.created_at))
    let running = 0
    for (const le of les) {
      if (le.debit) running += le.debit
      if (le.credit) running -= le.credit
      le.balance = running
    }
  }

  return result
}

export function useLedger(accountId?: string, startDate?: string, endDate?: string) {
  const { currentCompany, loading: companyLoading } = useCompany()
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalDebit, setTotalDebit] = useState(0)
  const [totalCredit, setTotalCredit] = useState(0)
  const [closingBalance, setClosingBalance] = useState(0)
  const [isDemo, setIsDemo] = useState(false)

  const fetchLedger = useCallback(async () => {
    setLoading(true)
    setError(null)

    const companyId = currentCompany?.id
    console.log('[useLedger] Fetching ledger — online:', !!isOnline(), 'supabase:', !!supabase, 'companyId:', companyId, 'accountId:', accountId, 'startDate:', startDate, 'endDate:', endDate)

    if (!isOnline() || !supabase) {
      console.log('[useLedger] Offline mode — using demo data')
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

    if (!companyId) {
      console.log('[useLedger] No companyId — waiting for context to load')
      if (companyLoading) return
      setLoading(false)
      return
    }

    console.log('[useLedger] Querying ledger_entries for company:', companyId)
    let query = supabase
      .from('ledger_entries')
      .select('*, account:accounts(*), journal_entry:journal_entries(*)')
      .eq('company_id', companyId)
      .order('posting_date', { ascending: true })
      .order('created_at', { ascending: true })

    if (accountId) query = query.eq('account_id', accountId)
    if (startDate) query = query.gte('posting_date', startDate)
    if (endDate) query = query.lte('posting_date', endDate)

    const { data, error } = await query

    if (error) {
      console.log('[useLedger] DB error:', error.message)
      setError(error.message)
    } else {
      console.log('[useLedger] ledger_entries returned:', data?.length ?? 0, 'rows')
      let ledgerData = data as unknown as LedgerEntry[]

      if (ledgerData.length === 0) {
        console.log('[useLedger] No ledger_entries — building virtual ledger from posted JEs')
        const { data: postedJEs, error: jeError } = await supabase
          .from('journal_entries')
          .select('id, entry_number, posting_date, description, created_at, items:journal_entry_items(*)')
          .eq('company_id', companyId)
          .eq('status', 'posted')
          .order('posting_date', { ascending: true })

        if (jeError) console.log('[useLedger] JE query error:', jeError.message)
        console.log('[useLedger] Posted JEs found in DB:', postedJEs?.length ?? 0)

        let allEntries: any[] = postedJEs ?? []

        // Also include localStorage posted JEs, filtered to current company
        const localEntries = getJournalEntries().filter((e) => e.status === 'posted' && e.company_id === companyId)
        console.log('[useLedger] Local posted JEs found:', localEntries.length)
        const dbIds = new Set(allEntries.map((je: any) => je.id))
        for (const le of localEntries) {
          if (!dbIds.has(le.id)) {
            allEntries.push({
              id: le.id,
              posting_date: le.posting_date,
              description: le.description,
              created_at: le.created_at,
              company_id: le.company_id,
              items: (le.items ?? []).map((i: any) => ({
                id: i.id,
                account_id: i.account_id,
                debit: i.debit,
                credit: i.credit,
                description: i.description,
              })),
            })
          }
        }

        console.log('[useLedger] Total entries for virtual ledger:', allEntries.length)
        if (allEntries.length > 0) {
          const allLedger = buildVirtualLedger(allEntries)
          console.log('[useLedger] Virtual ledger built:', allLedger.length, 'entries')
          let filtered = allLedger
          if (accountId) filtered = filtered.filter((e) => e.account_id === accountId)
          if (startDate) filtered = filtered.filter((e) => e.posting_date >= startDate)
          if (endDate) filtered = filtered.filter((e) => e.posting_date <= endDate)
          console.log('[useLedger] After date/account filter:', filtered.length, 'entries')
          ledgerData = filtered
        }
      }
      console.log('[useLedger] Final ledgerData:', ledgerData.length, 'entries')

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
  }, [accountId, startDate, endDate, currentCompany?.id, companyLoading])

  useEffect(() => {
    fetchLedger()
  }, [fetchLedger])

  return { entries, loading, error, isDemo, totalDebit, totalCredit, closingBalance, refetch: fetchLedger }
}
