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
    SELECT
      TO_CHAR(start_d, 'Month YYYY'),
      start_d,
      end_d,
      CASE WHEN end_d < CURRENT_DATE THEN 'closed' ELSE 'open' END
    WHERE NOT EXISTS (
      SELECT 1 FROM accounting_periods WHERE name = TO_CHAR(start_d, 'Month YYYY')
    );
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

-- ============================================================
-- 19. User Profiles table for role management
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'User' CHECK (role IN ('Superuser', 'Manager', 'Team Leader', 'User')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access on user_profiles" ON user_profiles;
CREATE POLICY "Enable all access on user_profiles"
  ON user_profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Auto-create profile row when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'name',
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'User')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing users
INSERT INTO public.user_profiles (id, email, name, role)
SELECT
  au.id,
  au.email,
  au.raw_user_meta_data ->> 'name',
  COALESCE(au.raw_user_meta_data ->> 'role', 'User')
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = au.id)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 20. Multi-Company Support
-- ============================================================

-- 20a. Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  fiscal_year_start DATE NOT NULL DEFAULT '2026-01-01',
  fiscal_year_end DATE NOT NULL DEFAULT '2026-12-31',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access on companies" ON companies;
CREATE POLICY "Enable all access on companies"
  ON companies FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Seed the default company
INSERT INTO companies (id, name, code, fiscal_year_start, fiscal_year_end)
VALUES (
  '00000000-0000-4000-8000-000000000001'::uuid,
  'Default Company',
  'DEFAULT',
  date_trunc('year', CURRENT_DATE)::DATE,
  (date_trunc('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day')::DATE
) ON CONFLICT (id) DO NOTHING;

-- 20b. User-Company access table
CREATE TABLE IF NOT EXISTS user_companies (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, company_id)
);

ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access on user_companies" ON user_companies;
CREATE POLICY "Enable all access on user_companies"
  ON user_companies FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Link all existing users to the default company
INSERT INTO user_companies (user_id, company_id, is_default)
SELECT au.id, '00000000-0000-4000-8000-000000000001'::uuid, TRUE
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM user_companies uc WHERE uc.user_id = au.id AND uc.company_id = '00000000-0000-4000-8000-000000000001'::uuid
);

-- 20c. Add company_id column to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE user_profiles SET company_id = '00000000-0000-4000-8000-000000000001'::uuid WHERE company_id IS NULL;
ALTER TABLE user_profiles ALTER COLUMN company_id SET NOT NULL;

-- RPC: List all user profiles (only Superusers can list all profiles)
DROP FUNCTION IF EXISTS public.get_user_profiles();
CREATE FUNCTION public.get_user_profiles()
RETURNS TABLE (
  id UUID, email TEXT, name TEXT, role TEXT,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  company_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles up2
    WHERE up2.id = auth.uid() AND up2.role = 'Superuser'
  ) THEN
    RAISE EXCEPTION 'Only superusers can list all user profiles';
  END IF;
  RETURN QUERY
    SELECT up.id, up.email, up.name, up.role, up.created_at, up.updated_at, up.company_id
    FROM public.user_profiles up
    ORDER BY up.email;
END;
$$;

-- 20d. Add company_id to business tables (accounts, periods, references)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE accounts SET company_id = '00000000-0000-4000-8000-000000000001'::uuid WHERE company_id IS NULL;
ALTER TABLE accounts ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_company ON accounts(company_id);

ALTER TABLE accounting_periods ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE accounting_periods SET company_id = '00000000-0000-4000-8000-000000000001'::uuid WHERE company_id IS NULL;
ALTER TABLE accounting_periods ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE accounting_periods DROP CONSTRAINT IF EXISTS unique_period_name;
CREATE INDEX IF NOT EXISTS idx_accounting_periods_company ON accounting_periods(company_id);

ALTER TABLE payment_modes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE payment_modes SET company_id = '00000000-0000-4000-8000-000000000001'::uuid WHERE company_id IS NULL;
ALTER TABLE payment_modes ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_modes_company ON payment_modes(company_id);

