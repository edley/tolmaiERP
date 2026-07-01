import { supabase, isOnline } from './supabase'

export interface FieldChange {
  field_name: string
  old_value: string | null
  new_value: string | null
}

export interface FieldAuditEntry {
  id: string
  company_id: string
  record_type: 'journal_entry' | 'payment' | 'receipt'
  record_id: string
  field_name: string
  old_value: string | null
  new_value: string | null
  changed_by: string
  changed_by_name: string
  changed_at: string
}

export type RecordType = FieldAuditEntry['record_type']

const TRACKED_FIELDS: Record<RecordType, string[]> = {
  journal_entry: ['posting_date', 'description', 'total_debit', 'total_credit', 'status'],
  payment: ['date', 'voucher_amount', 'paid_to', 'invoice_no', 'description', 'mode_of_payment_id', 'status'],
  receipt: ['date', 'voucher_amount', 'received_from', 'invoice_no', 'description', 'mode_of_payment_id', 'status'],
}

const FIELD_LABELS: Record<string, string> = {
  posting_date: 'Posting Date',
  description: 'Description',
  total_debit: 'Total Debit',
  total_credit: 'Total Credit',
  date: 'Date',
  voucher_amount: 'Amount',
  paid_to: 'Paid To',
  received_from: 'Received From',
  invoice_no: 'Invoice No',
  mode_of_payment_id: 'Payment Mode',
  status: 'Status',
}

export function fieldLabel(fieldName: string): string {
  return FIELD_LABELS[fieldName] ?? fieldName
}

let cachedCompanyId: string | null = null

export function setAuditCompanyId(id: string | null) {
  cachedCompanyId = id
}

function auditStorageKey(): string {
  return `field_audit_log_${cachedCompanyId ?? ''}`
}

export function detectFieldChanges<T extends Record<string, any>>(
  recordType: RecordType,
  existing: T,
  updated: T,
): FieldChange[] {
  const fields = TRACKED_FIELDS[recordType]
  if (!fields) return []

  const changes: FieldChange[] = []

  for (const field of fields) {
    const oldVal = existing[field]
    const newVal = updated[field]
    const oldStr = oldVal == null ? null : String(oldVal)
    const newStr = newVal == null ? null : String(newVal)

    if (oldStr !== newStr) {
      changes.push({ field_name: field, old_value: oldStr, new_value: newStr })
    }
  }

  const oldItems = existing.items ?? existing.lines
  const newItems = updated.items ?? updated.lines
  if (Array.isArray(oldItems) && Array.isArray(newItems)) {
    const oldCount = oldItems.length
    const newCount = newItems.length
    if (oldCount !== newCount) {
      changes.push({
        field_name: 'lines',
        old_value: `${oldCount} items`,
        new_value: `${newCount} items`,
      })
    }
  }

  return changes
}

export function getFieldAuditEntries(
  recordType?: RecordType,
  recordId?: string,
): FieldAuditEntry[] {
  try {
    const raw = localStorage.getItem(auditStorageKey())
    if (!raw) return []
    const all: FieldAuditEntry[] = JSON.parse(raw)
    if (!recordType && !recordId) return all
    return all.filter((e) => {
      if (recordType && e.record_type !== recordType) return false
      if (recordId && e.record_id !== recordId) return false
      return true
    }).sort((a, b) => a.changed_at.localeCompare(b.changed_at))
  } catch {
    return []
  }
}

export function saveFieldAuditEntries(entries: FieldAuditEntry[]) {
  const existing = getFieldAuditEntries()
  const idSet = new Set(existing.map((e) => e.id))
  const merged = [...existing, ...entries.filter((e) => !idSet.has(e.id))]
  localStorage.setItem(auditStorageKey(), JSON.stringify(merged))
}

export async function persistFieldAuditToDb(entries: FieldAuditEntry[]) {
  if (!isOnline() || !supabase) return
  const dbEntries = entries.map((e) => ({
    id: e.id,
    company_id: e.company_id,
    record_type: e.record_type,
    record_id: e.record_id,
    field_name: e.field_name,
    old_value: e.old_value,
    new_value: e.new_value,
    changed_by: e.changed_by,
    changed_by_name: e.changed_by_name,
    changed_at: e.changed_at,
  }))
  const { error } = await supabase.from('field_audit_log').upsert(dbEntries)
  if (error) {
    console.warn('Failed to persist field audit entries to DB:', error.message)
  }
}

export async function fetchFieldAuditEntriesFromDb(
  companyId: string,
  recordType: RecordType,
  recordId: string,
): Promise<FieldAuditEntry[]> {
  if (!isOnline() || !supabase) return []
  const { data, error } = await supabase
    .from('field_audit_log')
    .select('*')
    .eq('company_id', companyId)
    .eq('record_type', recordType)
    .eq('record_id', recordId)
    .order('changed_at', { ascending: true })
  if (error) {
    console.warn('Failed to fetch field audit entries:', error.message)
    return []
  }
  return (data ?? []).map((r: any) => ({
    id: r.id,
    company_id: r.company_id,
    record_type: r.record_type as RecordType,
    record_id: r.record_id,
    field_name: r.field_name,
    old_value: r.old_value ?? null,
    new_value: r.new_value ?? null,
    changed_by: r.changed_by,
    changed_by_name: r.changed_by_name,
    changed_at: r.changed_at,
  }))
}
