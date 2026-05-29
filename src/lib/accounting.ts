import type { Account, AccountType, JournalEntryItem } from '../types'

export const ACCOUNT_TYPE_ORDER: AccountType[] = ['asset', 'liability', 'equity', 'income', 'expense']

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  asset: 'Asset',
  liability: 'Liability',
  equity: 'Equity',
  income: 'Income',
  expense: 'Expense',
}

export function buildAccountTree(accounts: Account[]): Account[] {
  const map = new Map<string, Account>()
  const roots: Account[] = []

  for (const acc of accounts) {
    map.set(acc.id, { ...acc, children: [] })
  }

  for (const acc of map.values()) {
    if (acc.parent_id && map.has(acc.parent_id)) {
      map.get(acc.parent_id)!.children!.push(acc)
    } else {
      roots.push(acc)
    }
  }

  return sortAccounts(roots)
}

function sortAccounts(accounts: Account[]): Account[] {
  const sorted = accounts.sort((a, b) => {
    const aIdx = ACCOUNT_TYPE_ORDER.indexOf(a.type)
    const bIdx = ACCOUNT_TYPE_ORDER.indexOf(b.type)
    if (aIdx !== bIdx) return aIdx - bIdx
    if (a.code && b.code) return a.code.localeCompare(b.code)
    return a.name.localeCompare(b.name)
  })

  for (const acc of sorted) {
    if (acc.children && acc.children.length > 0) {
      acc.children = sortAccounts(acc.children)
    }
  }

  return sorted
}

export function validateJournalEntry(items: JournalEntryItem[]): {
  valid: boolean
  message?: string
} {
  if (items.length < 2) {
    return { valid: false, message: 'At least two lines are required for a journal entry' }
  }

  const totalDebit = items.reduce((sum, item) => sum + Number(item.debit), 0)
  const totalCredit = items.reduce((sum, item) => sum + Number(item.credit), 0)

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return { valid: false, message: `Debit (${totalDebit.toFixed(2)}) must equal Credit (${totalCredit.toFixed(2)})` }
  }

  if (totalDebit === 0) {
    return { valid: false, message: 'Total debit/credit must be greater than zero' }
  }

  const hasEmptyAccount = items.some((item) => !item.account_id)
  if (hasEmptyAccount) {
    return { valid: false, message: 'All lines must have an account selected' }
  }

  return { valid: true }
}

export function generateEntryNumber(sequence: number): string {
  const year = new Date().getFullYear()
  return `JE-${year}-${String(sequence).padStart(4, '0')}`
}
