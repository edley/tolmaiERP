import { useState, useEffect, useCallback } from 'react'
import { supabase, isOnline } from '../lib/supabase'

interface BudgetStatus {
  budget: number
  actual: number
  remaining: number
  loading: boolean
}

export function useBudgetCheck(companyId: string | undefined, periodId: string) {
  const [budgetMap, setBudgetMap] = useState<Map<string, number>>(new Map())
  const [actualMap, setActualMap] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!companyId || !periodId || !supabase || !isOnline()) return
    let cancelled = false
    setLoading(true)

    const fetchData = async () => {
      const [budgetResult, ledgerResult] = await Promise.all([
        supabase!
          .from('budget_gl_accounts')
          .select('gl_account_id, amount')
          .eq('company_id', companyId)
          .eq('period_id', periodId),
        supabase!
          .from('ledger_entries')
          .select('account_id, debit, credit, account:accounts!inner(type)')
          .eq('company_id', companyId)
          .eq('period_id', periodId),
      ])

      if (cancelled) return

      const bMap = new Map<string, number>()
      for (const b of (budgetResult.data ?? [])) {
        bMap.set(b.gl_account_id, b.amount)
      }
      setBudgetMap(bMap)

      const aMap = new Map<string, number>()
      for (const le of (ledgerResult.data ?? [])) {
        const acctType = (le.account as unknown as { type: string })?.type
        const isExpense = acctType === 'expense'
        const isIncome = acctType === 'income'
        let net = 0
        if (isExpense) net = (le.debit ?? 0) - (le.credit ?? 0)
        else if (isIncome) net = (le.credit ?? 0) - (le.debit ?? 0)
        else net = (le.debit ?? 0) - (le.credit ?? 0)
        aMap.set(le.account_id, (aMap.get(le.account_id) ?? 0) + net)
      }
      setActualMap(aMap)
      setLoading(false)
    }

    fetchData()
    return () => { cancelled = true }
  }, [companyId, periodId])

  const getBudgetStatus = useCallback(
    (glAccountId: string): BudgetStatus => {
      const budget = budgetMap.get(glAccountId) ?? 0
      const actual = actualMap.get(glAccountId) ?? 0
      return { budget, actual, remaining: budget - actual, loading }
    },
    [budgetMap, actualMap, loading]
  )

  return { getBudgetStatus, budgetLoading: loading }
}
