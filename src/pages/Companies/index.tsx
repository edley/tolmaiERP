import { useState, useEffect, useCallback } from 'react'
import { supabase, isOnline } from '../../lib/supabase'
import { useRBAC } from '../../hooks/useRBAC'
import { PageLayout } from '../../components/PageLayout'
import type { Company } from '../../types'

const CURRENCIES = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'IDR', label: 'IDR — Indonesian Rupiah' },
  { value: 'SGD', label: 'SGD — Singapore Dollar' },
  { value: 'MYR', label: 'MYR — Malaysian Ringgit' },
  { value: 'PHP', label: 'PHP — Philippine Peso' },
  { value: 'THB', label: 'THB — Thai Baht' },
  { value: 'VND', label: 'VND — Vietnamese Dong' },
]

interface CompanyForm {
  name: string
  code: string
  registration_number: string
  tax_id: string
  currency: string
  fiscal_year_start: string
  fiscal_year_end: string
  phone: string
  email: string
  website: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  postal_code: string
  country: string
}

const EMPTY_FORM: CompanyForm = {
  name: '',
  code: '',
  registration_number: '',
  tax_id: '',
  currency: 'USD',
  fiscal_year_start: '',
  fiscal_year_end: '',
  phone: '',
  email: '',
  website: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
}

