import type { JournalEntry } from '../types'

const STORAGE_KEY = 'journal_entries'

export function generateEntryNumber(sequence: number): string {
  const year = new Date().getFullYear()
  return `JE-${year}-${String(sequence).padStart(4, '0')}`
}

export function getJournalEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function deleteJournalEntryById(id: string) {
  const list = getJournalEntries().filter((e) => e.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}
