import { useState, useEffect, useCallback } from 'react'
import { supabase, isOnline } from '../lib/supabase'
import { buildDemoTransactionTypes } from '../lib/demo'
import { useCompany } from '../contexts/CompanyContext'
import type { TransactionType } from '../types'

export function useTransactionTypes() {
  const { currentCompany } = useCompany()
  const [types, setTypes] = useState<TransactionType[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTypes = useCallback(async () => {
    const companyId = currentCompany?.id
    if (!companyId || !isOnline() || !supabase) {
      setTypes(buildDemoTransactionTypes())
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('transaction_types')
      .select('*')
      .eq('company_id', companyId)
      .order('code')

    if (error || !data || data.length === 0) {
      setTypes(buildDemoTransactionTypes())
    } else {
      setTypes(data)
    }
    setLoading(false)
  }, [currentCompany?.id])

  useEffect(() => {
    fetchTypes()
  }, [fetchTypes])

  return { types, loading, refetch: fetchTypes }
}
