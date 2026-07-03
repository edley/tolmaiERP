export interface Account {
  id: string
  name: string
  code: string | null
  type: AccountType
  parent_id: string | null
  is_group: boolean
  is_cash_account: boolean
  allocation_allow: boolean
  description: string | null
  company_id?: string | null
  created_at: string
  updated_at: string
  children?: Account[]
}

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense'

export interface JournalEntry {
  id: string
  entry_number: string
  posting_date: string
  description: string | null
  total_debit: number
  total_credit: number
  status: JournalEntryStatus
  period_id?: string | null
  company_id?: string | null
  created_by: string | null
  created_by_name: string | null
  created_at: string
  updated_at: string
  submitted_by: string | null
  submitted_by_name: string | null
  submitted_at: string | null
  approved_by: string | null
  approved_by_name: string | null
  approved_at: string | null
  posted_by: string | null
  posted_by_name: string | null
  posted_at: string | null
  items?: JournalEntryItem[]
}

export type JournalEntryStatus = 'draft' | 'submitted' | 'approved' | 'posted' | 'cancelled'

export interface JournalEntryItemAllocation {
  allocation_code: string
  expense_type: string | null
  amount: number
  company_id?: string | null
}

export interface JournalEntryItem {
  id: string
  journal_entry_id: string
  account_id: string
  debit: number
  credit: number
  description: string | null
  company_id?: string | null
  account?: Account
  allocations?: JournalEntryItemAllocation[]
}

export interface LedgerEntry {
  id: string
  journal_entry_id: string
  account_id: string
  posting_date: string
  debit: number
  credit: number
  balance: number
  description: string | null
  company_id?: string | null
  created_at: string
  account?: Account
  journal_entry?: JournalEntry
}

export interface Company {
  id: string
  name: string
  code: string
  fiscal_year_start: string
  fiscal_year_end: string
  registration_number: string | null
  tax_id: string | null
  currency: string
  phone: string | null
  email: string | null
  website: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
  created_at: string
}

export interface TransactionType {
  id: string
  code: string
  name: string
  description: string | null
  default_dr_cr: 'dr' | 'cr'
  company_id?: string | null
}

export interface AccountingPeriod {
  id: string
  name: string
  start_date: string
  end_date: string
  status: 'open' | 'closed'
  company_id?: string | null
}

export interface AllocationType {
  id: string
  gl_account_id: string | null
  gl_code: string
  name: string
  description: string | null
  active: boolean
  company_id?: string | null
  created_at: string
  updated_at: string
  gl_account?: Account
}

export interface AllocationMapping {
  id: string
  gl_account_id: string | null
  gl_code: string | null
  allocation_code: string
  description: string | null
  active: boolean
  company_id?: string | null
  created_at: string
  updated_at: string
  gl_account?: Account
}

export interface TrialBalanceRow {
  account_id: string
  account_code: string | null
  account_name: string
  account_type: AccountType
  is_group: boolean
  parent_id: string | null
  debit: number
  credit: number
  balance: number
}

export interface BudgetGlAccount {
  id: string
  company_id: string
  period_id: string
  gl_account_id: string
  gl_code: string | null
  amount: number
  created_at: string
  updated_at: string
  gl_account?: Account
}

export interface BudgetAllocationCode {
  id: string
  company_id: string
  period_id: string
  gl_account_id: string
  allocation_code: string
  allocation_type: string
  amount: number
  description: string | null
  created_at: string
  updated_at: string
}

export interface BudgetExpenseType {
  id: string
  company_id: string
  period_id: string
  expense_type_id: string
  amount: number
  created_at: string
  updated_at: string
  expense_type?: { id: string; name: string; gl_account_id: string; gl_account?: Account }
}

export type BudgetTab = 'gl_accounts' | 'allocation_codes' | 'expense_types'
