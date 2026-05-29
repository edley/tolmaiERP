export interface CashAccountConfig {
  account_id: string
  receipt_contra_account_id: string | null
  payment_contra_account_id: string | null
}

const STORAGE_KEY = 'cash_account_configs'

let cachedConfigs: CashAccountConfig[] | null = null

export function getCashAccountConfigs(): CashAccountConfig[] {
  if (cachedConfigs) return cachedConfigs
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      cachedConfigs = JSON.parse(stored)
      return cachedConfigs!
    }
  } catch { /* ignore */ }
  cachedConfigs = []
  return cachedConfigs!
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
  cachedConfigs = configs
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs))
}

export function migrateOldConfigs() {
  const configs = getCashAccountConfigs()
  let changed = false
  for (const c of configs) {
    const old = (c as unknown as Record<string, unknown>).contra_account_id as string | undefined
    if (old !== undefined) {
      if (!c.receipt_contra_account_id) c.receipt_contra_account_id = old
      if (!c.payment_contra_account_id) c.payment_contra_account_id = old
      delete (c as unknown as Record<string, unknown>).contra_account_id
      changed = true
    }
  }
  if (changed) {
    cachedConfigs = configs
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs))
  }
}
