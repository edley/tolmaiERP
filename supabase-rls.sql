-- Tolmai ERP - Row-Level Security Policies
-- Run this in the Supabase SQL Editor to replace permissive policies with company-scoped ones
-- Requires: supabase-migration.sql to have been run (all tables need company_id)
-- Fully idempotent — safe to re-run.

-- Helper: returns company IDs the current user has access to
CREATE OR REPLACE FUNCTION public.user_company_ids()
RETURNS SETOF UUID
LANGUAGE SQL STABLE
AS $$
  SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()
$$;

-- ============================================================
-- 1. COMPANIES
-- ============================================================
DROP POLICY IF EXISTS "Enable all access on companies" ON companies;
DROP POLICY IF EXISTS "Users can view their companies" ON companies;
CREATE POLICY "Users can view their companies" ON companies
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.user_company_ids()));

-- ============================================================
-- 2. USER_COMPANIES
-- ============================================================
DROP POLICY IF EXISTS "Enable all access on user_companies" ON user_companies;
DROP POLICY IF EXISTS "Users can view their own company memberships" ON user_companies;
CREATE POLICY "Users can view their own company memberships" ON user_companies
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 3. ACCOUNTS
-- ============================================================
DROP POLICY IF EXISTS "Enable all access on accounts" ON accounts;
DROP POLICY IF EXISTS "Company-scoped access on accounts" ON accounts;
CREATE POLICY "Company-scoped access on accounts" ON accounts
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.user_company_ids()))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()));

-- ============================================================
-- 4. JOURNAL ENTRIES, ITEMS, ALLOCATIONS
-- ============================================================
DROP POLICY IF EXISTS "Enable all access on journal_entries" ON journal_entries;
DROP POLICY IF EXISTS "Company-scoped access on journal_entries" ON journal_entries;
CREATE POLICY "Company-scoped access on journal_entries" ON journal_entries
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.user_company_ids()))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()));

DROP POLICY IF EXISTS "Enable all access on journal_entry_items" ON journal_entry_items;
DROP POLICY IF EXISTS "Company-scoped access on journal_entry_items" ON journal_entry_items;
CREATE POLICY "Company-scoped access on journal_entry_items" ON journal_entry_items
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.user_company_ids()))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()));

DROP POLICY IF EXISTS "Enable all access on journal_entry_item_allocations" ON journal_entry_item_allocations;
DROP POLICY IF EXISTS "Company-scoped access on journal_entry_item_allocations" ON journal_entry_item_allocations;
CREATE POLICY "Company-scoped access on journal_entry_item_allocations" ON journal_entry_item_allocations
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.user_company_ids()))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()));

-- ============================================================
-- 5. LEDGER ENTRIES
-- ============================================================
DROP POLICY IF EXISTS "Enable all access on ledger_entries" ON ledger_entries;
DROP POLICY IF EXISTS "Company-scoped access on ledger_entries" ON ledger_entries;
CREATE POLICY "Company-scoped access on ledger_entries" ON ledger_entries
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.user_company_ids()))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()));

-- ============================================================
-- 6. ACCOUNTING PERIODS
-- ============================================================
DROP POLICY IF EXISTS "Enable all access on accounting_periods" ON accounting_periods;
DROP POLICY IF EXISTS "Company-scoped access on accounting_periods" ON accounting_periods;
CREATE POLICY "Company-scoped access on accounting_periods" ON accounting_periods
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.user_company_ids()))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()));

-- ============================================================
-- 7. TRANSACTION TYPES
-- ============================================================
DROP POLICY IF EXISTS "Enable all access on transaction_types" ON transaction_types;
DROP POLICY IF EXISTS "Company-scoped access on transaction_types" ON transaction_types;
CREATE POLICY "Company-scoped access on transaction_types" ON transaction_types
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.user_company_ids()))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()));

