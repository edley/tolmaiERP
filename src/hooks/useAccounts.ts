import { useState, useEffect, useCallback } from 'react'
import { supabase, isOnline } from '../lib/supabase'
import { buildDemoAccounts } from '../lib/demo'
import type { Account } from '../types'

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)

    if (!isOnline() || !supabase) {
      setAccounts(buildDemoAccounts())
      setIsDemo(true)
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('code', { ascending: true, nullsFirst: false })

    if (error) {
      setError(error.message)
      setAccounts(buildDemoAccounts())
      setIsDemo(true)
    } else if (!data || data.length === 0) {
      setAccounts(buildDemoAccounts())
      setIsDemo(true)
    } else {
      setAccounts(data)
      setIsDemo(false)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const createAccount = async (account: Omit<Account, 'id' | 'created_at' | 'updated_at'>) => {
    if (!supabase) throw new Error('Supabase not configured')
    const { data, error } = await supabase
      .from('accounts')
      .insert(account)
      .select()
      .single()

    if (error) throw new Error(error.message)
    await fetchAccounts()
    return data
  }

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    if (!supabase) throw new Error('Supabase not configured')
    const { error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', id)

    if (error) throw new Error(error.message)
    await fetchAccounts()
  }

  const deleteAccount = async (id: string) => {
    if (!supabase) throw new Error('Supabase not configured')
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    await fetchAccounts()
  }

  return { accounts, loading, error, isDemo, createAccount, updateAccount, deleteAccount, refetch: fetchAccounts }
}
