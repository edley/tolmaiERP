import type { Account, AllocationMapping } from '../types'

export function resolveMappingAccounts(mappings: AllocationMapping[], accounts: Account[]): AllocationMapping[] {
  if (accounts.length === 0) return mappings
  return mappings.map((m) => ({
    ...m,
    gl_account: m.gl_account_id ? accounts.find((a) => a.id === m.gl_account_id) : undefined,
  }))
}
