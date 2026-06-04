import type { JournalEntry } from '../types'

const BASE_KEY = 'journal_entries'

function scopedKey(): string {
  const cid = localStorage.getItem('tolmai_company_id')
  return cid ? `${BASE_KEY}_${cid}` : BASE_KEY
}

function migrateFromUnscoped(): boolean {
  const oldKey = BASE_KEY
  const raw = localStorage.getItem(oldKey)
  if (!raw) return false
  const key = scopedKey()
  if (localStorage.getItem(key)) return true
  localStorage.setItem(key, raw)
  localStorage.removeItem(oldKey)
  return true
}

export function generateEntryNumber(sequence: number): string {
  const year = new Date().getFullYear()
  return `JE-${year}-${String(sequence).padStart(4, '0')}`
}

export function getJournalEntries(): JournalEntry[] {
  migrateFromUnscoped()
  try {
    const raw = localStorage.getItem(scopedKey())
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function saveJournalEntry(entry: JournalEntry) {
  const list = getJournalEntries()
  const idx = list.findIndex((e) => e.id === entry.id)
  if (idx >= 0) {
    list[idx] = entry
  } else {
    list.unshift(entry)
  }
  localStorage.setItem(scopedKey(), JSON.stringify(list))
}

export function deleteJournalEntryById(id: string) {
  const list = getJournalEntries().filter((e) => e.id !== id)
  localStorage.setItem(scopedKey(), JSON.stringify(list))
}
