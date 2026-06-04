export interface PaymentLineAllocation {
  allocation_code: string
  expense_type: string | null
  amount: number
  company_id?: string | null
}

export interface PaymentLine {
  id: string
  gl_account_id: string
  amount: number
  company_id?: string | null
  allocations?: PaymentLineAllocation[]
}

export type PaymentStatus = 'draft' | 'submitted' | 'approved' | 'posted' | 'cancelled'

export interface AuditEntry {
  by: string
  by_name: string
  at: string
}

export interface Payment {
  id: string
  voucher_number: string
  period_id: string
  company_id?: string | null
  date: string
  voucher_amount: number
  mode_of_payment_id: string
  paid_to: string
  invoice_no: string
  description: string
  lines: PaymentLine[]
  status: PaymentStatus
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

export function paymentToLedgerEntries(payment: Payment) {
  const modeGl = payment.mode_of_payment_id
  return [
    {
      account_id: modeGl,
      debit: payment.voucher_amount,
      credit: 0,
      description: `Payment via ${payment.mode_of_payment_id}`,
    },
    ...payment.lines.map((l) => ({
      account_id: l.gl_account_id,
      debit: 0,
      credit: l.amount,
      description: l.allocations && l.allocations.length > 0
        ? `${payment.paid_to} (${l.allocations.map((a) => a.expense_type ? `${a.allocation_code}·${a.expense_type}: $${a.amount.toFixed(2)}` : `${a.allocation_code}: $${a.amount.toFixed(2)}`).join(', ')})`
        : payment.paid_to,
    })),
  ]
}

const BASE_KEY = 'payments'

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

export function generatePaymentNumber(sequence: number): string {
  const year = new Date().getFullYear()
  return `PMT-${year}-${String(sequence).padStart(4, '0')}`
}

export function getPayments(): Payment[] {
  migrateFromUnscoped()
  try {
    const raw = localStorage.getItem(scopedKey())
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function savePayment(payment: Payment) {
  const list = getPayments()
  const idx = list.findIndex((p) => p.id === payment.id)
  if (idx >= 0) {
    list[idx] = payment
  } else {
    list.unshift(payment)
  }
  localStorage.setItem(scopedKey(), JSON.stringify(list))
}

export function deletePaymentById(id: string) {
  const list = getPayments().filter((p) => p.id !== id)
  localStorage.setItem(scopedKey(), JSON.stringify(list))
}
