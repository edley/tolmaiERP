export interface Account {
  id: string
  name: string
  code: string | null
  type: AccountType
  parent_id: string | null
  is_group: boolean
  is_cash_account: boolean
  description: string | null
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

export interface JournalEntryItem {
  id: string
  journal_entry_id: string
  account_id: string
  debit: number
  credit: number
  description: string | null
  account?: Account
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
  created_at: string
  account?: Account
  journal_entry?: JournalEntry
}

export interface Company {
  id: string
  name: string
  fiscal_year_start: string
  fiscal_year_end: string
  created_at: string
}

export interface TransactionType {
  id: string
  code: string
  name: string
  description: string | null
  default_dr_cr: 'dr' | 'cr'
}

export interface AccountingPeriod {
  id: string
  name: string
  start_date: string
  end_date: string
  status: 'open' | 'closed'
}
