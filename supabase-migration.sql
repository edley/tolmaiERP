-- Migration: Add transaction_types table + fix RLS policies

-- 1. Create transaction_types table
CREATE TABLE IF NOT EXISTS transaction_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  default_dr_cr TEXT NOT NULL CHECK (default_dr_cr IN ('dr', 'cr')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transaction_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access on transaction_types" ON transaction_types;
CREATE POLICY "Enable all access on transaction_types"
  ON transaction_types FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Seed transaction types
INSERT INTO transaction_types (code, name, description, default_dr_cr)
SELECT * FROM (VALUES
  ('JE', 'Journal Entry', 'General journal adjustment', 'dr'),
  ('PV', 'Payment Voucher', 'Cash/bank payment', 'cr'),
  ('RV', 'Receipt Voucher', 'Cash/bank receipt', 'dr'),
  ('SI', 'Sales Invoice', 'Invoice to customer', 'dr'),
  ('PI', 'Purchase Invoice', 'Invoice from supplier', 'cr'),
  ('CN', 'Credit Note', 'Customer credit/refund', 'cr'),
  ('DN', 'Debit Note', 'Supplier debit/refund', 'dr'),
  ('CT', 'Contra Entry', 'Transfer between cash accounts', 'dr'),
  ('PM', 'Payment', 'Payment made', 'cr'),
  ('RC', 'Receipt', 'Receipt received', 'dr')
) AS s
WHERE NOT EXISTS (SELECT 1 FROM transaction_types);

-- 2. Fix RLS policies for existing tables (allow anon + authenticated)
DROP POLICY IF EXISTS "Enable all for authenticated users on accounts" ON accounts;
DROP POLICY IF EXISTS "Enable all for authenticated users on journal_entries" ON journal_entries;
DROP POLICY IF EXISTS "Enable all for authenticated users on journal_entry_items" ON journal_entry_items;
DROP POLICY IF EXISTS "Enable all for authenticated users on ledger_entries" ON ledger_entries;

DROP POLICY IF EXISTS "Enable all access on accounts" ON accounts;
DROP POLICY IF EXISTS "Enable all access on journal_entries" ON journal_entries;
DROP POLICY IF EXISTS "Enable all access on journal_entry_items" ON journal_entry_items;
DROP POLICY IF EXISTS "Enable all access on ledger_entries" ON ledger_entries;

CREATE POLICY "Enable all access on accounts" ON accounts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access on journal_entries" ON journal_entries FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access on journal_entry_items" ON journal_entry_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access on ledger_entries" ON ledger_entries FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 3. Accounting Periods
-- ============================================================
CREATE TABLE IF NOT EXISTS accounting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_period_name UNIQUE (name),
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access on accounting_periods" ON accounting_periods;
CREATE POLICY "Enable all access on accounting_periods"
  ON accounting_periods FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. Link journal_entries and ledger_entries to periods
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES accounting_periods(id);
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES accounting_periods(id);

CREATE INDEX IF NOT EXISTS idx_journal_entries_period ON journal_entries(period_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_period ON ledger_entries(period_id);

-- 5. Seed periods for current year (if not already seeded)
DO $$
DECLARE
  y INT := EXTRACT(YEAR FROM CURRENT_DATE);
  m INT;
  start_d DATE;
  end_d DATE;
BEGIN
  FOR m IN 1..12 LOOP
    start_d := make_date(y, m, 1);
    end_d := (start_d + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    INSERT INTO accounting_periods (name, start_date, end_date, status)
    VALUES (
      TO_CHAR(start_d, 'Month YYYY'),
      start_d,
      end_d,
      CASE WHEN end_d < CURRENT_DATE THEN 'closed' ELSE 'open' END
    )
    ON CONFLICT (name) DO NOTHING;
  END LOOP;
END $$;

-- 6. Backfill period_id on existing journal_entries
UPDATE journal_entries je
SET period_id = (
  SELECT ap.id FROM accounting_periods ap
  WHERE je.posting_date BETWEEN ap.start_date AND ap.end_date
  LIMIT 1
)
WHERE je.period_id IS NULL AND je.posting_date IS NOT NULL;

-- 7. Backfill period_id on existing ledger_entries
UPDATE ledger_entries le
SET period_id = (
  SELECT ap.id FROM accounting_periods ap
  WHERE le.posting_date BETWEEN ap.start_date AND ap.end_date
  LIMIT 1
)
WHERE le.period_id IS NULL AND le.posting_date IS NOT NULL;

-- ============================================================
-- 8. Payment Modes, Payments, and Payment Lines tables
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  gl_account_id UUID REFERENCES accounts(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payment_modes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access on payment_modes" ON payment_modes;
CREATE POLICY "Enable all access on payment_modes"
  ON payment_modes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO payment_modes (id, name, gl_account_id)
SELECT * FROM (VALUES
  ('11111111-1111-4111-8111-111111111111'::uuid, 'Bank', (SELECT id FROM accounts WHERE code = '1120')),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'Cash', (SELECT id FROM accounts WHERE code = '1110'))
) AS s
WHERE NOT EXISTS (SELECT 1 FROM payment_modes WHERE id IN ('11111111-1111-4111-8111-111111111111'::uuid, '22222222-2222-4222-8222-222222222222'::uuid));

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number TEXT NOT NULL UNIQUE,
  period_id UUID REFERENCES accounting_periods(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  voucher_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
  mode_of_payment_id UUID REFERENCES payment_modes(id),
  paid_to TEXT NOT NULL,
  invoice_no TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  gl_account_id UUID NOT NULL REFERENCES accounts(id),
  amount NUMERIC(16,2) NOT NULL DEFAULT 0
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access on payments" ON payments;
CREATE POLICY "Enable all access on payments"
  ON payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access on payment_lines" ON payment_lines;
CREATE POLICY "Enable all access on payment_lines"
  ON payment_lines FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_payments_period ON payments(period_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_mode ON payments(mode_of_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_lines_payment ON payment_lines(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_lines_account ON payment_lines(gl_account_id);

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 10. Journal Entry Approval & Posting Workflow Migration
-- ============================================================

-- Update status CHECK to include full workflow
ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS journal_entries_status_check;
ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_status_check
  CHECK (status IN ('draft', 'submitted', 'approved', 'posted', 'cancelled'));

-- Change created_by from UUID to TEXT for consistency
ALTER TABLE journal_entries ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

-- Add audit trail columns
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS created_by_name TEXT;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS submitted_by TEXT;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS submitted_by_name TEXT;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS approved_by  TEXT;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS approved_by_name TEXT;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS approved_at  TIMESTAMPTZ;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS posted_by    TEXT;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS posted_by_name TEXT;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS posted_at    TIMESTAMPTZ;

-- ============================================================
-- 11. Payment Approval & Posting Workflow Migration
-- ============================================================

-- Update status CHECK to include full workflow
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('draft', 'submitted', 'approved', 'posted', 'cancelled'));

-- Make ledger_entries.journal_entry_id nullable and add payment_id for payment postings
ALTER TABLE ledger_entries ALTER COLUMN journal_entry_id DROP NOT NULL;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id);

-- ============================================================
-- 12. Receipts table, receipt_lines, and ledger source_type
-- ============================================================
CREATE TABLE IF NOT EXISTS receipts (
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

CREATE TABLE IF NOT EXISTS receipt_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  gl_account_id UUID NOT NULL REFERENCES accounts(id),
  amount NUMERIC(16,2) NOT NULL DEFAULT 0
);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access on receipts" ON receipts;
CREATE POLICY "Enable all access on receipts"
  ON receipts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access on receipt_lines" ON receipt_lines;
CREATE POLICY "Enable all access on receipt_lines"
  ON receipt_lines FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_receipts_period ON receipts(period_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_mode ON receipts(mode_of_payment_id);
CREATE INDEX IF NOT EXISTS idx_receipt_lines_receipt ON receipt_lines(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_lines_account ON receipt_lines(gl_account_id);

DROP TRIGGER IF EXISTS update_receipts_updated_at ON receipts;
CREATE TRIGGER update_receipts_updated_at
  BEFORE UPDATE ON receipts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add receipt_id and source_type to ledger_entries
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS receipt_id UUID REFERENCES receipts(id);
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('journal_entry', 'payment', 'receipt'));

-- ============================================================
-- 13. Trial Balance table and generation function
-- ============================================================
CREATE TABLE IF NOT EXISTS trial_balances (
  period_id UUID NOT NULL REFERENCES accounting_periods(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  debit NUMERIC(16,2) DEFAULT 0,
  credit NUMERIC(16,2) DEFAULT 0,
  PRIMARY KEY (period_id, account_id)
);

ALTER TABLE trial_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access on trial_balances" ON trial_balances;
CREATE POLICY "Enable all access on trial_balances"
  ON trial_balances FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_trial_balances_period ON trial_balances(period_id);
CREATE INDEX IF NOT EXISTS idx_trial_balances_account ON trial_balances(account_id);

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

-- Add audit trail columns (user IDs stored as TEXT — references auth.users in production)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_by   TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_by_name TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS submitted_by TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS submitted_by_name TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS approved_by  TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS approved_by_name TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS approved_at  TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS posted_by    TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS posted_by_name TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS posted_at    TIMESTAMPTZ;

-- ============================================================
-- 14. Allocation Allow field on accounts
-- ============================================================
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS allocation_allow BOOLEAN DEFAULT FALSE;

-- ============================================================
-- 15. Allocation Mappings table
-- ============================================================
CREATE TABLE IF NOT EXISTS allocation_mappings (
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

DROP POLICY IF EXISTS "Enable all access on allocation_mappings" ON allocation_mappings;
CREATE POLICY "Enable all access on allocation_mappings"
  ON allocation_mappings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_allocation_mappings_account ON allocation_mappings(gl_account_id);
CREATE INDEX IF NOT EXISTS idx_allocation_mappings_code ON allocation_mappings(allocation_code);

DROP TRIGGER IF EXISTS update_allocation_mappings_updated_at ON allocation_mappings;
CREATE TRIGGER update_allocation_mappings_updated_at
  BEFORE UPDATE ON allocation_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 16. Payment Line Allocations
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_line_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_line_id UUID NOT NULL REFERENCES payment_lines(id) ON DELETE CASCADE,
  allocation_code TEXT NOT NULL,
  amount NUMERIC(16,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payment_line_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access on payment_line_allocations" ON payment_line_allocations;
CREATE POLICY "Enable all access on payment_line_allocations"
  ON payment_line_allocations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE payment_line_allocations ADD COLUMN IF NOT EXISTS expense_type TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_line_allocations_line ON payment_line_allocations(payment_line_id);

-- ============================================================
-- 17. Expense Types table
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gl_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (gl_account_id, name)
);

ALTER TABLE expense_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access on expense_types" ON expense_types;
CREATE POLICY "Enable all access on expense_types"
  ON expense_types FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_expense_types_account ON expense_types(gl_account_id);

-- ============================================================
-- 18. Receipt Line Allocations
-- ============================================================
CREATE TABLE IF NOT EXISTS receipt_line_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_line_id UUID NOT NULL REFERENCES receipt_lines(id) ON DELETE CASCADE,
  allocation_code TEXT NOT NULL,
  expense_type TEXT,
  amount NUMERIC(16,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE receipt_line_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access on receipt_line_allocations" ON receipt_line_allocations;
CREATE POLICY "Enable all access on receipt_line_allocations"
  ON receipt_line_allocations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_receipt_line_allocations_line ON receipt_line_allocations(receipt_line_id);

-- ============================================================
-- 18. Journal Entry Item Allocations
-- ============================================================
CREATE TABLE IF NOT EXISTS journal_entry_item_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_item_id UUID NOT NULL REFERENCES journal_entry_items(id) ON DELETE CASCADE,
  allocation_code TEXT NOT NULL,
  expense_type TEXT,
  amount NUMERIC(16,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE journal_entry_item_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access on journal_entry_item_allocations" ON journal_entry_item_allocations;
CREATE POLICY "Enable all access on journal_entry_item_allocations"
  ON journal_entry_item_allocations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_je_item_allocations_item ON journal_entry_item_allocations(journal_entry_item_id);
