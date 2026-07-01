import type { BudgetGlAccount, BudgetAllocationCode, BudgetExpenseType } from '../types'
import { supabase, isOnline } from './supabase'

export interface BudgetActualRow {
  account_id: string
  account_code: string | null
  account_name: string
  account_type: string
  budget_amount: number
  actual_debit: number
  actual_credit: number
  variance: number
  variance_pct: number | null
}

function uid(): string {
  return crypto.randomUUID()
}

// ---------------------------------------------------------------
// GL Account Budgets
// ---------------------------------------------------------------
export async function getGlAccountBudgets(companyId: string, periodId: string): Promise<BudgetGlAccount[]> {
  if (!supabase || !isOnline()) return []
  const { data, error } = await supabase
    .from('budget_gl_accounts')
    .select('*')
    .eq('company_id', companyId)
    .eq('period_id', periodId)
  if (error) { console.error('Failed to fetch GL budgets:', error.message); return [] }
  return data ?? []
}

export async function upsertGlAccountBudget(
  companyId: string,
  periodId: string,
  glAccountId: string,
  amount: number,
): Promise<BudgetGlAccount> {
  const row = {
    company_id: companyId,
    period_id: periodId,
    gl_account_id: glAccountId,
    amount,
  }

  if (!supabase || !isOnline()) {
    return { id: uid(), ...row, gl_code: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  }

  const { data, error } = await supabase
    .from('budget_gl_accounts')
    .upsert(row, { onConflict: 'company_id,period_id,gl_account_id' })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteGlAccountBudget(id: string): Promise<void> {
  if (!supabase || !isOnline()) return
  await supabase.from('budget_gl_accounts').delete().eq('id', id)
}

// ---------------------------------------------------------------
// Allocation Code Budgets
// ---------------------------------------------------------------
export async function getAllocationCodeBudgets(
  companyId: string,
  periodId: string,
  glAccountId: string,
): Promise<BudgetAllocationCode[]> {
  if (!supabase || !isOnline()) return []
  const { data, error } = await supabase
    .from('budget_allocation_codes')
    .select('*')
    .eq('company_id', companyId)
    .eq('period_id', periodId)
    .eq('gl_account_id', glAccountId)
  if (error) { console.error('Failed to fetch allocation budgets:', error.message); return [] }
  return data ?? []
}

export async function upsertAllocationCodeBudget(
  companyId: string,
  periodId: string,
  glAccountId: string,
  allocationCode: string,
  allocationType: string,
  amount: number,
): Promise<BudgetAllocationCode> {
  const row = {
    company_id: companyId,
    period_id: periodId,
    gl_account_id: glAccountId,
    allocation_code: allocationCode,
    allocation_type: allocationType,
    amount,
  }

  if (!supabase || !isOnline()) {
    return { id: uid(), ...row, description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  }

  const { data, error } = await supabase
    .from('budget_allocation_codes')
    .upsert(row, { onConflict: 'company_id,period_id,gl_account_id,allocation_code,allocation_type' })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteAllocationCodeBudget(id: string): Promise<void> {
  if (!supabase || !isOnline()) return
  await supabase.from('budget_allocation_codes').delete().eq('id', id)
}

// ---------------------------------------------------------------
// Expense Type Budgets
// ---------------------------------------------------------------
export async function getExpenseTypeBudgets(companyId: string, periodId: string): Promise<BudgetExpenseType[]> {
  if (!supabase || !isOnline()) return []
  const { data, error } = await supabase
    .from('budget_expense_types')
    .select('*')
    .eq('company_id', companyId)
    .eq('period_id', periodId)
  if (error) { console.error('Failed to fetch expense type budgets:', error.message); return [] }
  return data ?? []
}

export async function upsertExpenseTypeBudget(
  companyId: string,
  periodId: string,
  expenseTypeId: string,
  amount: number,
): Promise<BudgetExpenseType> {
  const row = {
    company_id: companyId,
    period_id: periodId,
    expense_type_id: expenseTypeId,
    amount,
  }

  if (!supabase || !isOnline()) {
    return { id: uid(), ...row, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  }

  const { data, error } = await supabase
    .from('budget_expense_types')
    .upsert(row, { onConflict: 'company_id,period_id,expense_type_id' })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteExpenseTypeBudget(id: string): Promise<void> {
  if (!supabase || !isOnline()) return
  await supabase.from('budget_expense_types').delete().eq('id', id)
}

// ---------------------------------------------------------------
// Budget vs Actual Analysis
// ---------------------------------------------------------------
export async function getBudgetActuals(
  companyId: string,
  periodId: string,
): Promise<BudgetActualRow[]> {
  if (!supabase || !isOnline()) return []

  const { data: budgets, error: bErr } = await supabase
    .from('budget_gl_accounts')
    .select('gl_account_id, amount')
    .eq('company_id', companyId)
    .eq('period_id', periodId)
  if (bErr) { console.error('Failed to fetch budgets:', bErr.message); return [] }

  const { data: ledgers, error: lErr } = await supabase
    .from('ledger_entries')
    .select('account_id, debit, credit')
    .eq('company_id', companyId)
    .eq('period_id', periodId)
  if (lErr) { console.error('Failed to fetch ledger entries:', lErr.message); return [] }

  const { data: accounts, error: aErr } = await supabase
    .from('accounts')
    .select('id, code, name, type')
    .eq('company_id', companyId)
  if (aErr) { console.error('Failed to fetch accounts:', aErr.message); return [] }

  const budgetMap = new Map<string, number>()
  for (const b of budgets) {
    budgetMap.set(b.gl_account_id, b.amount)
  }

  const actualMap = new Map<string, { debit: number; credit: number }>()
  for (const le of ledgers) {
    const cur = actualMap.get(le.account_id) ?? { debit: 0, credit: 0 }
    cur.debit += le.debit ?? 0
    cur.credit += le.credit ?? 0
    actualMap.set(le.account_id, cur)
  }

  const rows: BudgetActualRow[] = []

  for (const acct of accounts) {
    if (!budgetMap.has(acct.id)) continue
    const budgetAmount = budgetMap.get(acct.id) ?? 0
    const actuals = actualMap.get(acct.id) ?? { debit: 0, credit: 0 }
    const isExpense = acct.type === 'expense'
    const isIncome = acct.type === 'income'
    let netActual = 0
    if (isExpense) netActual = actuals.debit - actuals.credit
    else if (isIncome) netActual = actuals.credit - actuals.debit
    else netActual = actuals.debit - actuals.credit

    const variance = budgetAmount - netActual
    const variance_pct = budgetAmount !== 0 ? Math.round((variance / budgetAmount) * 10000) / 100 : null

    rows.push({
      account_id: acct.id,
      account_code: acct.code,
      account_name: acct.name,
      account_type: acct.type,
      budget_amount: budgetAmount,
      actual_debit: actuals.debit,
      actual_credit: actuals.credit,
      variance,
      variance_pct,
    })
  }

  return rows
}
