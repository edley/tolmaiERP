export interface ReceiptLineAllocation {
  allocation_code: string
  expense_type: string | null
  amount: number
}

export interface ReceiptLine {
  id: string
  gl_account_id: string
  amount: number
  allocations?: ReceiptLineAllocation[]
}

export type ReceiptStatus = 'draft' | 'submitted' | 'approved' | 'posted' | 'cancelled'

export interface Receipt {
  id: string
  voucher_number: string
  period_id: string
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

const STORAGE_KEY = 'receipts'

export function generateReceiptNumber(sequence: number): string {
  const year = new Date().getFullYear()
  return `RCT-${year}-${String(sequence).padStart(4, '0')}`
}

export function getReceipts(): Receipt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function deleteReceiptById(id: string) {
  const list = getReceipts().filter((p) => p.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}
