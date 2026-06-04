import { supabase, isOnline } from './supabase'

export interface PaymentMode {
  id: string
  name: string
  gl_account_id: string | null
  bank_account_no: string
  address: string
  location: string
  account_type: string
  company_id: string
}

const BASE_KEY = 'payment_modes'
const LEGACY_MAP: Record<string, { id: string; name: string }> = {
  bank: { id: '11111111-1111-4111-8111-111111111111', name: 'Bank' },
  cash: { id: '22222222-2222-4222-8222-222222222222', name: 'Cash' },
}

const DEFAULT_MODES: PaymentMode[] = [
  { id: LEGACY_MAP.bank.id, name: 'Bank', gl_account_id: null, bank_account_no: '', address: '', location: '', account_type: '', company_id: '' },
  { id: LEGACY_MAP.cash.id, name: 'Cash', gl_account_id: null, bank_account_no: '', address: '', location: '', account_type: '', company_id: '' },
]

function currentCompanyId(): string {
  return localStorage.getItem('tolmai_company_id') ?? ''
}

function scopedKey(): string {
  const cid = currentCompanyId()
  return cid ? `${BASE_KEY}_${cid}` : BASE_KEY
}

function loadModes(): PaymentMode[] {
  const key = scopedKey()
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  // migrate from unscoped key
  try {
    const raw = localStorage.getItem(BASE_KEY)
    if (raw) {
      const modes: PaymentMode[] = JSON.parse(raw)
      localStorage.setItem(key, raw)
      localStorage.removeItem(BASE_KEY)
      return modes
    }
  } catch { /* ignore */ }
  return []
}

function saveModes(modes: PaymentMode[]) {
  localStorage.setItem(scopedKey(), JSON.stringify(modes))
}

export function getPaymentModes(): PaymentMode[] {
  let stored = loadModes()
  let migrated = false
  stored = stored.map((m) => {
    const legacy = LEGACY_MAP[m.id]
    if (legacy) {
      migrated = true
      return { ...m, id: legacy.id }
    }
    return m
  })
  if (migrated) saveModes(stored)
  if (stored.length === 0) {
    saveModes(DEFAULT_MODES)
    return [...DEFAULT_MODES]
  }
  return stored
}

export async function savePaymentMode(id: string, updates: Partial<PaymentMode>) {
  const modes = getPaymentModes()
  const cid = currentCompanyId()
  const idx = modes.findIndex((m) => m.id === id)
  if (idx >= 0) {
    modes[idx] = { ...modes[idx], ...updates }
  } else {
    modes.push({ id, name: id, gl_account_id: null, bank_account_no: '', address: '', location: '', account_type: '', company_id: cid, ...updates })
  }
  saveModes(modes)

  if (isOnline() && supabase) {
    const mode = modes[idx >= 0 ? idx : modes.length - 1]
    await supabase.from('payment_modes').upsert({
      id: mode.id,
      name: mode.name,
      gl_account_id: mode.gl_account_id,
      bank_account_no: mode.bank_account_no || null,
      address: mode.address || null,
      location: mode.location || null,
      account_type: mode.account_type || null,
      company_id: cid || null,
    }).select()
  }
}

export function deletePaymentMode(id: string) {
  const modes = getPaymentModes().filter((m) => m.id !== id)
  saveModes(modes)
}
