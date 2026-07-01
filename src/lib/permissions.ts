import type { UserType } from './rbac'

export type DocType = 'journal_entry' | 'account' | 'ledger_entry' | 'company' | 'transaction_type' | 'accounting_period' | 'payment' | 'receipt' | 'trial_balance' | 'allocation_mapping' | 'allocation_type' | 'bank_report' | 'payment_mode' | 'budget'

export type CrudOp = 'create' | 'read' | 'update' | 'delete'

export const DOC_TYPES: DocType[] = ['journal_entry', 'account', 'ledger_entry', 'company', 'transaction_type', 'accounting_period', 'payment', 'receipt', 'trial_balance', 'allocation_mapping', 'allocation_type', 'bank_report', 'payment_mode', 'budget']

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  journal_entry: 'Journal Entry',
  account: 'Account',
  ledger_entry: 'Ledger Entry',
  company: 'Company',
  transaction_type: 'Transaction Type',
  accounting_period: 'Accounting Period',
  payment: 'Payment',
  receipt: 'Receipt',
  trial_balance: 'Trial Balance',
  allocation_mapping: 'Allocation Mapping',
  allocation_type: 'Allocation Type',
  bank_report: 'Bank Report',
  payment_mode: 'Payment Mode',
  budget: 'Budget',
}

export const DEFAULT_CRUD: Record<UserType, Record<DocType, Record<CrudOp, boolean>>> = {
  Superuser: initCrudFull({
    journal_entry: { create: true, read: true, update: true, delete: true },
    account: { create: true, read: true, update: true, delete: true },
    ledger_entry: { create: false, read: true, update: false, delete: false },
    company: { create: true, read: true, update: true, delete: true },
    transaction_type: { create: true, read: true, update: true, delete: true },
    accounting_period: { create: true, read: true, update: true, delete: true },
    payment: { create: true, read: true, update: true, delete: true },
    receipt: { create: false, read: true, update: false, delete: false },
    trial_balance: { create: false, read: true, update: false, delete: false },
    allocation_mapping: { create: true, read: true, update: true, delete: true },
    allocation_type: { create: true, read: true, update: true, delete: true },
    bank_report: { create: false, read: true, update: false, delete: false },
    payment_mode: { create: true, read: true, update: true, delete: true },
    budget: { create: true, read: true, update: true, delete: true },
  }),
  Manager: initCrudFull({
    journal_entry: { create: true, read: true, update: true, delete: false },
    account: { create: true, read: true, update: true, delete: false },
    ledger_entry: { create: false, read: true, update: false, delete: false },
    company: { create: false, read: true, update: false, delete: false },
    transaction_type: { create: false, read: true, update: false, delete: false },
    accounting_period: { create: false, read: true, update: false, delete: false },
    payment: { create: true, read: true, update: true, delete: false },
    receipt: { create: true, read: true, update: true, delete: false },
    trial_balance: { create: false, read: true, update: false, delete: false },
    allocation_mapping: { create: true, read: true, update: true, delete: false },
    allocation_type: { create: true, read: true, update: true, delete: false },
    bank_report: { create: false, read: true, update: false, delete: false },
    payment_mode: { create: true, read: true, update: true, delete: false },
    budget: { create: true, read: true, update: true, delete: false },
  }),
  'Team Leader': initCrudFull({
    journal_entry: { create: true, read: true, update: true, delete: false },
    account: { create: false, read: true, update: false, delete: false },
    ledger_entry: { create: false, read: true, update: false, delete: false },
    company: { create: false, read: true, update: false, delete: false },
    transaction_type: { create: false, read: true, update: false, delete: false },
    accounting_period: { create: false, read: true, update: false, delete: false },
    payment: { create: true, read: true, update: true, delete: false },
    receipt: { create: true, read: true, update: true, delete: false },
    trial_balance: { create: false, read: true, update: false, delete: false },
    allocation_mapping: { create: true, read: true, update: true, delete: false },
    allocation_type: { create: true, read: true, update: true, delete: false },
    bank_report: { create: false, read: true, update: false, delete: false },
    payment_mode: { create: true, read: true, update: true, delete: false },
    budget: { create: true, read: true, update: true, delete: false },
  }),
  User: initCrudFull({
    journal_entry: { create: true, read: true, update: false, delete: false },
    account: { create: false, read: true, update: false, delete: false },
    ledger_entry: { create: false, read: true, update: false, delete: false },
    company: { create: false, read: true, update: false, delete: false },
    transaction_type: { create: false, read: true, update: false, delete: false },
    accounting_period: { create: false, read: true, update: false, delete: false },
    payment: { create: true, read: true, update: false, delete: false },
    receipt: { create: true, read: true, update: false, delete: false },
    trial_balance: { create: false, read: true, update: false, delete: false },
    allocation_mapping: { create: true, read: true, update: false, delete: false },
    allocation_type: { create: true, read: true, update: false, delete: false },
    bank_report: { create: false, read: true, update: false, delete: false },
    payment_mode: { create: true, read: true, update: false, delete: false },
    budget: { create: false, read: true, update: false, delete: false },
  }),
}

function initCrudFull(
  overrides: Partial<Record<DocType, Partial<Record<CrudOp, boolean>>>>
): Record<DocType, Record<CrudOp, boolean>> {
  return Object.fromEntries(
    DOC_TYPES.map((dt) => [
      dt,
      {
        create: overrides[dt]?.create ?? false,
        read: overrides[dt]?.read ?? false,
        update: overrides[dt]?.update ?? false,
        delete: overrides[dt]?.delete ?? false,
      },
    ])
  ) as Record<DocType, Record<CrudOp, boolean>>
}

let currentCrud: Record<UserType, Record<DocType, Record<CrudOp, boolean>>> | null = null

export function getCrud(): Record<UserType, Record<DocType, Record<CrudOp, boolean>>> {
  if (!currentCrud) {
    currentCrud = structuredClone(DEFAULT_CRUD)
  }
  return currentCrud
}

export function resetCrud() {
  currentCrud = structuredClone(DEFAULT_CRUD)
}

export function setCrudPerm(userType: UserType, docType: DocType, op: CrudOp, value: boolean) {
  if (userType === 'Superuser') return
  const crud = getCrud()
  crud[userType][docType][op] = value
}

/** Check if a user type can perform a CRUD operation. Role is sourced from the DB — no localStorage override. */
export function canCrud(userType: UserType | null, docType: DocType, op: CrudOp): boolean {
  if (!userType) return false
  if (userType === 'Superuser') return true
  const crud = getCrud()
  return crud[userType]?.[docType]?.[op] ?? false
}
