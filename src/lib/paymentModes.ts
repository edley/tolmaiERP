export interface PaymentMode {
  id: string
  name: string
  gl_account_id: string | null
}

const STORAGE_KEY = 'payment_modes'
const LEGACY_MAP: Record<string, { id: string; name: string }> = {
  bank: { id: '11111111-1111-4111-8111-111111111111', name: 'Bank' },
  cash: { id: '22222222-2222-4222-8222-222222222222', name: 'Cash' },
}

const DEFAULT_MODES: PaymentMode[] = [
  { id: LEGACY_MAP.bank.id, name: 'Bank', gl_account_id: null },
  { id: LEGACY_MAP.cash.id, name: 'Cash', gl_account_id: null },
]

function loadModes(): PaymentMode[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveModes(modes: PaymentMode[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(modes))
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

export function savePaymentMode(id: string, updates: Partial<PaymentMode>) {
  const modes = getPaymentModes()
  const idx = modes.findIndex((m) => m.id === id)
  if (idx >= 0) {
    modes[idx] = { ...modes[idx], ...updates }
  } else {
    modes.push({ id, name: id, gl_account_id: null, ...updates })
  }
  saveModes(modes)
}
