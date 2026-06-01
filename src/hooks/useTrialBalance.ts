import { useState, useCallback } from 'react'
import { supabase, isOnline } from '../lib/supabase'
import { buildDemoAccounts, buildDemoJournalEntries, buildDemoTrialBalance } from '../lib/demo'
import type { TrialBalanceRow } from '../types'

export function useTrialBalance() {
  const [rows, setRows] = useState<TrialBalanceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [totalDebit, setTotalDebit] = useState(0)
  const [totalCredit, setTotalCredit] = useState(0)

  const generate = useCallback(async (periodId: string, startDate: string, endDate: string) => {
    setGenerating(true)
    setError(null)

    if (!isOnline() || !supabase) {
      const accounts = buildDemoAccounts()
      const entries = buildDemoJournalEntries(accounts)
      const result = buildDemoTrialBalance(accounts, entries, startDate, endDate)

      setRows(result)
      setTotalDebit(result.reduce((s, r) => s + r.debit, 0))
      setTotalCredit(result.reduce((s, r) => s + r.credit, 0))
      setIsDemo(true)
      setGenerating(false)
      setLoading(false)
      return
    }

    const { error: rpcError } = await supabase.rpc('generate_trial_balance', {
      p_period_id: periodId,
    })

    if (rpcError) {
      setError(rpcError.message)
      setGenerating(false)
      return
    }

    const { data, error: fetchError } = await supabase
      .from('trial_balances')
      .select('*, account:accounts(*)')
      .eq('period_id', periodId)

    if (fetchError) {
      setError(fetchError.message)
    } else if (data) {
      const result: TrialBalanceRow[] = (data as any[]).map((r: any) => {
        const acc = r.account as { code: string | null; name: string; type: string; is_group: boolean; parent_id: string | null }
        const isDebitPos = acc.type === 'asset' || acc.type === 'expense'
        const debit = Number(r.debit)
        const credit = Number(r.credit)
        return {
          account_id: r.account_id,
          account_code: acc.code,
          account_name: acc.name,
          account_type: acc.type as TrialBalanceRow['account_type'],
          is_group: acc.is_group,
          parent_id: acc.parent_id,
          debit,
          credit,
          balance: isDebitPos ? debit - credit : credit - debit,
        }
      })
      result.sort((a, b) => (a.account_code ?? '').localeCompare(b.account_code ?? ''))
      setRows(result)
      setTotalDebit(result.reduce((s, r) => s + r.debit, 0))
      setTotalCredit(result.reduce((s, r) => s + r.credit, 0))
    }

    setIsDemo(false)
    setGenerating(false)
    setLoading(false)
  }, [])

  return { rows, loading, generating, error, isDemo, totalDebit, totalCredit, generate }
}