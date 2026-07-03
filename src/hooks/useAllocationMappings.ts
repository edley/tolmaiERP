import { useState, useEffect, useCallback } from 'react'
import { supabase, isOnline } from '../lib/supabase'
import { useCompany } from '../contexts/CompanyContext'
import type { AllocationMapping, Account } from '../types'

let inMemoryCache: AllocationMapping[] | null = null
let cacheCompanyId: string | null = null

function uid(): string {
  return crypto.randomUUID()
}

function makeInMemoryDemo(accounts: Account[]): AllocationMapping[] {
  const acc = (code: string) => accounts.find((a) => a.code === code)?.id ?? null
  const now = new Date().toISOString()
  const rows: Array<{ gl_account_id: string | null; gl_code: string; allocation_code: string; active: boolean }> = [
    { gl_account_id: acc('6310'), gl_code: '6310', allocation_code: 'ADMIN',  active: true },
    { gl_account_id: acc('6310'), gl_code: '6310', allocation_code: 'SALES',  active: true },
    { gl_account_id: acc('6310'), gl_code: '6310', allocation_code: 'IT',     active: true },
    { gl_account_id: acc('6320'), gl_code: '6320', allocation_code: 'ADMIN',  active: true },
    { gl_account_id: acc('6320'), gl_code: '6320', allocation_code: 'SALES',  active: true },
    { gl_account_id: acc('6330'), gl_code: '6330', allocation_code: 'ADMIN',  active: true },
    { gl_account_id: acc('6330'), gl_code: '6330', allocation_code: 'PROD',   active: true },
    { gl_account_id: acc('6610'), gl_code: '6610', allocation_code: 'SALES',  active: true },
    { gl_account_id: acc('6610'), gl_code: '6610', allocation_code: 'MARKET', active: false },
    { gl_account_id: acc('6110'), gl_code: '6110', allocation_code: 'ADMIN',  active: true },
    { gl_account_id: acc('6110'), gl_code: '6110', allocation_code: 'SALES',  active: true },
    { gl_account_id: acc('6410'), gl_code: '6410', allocation_code: 'IT',     active: true },
    { gl_account_id: acc('6410'), gl_code: '6410', allocation_code: 'ADMIN',  active: true },
    { gl_account_id: acc('6710'), gl_code: '6710', allocation_code: 'SALES',  active: true },
    { gl_account_id: acc('6710'), gl_code: '6710', allocation_code: 'ADMIN',  active: true },
    { gl_account_id: acc('1210'), gl_code: '1210', allocation_code: 'ADMIN',  active: true },
    { gl_account_id: acc('1210'), gl_code: '1210', allocation_code: 'SALES',  active: true },
    { gl_account_id: acc('1670'), gl_code: '1670', allocation_code: 'ADMIN',  active: true },
    { gl_account_id: acc('1670'), gl_code: '1670', allocation_code: 'SALES',  active: true },
    { gl_account_id: acc('4100'), gl_code: '4100', allocation_code: 'ADMIN',  active: true },
    { gl_account_id: acc('4100'), gl_code: '4100', allocation_code: 'SALES',  active: true },
    { gl_account_id: acc('4200'), gl_code: '4200', allocation_code: 'ADMIN',  active: true },
    { gl_account_id: acc('4200'), gl_code: '4200', allocation_code: 'SALES',  active: true },
    { gl_account_id: acc('4300'), gl_code: '4300', allocation_code: 'ADMIN',  active: true },
    { gl_account_id: acc('4300'), gl_code: '4300', allocation_code: 'SALES',  active: true },
    { gl_account_id: acc('5100'), gl_code: '5100', allocation_code: 'PROD',   active: true },
    { gl_account_id: acc('5200'), gl_code: '5200', allocation_code: 'PROD',   active: true },
    { gl_account_id: acc('5300'), gl_code: '5300', allocation_code: 'PROD',   active: true },
    { gl_account_id: acc('6120'), gl_code: '6120', allocation_code: 'ADMIN',  active: true },
    { gl_account_id: acc('6130'), gl_code: '6130', allocation_code: 'SALES',  active: true },
    { gl_account_id: acc('6210'), gl_code: '6210', allocation_code: 'ADMIN',  active: true },
    { gl_account_id: acc('6230'), gl_code: '6230', allocation_code: 'ADMIN',  active: true },
    { gl_account_id: acc('6430'), gl_code: '6430', allocation_code: 'IT',     active: true },
    { gl_account_id: acc('6510'), gl_code: '6510', allocation_code: 'ADMIN',  active: true },
    { gl_account_id: acc('6520'), gl_code: '6520', allocation_code: 'ADMIN',  active: true },
    { gl_account_id: acc('6540'), gl_code: '6540', allocation_code: 'ADMIN',  active: true },
    { gl_account_id: acc('6720'), gl_code: '6720', allocation_code: 'SALES',  active: true },
    { gl_account_id: acc('6730'), gl_code: '6730', allocation_code: 'SALES',  active: true },
    { gl_account_id: acc('6820'), gl_code: '6820', allocation_code: 'ADMIN',  active: true },
    { gl_account_id: acc('6910'), gl_code: '6910', allocation_code: 'ADMIN',  active: true },
    { gl_account_id: acc('7100'), gl_code: '7100', allocation_code: 'ADMIN',  active: true },
    { gl_account_id: acc('7300'), gl_code: '7300', allocation_code: 'ADMIN',  active: true },
  ]
  return rows.map((r) => {
    const acct = r.gl_account_id ? accounts.find((a) => a.id === r.gl_account_id) : undefined
    return { ...r, id: uid(), description: null, company_id: null, created_at: now, updated_at: now, gl_account: acct }
  })
}

