export interface MenuDef {
  key: string
  label: string
  route: string
  module: string
}

export interface MenuGroup {
  key: string
  label: string
  module: string
  children: MenuDef[]
}

export type MenuItem = MenuDef | MenuGroup

export function isGroup(item: MenuItem): item is MenuGroup {
  return 'children' in item
}

/** Single source of truth for all navigable menus.
 *  Add new pages here and they automatically appear in the sidebar,
 *  permission system, and User Management. */
export const ALL_MENUS: MenuItem[] = [
  { key: 'dashboard',   label: 'Dashboard',        route: '/',                module: 'Overview' },
  {
    key: 'transactions',
    label: 'Transactions',
    module: 'Accounting',
    children: [
      { key: 'journal',     label: 'Journal Entries',   route: '/journal-entries', module: 'Accounting' },
      { key: 'payments',    label: 'Payments',          route: '/payments',        module: 'Accounting' },
      { key: 'receipts',    label: 'Receipts',          route: '/receipts',        module: 'Accounting' },
    ],
  },
  { key: 'ledger',      label: 'General Ledger',    route: '/general-ledger',  module: 'Accounting' },
  { key: 'trialbalance', label: 'Trial Balance',     route: '/trial-balance',   module: 'Accounting' },
  { key: 'reports',      label: 'Financial Reports',  route: '/reports',         module: 'Reports' },
  { key: 'allocation-report-analysis', label: 'Allocation Report Analysis', route: '/allocation-report-analysis', module: 'Reports' },
  {
    key: 'settings',
    label: 'Reference Data',
    module: 'Administration',
    children: [
      { key: 'accountant',       label: 'Chart of Accounts',    route: '/accounts',             module: 'Administration' },
      { key: 'allocationmappings', label: 'Allocation Codes', route: '/allocation-mappings',  module: 'Administration' },
      { key: 'accountingperiods',  label: 'Accounting Periods',  route: '/accounting-periods',   module: 'Administration' },
    ],
  },
  { key: 'usermgmt',    label: 'User Management',    route: '/usermgmt',        module: 'Administration' },
]

const flatMenus: MenuDef[] = []
function flatten(items: MenuItem[]) {
  for (const item of items) {
    if (isGroup(item)) {
      flatten(item.children)
    } else {
      flatMenus.push(item)
    }
  }
}
flatten(ALL_MENUS)

export function getMenuByKey(key: string): MenuDef | undefined {
  return flatMenus.find((m) => m.key === key)
}

export function getModules(): string[] {
  return [...new Set(flatMenus.map((m) => m.module))]
}

export function getFlatMenus(): MenuDef[] {
  return [...flatMenus]
}
