import type { Account, AllocationMapping } from '../types'

function uid(): string {
  return crypto.randomUUID()
}

function buildDemoMappings(accounts: Account[]): AllocationMapping[] {
  const acc = (code: string) => accounts.find((a) => a.code === code)?.id ?? null

  const mappings = [
    { gl_account_id: acc('6310'), gl_code: '6310', allocation_code: 'ADMIN',   description: 'Admin office rent portion', active: true },
    { gl_account_id: acc('6310'), gl_code: '6310', allocation_code: 'SALES',   description: 'Sales office rent portion',  active: true },
    { gl_account_id: acc('6310'), gl_code: '6310', allocation_code: 'IT',      description: 'IT dept rent portion',       active: true },
    { gl_account_id: acc('6320'), gl_code: '6320', allocation_code: 'ADMIN',   description: 'Admin supplies',             active: true },
    { gl_account_id: acc('6320'), gl_code: '6320', allocation_code: 'SALES',   description: 'Sales supplies',             active: true },
    { gl_account_id: acc('6330'), gl_code: '6330', allocation_code: 'ADMIN',   description: 'Admin utilities portion',    active: true },
    { gl_account_id: acc('6330'), gl_code: '6330', allocation_code: 'PROD',    description: 'Production utilities',       active: true },
    { gl_account_id: acc('6610'), gl_code: '6610', allocation_code: 'SALES',   description: 'Online ads for sales',       active: true },
    { gl_account_id: acc('6610'), gl_code: '6610', allocation_code: 'MARKET',  description: 'Brand marketing campaigns',  active: false },
    { gl_account_id: acc('6110'), gl_code: '6110', allocation_code: 'ADMIN',   description: 'Exec compensation',          active: true },
    { gl_account_id: acc('6110'), gl_code: '6110', allocation_code: 'SALES',   description: 'Sales management',           active: true },
    { gl_account_id: acc('6410'), gl_code: '6410', allocation_code: 'IT',      description: 'SaaS licenses',              active: true },
    { gl_account_id: acc('6410'), gl_code: '6410', allocation_code: 'ADMIN',   description: 'Admin software',             active: true },
    { gl_account_id: acc('6710'), gl_code: '6710', allocation_code: 'SALES',   description: 'Sales travel',               active: true },
    { gl_account_id: acc('6710'), gl_code: '6710', allocation_code: 'ADMIN',   description: 'Exec travel',                active: true },
  ]

  return mappings.map((m) => ({
    ...m,
    id: uid(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))
}

let currentMappings: AllocationMapping[] | null = null

export function getMappings(accounts: Account[]): AllocationMapping[] {
  if (accounts.length === 0) return []

  if (currentMappings) {
    return currentMappings.map((m) => ({
      ...m,
      gl_account: m.gl_account_id ? accounts.find((a) => a.id === m.gl_account_id) : undefined,
    }))
  }
  try {
    const stored = localStorage.getItem('allocation_mappings')
    if (stored) {
      currentMappings = JSON.parse(stored)
      if (currentMappings && currentMappings.length > 0) {
        return currentMappings.map((m) => ({
          ...m,
          gl_account: m.gl_account_id ? accounts.find((a) => a.id === m.gl_account_id) : undefined,
        }))
      }
    }
  } catch { /* ignore */ }
  currentMappings = buildDemoMappings(accounts)
  const result = currentMappings.map((m) => ({
    ...m,
    gl_account: m.gl_account_id ? accounts.find((a) => a.id === m.gl_account_id) : undefined,
  }))
  return result
}

export function saveMappings(mappings: AllocationMapping[]) {
  currentMappings = mappings
  localStorage.setItem('allocation_mappings', JSON.stringify(mappings.map(({ gl_account, ...m }) => m)))
}

export function addMapping(mapping: Omit<AllocationMapping, 'id' | 'created_at' | 'updated_at' | 'gl_account'>, accounts: Account[]): AllocationMapping {
  const mappings = getMappings(accounts)
  const m: AllocationMapping = {
    ...mapping,
    id: uid(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    gl_account: mapping.gl_account_id ? accounts.find((a) => a.id === mapping.gl_account_id) : undefined,
  }
  mappings.push(m)
  saveMappings(mappings)
  return m
}

export function updateMapping(id: string, updates: Partial<AllocationMapping>, accounts: Account[]) {
  const mappings = getMappings(accounts)
  const idx = mappings.findIndex((m) => m.id === id)
  if (idx === -1) throw new Error('Mapping not found')
  mappings[idx] = { ...mappings[idx], ...updates, updated_at: new Date().toISOString() }
  saveMappings(mappings)
}

export function deleteMapping(id: string, accounts: Account[]) {
  const mappings = getMappings(accounts)
  const filtered = mappings.filter((m) => m.id !== id)
  if (filtered.length === mappings.length) return
  saveMappings(filtered)
}