ALTER TABLE transaction_types ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE transaction_types SET company_id = '00000000-0000-4000-8000-000000000001'::uuid WHERE company_id IS NULL;
ALTER TABLE transaction_types ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transaction_types_company ON transaction_types(company_id);

ALTER TABLE allocation_mappings ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE allocation_mappings SET company_id = '00000000-0000-4000-8000-000000000001'::uuid WHERE company_id IS NULL;
ALTER TABLE allocation_mappings ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_allocation_mappings_company ON allocation_mappings(company_id);

ALTER TABLE expense_types ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE expense_types SET company_id = '00000000-0000-4000-8000-000000000001'::uuid WHERE company_id IS NULL;
ALTER TABLE expense_types ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expense_types_company ON expense_types(company_id);

-- 20e. Add company_id to transaction tables
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE journal_entries SET company_id = '00000000-0000-4000-8000-000000000001'::uuid WHERE company_id IS NULL;
ALTER TABLE journal_entries ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journal_entries_company ON journal_entries(company_id);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE payments SET company_id = '00000000-0000-4000-8000-000000000001'::uuid WHERE company_id IS NULL;
ALTER TABLE payments ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);

ALTER TABLE receipts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE receipts SET company_id = '00000000-0000-4000-8000-000000000001'::uuid WHERE company_id IS NULL;
ALTER TABLE receipts ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_receipts_company ON receipts(company_id);

ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE ledger_entries SET company_id = '00000000-0000-4000-8000-000000000001'::uuid WHERE company_id IS NULL;
ALTER TABLE ledger_entries ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_entries_company ON ledger_entries(company_id);

ALTER TABLE trial_balances ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE trial_balances SET company_id = '00000000-0000-4000-8000-000000000001'::uuid WHERE company_id IS NULL;
ALTER TABLE trial_balances ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE trial_balances DROP CONSTRAINT IF EXISTS trial_balances_pkey;
ALTER TABLE trial_balances ADD PRIMARY KEY (period_id, account_id, company_id);