-- ============================================================
-- 8. PAYMENT MODES
-- ============================================================
DROP POLICY IF EXISTS "Enable all access on payment_modes" ON payment_modes;
DROP POLICY IF EXISTS "Company-scoped access on payment_modes" ON payment_modes;
CREATE POLICY "Company-scoped access on payment_modes" ON payment_modes
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.user_company_ids()))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()));

-- ============================================================
-- 9. PAYMENTS, PAYMENT_LINES, ALLOCATIONS
-- ============================================================
DROP POLICY IF EXISTS "Enable all access on payments" ON payments;
DROP POLICY IF EXISTS "Company-scoped access on payments" ON payments;
CREATE POLICY "Company-scoped access on payments" ON payments
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.user_company_ids()))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()));

DROP POLICY IF EXISTS "Enable all access on payment_lines" ON payment_lines;
DROP POLICY IF EXISTS "Company-scoped access on payment_lines" ON payment_lines;
CREATE POLICY "Company-scoped access on payment_lines" ON payment_lines
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.user_company_ids()))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()));

DROP POLICY IF EXISTS "Enable all access on payment_line_allocations" ON payment_line_allocations;
DROP POLICY IF EXISTS "Company-scoped access on payment_line_allocations" ON payment_line_allocations;
CREATE POLICY "Company-scoped access on payment_line_allocations" ON payment_line_allocations
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.user_company_ids()))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()));

-- ============================================================
-- 10. RECEIPTS, RECEIPT_LINES, ALLOCATIONS
-- ============================================================
DROP POLICY IF EXISTS "Enable all access on receipts" ON receipts;
DROP POLICY IF EXISTS "Company-scoped access on receipts" ON receipts;
CREATE POLICY "Company-scoped access on receipts" ON receipts
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.user_company_ids()))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()));

DROP POLICY IF EXISTS "Enable all access on receipt_lines" ON receipt_lines;
DROP POLICY IF EXISTS "Company-scoped access on receipt_lines" ON receipt_lines;
CREATE POLICY "Company-scoped access on receipt_lines" ON receipt_lines
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.user_company_ids()))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()));

DROP POLICY IF EXISTS "Enable all access on receipt_line_allocations" ON receipt_line_allocations;
DROP POLICY IF EXISTS "Company-scoped access on receipt_line_allocations" ON receipt_line_allocations;
CREATE POLICY "Company-scoped access on receipt_line_allocations" ON receipt_line_allocations
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.user_company_ids()))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()));

-- ============================================================
-- 11. ALLOCATION MAPPINGS
-- ============================================================
DROP POLICY IF EXISTS "Enable all access on allocation_mappings" ON allocation_mappings;
DROP POLICY IF EXISTS "Company-scoped access on allocation_mappings" ON allocation_mappings;
CREATE POLICY "Company-scoped access on allocation_mappings" ON allocation_mappings
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.user_company_ids()))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()));

-- ============================================================
-- 12. TRIAL BALANCES
-- ============================================================
DROP POLICY IF EXISTS "Enable all access on trial_balances" ON trial_balances;
DROP POLICY IF EXISTS "Company-scoped access on trial_balances" ON trial_balances;
CREATE POLICY "Company-scoped access on trial_balances" ON trial_balances
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.user_company_ids()))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()));

-- ============================================================
-- 13. EXPENSE TYPES
-- ============================================================
DROP POLICY IF EXISTS "Enable all access on expense_types" ON expense_types;
DROP POLICY IF EXISTS "Company-scoped access on expense_types" ON expense_types;
CREATE POLICY "Company-scoped access on expense_types" ON expense_types
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.user_company_ids()))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()));

-- ============================================================
-- 14. USER PROFILES
-- ============================================================
DROP POLICY IF EXISTS "Enable all access on user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Users can update their own profile (name, avatar_url, password_reset_required)
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Superusers can update any profile
DROP POLICY IF EXISTS "Superusers can update any profile" ON user_profiles;
CREATE POLICY "Superusers can update any profile" ON user_profiles
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'Superuser'));