function buildSupabaseSeed(): Array<{ gl_account_id: string | null; gl_code: string; allocation_code: string; description: null; active: boolean; company_id: string }> {
  const codes = ['6310', '6320', '6330', '6610', '6110', '6410', '6710', '1210', '1670', '4100', '4200', '4300', '5100', '5200', '5300', '6120', '6130', '6210', '6230', '6430', '6510', '6520', '6540', '6720', '6730', '6820', '6910', '7100', '7300']
  const allocs: Record<string, string[]> = {
    '6310': ['ADMIN', 'SALES', 'IT'],
    '6320': ['ADMIN', 'SALES'],
    '6330': ['ADMIN', 'PROD'],
    '6610': ['SALES', 'MARKET'],
    '6110': ['ADMIN', 'SALES'],
    '6410': ['IT', 'ADMIN'],
    '6710': ['SALES', 'ADMIN'],
    '1210': ['ADMIN', 'SALES'],
    '1670': ['ADMIN', 'SALES'],
    '4100': ['ADMIN', 'SALES'],
    '4200': ['ADMIN', 'SALES'],
    '4300': ['ADMIN', 'SALES'],
    '5100': ['PROD'],
    '5200': ['PROD'],
    '5300': ['PROD'],
    '6120': ['ADMIN'],
    '6130': ['SALES'],
    '6210': ['ADMIN'],
    '6230': ['ADMIN'],
    '6430': ['IT'],
    '6510': ['ADMIN'],
    '6520': ['ADMIN'],
    '6540': ['ADMIN'],
    '6720': ['SALES'],
    '6730': ['SALES'],
    '6820': ['ADMIN'],
    '6910': ['ADMIN'],
    '7100': ['ADMIN'],
    '7300': ['ADMIN'],
  }
  const rows: Array<{ gl_account_id: string | null; gl_code: string; allocation_code: string; description: null; active: boolean; company_id: string }> = []
  for (const code of codes) {
    for (const alloc of (allocs[code] ?? [])) {
      rows.push({ gl_account_id: null, gl_code: code, allocation_code: alloc, description: null, active: true, company_id: '' })
    }
  }
  return rows
}

