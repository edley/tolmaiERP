export interface Company {
  name: string
  registration_number: string
  tax_id: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  postal_code: string
  country: string
  phone: string
  email: string
  website: string
  currency: string
  fiscal_year_start: string
}

const STORAGE_KEY = 'company_info'
const DEFAULTS: Company = {
  name: '',
  registration_number: '',
  tax_id: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  phone: '',
  email: '',
  website: '',
  currency: 'USD',
  fiscal_year_start: 'January',
}

let cached: Company | null = null

export function getCompany(): Company {
  if (cached) return cached
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      cached = JSON.parse(raw) as Company
      return cached
    }
  } catch {}
  cached = { ...DEFAULTS }
  return cached
}

export function saveCompany(data: Company) {
  cached = data
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function updateCompany(updates: Partial<Company>) {
  const current = getCompany()
  const next = { ...current, ...updates }
  saveCompany(next)
  return next
}

export const FISCAL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
