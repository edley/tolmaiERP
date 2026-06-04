import { useState, useEffect, useCallback } from 'react'
import { supabase, isOnline } from '../lib/supabase'
import { buildDemoAccounts } from '../lib/demo'
import { useCompany } from '../contexts/CompanyContext'
import { useViewFilter } from '../contexts/ViewFilterContext'
import type { Account } from '../types'

function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

const syncedCompanies = new Set<string>()

export function useAccounts() {
  const { currentCompany } = useCompany()
  const viewFilter = useViewFilter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    const companyId = currentCompany?.id

    if (!companyId || !isOnline() || !supabase) {
      setAccounts(buildDemoAccounts())
      setIsDemo(true)
      setLoading(false)
      return
    }

    let query = supabase
      .from('accounts')
      .select('*')
      .eq('company_id', companyId)
      .order('code', { ascending: true, nullsFirst: false })

    if (viewFilter === 'recent') {
      query = query.limit(20)
    } else if (viewFilter === '10days') {
      query = query.gte('created_at', daysAgo(10))
    }

    const { data, error } = await query

    if (error) {
      setError(error.message)
      setAccounts(buildDemoAccounts())
      setIsDemo(true)
      setLoading(false)
      return
    }

    if (!data || data.length === 0) {
      if (!syncedCompanies.has(companyId)) {
        syncedCompanies.add(companyId)
        const demo = buildDemoAccounts()
        const { data: inserted, error: insErr } = await supabase
          .from('accounts')
          .insert(
            demo.map((a) => ({
              name: a.name,
              code: a.code,
              type: a.type,
              parent_id: null,
              is_group: a.is_group,
              is_cash_account: a.is_cash_account,
              allocation_allow: a.allocation_allow,
              description: a.description,
              company_id: companyId,
            }))
          )
          .select()

        if (!insErr && inserted) {
          const codeToId = new Map(inserted.filter((a) => a.code).map((a) => [a.code, a.id]))
          const groupChildren: Record<string, string[]> = {
            '1000': ['1100','1200','1300','1400'],
            '1100': ['1110','1120','1130','1140','1150'],
            '1200': ['1210','1220','1230'],
            '1300': ['1310','1320','1330','1340'],
            '1400': ['1410','1420'],
            '1600': ['1640','1650'],
            '2000': ['2100','2200','2300','2400','2500'],
            '2100': ['2110','2120'],
            '2200': ['2210','2230'],
            '2300': ['2310','2320'],
            '2400': ['2410','2420'],
            '2500': ['2510'],
            '3000': ['3100','3300','3400'],
            '4000': ['4100','4200','4300','4900'],
            '4900': ['4910'],
            '5000': ['5100','5200','5300'],
            '6000': ['6100','6200','6300','6400','6500','6600','6700','6800','6900','7000'],
            '6100': ['6110','6120','6130'],
            '6200': ['6210','6230'],
            '6300': ['6310','6320','6330'],
            '6400': ['6410','6430'],
            '6500': ['6510','6520','6540'],
            '6600': ['6610'],
            '6700': ['6710','6720','6730'],
            '6800': ['6820'],
            '6900': ['6910'],
            '7000': ['7100','7300'],
          }
          for (const [parentCode, childCodes] of Object.entries(groupChildren)) {
            const pid = codeToId.get(parentCode)
            if (pid) {
              for (const cc of childCodes) {
                const cid = codeToId.get(cc)
                if (cid) await supabase.from('accounts').update({ parent_id: pid }).eq('id', cid)
              }
            }
          }
        }
      }
      let refreshQuery = supabase
        .from('accounts')
        .select('*')
        .eq('company_id', companyId)
        .order('code', { ascending: true, nullsFirst: false })

      if (viewFilter === 'recent') {
        refreshQuery = refreshQuery.limit(20)
      } else if (viewFilter === '10days') {
        refreshQuery = refreshQuery.gte('created_at', daysAgo(10))
      }

      const { data: refreshed } = await refreshQuery
      if (refreshed && refreshed.length > 0) {
        setAccounts(refreshed)
        setIsDemo(false)
      } else {
        setAccounts(buildDemoAccounts())
        setIsDemo(true)
      }
    } else {
      setAccounts(data)
      setIsDemo(false)
    }
    setLoading(false)
  }, [currentCompany?.id, viewFilter])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const createAccount = async (account: Omit<Account, 'id' | 'created_at' | 'updated_at'>) => {
    if (!supabase) throw new Error('Supabase not configured')
    const companyId = currentCompany?.id
    if (!companyId) throw new Error('No company selected')
    const { data, error } = await supabase
      .from('accounts')
      .insert({ ...account, company_id: companyId })
      .select()
      .single()

    if (error) throw new Error(error.message)
    await fetchAccounts()
    return data
  }

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    if (!supabase) throw new Error('Supabase not configured')
    const companyId = currentCompany?.id
    if (!companyId) throw new Error('No company selected')
    const { error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', id)
      .eq('company_id', companyId)

    if (error) throw new Error(error.message)
    await fetchAccounts()
  }

  const deleteAccount = async (id: string) => {
    if (!supabase) throw new Error('Supabase not configured')
    const companyId = currentCompany?.id
    if (!companyId) throw new Error('No company selected')
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId)

    if (error) throw new Error(error.message)
    await fetchAccounts()
  }

  return { accounts, loading, error, isDemo, createAccount, updateAccount, deleteAccount, refetch: fetchAccounts }
}
