import { useState, useEffect, useCallback } from 'react'
import { supabase, isOnline } from '../lib/supabase'
import { useCompany } from '../contexts/CompanyContext'
import type { AllocationType, Account } from '../types'

let inMemoryCache: AllocationType[] | null = null
let cacheCompanyId: string | null = null

function uid(): string {
  return crypto.randomUUID()
}

const DEMO_TYPES: Record<string, string[]> = {
  '1210': ['New Receipt', 'Invoice'],
  '1670': ['Petrol', 'Insurance', 'Road Tax', 'Maintenance'],
  '4100': ['Product A', 'Product B', 'Product C'],
  '4200': ['Consulting', 'Training', 'Support'],
  '4300': ['Strategy', 'Implementation', 'Review'],
  '5100': ['Raw Material X', 'Raw Material Y'],
  '5200': ['Regular', 'Overtime'],
  '5300': ['Utilities', 'Rent', 'Maintenance'],
  '6110': ['Base', 'Bonus'],
  '6120': ['Full-time', 'Part-time'],
  '6130': ['Domestic', 'International'],
  '6210': ['Medical', 'Dental', 'Vision'],
  '6230': ['Social Security', 'Medicare'],
  '6310': ['Base Rent', 'Service Charge', 'Parking'],
  '6320': ['Stationery', 'Printer', 'Cleaning'],
  '6330': ['Electricity', 'Water', 'Internet'],
  '6410': ['SaaS', 'Licenses', 'Maintenance'],
  '6430': ['Hosting', 'CDN', 'Storage'],
  '6510': ['Retainer', 'Litigation', 'Contract Review'],
  '6520': ['Audit', 'Tax Filing', 'Bookkeeping'],
  '6540': ['Wire Transfer', 'Merchant Fees', 'Monthly Fee'],
  '6610': ['Google Ads', 'Social Media', 'Print'],
  '6710': ['Airfare', 'Lodging'],
  '6720': ['Hotel', 'Airbnb'],
  '6730': ['Client Meals', 'Team Events'],
  '6820': ['Computers', 'Furniture', 'Vehicles'],
  '6910': ['General Liability', 'Property', 'Workers Comp'],
  '7100': ['Short-term', 'Long-term'],
  '7300': ['Estimated', 'Final'],
}

function makeInMemoryDemo(accounts: Account[]): AllocationType[] {
  const acc = (code: string) => accounts.find((a) => a.code === code)?.id ?? null
  const now = new Date().toISOString()
  const rows: AllocationType[] = []
  for (const [code, names] of Object.entries(DEMO_TYPES)) {
    for (const name of names) {
      const aId = acc(code)
      const acct = aId ? accounts.find((a) => a.id === aId) : undefined
      rows.push({
        id: uid(),
        gl_account_id: aId,
        gl_code: code,
        name,
        description: null,
        active: true,
        company_id: null,
        created_at: now,
        updated_at: now,
        gl_account: acct,
      })
    }
  }
  return rows
}

function buildSupabaseSeed(companyId: string): Array<{ gl_account_id: string | null; gl_code: string; name: string; description: null; active: boolean; company_id: string }> {
  const rows: Array<{ gl_account_id: string | null; gl_code: string; name: string; description: null; active: boolean; company_id: string }> = []
  for (const [code, names] of Object.entries(DEMO_TYPES)) {
    for (const name of names) {
      rows.push({ gl_account_id: null, gl_code: code, name, description: null, active: true, company_id: companyId })
    }
  }
  return rows
}

export function useAllocationTypes() {
  const { currentCompany } = useCompany()
  const [types, setTypes] = useState<AllocationType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTypes = useCallback(async () => {
    setLoading(true)
    setError(null)

    const companyId = currentCompany?.id

    if (!companyId || !supabase || !isOnline()) {
      setTypes([])
      setLoading(false)
      return
    }

    // 1) Try Supabase
    const { data, error: fetchErr } = await supabase
      .from('allocation_types')
      .select('*')
      .eq('company_id', companyId)
      .order('gl_code', { ascending: true })

    if (!fetchErr && data && data.length > 0) {
      inMemoryCache = null
      cacheCompanyId = null
      setTypes(data as AllocationType[])
      setLoading(false)
      return
    }

    // 2) Table empty or errored — seed it
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, code')
      .eq('company_id', companyId)

    if (accounts && accounts.length > 0) {
      const seed = buildSupabaseSeed(companyId).map((r) => ({
        ...r,
        gl_account_id: (accounts as { id: string; code: string | null }[]).find((a) => a.code === r.gl_code)?.id ?? null,
      }))

      const { error: insErr } = await supabase.from('allocation_types').insert(seed)
      if (!insErr) {
        const { data: seeded } = await supabase
          .from('allocation_types')
          .select('*')
          .eq('company_id', companyId)
          .order('gl_code', { ascending: true })
        if (seeded && seeded.length > 0) {
          inMemoryCache = null
          cacheCompanyId = null
          setTypes(seeded as AllocationType[])
          setLoading(false)
          return
        }
      }
    }

    // 3) Seeding failed — use in-memory fallback
    if (cacheCompanyId !== companyId || !inMemoryCache) {
      cacheCompanyId = companyId
      inMemoryCache = makeInMemoryDemo((accounts ?? []) as Account[])
    }
    setTypes(inMemoryCache!)
    setLoading(false)
  }, [currentCompany?.id])

  useEffect(() => {
    fetchTypes()
  }, [fetchTypes])

  const addType = async (type: {
    gl_account_id: string | null
    gl_code: string
    name: string
    description: string | null
    active: boolean
  }) => {
    const companyId = currentCompany?.id
    if (!companyId) throw new Error('No company selected')

    if (supabase && isOnline()) {
      const { error: insErr } = await supabase
        .from('allocation_types')
        .insert({ ...type, company_id: companyId })
      if (!insErr) { await fetchTypes(); return }
    }

    const t: AllocationType = {
      ...type,
      id: uid(),
      company_id: companyId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      gl_account: undefined,
    }
    setTypes((prev) => [...prev, t])
    if (inMemoryCache) inMemoryCache = [...inMemoryCache, t]
  }

  const updateType = async (id: string, updates: Partial<AllocationType>) => {
    const companyId = currentCompany?.id
    if (!companyId) throw new Error('No company selected')

    if (supabase && isOnline()) {
      const { error: updErr } = await supabase
        .from('allocation_types')
        .update(updates)
        .eq('id', id)
        .eq('company_id', companyId)
      if (!updErr) { await fetchTypes(); return }
    }

    setTypes((prev) => prev.map((t) => t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t))
    if (inMemoryCache) {
      inMemoryCache = inMemoryCache.map((t) => t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t)
    }
  }

  const deleteType = async (id: string) => {
    const companyId = currentCompany?.id
    if (!companyId) throw new Error('No company selected')

    if (supabase && isOnline()) {
      const { error: delErr } = await supabase
        .from('allocation_types')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId)
      if (!delErr) { await fetchTypes(); return }
    }

    setTypes((prev) => prev.filter((t) => t.id !== id))
    if (inMemoryCache) {
      inMemoryCache = inMemoryCache.filter((t) => t.id !== id)
    }
  }

  return { types, loading, error, addType, updateType, deleteType, refetch: fetchTypes }
}