export function Companies() {
  const { isSuperuser } = useRBAC()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Company | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CompanyForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    if (!isOnline() || !supabase) {
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name', { ascending: true })
    if (error) setError(error.message)
    else setCompanies((data ?? []) as Company[])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditing(null)
    setShowForm(false)
  }

  const openEdit = (c: Company) => {
    setForm({
      name: c.name,
      code: c.code,
      registration_number: c.registration_number ?? '',
      tax_id: c.tax_id ?? '',
      currency: c.currency ?? 'USD',
      fiscal_year_start: c.fiscal_year_start,
      fiscal_year_end: c.fiscal_year_end,
      phone: c.phone ?? '',
      email: c.email ?? '',
      website: c.website ?? '',
      address_line1: c.address_line1 ?? '',
      address_line2: c.address_line2 ?? '',
      city: c.city ?? '',
      state: c.state ?? '',
      postal_code: c.postal_code ?? '',
      country: c.country ?? '',
    })
    setEditing(c)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.code) return
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        code: form.code,
        registration_number: form.registration_number || null,
        tax_id: form.tax_id || null,
        currency: form.currency,
        fiscal_year_start: form.fiscal_year_start,
        fiscal_year_end: form.fiscal_year_end,
        phone: form.phone || null,
        email: form.email || null,
        website: form.website || null,
        address_line1: form.address_line1 || null,
        address_line2: form.address_line2 || null,
        city: form.city || null,
        state: form.state || null,
        postal_code: form.postal_code || null,
        country: form.country || null,
        updated_at: new Date().toISOString(),
      }
      if (editing) {
        const { error } = await supabase!
          .from('companies')
          .update(payload)
          .eq('id', editing.id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase!
          .from('companies')
          .insert(payload)
        if (error) throw new Error(error.message)
      }
      resetForm()
      await fetch()
    } catch (e: any) {
      setError(e.message)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this company? This cannot be undone.')) return
    try {
      const { error } = await supabase!.from('companies').delete().eq('id', id)
      if (error) throw new Error(error.message)
      await fetch()
    } catch (e: any) {
      setError(e.message)
    }
  }

  if (!isSuperuser) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="bg-[#fef0f0] border border-[#c23934] p-4 rounded text-sm text-[#c23934]">
          Access denied. Only Superusers can manage companies.
        </div>
      </div>
    )
  }

  return (
    <PageLayout
      title="Companies"
      description="Manage companies and their legal entity details"
      actions={
        !showForm ? (
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] transition-colors"
          >
            + New Company
          </button>
        ) : null
      }
    >
      {error && (
        <div className="mb-4 px-4 py-2 bg-[#fef0f0] border border-[#c23934] rounded text-xs text-[#c23934]">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 bg-white border border-[#dddbda] rounded-lg p-5">
          <h3 className="text-sm font-bold text-[#16325c] mb-4">{editing ? 'Edit Company' : 'New Company'}</h3>

          {/* Basic Info */}
          <div className="mb-5">
            <h4 className="text-[11px] font-bold text-[#514f4d] uppercase tracking-wider mb-3">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#514f4d] mb-1">Company Name <span className="text-[#c23934]">*</span></label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#dddbda] rounded bg-white text-[#16325c] focus:outline-none focus:border-[#0070d2]"
                  placeholder="My Company Ltd"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#514f4d] mb-1">Company Code <span className="text-[#c23934]">*</span></label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 text-sm border border-[#dddbda] rounded bg-white text-[#16325c] focus:outline-none focus:border-[#0070d2]"
                  placeholder="COMP001"
                />
              </div>
            </div>
          </div>

          {/* Legal Details */}
          <div className="mb-5">
            <h4 className="text-[11px] font-bold text-[#514f4d] uppercase tracking-wider mb-3">Legal & Financial</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#514f4d] mb-1">Registration Number</label>
                <input
                  value={form.registration_number}
                  onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#dddbda] rounded bg-white text-[#16325c] focus:outline-none focus:border-[#0070d2]"
                  placeholder="2024/123456"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#514f4d] mb-1">Tax ID / VAT Number</label>
                <input
                  value={form.tax_id}
                  onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#dddbda] rounded bg-white text-[#16325c] focus:outline-none focus:border-[#0070d2]"
                  placeholder="VAT-123456789"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#514f4d] mb-1">Currency</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#dddbda] rounded bg-white text-[#16325c] focus:outline-none focus:border-[#0070d2]"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div />
              <div>
                <label className="block text-xs font-medium text-[#514f4d] mb-1">Fiscal Year Start</label>
                <input
                  type="date"
                  value={form.fiscal_year_start}
                  onChange={(e) => setForm({ ...form, fiscal_year_start: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#dddbda] rounded bg-white text-[#16325c] focus:outline-none focus:border-[#0070d2]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#514f4d] mb-1">Fiscal Year End</label>
                <input
                  type="date"
                  value={form.fiscal_year_end}
                  onChange={(e) => setForm({ ...form, fiscal_year_end: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#dddbda] rounded bg-white text-[#16325c] focus:outline-none focus:border-[#0070d2]"
                />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="mb-5">
            <h4 className="text-[11px] font-bold text-[#514f4d] uppercase tracking-wider mb-3">Contact</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#514f4d] mb-1">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#dddbda] rounded bg-white text-[#16325c] focus:outline-none focus:border-[#0070d2]"
                  placeholder="+1 555-123-4567"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#514f4d] mb-1">Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#dddbda] rounded bg-white text-[#16325c] focus:outline-none focus:border-[#0070d2]"
                  placeholder="finance@company.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#514f4d] mb-1">Website</label>
                <input
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#dddbda] rounded bg-white text-[#16325c] focus:outline-none focus:border-[#0070d2]"
                  placeholder="https://company.com"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="mb-5">
            <h4 className="text-[11px] font-bold text-[#514f4d] uppercase tracking-wider mb-3">Address</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#514f4d] mb-1">Address Line 1</label>
                  <input
                    value={form.address_line1}
                    onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#dddbda] rounded bg-white text-[#16325c] focus:outline-none focus:border-[#0070d2]"
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#514f4d] mb-1">Address Line 2</label>
                  <input
                    value={form.address_line2}
                    onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#dddbda] rounded bg-white text-[#16325c] focus:outline-none focus:border-[#0070d2]"
                    placeholder="Apt, suite, unit"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#514f4d] mb-1">City</label>
                  <input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#dddbda] rounded bg-white text-[#16325c] focus:outline-none focus:border-[#0070d2]"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#514f4d] mb-1">State / Province</label>
                  <input
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#dddbda] rounded bg-white text-[#16325c] focus:outline-none focus:border-[#0070d2]"
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#514f4d] mb-1">Postal Code</label>
                  <input
                    value={form.postal_code}
                    onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#dddbda] rounded bg-white text-[#16325c] focus:outline-none focus:border-[#0070d2]"
                    placeholder="Postal code"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#514f4d] mb-1">Country</label>
                  <input
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#dddbda] rounded bg-white text-[#16325c] focus:outline-none focus:border-[#0070d2]"
                    placeholder="Country"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.name || !form.code}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-xs font-semibold text-[#514f4d] bg-white border border-[#dddbda] rounded hover:bg-[#f3f3f3] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-[#dddbda] rounded-lg shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_1fr_80px] gap-4 px-5 py-3 bg-[#f3f3f3] text-[11px] font-bold text-[#514f4d] uppercase tracking-wider border-b border-[#dddbda]">
          <span>Name</span>
          <span>Code</span>
          <span>Currency</span>
          <span />
        </div>
        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-[#514f4d]">Loading...</div>
        ) : companies.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400 italic">No companies found.</div>
        ) : (
          <div className="divide-y divide-[#dddbda]">
            {companies.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-[1fr_100px_1fr_80px] gap-4 px-5 py-3 items-center hover:bg-[#fafaf9] transition-colors text-sm cursor-pointer"
                onClick={() => openEdit(c)}
              >
                <span className="text-[#16325c] font-medium">{c.name}</span>
                <span className="text-[#514f4d] font-mono text-xs">{c.code}</span>
                <span className="text-[#514f4d]">{c.currency || 'USD'}</span>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(c) }}
                    className="px-2 py-1 text-[10px] font-semibold text-[#0070d2] bg-[#e8f4fe] rounded hover:bg-[#d8edfa] transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(c.id) }}
                    className="px-2 py-1 text-[10px] font-semibold text-[#c23934] bg-[#fef0f0] rounded hover:bg-[#fce8e8] transition-colors"
                  >
                    Del
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