-- 20f. Update handle_new_user trigger to include company_id and auto-link to default company
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_default_company_id UUID := '00000000-0000-4000-8000-000000000001'::uuid;
BEGIN
  INSERT INTO public.user_profiles (id, email, name, role, company_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'name',
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'User'),
    v_default_company_id
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_companies (user_id, company_id, is_default)
  VALUES (NEW.id, v_default_company_id, TRUE)
  ON CONFLICT (user_id, company_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 20g. RPC: get companies accessible by a user
CREATE OR REPLACE FUNCTION public.get_user_companies(p_user_id UUID)
RETURNS SETOF public.companies
LANGUAGE sql
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT c.* FROM public.companies c
  INNER JOIN public.user_companies uc ON uc.company_id = c.id
  WHERE uc.user_id = p_user_id
  ORDER BY c.name;
$$;

-- RPC: set default company for a user
CREATE OR REPLACE FUNCTION public.set_default_company(p_user_id UUID, p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.user_companies SET is_default = FALSE WHERE user_id = p_user_id;
  UPDATE public.user_companies SET is_default = TRUE WHERE user_id = p_user_id AND company_id = p_company_id;
END;
$$;

-- 20h. Add company_id to child/detail tables (lines + allocations)
ALTER TABLE journal_entry_items ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE journal_entry_items SET company_id = je.company_id
  FROM journal_entries je WHERE journal_entry_items.journal_entry_id = je.id AND journal_entry_items.company_id IS NULL;
ALTER TABLE journal_entry_items ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journal_entry_items_company ON journal_entry_items(company_id);

ALTER TABLE payment_lines ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE payment_lines SET company_id = p.company_id
  FROM payments p WHERE payment_lines.payment_id = p.id AND payment_lines.company_id IS NULL;
ALTER TABLE payment_lines ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_lines_company ON payment_lines(company_id);

ALTER TABLE receipt_lines ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE receipt_lines SET company_id = r.company_id
  FROM receipts r WHERE receipt_lines.receipt_id = r.id AND receipt_lines.company_id IS NULL;
ALTER TABLE receipt_lines ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_receipt_lines_company ON receipt_lines(company_id);

ALTER TABLE payment_line_allocations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE payment_line_allocations SET company_id = p.company_id
  FROM payment_lines pl
  INNER JOIN payments p ON p.id = pl.payment_id
  WHERE payment_line_allocations.payment_line_id = pl.id AND payment_line_allocations.company_id IS NULL;
ALTER TABLE payment_line_allocations ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_line_allocations_company ON payment_line_allocations(company_id);

ALTER TABLE receipt_line_allocations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE receipt_line_allocations SET company_id = r.company_id
  FROM receipt_lines rl
  INNER JOIN receipts r ON r.id = rl.receipt_id
  WHERE receipt_line_allocations.receipt_line_id = rl.id AND receipt_line_allocations.company_id IS NULL;
ALTER TABLE receipt_line_allocations ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_receipt_line_allocations_company ON receipt_line_allocations(company_id);

ALTER TABLE journal_entry_item_allocations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE journal_entry_item_allocations SET company_id = je.company_id
  FROM journal_entry_items jei
  INNER JOIN journal_entries je ON je.id = jei.journal_entry_id
  WHERE journal_entry_item_allocations.journal_entry_item_id = jei.id AND journal_entry_item_allocations.company_id IS NULL;
ALTER TABLE journal_entry_item_allocations ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journal_entry_item_allocations_company ON journal_entry_item_allocations(company_id);

-- 20i. Update generate_trial_balance to be company-aware
CREATE OR REPLACE FUNCTION public.generate_trial_balance(p_period_id UUID)
RETURNS void AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id FROM accounting_periods WHERE id = p_period_id;

  DELETE FROM trial_balances WHERE period_id = p_period_id;

  INSERT INTO trial_balances (period_id, account_id, debit, credit, company_id)
  SELECT
    p_period_id,
    le.account_id,
    COALESCE(SUM(le.debit), 0),
    COALESCE(SUM(le.credit), 0),
    v_company_id
  FROM ledger_entries le
  WHERE le.period_id = p_period_id
  GROUP BY le.account_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 21. Add legal entity & contact fields to companies table
-- ============================================================
ALTER TABLE companies ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS country TEXT;

-- ============================================================
-- 22. Company-scoped UNIQUE constraints for multi-tenant isolation
--     Every UNIQUE constraint on business data must include company_id
--     to prevent cross-company collisions and data leaks.
-- ============================================================

-- 22a. journal_entries: entry_number UNIQUE → UNIQUE (company_id, entry_number)
ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS journal_entries_entry_number_key;
DO $$ BEGIN
  ALTER TABLE journal_entries ADD CONSTRAINT uq_journal_entries_company_entry UNIQUE (company_id, entry_number);
EXCEPTION WHEN duplicate_table THEN END; $$;

-- 22b. payments: voucher_number UNIQUE → UNIQUE (company_id, voucher_number)
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_voucher_number_key;
DO $$ BEGIN
  ALTER TABLE payments ADD CONSTRAINT uq_payments_company_voucher UNIQUE (company_id, voucher_number);
EXCEPTION WHEN duplicate_table THEN END; $$;

-- 22c. receipts: voucher_number UNIQUE → UNIQUE (company_id, voucher_number)
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_voucher_number_key;
DO $$ BEGIN
  ALTER TABLE receipts ADD CONSTRAINT uq_receipts_company_voucher UNIQUE (company_id, voucher_number);
EXCEPTION WHEN duplicate_table THEN END; $$;

-- 22d. transaction_types: UNIQUE (code) → UNIQUE (company_id, code)
ALTER TABLE transaction_types DROP CONSTRAINT IF EXISTS transaction_types_code_key;
DO $$ BEGIN
  ALTER TABLE transaction_types ADD CONSTRAINT uq_transaction_types_company_code UNIQUE (company_id, code);
EXCEPTION WHEN duplicate_table THEN END; $$;

-- 22e. expense_types: UNIQUE (gl_account_id, name) → UNIQUE (company_id, gl_account_id, name)
ALTER TABLE expense_types DROP CONSTRAINT IF EXISTS expense_types_gl_account_id_name_key;
DO $$ BEGIN
  ALTER TABLE expense_types ADD CONSTRAINT uq_expense_types_company_gl_name UNIQUE (company_id, gl_account_id, name);
EXCEPTION WHEN duplicate_table THEN END; $$;

-- 22f. allocation_mappings: UNIQUE (gl_code, allocation_code) → UNIQUE (company_id, gl_code, allocation_code)
ALTER TABLE allocation_mappings ADD COLUMN IF NOT EXISTS gl_code TEXT;
ALTER TABLE allocation_mappings DROP CONSTRAINT IF EXISTS allocation_mappings_gl_code_allocation_code_key;
DO $$ BEGIN
  ALTER TABLE allocation_mappings ADD CONSTRAINT uq_allocation_mappings_company_gl_alloc UNIQUE (company_id, gl_code, allocation_code);
EXCEPTION WHEN duplicate_table THEN END; $$;

-- 22g. companies.code should remain globally UNIQUE (cross-company uniqueness is correct for company codes)

-- 22h. user_profiles: add missing company_id index
CREATE INDEX IF NOT EXISTS idx_user_profiles_company ON user_profiles(company_id);

-- ============================================================
-- 23. Add bank account detail columns to payment_modes
-- ============================================================
ALTER TABLE payment_modes ADD COLUMN IF NOT EXISTS bank_account_no TEXT DEFAULT '';
ALTER TABLE payment_modes ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE payment_modes ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '';
ALTER TABLE payment_modes ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT '';

-- ============================================================
-- 24. User Tasks table (per-user, per-company todo list)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns added in a later iteration (safe to re-run)
ALTER TABLE user_tasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE user_tasks ADD COLUMN IF NOT EXISTS completion_percentage SMALLINT NOT NULL DEFAULT 0;

-- Drop and re-add the check constraint to allow reruns
ALTER TABLE user_tasks DROP CONSTRAINT IF EXISTS user_tasks_completion_percentage_check;
ALTER TABLE user_tasks ADD CONSTRAINT user_tasks_completion_percentage_check
  CHECK (completion_percentage >= 0 AND completion_percentage <= 100);

ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User-scoped access on user_tasks" ON user_tasks;
CREATE POLICY "User-scoped access on user_tasks"
  ON user_tasks FOR ALL TO authenticated
  USING (user_id = auth.uid() AND company_id IN (SELECT public.user_company_ids()))
  WITH CHECK (user_id = auth.uid() AND company_id IN (SELECT public.user_company_ids()));

CREATE INDEX IF NOT EXISTS idx_user_tasks_user_company ON user_tasks(user_id, company_id);

-- ============================================================
-- 25. Waitlist Signups
-- ============================================================
CREATE TABLE IF NOT EXISTS waitlist_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id UUID,
  source TEXT DEFAULT 'app',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for all on waitlist_signups" ON waitlist_signups;
CREATE POLICY "Enable insert for all on waitlist_signups"
  ON waitlist_signups FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable select for authenticated on waitlist_signups" ON waitlist_signups;
CREATE POLICY "Enable select for authenticated on waitlist_signups"
  ON waitlist_signups FOR SELECT TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_waitlist_signups_email ON waitlist_signups(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_created ON waitlist_signups(created_at);

-- ============================================================
-- 26. Avatar support
-- ============================================================
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
SELECT 'avatars', 'avatars', true, false, 2097152, ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp'::text]
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars');

-- Allow authenticated users to upload their own avatar
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Avatars are public (anyone can view)
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

-- ============================================================
-- 27. Force password reset on first login
-- ============================================================
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 29. Profile personal details
-- ============================================================
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS country TEXT;

-- ============================================================
-- 28. Field-Level Audit Log (tracks individual field changes)
-- ============================================================
CREATE TABLE IF NOT EXISTS field_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('journal_entry', 'payment', 'receipt')),
  record_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT NOT NULL,
  changed_by_name TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE field_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access on field_audit_log" ON field_audit_log;
CREATE POLICY "Enable all access on field_audit_log"
  ON field_audit_log FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_field_audit_log_record ON field_audit_log(record_type, record_id);
CREATE INDEX IF NOT EXISTS idx_field_audit_log_company ON field_audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_field_audit_log_changed_at ON field_audit_log(changed_at);

-- ============================================================
-- 30. Budget tables (period-based budgets)
-- ============================================================
CREATE TABLE IF NOT EXISTS budget_gl_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES accounting_periods(id),
  gl_account_id UUID NOT NULL REFERENCES accounts(id),
  amount NUMERIC(16,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, period_id, gl_account_id)
);

CREATE TABLE IF NOT EXISTS budget_allocation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES accounting_periods(id),
  gl_account_id UUID NOT NULL REFERENCES accounts(id),
  allocation_code TEXT NOT NULL,
  allocation_type TEXT NOT NULL DEFAULT '',
  amount NUMERIC(16,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, period_id, gl_account_id, allocation_code, allocation_type)
);

