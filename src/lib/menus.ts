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
  { key: 'dashboard',   label: 'Home',        route: '/',                module: 'Overview' },
  { key: 'budget',       label: 'Budget',     route: '/budget',           module: 'Reporting' },
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
  {
    key: 'reporting',
    label: 'Reporting',
    module: 'Reporting',
    children: [
      { key: 'ledger',      label: 'General Ledger',     route: '/general-ledger',               module: 'Reporting' },
      { key: 'trialbalance', label: 'Trial Balance',      route: '/trial-balance',                module: 'Reporting' },
      { key: 'reports',      label: 'Financial Reports',   route: '/reports',                      module: 'Reporting' },
      { key: 'allocation-report-analysis', label: 'Allocation Report Analysis', route: '/allocation-report-analysis', module: 'Reporting' },
      { key: 'expense-type-analysis',    label: 'Expense Type Analysis',     route: '/expense-type-analysis',    module: 'Reporting' },
      { key: 'budget-analysis',         label: 'Budget vs Actual',           route: '/budget-analysis',              module: 'Reporting' },
      { key: 'bank-report',              label: 'Bank Report',               route: '/bank-report',              module: 'Reporting' },
    ],
  },
  {
    key: 'eom',
    label: 'EOM',
    module: 'Accounting',
    children: [
      { key: 'pending-posting', label: 'Post to Ledger', route: '/pending-posting', module: 'Accounting' },
    ],
  },
  {
    key: 'settings',
    label: 'Reference Data',
    module: 'Administration',
    children: [
      { key: 'accountant',       label: 'Chart of Accounts',    route: '/accounts',             module: 'Administration' },
      { key: 'paymentmodes',    label: 'Bank Accounts',       route: '/payment-modes',        module: 'Administration' },
      { key: 'allocationmappings', label: 'Allocation Codes', route: '/allocation-mappings',  module: 'Administration' },
      { key: 'allocationtypes',    label: 'Allocation Types', route: '/allocation-types',     module: 'Administration' },
      { key: 'accountingperiods',  label: 'Accounting Periods',  route: '/accounting-periods',   module: 'Administration' },
    ],
  },
  {
    key: 'usersettings',
    label: 'Settings',
    module: 'Administration',
    children: [
      { key: 'user-sessions', label: 'User Sessions',    route: '/user-sessions', module: 'Administration' },
      { key: 'companies',    label: 'Companies',        route: '/companies',    module: 'Administration' },
    ],
  },
  {
    key: 'security',
    label: 'Security',
    module: 'Administration',
    children: [
      { key: 'usermgmt',     label: 'User Management',  route: '/usermgmt',     module: 'Administration' },
      { key: 'audit-trail',       label: 'Audit Trail',        route: '/audit-trail',       module: 'Administration' },
      { key: 'field-audit-log',   label: 'Field Audit Log',    route: '/field-audit-log',   module: 'Administration' },
      { key: 'object-manager',    label: 'Object Manager',     route: '/object-manager',    module: 'Administration' },
    ],
  },
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
