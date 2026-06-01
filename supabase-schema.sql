-- Tolmai ERP - Supabase Schema Setup
-- Run this in the Supabase SQL Editor to initialize the database

-- 1. Chart of Accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'income', 'expense')),
  parent_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  is_group BOOLEAN DEFAULT FALSE,
  is_cash_account BOOLEAN DEFAULT FALSE,
  allocation_allow BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Journal Entries (header)
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number TEXT NOT NULL UNIQUE,
  posting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  total_debit NUMERIC(16,2) DEFAULT 0,
  total_credit NUMERIC(16,2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'posted', 'cancelled')),
  created_by TEXT,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_by TEXT,
  submitted_by_name TEXT,
  submitted_at TIMESTAMPTZ,
  approved_by TEXT,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  posted_by TEXT,
  posted_by_name TEXT,
  posted_at TIMESTAMPTZ
);

-- 3. Journal Entry Items (lines)
CREATE TABLE journal_entry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  debit NUMERIC(16,2) DEFAULT 0,
  credit NUMERIC(16,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Ledger Entries (immutable GL entries)
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID REFERENCES journal_entries(id),
  payment_id UUID REFERENCES payments(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  posting_date DATE NOT NULL,
  debit NUMERIC(16,2) DEFAULT 0,
  credit NUMERIC(16,2) DEFAULT 0,
  balance NUMERIC(16,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Accounting Periods
CREATE TABLE accounting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

-- Link journal_entries and ledger_entries to periods
ALTER TABLE journal_entries ADD COLUMN period_id UUID REFERENCES accounting_periods(id);
ALTER TABLE ledger_entries ADD COLUMN period_id UUID REFERENCES accounting_periods(id);

-- Indexes
CREATE INDEX idx_journal_entries_status ON journal_entries(status);
CREATE INDEX idx_journal_entries_date ON journal_entries(posting_date);
CREATE INDEX idx_journal_entries_period ON journal_entries(period_id);
CREATE INDEX idx_journal_entry_items_je ON journal_entry_items(journal_entry_id);
CREATE INDEX idx_journal_entry_items_account ON journal_entry_items(account_id);
CREATE INDEX idx_ledger_entries_account ON ledger_entries(account_id);
CREATE INDEX idx_ledger_entries_date ON ledger_entries(posting_date);
CREATE INDEX idx_ledger_entries_period ON ledger_entries(period_id);
CREATE INDEX idx_ledger_entries_je ON ledger_entries(journal_entry_id);
CREATE INDEX idx_accounts_type ON accounts(type);
CREATE INDEX idx_accounts_parent ON accounts(parent_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;

-- Default policies (allow all anon + authenticated users for development)
CREATE POLICY "Enable all access on accounts"
  ON accounts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access on journal_entries"
  ON journal_entries FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access on journal_entry_items"
  ON journal_entry_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access on ledger_entries"
  ON ledger_entries FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access on accounting_periods"
  ON accounting_periods FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. Transaction Types (lookup for journal entries)
CREATE TABLE transaction_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  default_dr_cr TEXT NOT NULL CHECK (default_dr_cr IN ('dr', 'cr')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transaction_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access on transaction_types"
  ON transaction_types FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Seed transaction types
INSERT INTO transaction_types (code, name, description, default_dr_cr) VALUES
  ('JE', 'Journal Entry', 'General journal adjustment', 'dr'),
  ('PV', 'Payment Voucher', 'Cash/bank payment', 'cr'),
  ('RV', 'Receipt Voucher', 'Cash/bank receipt', 'dr'),
  ('SI', 'Sales Invoice', 'Invoice to customer', 'dr'),
  ('PI', 'Purchase Invoice', 'Invoice from supplier', 'cr'),
  ('CN', 'Credit Note', 'Customer credit/refund', 'cr'),
  ('DN', 'Debit Note', 'Supplier debit/refund', 'dr'),
  ('CT', 'Contra Entry', 'Transfer between cash accounts', 'dr'),
  ('PM', 'Payment', 'Payment made', 'cr'),
  ('RC', 'Receipt', 'Receipt received', 'dr');

-- Seed default accounts (will be updated with parent_id below)
INSERT INTO accounts (name, code, type, is_group, is_cash_account) VALUES
  ('Current Assets', '1000', 'asset', TRUE, FALSE),
  ('Cash and Cash Equivalents', '1100', 'asset', TRUE, TRUE),
  ('Petty Cash', '1110', 'asset', FALSE, TRUE),
  ('Cash in Bank - Operating', '1120', 'asset', FALSE, TRUE),
  ('Cash in Bank - Payroll', '1130', 'asset', FALSE, TRUE),
  ('Cash in Bank - Savings', '1140', 'asset', FALSE, TRUE),
  ('Accounts Receivable', '1200', 'asset', TRUE, FALSE),
  ('Trade Debtors', '1210', 'asset', FALSE, FALSE),
  ('Allowance for Doubtful Accounts', '1220', 'asset', FALSE, FALSE),
  ('Inventory', '1300', 'asset', TRUE, FALSE),
  ('Raw Materials', '1310', 'asset', FALSE, FALSE),
  ('Finished Goods', '1330', 'asset', FALSE, FALSE),
  ('Prepaid Expenses', '1400', 'asset', TRUE, FALSE),
  ('Prepaid Rent', '1410', 'asset', FALSE, FALSE),
  ('Prepaid Insurance', '1420', 'asset', FALSE, FALSE),
  ('Fixed Assets', '1600', 'asset', TRUE, FALSE),
  ('Computer Equipment', '1640', 'asset', FALSE, FALSE),
  ('Office Furniture', '1650', 'asset', FALSE, FALSE),

  ('Current Liabilities', '2000', 'liability', TRUE, FALSE),
  ('Accounts Payable', '2100', 'liability', TRUE, FALSE),
  ('Trade Creditors', '2110', 'liability', FALSE, FALSE),
  ('Accrued Expenses', '2120', 'liability', FALSE, FALSE),
  ('Payroll Liabilities', '2200', 'liability', TRUE, FALSE),
  ('Salaries Payable', '2210', 'liability', FALSE, FALSE),
  ('Tax Liabilities', '2300', 'liability', TRUE, FALSE),
  ('Income Tax Payable', '2310', 'liability', FALSE, FALSE),
  ('Deferred Revenue', '2410', 'liability', FALSE, FALSE),
  ('Long-term Loans', '2510', 'liability', FALSE, FALSE),

  ('Equity', '3000', 'equity', TRUE, FALSE),
  ('Share Capital', '3100', 'equity', FALSE, FALSE),
  ('Retained Earnings', '3300', 'equity', FALSE, FALSE),

  ('Revenue', '4000', 'income', TRUE, FALSE),
  ('Product Sales Revenue', '4100', 'income', FALSE, FALSE),
  ('Service Revenue', '4200', 'income', FALSE, FALSE),
  ('Consulting Revenue', '4300', 'income', FALSE, FALSE),
  ('Interest Income', '4910', 'income', FALSE, FALSE),

  ('Cost of Goods Sold', '5000', 'expense', TRUE, FALSE),
  ('Raw Material Purchases', '5100', 'expense', FALSE, FALSE),
  ('Direct Labor', '5200', 'expense', FALSE, FALSE),
  ('Manufacturing Overhead', '5300', 'expense', FALSE, FALSE),

  ('Operating Expenses', '6000', 'expense', TRUE, FALSE),
  ('Management Salaries', '6110', 'expense', FALSE, FALSE),
  ('Admin Salaries', '6120', 'expense', FALSE, FALSE),
  ('Sales Commissions', '6130', 'expense', FALSE, FALSE),
  ('Health Insurance', '6210', 'expense', FALSE, FALSE),
  ('Payroll Taxes', '6230', 'expense', FALSE, FALSE),
  ('Office Rent', '6310', 'expense', FALSE, FALSE),
  ('Office Supplies', '6320', 'expense', FALSE, FALSE),
  ('Utilities', '6330', 'expense', FALSE, FALSE),
  ('Software Subscriptions', '6410', 'expense', FALSE, FALSE),
  ('Cloud Services', '6430', 'expense', FALSE, FALSE),
  ('Legal Fees', '6510', 'expense', FALSE, FALSE),
  ('Accounting & Audit', '6520', 'expense', FALSE, FALSE),
  ('Digital Advertising', '6610', 'expense', FALSE, FALSE),
  ('Depreciation', '6800', 'expense', FALSE, FALSE),
  ('Insurance', '6910', 'expense', FALSE, FALSE),
  ('Interest Expense', '7100', 'expense', FALSE, FALSE),
  ('Income Tax Expense', '7300', 'expense', FALSE, FALSE);

-- Set parent_id for hierarchical tree structure
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '1000') WHERE code IN ('1100','1200','1300','1400','1600');
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '1100') WHERE code IN ('1110','1120','1130','1140');
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '1200') WHERE code IN ('1210','1220');
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '1300') WHERE code IN ('1310','1330');
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '1400') WHERE code IN ('1410','1420');
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '1600') WHERE code IN ('1640','1650');
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '2000') WHERE code IN ('2100','2200','2300','2410','2510');
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '2100') WHERE code IN ('2110','2120');
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '2200') WHERE code IN ('2210');
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '2300') WHERE code IN ('2310');
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '3000') WHERE code IN ('3100','3300');
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '4000') WHERE code IN ('4100','4200','4300','4910');
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '5000') WHERE code IN ('5100','5200','5300');
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '6000') WHERE code IN ('6110','6120','6130','6210','6230','6310','6320','6330','6410','6430','6510','6520','6610','6800','6910');
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code = '6000') WHERE code IN ('7100','7300');

