import type { Account, JournalEntry, JournalEntryItem, LedgerEntry, TrialBalanceRow, AccountType, TransactionType } from '../types'

let idCounter = 0
function uid(): string {
  idCounter++
  return `demo-${idCounter}-${Date.now()}`
}

function generateEntryNumber(seq: number): string {
  return `JE-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`
}

export function buildDemoAccounts(): Account[] {
  const raw: Omit<Account, 'id'>[] = [
    { name: 'Current Assets', code: '1000', type: 'asset' as AccountType, parent_id: null, is_group: true, is_cash_account: false, allocation_allow: false, description: 'Assets expected to be converted to cash within one year', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Cash and Cash Equivalents', code: '1100', type: 'asset' as AccountType, parent_id: null, is_group: true, is_cash_account: true, allocation_allow: false, description: 'Cash on hand and in bank', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Petty Cash', code: '1110', type: 'asset' as AccountType, parent_id: null, is_group: false, is_cash_account: true, allocation_allow: false, description: 'Cash on hand for small expenses', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Cash in Bank - Operating', code: '1120', type: 'asset' as AccountType, parent_id: null, is_group: false, is_cash_account: true, allocation_allow: false, description: 'Primary operating checking account', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Cash in Bank - Payroll', code: '1130', type: 'asset' as AccountType, parent_id: null, is_group: false, is_cash_account: true, allocation_allow: false, description: 'Dedicated payroll account', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Cash in Bank - Savings', code: '1140', type: 'asset' as AccountType, parent_id: null, is_group: false, is_cash_account: true, allocation_allow: false, description: 'Interest-bearing savings account', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Cash in Bank - Tax', code: '1150', type: 'asset' as AccountType, parent_id: null, is_group: false, is_cash_account: true, allocation_allow: false, description: 'Tax withholding account', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Accounts Receivable', code: '1200', type: 'asset' as AccountType, parent_id: null, is_group: true, is_cash_account: false, allocation_allow: false, description: 'Amounts owed by customers', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Trade Debtors', code: '1210', type: 'asset' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: false, description: 'Customer invoice receivables', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Other Receivables', code: '1220', type: 'asset' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: false, description: 'Non-trade receivables', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Allowance for Doubtful Accounts', code: '1230', type: 'asset' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: false, description: 'Estimated uncollectible receivables', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Inventory', code: '1300', type: 'asset' as AccountType, parent_id: null, is_group: true, is_cash_account: false, allocation_allow: false, description: 'Goods held for sale', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Raw Materials', code: '1310', type: 'asset' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: false, description: 'Unprocessed materials', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Work in Progress', code: '1320', type: 'asset' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: false, description: 'Partially completed goods', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Finished Goods', code: '1330', type: 'asset' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: false, description: 'Completed goods ready for sale', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Inventory Reserve', code: '1340', type: 'asset' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: false, description: 'Obsolescence/valuation reserve', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Prepaid Expenses', code: '1400', type: 'asset' as AccountType, parent_id: null, is_group: true, is_cash_account: false, allocation_allow: false, description: 'Payments made in advance', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Prepaid Rent', code: '1410', type: 'asset' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: false, description: 'Rent paid in advance', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Prepaid Insurance', code: '1420', type: 'asset' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: false, description: 'Insurance premiums paid in advance', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Fixed Assets', code: '1600', type: 'asset' as AccountType, parent_id: null, is_group: true, is_cash_account: false, allocation_allow: false, description: 'Long-term tangible assets', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Computer Equipment', code: '1640', type: 'asset' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: false, description: 'Servers, workstations, laptops', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Office Furniture & Fixtures', code: '1650', type: 'asset' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: false, description: 'Desks, chairs, cabinets', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Current Liabilities', code: '2000', type: 'liability' as AccountType, parent_id: null, is_group: true, is_cash_account: false, allocation_allow: false, description: 'Obligations due within one year', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Accounts Payable', code: '2100', type: 'liability' as AccountType, parent_id: null, is_group: true, is_cash_account: false, allocation_allow: false, description: 'Amounts owed to suppliers', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Trade Creditors', code: '2110', type: 'liability' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: false, description: 'Supplier invoices payable', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Accrued Expenses', code: '2120', type: 'liability' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: false, description: 'Expenses incurred but not yet billed', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Payroll Liabilities', code: '2200', type: 'liability' as AccountType, parent_id: null, is_group: true, is_cash_account: false, allocation_allow: false, description: 'Employee-related obligations', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Salaries Payable', code: '2210', type: 'liability' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: false, description: 'Accrued salaries not yet paid', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Payroll Taxes Payable', code: '2230', type: 'liability' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: false, description: 'Withheld payroll taxes', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Tax Liabilities', code: '2300', type: 'liability' as AccountType, parent_id: null, is_group: true, is_cash_account: false, allocation_allow: false, description: 'Tax obligations', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Income Tax Payable', code: '2310', type: 'liability' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: false, description: 'Corporate income tax payable', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Sales Tax Payable', code: '2320', type: 'liability' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: false, description: 'Output tax collected', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Deferred Revenue', code: '2410', type: 'liability' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: false, description: 'Unearned customer prepayments', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Short-term Loans', code: '2420', type: 'liability' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: false, description: 'Bank loans due < 1 year', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Long-term Liabilities', code: '2500', type: 'liability' as AccountType, parent_id: null, is_group: true, is_cash_account: false, allocation_allow: false, description: 'Obligations due beyond one year', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Long-term Loans', code: '2510', type: 'liability' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: false, description: 'Bank loans > 1 year', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Equity', code: '3000', type: 'equity' as AccountType, parent_id: null, is_group: true, is_cash_account: false, allocation_allow: false, description: 'Shareholders equity', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Share Capital - Ordinary', code: '3100', type: 'equity' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: false, description: 'Common stock at par value', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Retained Earnings', code: '3300', type: 'equity' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: false, description: 'Cumulative retained profits', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Current Year Earnings', code: '3400', type: 'equity' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: false, description: 'This fiscal year net profit/loss', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Revenue', code: '4000', type: 'income' as AccountType, parent_id: null, is_group: true, is_cash_account: false, allocation_allow: false, description: 'Operating income', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Product Sales Revenue', code: '4100', type: 'income' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'Revenue from product sales', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Service Revenue', code: '4200', type: 'income' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'Revenue from services rendered', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Consulting Revenue', code: '4300', type: 'income' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'Revenue from consulting engagements', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Other Income', code: '4900', type: 'income' as AccountType, parent_id: null, is_group: true, is_cash_account: false, allocation_allow: false, description: 'Non-operating income', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Interest Income', code: '4910', type: 'income' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'Bank interest earned', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Cost of Goods Sold', code: '5000', type: 'expense' as AccountType, parent_id: null, is_group: true, is_cash_account: false, allocation_allow: false, description: 'Direct costs attributable to revenue', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Raw Material Purchases', code: '5100', type: 'expense' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'Cost of raw materials', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Direct Labor', code: '5200', type: 'expense' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'Production staff wages', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Manufacturing Overhead', code: '5300', type: 'expense' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'Factory indirect costs', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Operating Expenses', code: '6000', type: 'expense' as AccountType, parent_id: null, is_group: true, is_cash_account: false, allocation_allow: false, description: 'General and administrative expenses', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Management Salaries', code: '6110', type: 'expense' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'Executive and management compensation', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Administrative Salaries', code: '6120', type: 'expense' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'Admin staff salaries', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Sales Commissions', code: '6130', type: 'expense' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'Sales team commissions', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Health Insurance', code: '6210', type: 'expense' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'Employee health coverage', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Payroll Taxes', code: '6230', type: 'expense' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'Employer social security/medicare', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Office Rent', code: '6310', type: 'expense' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'Office space lease payments', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Office Supplies', code: '6320', type: 'expense' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'Stationery and consumables', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Utilities', code: '6330', type: 'expense' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'Electricity, water, internet', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Software Subscriptions', code: '6410', type: 'expense' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'SaaS and license fees', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Cloud Services', code: '6430', type: 'expense' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'Cloud hosting costs', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Legal Fees', code: '6510', type: 'expense' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'Attorney and legal costs', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Accounting & Audit', code: '6520', type: 'expense' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'CPA and auditor fees', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Bank Charges', code: '6540', type: 'expense' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'Bank service and merchant fees', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Digital Advertising', code: '6610', type: 'expense' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'Online ads and PPC', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Air Travel', code: '6710', type: 'expense' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'Flight tickets', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Hotel & Accommodation', code: '6720', type: 'expense' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'Hotel stays', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Meals & Entertainment', code: '6730', type: 'expense' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'Client and team meals', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Depreciation - Equipment', code: '6820', type: 'expense' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'Computer and machinery depreciation', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Insurance', code: '6910', type: 'expense' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'General liability and property insurance', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Interest Expense', code: '7100', type: 'expense' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'Interest on loans and borrowings', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { name: 'Income Tax Expense', code: '7300', type: 'expense' as AccountType, parent_id: null, is_group: false, is_cash_account: false, allocation_allow: true, description: 'Corporate income tax provision', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ]

  const ids = new Map<string, string>()
  const result: Account[] = raw.map((a) => ({ ...a, id: uid() }))
  for (const a of result) ids.set(a.code!, a.id)
  const groupChildren: Record<string, string[]> = {
    '1000': ['1100','1200','1300','1400'],
    '1100': ['1110','1120','1130','1140','1150'],
    '1200': ['1210','1220','1230'],
    '1300': ['1310','1320','1330','1340'],
    '1400': ['1410','1420'],
    '1600': ['1640','1650'],
    '2000': ['2100','2200','2300','2400','2500'],
    '2100': ['2110','2120'],
    '2200': ['2210','2230'],
    '2300': ['2310','2320'],
    '2400': ['2410','2420'],
    '2500': ['2510'],
    '3000': ['3100','3300','3400'],
    '4000': ['4100','4200','4300','4900'],
    '4900': ['4910'],
    '5000': ['5100','5200','5300'],
    '6000': ['6100','6200','6300','6400','6500','6600','6700','6800','6900','7000'],
    '6100': ['6110','6120','6130'],
    '6200': ['6210','6230'],
    '6300': ['6310','6320','6330'],
    '6400': ['6410','6430'],
    '6500': ['6510','6520','6540'],
    '6600': ['6610'],
    '6700': ['6710','6720','6730'],
    '6800': ['6820'],
    '6900': ['6910'],
    '7000': ['7100','7300'],
  }

  for (const [parentCode, childCodes] of Object.entries(groupChildren)) {
    const pid = ids.get(parentCode)
    if (pid) {
      for (const cc of childCodes) {
        const cid = ids.get(cc)
        if (cid) {
          const child = result.find((a) => a.id === cid)
          if (child) child.parent_id = pid
        }
      }
    }
  }

  return result
}

export function buildDemoJournalEntries(accounts: Account[]): JournalEntry[] {
  const acc = (code: string) => accounts.find((a) => a.code === code)?.id ?? ''

  const today = new Date()
  const y = today.getFullYear()
  const entries: JournalEntry[] = []
  let seq = 1

  let entryStatusIndex = 0
  const STATUS_CYCLE: JournalEntry['status'][] = ['submitted', 'posted', 'approved', 'draft', 'posted', 'draft', 'posted', 'submitted']

  function makeEntry(dateStr: string, desc: string, lines: { account_code: string; debit: number; credit: number; desc?: string }[], status?: JournalEntry['status']): JournalEntry {
    const id = uid()
    const totalDr = lines.reduce((s, l) => s + l.debit, 0)
    const totalCr = lines.reduce((s, l) => s + l.credit, 0)
    const items: JournalEntryItem[] = lines.map((l) => ({
      id: uid(),
      journal_entry_id: id,
      account_id: acc(l.account_code),
      debit: l.debit,
      credit: l.credit,
      description: l.desc ?? null,
    }))
    const entry: JournalEntry = {
      id,
      entry_number: generateEntryNumber(seq++),
      posting_date: dateStr,
      description: desc,
      total_debit: totalDr,
      total_credit: totalCr,
      status: status ?? STATUS_CYCLE[entryStatusIndex++ % STATUS_CYCLE.length],
      created_by: null,
      created_by_name: null,
      created_at: new Date(dateStr).toISOString(),
      updated_at: new Date(dateStr).toISOString(),
      submitted_by: null,
      submitted_by_name: null,
      submitted_at: null,
      approved_by: null,
      approved_by_name: null,
      approved_at: null,
      posted_by: null,
      posted_by_name: null,
      posted_at: null,
      items,
    }
    return entry
  }

  entries.push(makeEntry(`${y}-01-01`, 'Opening entry - Share capital injection', [
    { account_code: '1120', debit: 500000000, credit: 0, desc: 'Initial share capital deposit' },
    { account_code: '3100', debit: 0, credit: 500000000, desc: 'Issuance of ordinary shares' },
  ]))

  entries.push(makeEntry(`${y}-01-05`, 'Bank loan - Equipment financing', [
    { account_code: '1120', debit: 300000000, credit: 0, desc: 'Loan proceeds deposited' },
    { account_code: '2510', debit: 0, credit: 300000000, desc: '5-year equipment loan' },
  ]))

  for (let m = 1; m <= 5; m++) {
    const date = new Date(y, m - 1, 15)
    entries.push(makeEntry(date.toISOString().split('T')[0], `Product sales - Month ${m}/${y}`, [
      { account_code: '1210', debit: 25000000, credit: 0, desc: `Sales invoice - ${m}/${y}` },
      { account_code: '4100', debit: 0, credit: 25000000, desc: `Product revenue - ${m}/${y}` },
    ]))

    if (m > 1) {
      const payDate = new Date(y, m - 1, 15)
      entries.push(makeEntry(payDate.toISOString().split('T')[0], `Customer payment received - Month ${m - 1}`, [
        { account_code: '1120', debit: 25000000, credit: 0, desc: `Check deposit - payment Month ${m - 1}` },
        { account_code: '1210', debit: 0, credit: 25000000, desc: `AR cleared - payment Month ${m - 1}` },
      ]))
    }
  }

  entries.push(makeEntry(`${y}-01-01`, 'Q1 Retainer - Consulting client', [
    { account_code: '1120', debit: 60000000, credit: 0, desc: 'Q1 retainer prepayment' },
    { account_code: '2410', debit: 0, credit: 60000000, desc: 'Deferred revenue' },
  ]))

  for (let m = 1; m <= 3; m++) {
    entries.push(makeEntry(`${y}-0${m}-01`, `Revenue recognition - Retainer month ${m}`, [
      { account_code: '2410', debit: 20000000, credit: 0, desc: `Amortize deferred revenue - month ${m}` },
      { account_code: '4200', debit: 0, credit: 20000000, desc: `Service revenue recognized - month ${m}` },
    ]))
  }

  for (let m = 1; m <= 5; m++) {
    const d = new Date(y, m - 1, 28)
    const ds = d.toISOString().split('T')[0]
    entries.push(makeEntry(ds, `Salary accrual - Month ${m}/${y}`, [
      { account_code: '6110', debit: 40000000, credit: 0, desc: 'Management salaries' },
      { account_code: '6120', debit: 25000000, credit: 0, desc: 'Admin staff salaries' },
      { account_code: '6130', debit: 20000000, credit: 0, desc: 'Sales commissions' },
      { account_code: '2210', debit: 0, credit: 85000000, desc: 'Salaries payable' },
    ]))
    entries.push(makeEntry(ds, `Salary payment - Month ${m}/${y}`, [
      { account_code: '2210', debit: 85000000, credit: 0, desc: 'Salary disbursement' },
      { account_code: '1130', debit: 0, credit: 85000000, desc: 'EFT salaries' },
    ]))
  }

  for (let m = 1; m <= 5; m++) {
    const d5 = `${y}-${String(m).padStart(2, '0')}-05`
    entries.push(makeEntry(d5, `Office rent - Month ${m}/${y}`, [
      { account_code: '6310', debit: 15000000, credit: 0, desc: `Rent - Month ${m}` },
      { account_code: '1120', debit: 0, credit: 15000000, desc: `Rent payment - Month ${m}` },
    ]))
    const d10 = `${y}-${String(m).padStart(2, '0')}-10`
    entries.push(makeEntry(d10, `Utilities - Month ${m}/${y}`, [
      { account_code: '6330', debit: 3000000, credit: 0, desc: `Electricity/internet - Month ${m}` },
      { account_code: '1120', debit: 0, credit: 3000000, desc: `Utility payment - Month ${m}` },
    ]))
  }

  const d28 = (m: number, y: number) => {
    const d = new Date(y, m - 1, 28); return d.toISOString().split('T')[0]
  }

  for (let m = 1; m <= 5; m++) {
    const d = `${y}-${String(m).padStart(2, '0')}-03`
    entries.push(makeEntry(d, `Raw material purchase - Month ${m}/${y}`, [
      { account_code: '5100', debit: 8000000, credit: 0, desc: `Raw materials - Month ${m}` },
      { account_code: '2110', debit: 0, credit: 8000000, desc: `Supplier invoice - Month ${m}` },
    ]))
    const d30 = `${y}-${String(m).padStart(2, '0')}-03`
    entries.push(makeEntry(d30, `Supplier payment - Month ${m}/${y}`, [
      { account_code: '2110', debit: 8000000, credit: 0, desc: `Payables clearing - Month ${m}` },
      { account_code: '1120', debit: 0, credit: 8000000, desc: `EFT to supplier - Month ${m}` },
    ]))
    entries.push(makeEntry(d28(m, y), `Direct labor - Month ${m}/${y}`, [
      { account_code: '5200', debit: 12000000, credit: 0, desc: `Production labor - Month ${m}` },
      { account_code: '1130', debit: 0, credit: 12000000, desc: `Labor payroll - Month ${m}` },
    ]))
  }

  entries.push(makeEntry(`${y}-03-01`, 'Q1 Marketing campaign', [
    { account_code: '6610', debit: 10000000, credit: 0, desc: 'Q1 Google/Facebook ads' },
    { account_code: '6710', debit: 3000000, credit: 0, desc: 'Q1 Sales team travel' },
    { account_code: '6730', debit: 2000000, credit: 0, desc: 'Q1 Client entertainment' },
    { account_code: '1120', debit: 0, credit: 15000000, desc: 'Q1 Campaign payment' },
  ]))

  entries.push(makeEntry(`${y}-01-01`, 'Annual software subscriptions', [
    { account_code: '6410', debit: 12000000, credit: 0, desc: 'SaaS annual subscriptions' },
    { account_code: '6430', debit: 12000000, credit: 0, desc: 'Cloud hosting annual' },
    { account_code: '1120', debit: 0, credit: 24000000, desc: 'Annual IT vendor payment' },
  ]))

  entries.push(makeEntry(`${y}-06-30`, 'Mid-year accounting & audit', [
    { account_code: '6520', debit: 12000000, credit: 0, desc: 'Audit preparation' },
    { account_code: '6510', debit: 6000000, credit: 0, desc: 'Contract review' },
    { account_code: '1120', debit: 0, credit: 18000000, desc: 'Professional fees payment' },
  ]))

  for (let m = 1; m <= 5; m++) {
    const d = d28(m, y)
    entries.push(makeEntry(d, `Benefits - Month ${m}/${y}`, [
      { account_code: '6210', debit: 6000000, credit: 0, desc: `Health insurance - Month ${m}` },
      { account_code: '6230', debit: 5000000, credit: 0, desc: `Payroll taxes - Month ${m}` },
      { account_code: '1120', debit: 0, credit: 11000000, desc: `Benefits payment - Month ${m}` },
    ]))
  }

  entries.push(makeEntry(`${y}-01-01`, 'Annual insurance premium', [
    { account_code: '6910', debit: 24000000, credit: 0, desc: 'General liability insurance' },
    { account_code: '1120', debit: 0, credit: 24000000, desc: 'Annual premium' },
  ]))

  for (let m = 1; m <= 5; m++) {
    const d = `${y}-${String(m).padStart(2, '0')}-01`
    entries.push(makeEntry(d, `Loan repayment - Month ${m}/${y}`, [
      { account_code: '7100', debit: 3000000, credit: 0, desc: `Interest - Month ${m}` },
      { account_code: '2510', debit: 5000000, credit: 0, desc: `Principal repayment - Month ${m}` },
      { account_code: '1120', debit: 0, credit: 8000000, desc: `Loan EMI - Month ${m}` },
    ]))
  }

  for (let q = 1; q <= 2; q++) {
    const d = `${y}-${String(q * 3).padStart(2, '0')}-31`
    entries.push(makeEntry(d, `Q${q} Bank interest income`, [
      { account_code: '1140', debit: 1500000, credit: 0, desc: `Q${q} interest credited` },
      { account_code: '4910', debit: 0, credit: 1500000, desc: `Q${q} interest income` },
    ]))
  }

  entries.push(makeEntry(`${y}-03-15`, 'Transfer to savings account', [
    { account_code: '1140', debit: 50000000, credit: 0, desc: 'From operating to savings' },
    { account_code: '1120', debit: 0, credit: 50000000, desc: 'Transfer to savings' },
  ]))

  entries.push(makeEntry(`${y}-03-15`, 'Q1 Tax remittance', [
    { account_code: '6230', debit: 3500000, credit: 0, desc: 'Q1 withholding tax' },
    { account_code: '1120', debit: 0, credit: 3500000, desc: 'Q1 tax payment' },
  ]))

  entries.push(makeEntry(`${y}-05-15`, 'Strategy consulting engagement', [
    { account_code: '1120', debit: 35000000, credit: 0, desc: 'Consulting fee received' },
    { account_code: '4300', debit: 0, credit: 35000000, desc: 'Consulting revenue' },
  ]))

  entries.push(makeEntry(today.toISOString().split('T')[0], 'Estimated income tax provision', [
    { account_code: '7300', debit: 42000000, credit: 0, desc: 'Estimated corporate tax' },
    { account_code: '2310', debit: 0, credit: 42000000, desc: 'Income tax payable' },
  ]))

  return entries
}

export function buildDemoLedger(entries: JournalEntry[]): LedgerEntry[] {
  const result: LedgerEntry[] = []
  for (const je of entries) {
    if (je.status !== 'submitted' || !je.items) continue
    for (const item of je.items) {
      result.push({
        id: uid(),
        journal_entry_id: je.id,
        account_id: item.account_id,
        posting_date: je.posting_date,
        debit: item.debit,
        credit: item.credit,
        balance: 0,
        description: item.description || je.description,
        created_at: je.created_at,
      })
    }
  }

  const byAccount: Record<string, LedgerEntry[]> = {}
  for (const le of result) {
    if (!byAccount[le.account_id]) byAccount[le.account_id] = []
    byAccount[le.account_id].push(le)
  }

  for (const les of Object.values(byAccount)) {
    les.sort((a, b) => a.posting_date.localeCompare(b.posting_date) || a.created_at.localeCompare(b.created_at))
    let running = 0
    for (const le of les) {
      if (le.debit) running += le.debit
      if (le.credit) running -= le.credit
      le.balance = running
    }
  }

  return result
}

export function buildDemoTransactionTypes(): TransactionType[] {
  return [
    { id: uid(), code: 'JE', name: 'Journal Entry', description: 'General journal adjustment', default_dr_cr: 'dr' },
    { id: uid(), code: 'PV', name: 'Payment Voucher', description: 'Cash/bank payment', default_dr_cr: 'cr' },
    { id: uid(), code: 'RV', name: 'Receipt Voucher', description: 'Cash/bank receipt', default_dr_cr: 'dr' },
    { id: uid(), code: 'SI', name: 'Sales Invoice', description: 'Invoice to customer', default_dr_cr: 'dr' },
    { id: uid(), code: 'PI', name: 'Purchase Invoice', description: 'Invoice from supplier', default_dr_cr: 'cr' },
    { id: uid(), code: 'CN', name: 'Credit Note', description: 'Customer credit/refund', default_dr_cr: 'cr' },
    { id: uid(), code: 'DN', name: 'Debit Note', description: 'Supplier debit/refund', default_dr_cr: 'dr' },
    { id: uid(), code: 'CT', name: 'Contra Entry', description: 'Transfer between cash accounts', default_dr_cr: 'dr' },
    { id: uid(), code: 'PM', name: 'Payment', description: 'Payment made', default_dr_cr: 'cr' },
    { id: uid(), code: 'RC', name: 'Receipt', description: 'Receipt received', default_dr_cr: 'dr' },
  ]
}

export function buildDemoTrialBalance(accounts: Account[], entries: JournalEntry[], startDate?: string, endDate?: string): TrialBalanceRow[] {
  const ledger = buildDemoLedger(entries)

  let filtered = ledger
  if (startDate) filtered = filtered.filter((e) => e.posting_date >= startDate)
  if (endDate) filtered = filtered.filter((e) => e.posting_date <= endDate)

  const byAccount = new Map<string, { debit: number; credit: number }>()
  for (const e of filtered) {
    const acc = accounts.find((a) => a.id === e.account_id)
    if (!acc || acc.is_group) continue
    const curr = byAccount.get(e.account_id) ?? { debit: 0, credit: 0 }
    curr.debit += Number(e.debit)
    curr.credit += Number(e.credit)
    byAccount.set(e.account_id, curr)
  }

  const accountMap = new Map(accounts.map((a) => [a.id, a]))
  const result: TrialBalanceRow[] = []

  for (const [accountId, { debit, credit }] of byAccount) {
    const acc = accountMap.get(accountId)!
    const isDebitPos = acc.type === 'asset' || acc.type === 'expense'
    result.push({
      account_id: accountId,
      account_code: acc.code,
      account_name: acc.name,
      account_type: acc.type,
      is_group: acc.is_group,
      parent_id: acc.parent_id,
      debit,
      credit,
      balance: isDebitPos ? debit - credit : credit - debit,
    })
  }

  result.sort((a, b) => (a.account_code ?? '').localeCompare(b.account_code ?? ''))
  return result
}

export function isSupabaseConfigured(): boolean {
  return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}
