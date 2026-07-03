import type { Account, AllocationType } from '../types'

export function resolveTypeAccounts(types: AllocationType[], accounts: Account[]): AllocationType[] {
  if (accounts.length === 0) return types
  return types.map((t) => ({
    ...t,
    gl_account: t.gl_account_id ? accounts.find((a) => a.id === t.gl_account_id) : undefined,
  }))
}

export function getTypeNamesForGlCode(glCode: string, types: AllocationType[]): string[] {
  return types.filter((t) => t.gl_code === glCode && t.active).map((t) => t.name)
}
