export type UserType = 'Superuser' | 'Manager' | 'Team Leader' | 'User'

export const USER_TYPES: UserType[] = ['Superuser', 'Manager', 'Team Leader', 'User']

/** Default allowed menu keys per user type. '*' = all menus. */
export const DEFAULT_PERMISSIONS: Record<UserType, string[]> = {
  Superuser: ['*'],
  Manager: ['accountant', 'journal', 'ledger', 'payments', 'receipts', 'trialbalance', 'reports', 'settings', 'allocationmappings', 'allocationtypes', 'accountingperiods', 'pending-posting', 'user-sessions', 'usermgmt', 'paymentmodes'],
  'Team Leader': ['dashboard', 'accountant', 'journal', 'ledger', 'payments', 'receipts', 'trialbalance', 'reports', 'settings', 'allocationmappings', 'allocationtypes', 'accountingperiods', 'pending-posting', 'user-sessions', 'paymentmodes'],
  User: ['dashboard', 'accountant', 'ledger', 'payments', 'receipts', 'trialbalance', 'settings', 'allocationmappings', 'allocationtypes', 'accountingperiods', 'user-sessions', 'paymentmodes'],
}

let currentPermissions: Record<UserType, string[]> | null = null

export function getPermissions(): Record<UserType, string[]> {
  if (currentPermissions) return currentPermissions
  try {
    const stored = localStorage.getItem('rbac_menus')
    if (stored) {
      currentPermissions = JSON.parse(stored) as Record<UserType, string[]>
      return currentPermissions
    }
  } catch { /* ignore */ }
  currentPermissions = structuredClone(DEFAULT_PERMISSIONS)
  return currentPermissions!
}

export function savePermissions(perms: Record<UserType, string[]>) {
  currentPermissions = perms
  localStorage.setItem('rbac_menus', JSON.stringify(perms))
}

/** Add a menu key to a user type's allowed list */
export function grantMenu(userType: UserType, menuKey: string) {
  if (userType === 'Superuser') return
  const perms = getPermissions()
  if (!perms[userType].includes(menuKey)) {
    perms[userType] = [...perms[userType], menuKey]
    savePermissions(perms)
  }
}

/** Remove a menu key from a user type's allowed list */
export function revokeMenu(userType: UserType, menuKey: string) {
  if (userType === 'Superuser') return
  const perms = getPermissions()
  perms[userType] = perms[userType].filter((k) => k !== menuKey)
  savePermissions(perms)
}

/** Check if a user type can access a menu key */
export function canAccess(userType: UserType | null, menuKey: string): boolean {
  if (!userType) return false
  if (userType === 'Superuser') return true
  const perms = getPermissions()
  const allowed = perms[userType] ?? []
  return allowed.includes('*') || allowed.includes(menuKey)
}

export function resetPermissions() {
  currentPermissions = structuredClone(DEFAULT_PERMISSIONS)
  localStorage.setItem('rbac_menus', JSON.stringify(currentPermissions))
}