CREATE TABLE IF NOT EXISTS budget_expense_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES accounting_periods(id),
  expense_type_id UUID NOT NULL REFERENCES expense_types(id),
  amount NUMERIC(16,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, period_id, expense_type_id)
);

ALTER TABLE budget_gl_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_allocation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_expense_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access on budget_gl_accounts" ON budget_gl_accounts;
CREATE POLICY "Enable all access on budget_gl_accounts"
  ON budget_gl_accounts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable all access on budget_allocation_codes" ON budget_allocation_codes;
CREATE POLICY "Enable all access on budget_allocation_codes"
  ON budget_allocation_codes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable all access on budget_expense_types" ON budget_expense_types;
CREATE POLICY "Enable all access on budget_expense_types"
  ON budget_expense_types FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_budget_gl_accounts_company ON budget_gl_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_budget_gl_accounts_period ON budget_gl_accounts(period_id);
CREATE INDEX IF NOT EXISTS idx_budget_allocation_codes_company ON budget_allocation_codes(company_id);
CREATE INDEX IF NOT EXISTS idx_budget_allocation_codes_period ON budget_allocation_codes(period_id);
CREATE INDEX IF NOT EXISTS idx_budget_expense_types_company ON budget_expense_types(company_id);
CREATE INDEX IF NOT EXISTS idx_budget_expense_types_period ON budget_expense_types(period_id);

