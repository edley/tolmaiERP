export interface CashAccountConfig {
  account_id: string
  receipt_contra_account_id: string | null
  payment_contra_account_id: string | null
}

const BASE_KEY = 'cash_account_configs'

function scopedKey(): string {
  const cid = localStorage.getItem('tolmai_company_id')
  return cid ? `${BASE_KEY}_${cid}` : BASE_KEY
}

const caches = new Map<string, CashAccountConfig[] | null>()

export function getCashAccountConfigs(): CashAccountConfig[] {
  const key = scopedKey()
  if (caches.has(key)) return caches.get(key) ?? []
  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      const configs: CashAccountConfig[] = JSON.parse(stored)
      caches.set(key, configs)
      return configs
    }
  } catch { /* ignore */ }
  caches.set(key, [])
  return []
}

export function saveCashAccountConfig(
  account_id: string,
  field: 'receipt' | 'payment',
  contra_account_id: string | null
) {
  const configs = getCashAccountConfigs()
  const idx = configs.findIndex((c) => c.account_id === account_id)
  if (idx === -1) {
    configs.push({
      account_id,
      receipt_contra_account_id: field === 'receipt' ? contra_account_id : null,
      payment_contra_account_id: field === 'payment' ? contra_account_id : null,
    })
  } else {
    if (field === 'receipt') {
      configs[idx].receipt_contra_account_id = contra_account_id
    } else {
      configs[idx].payment_contra_account_id = contra_account_id
    }
  }
  const key = scopedKey()
  caches.set(key, configs)
  localStorage.setItem(key, JSON.stringify(configs))
}

export function migrateOldConfigs() {
  const oldKey = BASE_KEY
  const raw = localStorage.getItem(oldKey)
  if (!raw) return
  try {
    const oldConfigs: CashAccountConfig[] = JSON.parse(raw)
    const key = scopedKey()
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, raw)
      caches.set(key, oldConfigs)
    }
  } catch { /* ignore */ }
}
