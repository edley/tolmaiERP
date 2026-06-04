export interface DbTableMeta {
  table: string
  label: string
  description: string
  category: string
  hasLocalStorage?: true
}

export const DB_TABLES: DbTableMeta[] = [
  { table: 'accounts',              label: 'Chart of Accounts',        description: 'General ledger accounts',                    category: 'Accounting' },
  { table: 'accounting_periods',    label: 'Accounting Periods',      description: 'Fiscal and reporting periods',              category: 'Accounting' },
  { table: 'transaction_types',     label: 'Transaction Types',       description: 'Transaction classification types',          category: 'Accounting' },
  { table: 'expense_types',         label: 'Expense Types',           description: 'Expense classification types',              category: 'Accounting' },
  { table: 'journal_entries',       label: 'Journal Entries',         description: 'General journal entry headers',             category: 'Transactions' },
  { table: 'journal_entry_items',   label: 'Journal Entry Items',     description: 'Line items for journal entries',            category: 'Transactions' },
  { table: 'journal_entry_item_allocations', label: 'JE Allocations', description: 'Allocations on journal entry line items',  category: 'Transactions' },
  { table: 'payments',              label: 'Payments',                description: 'Payment voucher headers',                   category: 'Transactions' },
  { table: 'payment_lines',         label: 'Payment Lines',           description: 'Line items for payments',                   category: 'Transactions' },
  { table: 'payment_line_allocations', label: 'Payment Allocations',  description: 'Allocations on payment line items',         category: 'Transactions' },
  { table: 'receipts',              label: 'Receipts',                description: 'Receipt voucher headers',                   category: 'Transactions' },
  { table: 'receipt_lines',         label: 'Receipt Lines',           description: 'Line items for receipts',                   category: 'Transactions' },
  { table: 'receipt_line_allocations', label: 'Receipt Allocations',  description: 'Allocations on receipt line items',         category: 'Transactions' },
  { table: 'ledger_entries',        label: 'Ledger Entries',          description: 'Posted ledger entries (GL)',                category: 'Accounting' },
  { table: 'trial_balances',        label: 'Trial Balances',          description: 'Generated trial balance snapshots',         category: 'Accounting' },
  { table: 'payment_modes',         label: 'Payment Modes',           description: 'Bank accounts and payment methods',         category: 'Administration' },
  { table: 'user_profiles',         label: 'User Profiles',           description: 'User accounts and roles',                   category: 'Administration' },
  { table: 'companies',             label: 'Companies',               description: 'Company entities',                          category: 'Administration' },
  { table: 'user_companies',        label: 'User Companies',          description: 'User-company access mappings',              category: 'Administration' },
  { table: 'waitlist_signups',      label: 'Waitlist Signups',        description: 'Beta waitlist registrations',               category: 'Administration' },
  { table: 'user_tasks',            label: 'User Tasks',              description: 'User task assignments (localStorage)',      category: 'Administration', hasLocalStorage: true },
  { table: 'allocation_mappings',   label: 'Allocation Mappings',     description: 'Allocation code mappings (localStorage)',   category: 'Administration', hasLocalStorage: true },
]
