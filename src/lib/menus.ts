export interface MenuDef {
  key: string
  label: string
  route: string
  module: string
}

/** Single source of truth for all navigable menus.
 *  Add new pages here and they automatically appear in the sidebar,
 *  permission system, and User Management. */
export const ALL_MENUS: MenuDef[] = [
  { key: 'dashboard',   label: 'Dashboard',        route: '/',                module: 'Overview' },
  { key: 'accountant',  label: 'Chart of Accounts', route: '/accounts',        module: 'Accounting' },
  { key: 'journal',     label: 'Journal Entries',   route: '/journal-entries', module: 'Accounting' },
  { key: 'ledger',      label: 'General Ledger',    route: '/general-ledger',  module: 'Accounting' },
  { key: 'payments',    label: 'Payments',          route: '/payments',        module: 'Accounting' },
  { key: 'reports',     label: 'Financial Reports',  route: '/reports',         module: 'Reports' },
  { key: 'settings',    label: 'Settings',           route: '/settings',        module: 'Administration' },
  { key: 'accountingperiods', label: 'Accounting Periods', route: '/accounting-periods', module: 'Administration' },
  { key: 'usermgmt',    label: 'User Management',    route: '/usermgmt',        module: 'Administration' },
]

export function getMenuByKey(key: string): MenuDef | undefined {
  return ALL_MENUS.find((m) => m.key === key)
}

export function getModules(): string[] {
  return [...new Set(ALL_MENUS.map((m) => m.module))]
}