DROP TRIGGER IF EXISTS update_budget_gl_accounts_updated_at ON budget_gl_accounts;
CREATE TRIGGER update_budget_gl_accounts_updated_at
  BEFORE UPDATE ON budget_gl_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS update_budget_allocation_codes_updated_at ON budget_allocation_codes;
CREATE TRIGGER update_budget_allocation_codes_updated_at
  BEFORE UPDATE ON budget_allocation_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS update_budget_expense_types_updated_at ON budget_expense_types;
CREATE TRIGGER update_budget_expense_types_updated_at
  BEFORE UPDATE ON budget_expense_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add gl_code column to budget_gl_accounts if not present
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_gl_accounts' AND column_name = 'gl_code'
  ) THEN
    ALTER TABLE budget_gl_accounts ADD COLUMN gl_code TEXT;
  END IF;
END $$;

-- Add gl_account_id and allocation_type columns if not present, rebuild unique constraint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_allocation_codes' AND column_name = 'gl_account_id'
  ) THEN
    ALTER TABLE budget_allocation_codes ADD COLUMN gl_account_id UUID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_allocation_codes' AND column_name = 'allocation_type'
  ) THEN
    ALTER TABLE budget_allocation_codes ADD COLUMN allocation_type TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

-- Rebuild unique constraint to include all columns
ALTER TABLE budget_allocation_codes DROP CONSTRAINT IF EXISTS budget_allocation_codes_company_id_period_id_allocation_code_key;
ALTER TABLE budget_allocation_codes DROP CONSTRAINT IF EXISTS budget_allocation_codes_company_id_period_id_gl_account_id_allocation_code_key;
ALTER TABLE budget_allocation_codes ADD UNIQUE (company_id, period_id, gl_account_id, allocation_code, allocation_type);
