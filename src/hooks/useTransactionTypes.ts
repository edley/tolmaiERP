import { useState, useEffect, useCallback } from 'react'
import { supabase, isOnline } from '../lib/supabase'
import { buildDemoTransactionTypes } from '../lib/demo'
import type { TransactionType } from '../types'

export function useTransactionTypes() {
  const [types, setTypes] = useState<TransactionType[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTypes = useCallback(async () => {
    if (!isOnline() || !supabase) {
      setTypes(buildDemoTransactionTypes())
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('transaction_types')
      .select('*')
      .order('code')

    if (error || !data || data.length === 0) {
      setTypes(buildDemoTransactionTypes())
    } else {
      setTypes(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTypes()
  }, [fetchTypes])

  return { types, loading, refetch: fetchTypes }
}
