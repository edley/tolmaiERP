import type { Account } from '../types'

export interface AllocationTypeDef {
  id: string
  gl_account_id: string | null
  gl_code: string
  name: string
  description: string | null
  active: boolean
  created_at: string
  updated_at: string
  gl_account?: Account
}

const BASE_KEY = 'allocation_types'

function uid(): string {
  return crypto.randomUUID()
}

function buildDemoTypes(accounts: Account[]): AllocationTypeDef[] {
  const acc = (code: string) => accounts.find((a) => a.code === code)?.id ?? null

  const types = [
    { gl_account_id: acc('1670'), gl_code: '1670', name: 'Petrol', active: true },
    { gl_account_id: acc('1670'), gl_code: '1670', name: 'Insurance', active: true },
    { gl_account_id: acc('1670'), gl_code: '1670', name: 'Road Tax', active: true },
    { gl_account_id: acc('1670'), gl_code: '1670', name: 'Maintenance', active: true },
    { gl_account_id: acc('6310'), gl_code: '6310', name: 'Base Rent', active: true },
    { gl_account_id: acc('6310'), gl_code: '6310', name: 'Service Charge', active: true },
    { gl_account_id: acc('6310'), gl_code: '6310', name: 'Parking', active: true },
    { gl_account_id: acc('6710'), gl_code: '6710', name: 'Airfare', active: true },
    { gl_account_id: acc('6710'), gl_code: '6710', name: 'Lodging', active: true },
  ]

  return types.map((t) => ({
    ...t,
    description: null,
    id: uid(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))
}

let currentTypes: AllocationTypeDef[] | null = null
let currentTypesCompany: string | null = null

function scopedKey(): string {
  const cid = localStorage.getItem('tolmai_company_id')
  return cid ? `${BASE_KEY}_${cid}` : BASE_KEY
}

function ensureTypesLoaded(accounts: Account[]): AllocationTypeDef[] {
  const cid = localStorage.getItem('tolmai_company_id') ?? null
  if (currentTypes && currentTypesCompany === cid) return currentTypes!
  currentTypesCompany = cid
  const key = scopedKey()
  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      currentTypes = JSON.parse(stored)
      if (currentTypes && currentTypes.length > 0) return currentTypes!
    }
  } catch {}
  // migrate from unscoped key
  try {
    const stored = localStorage.getItem(BASE_KEY)
    if (stored) {
      currentTypes = JSON.parse(stored)
      if (currentTypes && currentTypes.length > 0) {
        localStorage.setItem(key, stored)
        localStorage.removeItem(BASE_KEY)
        return currentTypes!
      }
    }
  } catch {}
  currentTypes = buildDemoTypes(accounts)
  return currentTypes!
}

export function getTypes(accounts: Account[]): AllocationTypeDef[] {
  if (accounts.length === 0) return []
  const types = ensureTypesLoaded(accounts)
  return types.map((t) => ({
    ...t,
    gl_account: t.gl_account_id ? accounts.find((a) => a.id === t.gl_account_id) : undefined,
  }))
}

export function getTypesForGlCode(glCode: string, accounts: Account[]): string[] {
  const types = getTypes(accounts)
  return types.filter((t) => t.gl_code === glCode && t.active).map((t) => t.name)
}

function saveTypes(types: AllocationTypeDef[]) {
  currentTypes = types
  localStorage.setItem(scopedKey(), JSON.stringify(types.map(({ gl_account, ...t }) => t)))
}

export function addType(t: Omit<AllocationTypeDef, 'id' | 'created_at' | 'updated_at' | 'gl_account'>, accounts: Account[]): AllocationTypeDef {
  const types = getTypes(accounts)
  const def: AllocationTypeDef = {
    ...t,
    id: uid(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    gl_account: t.gl_account_id ? accounts.find((a) => a.id === t.gl_account_id) : undefined,
  }
  types.push(def)
  saveTypes(types)
  return def
}

export function updateType(id: string, updates: Partial<AllocationTypeDef>, accounts: Account[]) {
  const types = getTypes(accounts)
  const idx = types.findIndex((t) => t.id === id)
  if (idx === -1) throw new Error('Type not found')
  types[idx] = { ...types[idx], ...updates, updated_at: new Date().toISOString() }
  saveTypes(types)
}

export function deleteType(id: string, accounts: Account[]) {
  const types = getTypes(accounts)
  const filtered = types.filter((t) => t.id !== id)
  if (filtered.length === types.length) return
  saveTypes(filtered)
}
