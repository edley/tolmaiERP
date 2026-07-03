import { useState, useEffect, useCallback } from 'react'
import { supabase, isOnline } from '../lib/supabase'
import { getJournalEntries, saveJournalEntry, deleteJournalEntryById, generateEntryNumber } from '../lib/journalEntries'
import { buildDemoAccounts, buildDemoJournalEntries } from '../lib/demo'
import { useAuth } from '../contexts/AuthContext'
import { useCompany } from '../contexts/CompanyContext'
import { useViewFilter } from '../contexts/ViewFilterContext'
import type { JournalEntry, JournalEntryItem, JournalEntryStatus } from '../types'
import { detectFieldChanges, saveFieldAuditEntries, persistFieldAuditToDb, setAuditCompanyId } from '../lib/fieldAuditLog'
import type { FieldAuditEntry } from '../lib/fieldAuditLog'

function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function replaceIds(entry: JournalEntry, items: JournalEntryItem[]): { entry: JournalEntry; items: JournalEntryItem[] } {
  if (UUID_RE.test(entry.id)) return { entry, items }
  const newId = crypto.randomUUID()
  const itemMap = new Map(items.map((i) => [i.id, crypto.randomUUID()]))
  return {
    entry: { ...entry, id: newId, items: undefined },
    items: items.map((i) => ({ ...i, id: itemMap.get(i.id)!, journal_entry_id: newId })),
  }
}

let demoEntries: JournalEntry[] | null = null