-- ============================================================
-- 7. Payment Modes (lookup table for modes of payment)
-- ============================================================
CREATE TABLE payment_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  gl_account_id UUID REFERENCES accounts(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payment_modes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access on payment_modes"
  ON payment_modes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Seed default payment modes (fixed UUIDs to match frontend defaults)
INSERT INTO payment_modes (id, name, gl_account_id) VALUES
  ('11111111-1111-4111-8111-111111111111'::uuid, 'Bank', (SELECT id FROM accounts WHERE code = '1120')),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'Cash', (SELECT id FROM accounts WHERE code = '1110'))
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. Payments (header)
-- ============================================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number TEXT NOT NULL UNIQUE,
  period_id UUID REFERENCES accounting_periods(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  voucher_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
  mode_of_payment_id UUID REFERENCES payment_modes(id),
  paid_to TEXT NOT NULL,
  invoice_no TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'posted', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  created_by_name TEXT,
  submitted_by TEXT,
  submitted_by_name TEXT,
  submitted_at TIMESTAMPTZ,
  approved_by TEXT,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  posted_by TEXT,
  posted_by_name TEXT,
  posted_at TIMESTAMPTZ
);

-- ============================================================
-- 9. Payment Lines (detail items)
-- ============================================================
CREATE TABLE payment_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  gl_account_id UUID NOT NULL REFERENCES accounts(id),
  amount NUMERIC(16,2) NOT NULL DEFAULT 0
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access on payments"
  ON payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access on payment_lines"
  ON payment_lines FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_period ON payments(period_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_mode ON payments(mode_of_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_lines_payment ON payment_lines(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_lines_account ON payment_lines(gl_account_id);

-- Trigger for updated_at on payments
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 10. Trial Balance (snapshot per period per account)
-- ============================================================
CREATE TABLE trial_balances (
  period_id UUID NOT NULL REFERENCES accounting_periods(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  debit NUMERIC(16,2) DEFAULT 0,
  credit NUMERIC(16,2) DEFAULT 0,
  PRIMARY KEY (period_id, account_id)
);

ALTER TABLE trial_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access on trial_balances"
  ON trial_balances FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_trial_balances_period ON trial_balances(period_id);
CREATE INDEX IF NOT EXISTS idx_trial_balances_account ON trial_balances(account_id);

-- ============================================================
-- 11. Receipts (money incoming — mirrors payments)
-- ============================================================
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number TEXT NOT NULL UNIQUE,
  period_id UUID REFERENCES accounting_periods(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  voucher_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
  mode_of_payment_id UUID REFERENCES payment_modes(id),
  received_from TEXT NOT NULL,
  invoice_no TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'posted', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  created_by_name TEXT,
  submitted_by TEXT,
  submitted_by_name TEXT,
  submitted_at TIMESTAMPTZ,
  approved_by TEXT,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  posted_by TEXT,
  posted_by_name TEXT,
  posted_at TIMESTAMPTZ
);

CREATE TABLE receipt_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  gl_account_id UUID NOT NULL REFERENCES accounts(id),
  amount NUMERIC(16,2) NOT NULL DEFAULT 0
);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access on receipts"
  ON receipts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access on receipt_lines"
  ON receipt_lines FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_receipts_period ON receipts(period_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_mode ON receipts(mode_of_payment_id);
CREATE INDEX IF NOT EXISTS idx_receipt_lines_receipt ON receipt_lines(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_lines_account ON receipt_lines(gl_account_id);

CREATE TRIGGER update_receipts_updated_at
  BEFORE UPDATE ON receipts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add receipt_id and source_type to ledger_entries
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS receipt_id UUID REFERENCES receipts(id);
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('journal_entry', 'payment', 'receipt'));

-- On-demand procedure to generate trial balance for a given period
CREATE OR REPLACE FUNCTION generate_trial_balance(p_period_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM trial_balances WHERE period_id = p_period_id;

  INSERT INTO trial_balances (period_id, account_id, debit, credit)
  SELECT
    p_period_id,
    le.account_id,
    COALESCE(SUM(le.debit), 0),
    COALESCE(SUM(le.credit), 0)
  FROM ledger_entries le
  WHERE le.period_id = p_period_id
  GROUP BY le.account_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 12. Allocation Mappings (GL account ↔ allocation code)
-- ============================================================
CREATE TABLE allocation_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gl_account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  gl_code TEXT,
  allocation_code TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (gl_code, allocation_code)
);

ALTER TABLE allocation_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access on allocation_mappings"
  ON allocation_mappings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_allocation_mappings_account ON allocation_mappings(gl_account_id);
CREATE INDEX IF NOT EXISTS idx_allocation_mappings_code ON allocation_mappings(allocation_code);

CREATE TRIGGER update_allocation_mappings_updated_at
  BEFORE UPDATE ON allocation_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 13. Payment Line Allocations (further decomposition of payment lines)
-- ============================================================
CREATE TABLE payment_line_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_line_id UUID NOT NULL REFERENCES payment_lines(id) ON DELETE CASCADE,
  allocation_code TEXT NOT NULL,
  amount NUMERIC(16,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payment_line_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access on payment_line_allocations"
  ON payment_line_allocations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_payment_line_allocations_line ON payment_line_allocations(payment_line_id);

-- ============================================================
-- 14. Receipt Line Allocations (further decomposition of receipt lines)
-- ============================================================
CREATE TABLE receipt_line_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_line_id UUID NOT NULL REFERENCES receipt_lines(id) ON DELETE CASCADE,
  allocation_code TEXT NOT NULL,
  amount NUMERIC(16,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE receipt_line_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access on receipt_line_allocations"
  ON receipt_line_allocations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_receipt_line_allocations_line ON receipt_line_allocations(receipt_line_id);

-- ============================================================
-- 15. Journal Entry Item Allocations (decomposition of JE line items)
-- ============================================================
CREATE TABLE journal_entry_item_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_item_id UUID NOT NULL REFERENCES journal_entry_items(id) ON DELETE CASCADE,
  allocation_code TEXT NOT NULL,
  amount NUMERIC(16,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE journal_entry_item_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access on journal_entry_item_allocations"
  ON journal_entry_item_allocations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_je_item_allocations_item ON journal_entry_item_allocations(journal_entry_item_id);