export function useAllocationMappings() {
  const { currentCompany } = useCompany()
  const [mappings, setMappings] = useState<AllocationMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMappings = useCallback(async () => {
    setLoading(true)
    setError(null)

    const companyId = currentCompany?.id

    if (!companyId || !supabase || !isOnline()) {
      setMappings([])
      setLoading(false)
      return
    }

    // 1) Try Supabase
    const { data, error: fetchErr } = await supabase
      .from('allocation_mappings')
      .select('*')
      .eq('company_id', companyId)
      .order('gl_code', { ascending: true })

    if (!fetchErr && data && data.length > 0) {
      inMemoryCache = null
      cacheCompanyId = null
      setMappings(data as AllocationMapping[])
      setLoading(false)
      return
    }

    // 2) Table empty or errored — seed it
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, code')
      .eq('company_id', companyId)

    if (accounts && accounts.length > 0) {
      const seed = buildSupabaseSeed().map((r) => ({
        ...r,
        company_id: companyId,
        gl_account_id: (accounts as { id: string; code: string | null }[]).find((a) => a.code === r.gl_code)?.id ?? null,
      }))

      const { error: insErr } = await supabase.from('allocation_mappings').insert(seed)
      if (!insErr) {
        const { data: seeded } = await supabase
          .from('allocation_mappings')
          .select('*')
          .eq('company_id', companyId)
          .order('gl_code', { ascending: true })
        if (seeded && seeded.length > 0) {
          inMemoryCache = null
          cacheCompanyId = null
          setMappings(seeded as AllocationMapping[])
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
    setMappings(inMemoryCache!)
    setLoading(false)
  }, [currentCompany?.id])

  useEffect(() => {
    fetchMappings()
  }, [fetchMappings])

  const resolveAccounts = useCallback(async (mappings: AllocationMapping[]): Promise<AllocationMapping[]> => {
    const companyId = currentCompany?.id
    if (!companyId || !supabase) return mappings
    const { data: accounts } = await supabase.from('accounts').select('id, code, name').eq('company_id', companyId)
    if (!accounts) return mappings
    return mappings.map((m) => ({
      ...m,
      gl_account: m.gl_account_id ? (accounts as Account[]).find((a) => a.id === m.gl_account_id) : undefined,
    }))
  }, [currentCompany?.id])

  const addMapping = async (mapping: {
    gl_account_id: string | null
    gl_code: string
    allocation_code: string
    description: string | null
    active: boolean
  }) => {
    const companyId = currentCompany?.id
    if (!companyId) throw new Error('No company selected')

    if (supabase && isOnline()) {
      const { error: insErr } = await supabase
        .from('allocation_mappings')
        .insert({ ...mapping, company_id: companyId })
      if (!insErr) { await fetchMappings(); return }
    }

    const m: AllocationMapping = {
      ...mapping,
      id: uid(),
      company_id: companyId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      gl_account: undefined,
    }
    setMappings((prev) => [...prev, m])
    if (inMemoryCache) inMemoryCache = [...inMemoryCache, m]
  }

  const updateMapping = async (id: string, updates: Partial<AllocationMapping>) => {
    const companyId = currentCompany?.id
    if (!companyId) throw new Error('No company selected')

    if (supabase && isOnline()) {
      const { error: updErr } = await supabase
        .from('allocation_mappings')
        .update(updates)
        .eq('id', id)
        .eq('company_id', companyId)
      if (!updErr) { await fetchMappings(); return }
    }

    setMappings((prev) => prev.map((m) => m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m))
    if (inMemoryCache) {
      inMemoryCache = inMemoryCache.map((m) => m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m)
    }
  }

  const deleteMapping = async (id: string) => {
    const companyId = currentCompany?.id
    if (!companyId) throw new Error('No company selected')

    if (supabase && isOnline()) {
      const { error: delErr } = await supabase
        .from('allocation_mappings')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId)
      if (!delErr) { await fetchMappings(); return }
    }

    setMappings((prev) => prev.filter((m) => m.id !== id))
    if (inMemoryCache) {
      inMemoryCache = inMemoryCache.filter((m) => m.id !== id)
    }
  }

  return { mappings, loading, error, addMapping, updateMapping, deleteMapping, refetch: fetchMappings, resolveAccounts }
}
