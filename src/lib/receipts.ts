export interface ReceiptLineAllocation {
  allocation_code: string
  expense_type: string | null
  amount: number
  company_id?: string | null
}

export interface ReceiptLine {
  id: string
  gl_account_id: string
  amount: number
  company_id?: string | null
  allocations?: ReceiptLineAllocation[]
}

export type ReceiptStatus = 'draft' | 'submitted' | 'approved' | 'posted' | 'cancelled'

export interface Receipt {
  id: string
  voucher_number: string
  period_id: string
  company_id?: string | null
  date: string
  voucher_amount: number
  mode_of_payment_id: string
  received_from: string
  invoice_no: string
  description: string
  lines: ReceiptLine[]
  status: ReceiptStatus
  created_at: string
  created_by: string | null
  created_by_name: string | null
  submitted_by: string | null
  submitted_by_name: string | null
  submitted_at: string | null
  approved_by: string | null
  approved_by_name: string | null
  approved_at: string | null
  posted_by: string | null
  posted_by_name: string | null
  posted_at: string | null
}

const BASE_KEY = 'receipts'

function scopedKey(): string {
  const cid = localStorage.getItem('tolmai_company_id')
  return cid ? `${BASE_KEY}_${cid}` : BASE_KEY
}

function migrateFromUnscoped(): boolean {
  const oldKey = BASE_KEY
  const raw = localStorage.getItem(oldKey)
  if (!raw) return false
  const key = scopedKey()
  if (localStorage.getItem(key)) return true
  localStorage.setItem(key, raw)
  localStorage.removeItem(oldKey)
  return true
}

export function generateReceiptNumber(sequence: number): string {
  const year = new Date().getFullYear()
  return `RCT-${year}-${String(sequence).padStart(4, '0')}`
}

export function getReceipts(): Receipt[] {
  migrateFromUnscoped()
  try {
    const raw = localStorage.getItem(scopedKey())
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function saveReceipt(receipt: Receipt) {
  const list = getReceipts()
  const idx = list.findIndex((p) => p.id === receipt.id)
  if (idx >= 0) {
    list[idx] = receipt
  } else {
    list.unshift(receipt)
  }
  localStorage.setItem(scopedKey(), JSON.stringify(list))
}

export function deleteReceiptById(id: string) {
  const list = getReceipts().filter((p) => p.id !== id)
  localStorage.setItem(scopedKey(), JSON.stringify(list))
}