export function useJournalEntries() {
  const { user } = useAuth()
  const { currentCompany } = useCompany()
  const viewFilter = useViewFilter()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)

  const getNextSequence = useCallback(async (): Promise<number> => {
    const year = new Date().getFullYear()
    const companyId = currentCompany?.id
    if (companyId && isOnline() && supabase) {
      const prefix = `JE-${year}-`
      const { data } = await supabase
        .from('journal_entries')
        .select('entry_number')
        .like('entry_number', `${prefix}%`)
        .eq('company_id', companyId)
        .order('entry_number', { ascending: false })
        .limit(1)
      if (data && data.length > 0) {
        const parts = (data[0] as any).entry_number.split('-')
        const num = parseInt(parts[2], 10)
        if (!isNaN(num)) return num + 1
      }
      return 1
    }
    return (entries.length || demoEntries?.length || 0) + 1
  }, [currentCompany?.id, entries.length])

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    const companyId = currentCompany?.id
    if (companyId) setAuditCompanyId(companyId)
    const online = companyId && isOnline() && supabase
    let fromDb = false

    if (online) {
      let query = supabase!
        .from('journal_entries')
        .select('*, items:journal_entry_items(*)')
        .eq('company_id', companyId)
        .order('posting_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (viewFilter === 'recent') {
        query = query.limit(20)
      } else if (viewFilter === '10days') {
        query = query.gte('posting_date', daysAgo(10))
      }

      const { data, error } = await query
      if (error) {
        console.error('Failed to fetch journal entries:', error.message)
      } else if (data && data.length > 0) {
        let allocMap: Record<string, { allocation_code: string; expense_type: string | null; amount: number }[]> = {}
        try {
          const { data: allocData } = await supabase!
            .from('journal_entry_item_allocations')
            .select('journal_entry_item_id, allocation_code, expense_type, amount')
            .eq('company_id', companyId)
          if (allocData) {
            for (const a of allocData as any[]) {
              const itemId = a.journal_entry_item_id
              if (!allocMap[itemId]) allocMap[itemId] = []
              allocMap[itemId].push({ allocation_code: a.allocation_code, expense_type: a.expense_type ?? null, amount: Number(a.amount) })
            }
          }
        } catch { /* allocations table may not exist */ }

        const mapped: JournalEntry[] = data.map((r: any) => ({
          id: r.id,
          entry_number: r.entry_number,
          posting_date: r.posting_date,
          description: r.description,
          total_debit: Number(r.total_debit),
          total_credit: Number(r.total_credit),
          status: r.status,
          period_id: r.period_id ?? null,
          created_by: r.created_by ?? null,
          created_by_name: r.created_by_name ?? null,
          created_at: r.created_at,
          updated_at: r.updated_at,
          submitted_by: r.submitted_by ?? null,
          submitted_by_name: r.submitted_by_name ?? null,
          submitted_at: r.submitted_at ?? null,
          approved_by: r.approved_by ?? null,
          approved_by_name: r.approved_by_name ?? null,
          approved_at: r.approved_at ?? null,
          posted_by: r.posted_by ?? null,
          posted_by_name: r.posted_by_name ?? null,
          posted_at: r.posted_at ?? null,
          items: (r.items ?? []).map((item: any) => ({
            id: item.id,
            journal_entry_id: item.journal_entry_id,
            account_id: item.account_id,
            debit: Number(item.debit),
            credit: Number(item.credit),
            description: item.description,
            allocations: allocMap[item.id] ?? [],
          })),
        }))
        const remoteIds = new Set(mapped.map((e) => e.id))
        const localOnly = (demoEntries ?? []).filter((e) => !remoteIds.has(e.id))
        if (localOnly.length > 0) {
          mapped.push(...localOnly)
          mapped.sort((a, b) => b.posting_date.localeCompare(a.posting_date) || b.created_at.localeCompare(a.created_at))
        }
        setEntries(mapped)
        demoEntries = mapped
        fromDb = true
      }
    }

    if (!fromDb || !demoEntries) {
      const stored = getJournalEntries()
      if (stored.length > 0) {
        demoEntries = stored
      } else if (!online) {
        const accounts = buildDemoAccounts()
        demoEntries = buildDemoJournalEntries(accounts)
      } else {
        demoEntries = []
      }
      setEntries([...demoEntries])
    }

    // Sync local entries to DB when online (best-effort repair)
    if (online && demoEntries && demoEntries.length > 0) {
      const { data: dbIds } = await supabase!
        .from('journal_entries')
        .select('id, status')
        .eq('company_id', companyId)
      if (dbIds) {
        const dbMap = new Map(dbIds.map((r: any) => [r.id, r.status as string]))
        for (const entry of demoEntries) {
          const dbStatus = dbMap.get(entry.id)
          if (!dbStatus) {
            // Not in DB at all — persist it
            try {
              const items = entry.items ?? []
              const cid = entry.company_id ?? companyId
              await supabase!.from('journal_entries').upsert({
                id: entry.id, entry_number: entry.entry_number, posting_date: entry.posting_date,
                description: entry.description, total_debit: entry.total_debit, total_credit: entry.total_credit,
                status: entry.status, period_id: entry.period_id, company_id: cid,
                created_by: entry.created_by, created_by_name: entry.created_by_name,
                submitted_by: entry.submitted_by, submitted_by_name: entry.submitted_by_name,
                submitted_at: entry.submitted_at, approved_by: entry.approved_by, approved_by_name: entry.approved_by_name,
                approved_at: entry.approved_at, posted_by: entry.posted_by, posted_by_name: entry.posted_by_name,
                posted_at: entry.posted_at,
              })
              if (items.length > 0) {
                await supabase!.from('journal_entry_items').upsert(
                  items.map((item) => ({
                    id: item.id, journal_entry_id: entry.id, account_id: item.account_id,
                    debit: item.debit, credit: item.credit, description: item.description, company_id: cid,
                  }))
                )
              }
            } catch (e) {
              console.warn('Failed to sync entry to DB:', e)
            }
          }
        }
      }
    }

    setLoading(false)
  }, [currentCompany?.id, viewFilter])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const persistToDb = useCallback(async (entry: JournalEntry, items: JournalEntryItem[]) => {
    if (!isOnline() || !supabase) return
    const cid = currentCompany?.id ?? entry.company_id
    if (!cid) throw new Error('Cannot persist journal entry: no company selected.')
    const { error } = await supabase.from('journal_entries').upsert({
      id: entry.id,
      entry_number: entry.entry_number,
      posting_date: entry.posting_date,
      description: entry.description,
      total_debit: entry.total_debit,
      total_credit: entry.total_credit,
      status: entry.status,
      period_id: entry.period_id,
      company_id: cid,
      created_by: entry.created_by,
      created_by_name: entry.created_by_name,
      submitted_by: entry.submitted_by,
      submitted_by_name: entry.submitted_by_name,
      submitted_at: entry.submitted_at,
      approved_by: entry.approved_by,
      approved_by_name: entry.approved_by_name,
      approved_at: entry.approved_at,
      posted_by: entry.posted_by,
      posted_by_name: entry.posted_by_name,
      posted_at: entry.posted_at,
    })
    if (error) throw new Error(error.message)

    const { error: delError } = await supabase
      .from('journal_entry_items')
      .delete()
      .eq('journal_entry_id', entry.id)
    if (delError) throw new Error(delError.message)

    if (items.length > 0) {
      const { error: insError } = await supabase.from('journal_entry_items').insert(
        items.map((item) => ({
          id: item.id,
          journal_entry_id: entry.id,
          account_id: item.account_id,
          debit: item.debit,
          credit: item.credit,
          description: item.description,
          company_id: cid,
        }))
      )
      if (insError) throw new Error(insError.message)

      // Persist item-level allocations (best-effort)
      const allocData = items.flatMap((item) =>
        (item.allocations ?? []).map((a) => ({
          journal_entry_item_id: item.id,
          allocation_code: a.allocation_code,
          expense_type: a.expense_type ?? null,
          amount: a.amount,
          company_id: cid,
        }))
      )
      if (allocData.length > 0) {
        try {
          const { error: allocError } = await supabase.from('journal_entry_item_allocations').insert(allocData)
          if (allocError) console.warn('Failed to persist JE item allocations:', allocError.message)
        } catch (e) {
          console.warn('JE item allocations table not available — skipping', e)
        }
      }
    }
  }, [currentCompany?.id])

  const syncAndRefresh = useCallback(async (entry: JournalEntry, items?: JournalEntryItem[]) => {
    const { entry: dbEntry, items: dbItems } = replaceIds(entry, items ?? [])
    saveJournalEntry(dbEntry)
    const idx = (demoEntries ?? []).findIndex((e) => e.id === entry.id)
    if (idx >= 0) {
      demoEntries = [...demoEntries!]
      demoEntries[idx] = dbEntry
    } else {
      demoEntries = [...(demoEntries ?? []), dbEntry]
    }
    setEntries([...demoEntries])
    try {
      await persistToDb(dbEntry, dbItems)
    } catch (err) {
      console.warn('Entry updated locally but failed to persist to DB:', err)
    }
  }, [persistToDb])

  const createEntry = useCallback(async (
    header: Omit<JournalEntry, 'id' | 'entry_number' | 'status' | 'created_at' | 'updated_at' | 'created_by' | 'created_by_name' | 'submitted_by' | 'submitted_by_name' | 'submitted_at' | 'approved_by' | 'approved_by_name' | 'approved_at' | 'posted_by' | 'posted_by_name' | 'posted_at'> & { period_id?: string | null },
    items: Omit<JournalEntryItem, 'id' | 'journal_entry_id' | 'created_at'>[]
  ) => {
    const companyId = currentCompany?.id
    if (!companyId) throw new Error('No company selected')
    const seq = await getNextSequence()
    const now = new Date().toISOString()
    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      entry_number: generateEntryNumber(seq),
      ...header,
      status: 'draft',
      created_at: now,
      updated_at: now,
      created_by: user?.id ?? null,
      created_by_name: user?.name ?? null,
      company_id: companyId,
      submitted_by: null,
      submitted_by_name: null,
      submitted_at: null,
      approved_by: null,
      approved_by_name: null,
      approved_at: null,
      posted_by: null,
      posted_by_name: null,
      posted_at: null,
    }
    const entryItems: JournalEntryItem[] = items.map((item) => ({
      id: crypto.randomUUID(),
      journal_entry_id: entry.id,
      ...item,
    }))
    entry.items = entryItems
    saveJournalEntry(entry)
    demoEntries = [entry, ...(demoEntries ?? [])]
    setEntries([...demoEntries])
    await persistToDb(entry, entryItems)
    return entry
  }, [persistToDb, user, currentCompany?.id])

  const updateEntry = useCallback(async (
    id: string,
    header: Omit<JournalEntry, 'id' | 'entry_number' | 'status' | 'created_at' | 'updated_at' | 'created_by' | 'created_by_name' | 'submitted_by' | 'submitted_by_name' | 'submitted_at' | 'approved_by' | 'approved_by_name' | 'approved_at' | 'posted_by' | 'posted_by_name' | 'posted_at'> & { period_id?: string | null },
    items: Omit<JournalEntryItem, 'id' | 'journal_entry_id' | 'created_at'>[]
  ) => {
    const existing = (demoEntries ?? []).find((e) => e.id === id)
    if (!existing) throw new Error('Journal entry not found')
    if (existing.status !== 'draft') throw new Error('Only draft entries can be edited')
    const now = new Date().toISOString()
    const updated: JournalEntry = {
      ...existing,
      ...header,
      updated_at: now,
    }
    const updatedItems: JournalEntryItem[] = items.map((item) => ({
      id: crypto.randomUUID(),
      journal_entry_id: updated.id,
      ...item,
    }))
    updated.items = updatedItems

    const changes = detectFieldChanges('journal_entry', existing, updated)
    if (changes.length > 0 && user && currentCompany?.id) {
      const now2 = new Date().toISOString()
      const auditEntries: FieldAuditEntry[] = changes.map((c) => ({
        id: crypto.randomUUID(),
        company_id: currentCompany.id,
        record_type: 'journal_entry',
        record_id: id,
        field_name: c.field_name,
        old_value: c.old_value,
        new_value: c.new_value,
        changed_by: user.id ?? '',
        changed_by_name: user.name ?? '',
        changed_at: now2,
      }))
      saveFieldAuditEntries(auditEntries)
      persistFieldAuditToDb(auditEntries)
    }

    await syncAndRefresh(updated, updatedItems)
    return updated
  }, [syncAndRefresh, user, currentCompany?.id])

  const transitionStatus = useCallback(async (
    id: string,
    newStatus: JournalEntryStatus,
    auditField: 'submitted' | 'approved' | 'posted',
  ) => {
    const existing = (demoEntries ?? []).find((e) => e.id === id)
    if (!existing) throw new Error('Journal entry not found')
    const now = new Date().toISOString()
    const updated: JournalEntry = {
      ...existing,
      status: newStatus,
      updated_at: now,
      [`${auditField}_by`]: user?.id ?? null,
      [`${auditField}_by_name`]: user?.name ?? null,
      [`${auditField}_at`]: now,
    }

    const changes = detectFieldChanges('journal_entry', existing, updated)
    if (changes.length > 0 && user && currentCompany?.id) {
      const auditEntries: FieldAuditEntry[] = changes.map((c) => ({
        id: crypto.randomUUID(),
        company_id: currentCompany.id,
        record_type: 'journal_entry',
        record_id: id,
        field_name: c.field_name,
        old_value: c.old_value,
        new_value: c.new_value,
        changed_by: user.id ?? '',
        changed_by_name: user.name ?? '',
        changed_at: now,
      }))
      saveFieldAuditEntries(auditEntries)
      persistFieldAuditToDb(auditEntries)
    }

    await syncAndRefresh(updated, existing.items)
    return updated
  }, [syncAndRefresh, user, currentCompany?.id])

  const submitEntry = useCallback(async (id: string) => {
    const existing = (demoEntries ?? []).find((e) => e.id === id)
    if (!existing) throw new Error('Journal entry not found')
    if (existing.status !== 'draft') throw new Error('Only draft entries can be submitted')
    return transitionStatus(id, 'submitted', 'submitted')
  }, [transitionStatus])

  const approveEntry = useCallback(async (id: string) => {
    const existing = (demoEntries ?? []).find((e) => e.id === id)
    if (!existing) throw new Error('Journal entry not found')
    if (existing.status !== 'submitted') throw new Error('Only submitted entries can be approved')
    if (!user?.role || !['Superuser', 'Manager'].includes(user.role)) {
      throw new Error('Only managers can approve journal entries')
    }
    return transitionStatus(id, 'approved', 'approved')
  }, [transitionStatus, user])

  const postEntry = useCallback(async (id: string) => {
    const existing = (demoEntries ?? []).find((e) => e.id === id)
    if (!existing) throw new Error('Journal entry not found')
    if (existing.status !== 'approved') throw new Error('Only approved entries can be posted')
    if (!user?.role || !['Superuser', 'Manager'].includes(user.role)) {
      throw new Error('Only managers can post journal entries to ledger')
    }
    if (!isOnline() || !supabase) {
      throw new Error('Cannot post to ledger while offline. Connect to the internet and try again.')
    }

    const items = existing.items ?? []
    const now = new Date().toISOString()
    const { entry: dbEntry, items: dbItems } = replaceIds(
      { ...existing, status: 'posted', updated_at: now, posted_by: user?.id ?? null, posted_by_name: user?.name ?? null, posted_at: now },
      items,
    )

    const cid = dbEntry.company_id ?? currentCompany?.id
    if (!cid) throw new Error('Cannot post to ledger: no company selected.')

    const { error: leError } = await supabase.from('ledger_entries').insert(
      dbItems.map((item) => ({
        journal_entry_id: dbEntry.id,
        account_id: item.account_id,
        posting_date: existing.posting_date,
        debit: item.debit,
        credit: item.credit,
        description: item.allocations && item.allocations.length > 0
          ? `${item.description || existing.description} (${item.allocations.map((a) => `${a.allocation_code}: $${a.amount.toFixed(2)}`).join(', ')})`
          : (item.description || existing.description),
        period_id: existing.period_id,
        company_id: cid,
      }))
    )
    if (leError) throw new Error(leError.message)

    await syncAndRefresh(dbEntry, dbItems)
    return dbEntry
  }, [syncAndRefresh, user, currentCompany?.id])

  const cancelEntry = useCallback(async (id: string) => {
    const existing = (demoEntries ?? []).find((e) => e.id === id)
    if (!existing) throw new Error('Journal entry not found')
    if (existing.status === 'posted') throw new Error('Posted entries cannot be cancelled')
    if (existing.status === 'cancelled') throw new Error('Entry is already cancelled')
    const now = new Date().toISOString()
    const updated: JournalEntry = { ...existing, status: 'cancelled', updated_at: now }

    const changes = detectFieldChanges('journal_entry', existing, updated)
    if (changes.length > 0 && user && currentCompany?.id) {
      const auditEntries: FieldAuditEntry[] = changes.map((c) => ({
        id: crypto.randomUUID(),
        company_id: currentCompany.id,
        record_type: 'journal_entry',
        record_id: id,
        field_name: c.field_name,
        old_value: c.old_value,
        new_value: c.new_value,
        changed_by: user.id ?? '',
        changed_by_name: user.name ?? '',
        changed_at: now,
      }))
      saveFieldAuditEntries(auditEntries)
      persistFieldAuditToDb(auditEntries)
    }

    await syncAndRefresh(updated, existing.items)
    return updated
  }, [syncAndRefresh, user, currentCompany?.id])

  const deleteEntry = useCallback(async (id: string) => {
    const existing = (demoEntries ?? []).find((e) => e.id === id)
    if (existing && existing.status !== 'draft') throw new Error('Only draft entries can be deleted')
    deleteJournalEntryById(id)
    demoEntries = (demoEntries ?? []).filter((e) => e.id !== id)
    setEntries([...demoEntries])
    const companyId = currentCompany?.id
    if (companyId && isOnline() && supabase) {
      await supabase.from('journal_entry_items').delete().eq('journal_entry_id', id)
      await supabase.from('journal_entries').delete().eq('id', id).eq('company_id', companyId)
    }
  }, [currentCompany?.id])

  const refetch = useCallback(() => {
    fetchEntries()
  }, [fetchEntries])

  return {
    entries, loading, refetch,
    createEntry, updateEntry, submitEntry, approveEntry, postEntry, cancelEntry, deleteEntry,
  }
}
