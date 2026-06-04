import type { AccountingPeriod } from '../types'

const BASE_KEY = 'accounting_periods'
const PERIOD_ID_KEY = 'current_period_id'

function uid(): string {
  return crypto.randomUUID()
}

function buildDemoPeriods(): AccountingPeriod[] {
  const y = new Date().getFullYear()
  const now = new Date()
  const periods: AccountingPeriod[] = []
  for (let m = 0; m < 12; m++) {
    const start = new Date(y, m, 1)
    const end = new Date(y, m + 1, 0)
    const isPast = end < now
    periods.push({
      id: uid(),
      name: start.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
      status: isPast ? 'closed' : 'open',
    })
  }
  return periods
}

let currentPeriods: AccountingPeriod[] | null = null
let currentPeriodId: string | null = null
let currentCompanyId: string | null = null

const OLD_ID_RE = /^period-\d+-/

function scopedKey(base: string): string {
  const cid = localStorage.getItem('tolmai_company_id')
  return cid ? `${base}_${cid}` : base
}

export function getPeriods(): AccountingPeriod[] {
  const cid = localStorage.getItem('tolmai_company_id') ?? null
  if (currentPeriods && currentCompanyId === cid) return currentPeriods
  currentCompanyId = cid
  const key = scopedKey(BASE_KEY)
  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      currentPeriods = JSON.parse(stored)
      if (currentPeriods!.some((p) => OLD_ID_RE.test(p.id))) {
        currentPeriods = null
        localStorage.removeItem(key)
      } else {
        return currentPeriods!
      }
    }
  } catch { /* ignore */ }
  // migrate from unscoped key
  try {
    const stored = localStorage.getItem(BASE_KEY)
    if (stored) {
      currentPeriods = JSON.parse(stored)
      if (currentPeriods && !currentPeriods.some((p) => OLD_ID_RE.test(p.id))) {
        localStorage.setItem(key, stored)
        localStorage.removeItem(BASE_KEY)
      }
      if (currentPeriods) return currentPeriods!
    }
  } catch { /* ignore */ }
  currentPeriods = buildDemoPeriods()
  return currentPeriods!
}

export function savePeriods(periods: AccountingPeriod[]) {
  currentPeriods = periods
  localStorage.setItem(scopedKey(BASE_KEY), JSON.stringify(periods))
}

export function getCurrentPeriodId(): string {
  const cid = localStorage.getItem('tolmai_company_id') ?? null
  if (currentPeriodId && currentCompanyId === cid) return currentPeriodId
  const key = scopedKey(PERIOD_ID_KEY)
  try {
    const stored = localStorage.getItem(key)
    if (stored && !OLD_ID_RE.test(stored)) return stored
  } catch { /* ignore */ }
  // migrate from unscoped key
  try {
    const stored = localStorage.getItem(PERIOD_ID_KEY)
    if (stored && !OLD_ID_RE.test(stored)) {
      localStorage.setItem(key, stored)
      localStorage.removeItem(PERIOD_ID_KEY)
      currentPeriodId = stored
      return stored
    }
  } catch { /* ignore */ }
  localStorage.removeItem(key)
  const periods = getPeriods()
  const now = new Date()
  const found = periods.find((p) => {
    const s = new Date(p.start_date)
    const e = new Date(p.end_date)
    e.setHours(23, 59, 59, 999)
    return now >= s && now <= e
  })
  const id = found?.id ?? periods[periods.length - 1]?.id ?? ''
  currentPeriodId = id
  return id
}

export function setCurrentPeriodId(id: string) {
  currentPeriodId = id
  localStorage.setItem(scopedKey(PERIOD_ID_KEY), id)
}

export function addPeriod(period: Omit<AccountingPeriod, 'id'>): AccountingPeriod {
  const periods = getPeriods()
  const p: AccountingPeriod = { ...period, id: uid() }
  periods.push(p)
  periods.sort((a, b) => a.start_date.localeCompare(b.start_date))
  savePeriods(periods)
  return p
}

export function updatePeriod(id: string, updates: Partial<AccountingPeriod>) {
  const periods = getPeriods()
  const idx = periods.findIndex((p) => p.id === id)
  if (idx === -1) throw new Error('Period not found')
  periods[idx] = { ...periods[idx], ...updates }
  savePeriods(periods)
}

export function deletePeriod(id: string) {
  const periods = getPeriods()
  const filtered = periods.filter((p) => p.id !== id)
  if (filtered.length === periods.length) return
  savePeriods(filtered)
  if (currentPeriodId === id) {
    currentPeriodId = null
    localStorage.removeItem(scopedKey(PERIOD_ID_KEY))
  }
}

export function resetPeriods() {
  currentPeriods = null
  currentPeriodId = null
  localStorage.removeItem(scopedKey(BASE_KEY))
  localStorage.removeItem(scopedKey(PERIOD_ID_KEY))
}
