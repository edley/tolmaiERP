import type { AccountingPeriod } from '../types'

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

const OLD_ID_RE = /^period-\d+-/

export function getPeriods(): AccountingPeriod[] {
  if (currentPeriods) return currentPeriods
  try {
    const stored = localStorage.getItem('accounting_periods')
    if (stored) {
      currentPeriods = JSON.parse(stored)
      if (currentPeriods!.some((p) => OLD_ID_RE.test(p.id))) {
        currentPeriods = null
        localStorage.removeItem('accounting_periods')
      } else {
        return currentPeriods!
      }
    }
  } catch { /* ignore */ }
  currentPeriods = buildDemoPeriods()
  return currentPeriods!
}

export function savePeriods(periods: AccountingPeriod[]) {
  currentPeriods = periods
  localStorage.setItem('accounting_periods', JSON.stringify(periods))
}

export function getCurrentPeriodId(): string {
  if (currentPeriodId) return currentPeriodId
  try {
    const stored = localStorage.getItem('current_period_id')
    if (stored && !OLD_ID_RE.test(stored)) return stored
  } catch { /* ignore */ }
  localStorage.removeItem('current_period_id')
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
  localStorage.setItem('current_period_id', id)
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
    localStorage.removeItem('current_period_id')
  }
}

export function resetPeriods() {
  currentPeriods = null
  currentPeriodId = null
  localStorage.removeItem('accounting_periods')
  localStorage.removeItem('current_period_id')
}
