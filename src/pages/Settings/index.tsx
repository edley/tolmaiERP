import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useRBAC } from '../../hooks/useRBAC'
import { PageLayout } from '../../components/PageLayout'
import { getPermissions } from '../../lib/rbac'
import { getMenuByKey, getModules } from '../../lib/menus'
import { getCompany, saveCompany, FISCAL_MONTHS } from '../../lib/company'
import type { Company } from '../../lib/company'

export function Settings() {
  const { user, isOnline } = useAuth()
  const { userType, isSuperuser } = useRBAC()

  const initials = useMemo(() => {
    if (!user) return '??'
    return user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  }, [user])

  const allowedMenus = useMemo(() => {
    if (!userType) return []
    if (isSuperuser) return null // null = all
    const perms = getPermissions()
    return perms[userType] ?? []
  }, [userType, isSuperuser])

  const [company, setCompany] = useState<Company>(getCompany)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Company>(company)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setCompany(getCompany())
  }, [])

  const startEdit = () => {
    setDraft({ ...company })
    setEditing(true)
    setSaved(false)
  }

  const cancelEdit = () => {
    setDraft({ ...company })
    setEditing(false)
    setSaved(false)
  }

  const handleSave = () => {
    setSaving(true)
    saveCompany(draft)
    setCompany(draft)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  const updateDraft = (field: keyof Company, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  if (!user) return null

  return (
    <PageLayout title="Settings" description="Manage your profile, role, and permissions">
      <div className="max-w-3xl mx-auto space-y-6">

      {/* Profile Card */}
      <div className="bg-white border border-[#dddbda] rounded-lg shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-[#dddbda]">
          <h2 className="text-sm font-bold text-[#514f4d] uppercase tracking-wider">User Profile</h2>
        </div>
        <div className="p-6 flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-[#0070d2] text-white text-lg font-bold flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div>
            <div className="text-sm font-semibold text-[#16325c]">{user.name}</div>
            <div className="text-xs text-[#514f4d]">{user.email}</div>
            <div className="flex items-center gap-2 mt-1.5">
              {userType && (
                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-[#e8f4fe] text-[#0070d2] border border-[#0070d2]">
                  {userType}
                </span>
              )}
              {!isOnline && (
                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-[#fef7e0] text-[#6b5200] border border-[#f9d84a]">
                  Demo
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Menu Access Card */}
      <div className="bg-white border border-[#dddbda] rounded-lg shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-[#dddbda]">
          <h2 className="text-sm font-bold text-[#514f4d] uppercase tracking-wider">Menu Access</h2>
          <p className="text-xs text-[#514f4d] mt-0.5">
            {isSuperuser
              ? 'You have full access to all modules'
              : `Modules you can access as ${userType}`
            }
          </p>
        </div>
        <div className="p-6">
          {isSuperuser ? (
            <div className="flex items-center gap-2 text-sm text-[#007a33]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Full access to all menus
            </div>
          ) : (
            <div className="space-y-3">
              {getModules().map((mod) => {
                const keys = (allowedMenus ?? []).filter((k: string) => getMenuByKey(k)?.module === mod)
                if (keys.length === 0) return null
                return (
                  <div key={mod}>
                    <span className="text-[10px] font-bold text-[#514f4d] uppercase tracking-wider block mb-1">{mod}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {keys.map((key: string) => {
                        const menu = getMenuByKey(key)
                        return (
                          <span key={key} className="inline-flex px-2.5 py-1 text-xs font-medium bg-[#e8f4fe] text-[#0070d2] border border-[#0070d2] rounded-full">
                            {menu?.label ?? key}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {(allowedMenus ?? []).length === 0 && (
                <div className="text-sm text-slate-400 italic">No menus assigned.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Company Information */}
      <div className="bg-white border border-[#dddbda] rounded-lg shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-[#dddbda] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#514f4d] uppercase tracking-wider">Company Information</h2>
            <p className="text-xs text-[#514f4d] mt-0.5">Legal entity details used on invoices and reports</p>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-xs text-[#007a33] font-semibold flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Saved
              </span>
            )}
            {editing ? (
              <>
                <button onClick={cancelEdit} className="h-7 px-3 text-xs font-medium text-[#514f4d] bg-white border border-[#dddbda] rounded hover:bg-[#f3f3f3] transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="h-7 px-4 text-xs font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] transition-colors inline-flex items-center gap-1.5">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <button onClick={startEdit} className="h-7 px-3 text-xs font-semibold text-[#0070d2] bg-[#e8f4fe] border border-[#0070d2] rounded hover:bg-[#d8edfc] transition-colors">
                Edit
              </button>
            )}
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <label className="text-[11px] font-bold text-[#514f4d] uppercase tracking-wider block leading-normal">Company Name <span className="text-[#c23934]">*</span></label>
              {editing ? (
                <input type="text" value={draft.name} onChange={(e) => updateDraft('name', e.target.value)} className="w-full h-8 px-2.5 text-sm border border-[#dddbda] rounded text-[#16325c] hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none" placeholder="e.g. My Company Ltd." />
              ) : (
                <div className="h-8 flex items-center px-2.5 text-sm text-[#16325c]">{company.name || <span className="text-slate-400">—</span>}</div>
              )}
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#514f4d] uppercase tracking-wider block leading-normal">Registration Number</label>
              {editing ? (
                <input type="text" value={draft.registration_number} onChange={(e) => updateDraft('registration_number', e.target.value)} className="w-full h-8 px-2.5 text-sm border border-[#dddbda] rounded text-[#16325c] hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none" placeholder="e.g. 2024/123456" />
              ) : (
                <div className="h-8 flex items-center px-2.5 text-sm text-[#16325c]">{company.registration_number || <span className="text-slate-400">—</span>}</div>
              )}
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#514f4d] uppercase tracking-wider block leading-normal">Tax ID / VAT Number</label>
              {editing ? (
                <input type="text" value={draft.tax_id} onChange={(e) => updateDraft('tax_id', e.target.value)} className="w-full h-8 px-2.5 text-sm border border-[#dddbda] rounded text-[#16325c] hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none" placeholder="e.g. VAT-123456789" />
              ) : (
                <div className="h-8 flex items-center px-2.5 text-sm text-[#16325c]">{company.tax_id || <span className="text-slate-400">—</span>}</div>
              )}
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#514f4d] uppercase tracking-wider block leading-normal">Currency</label>
              {editing ? (
                <select value={draft.currency} onChange={(e) => updateDraft('currency', e.target.value)} className="w-full h-8 px-2.5 text-sm border border-[#dddbda] rounded text-[#16325c] bg-white hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none">
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="IDR">IDR — Indonesian Rupiah</option>
                  <option value="SGD">SGD — Singapore Dollar</option>
                  <option value="MYR">MYR — Malaysian Ringgit</option>
                  <option value="PHP">PHP — Philippine Peso</option>
                  <option value="THB">THB — Thai Baht</option>
                  <option value="VND">VND — Vietnamese Dong</option>
                </select>
              ) : (
                <div className="h-8 flex items-center px-2.5 text-sm text-[#16325c]">{company.currency || <span className="text-slate-400">—</span>}</div>
              )}
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#514f4d] uppercase tracking-wider block leading-normal">Fiscal Year Start</label>
              {editing ? (
                <select value={draft.fiscal_year_start} onChange={(e) => updateDraft('fiscal_year_start', e.target.value)} className="w-full h-8 px-2.5 text-sm border border-[#dddbda] rounded text-[#16325c] bg-white hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none">
                  {FISCAL_MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <div className="h-8 flex items-center px-2.5 text-sm text-[#16325c]">{company.fiscal_year_start || <span className="text-slate-400">—</span>}</div>
              )}
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#514f4d] uppercase tracking-wider block leading-normal">Phone</label>
              {editing ? (
                <input type="text" value={draft.phone} onChange={(e) => updateDraft('phone', e.target.value)} className="w-full h-8 px-2.5 text-sm border border-[#dddbda] rounded text-[#16325c] hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none" placeholder="+1 555-123-4567" />
              ) : (
                <div className="h-8 flex items-center px-2.5 text-sm text-[#16325c]">{company.phone || <span className="text-slate-400">—</span>}</div>
              )}
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#514f4d] uppercase tracking-wider block leading-normal">Email</label>
              {editing ? (
                <input type="email" value={draft.email} onChange={(e) => updateDraft('email', e.target.value)} className="w-full h-8 px-2.5 text-sm border border-[#dddbda] rounded text-[#16325c] hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none" placeholder="finance@company.com" />
              ) : (
                <div className="h-8 flex items-center px-2.5 text-sm text-[#16325c]">{company.email || <span className="text-slate-400">—</span>}</div>
              )}
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#514f4d] uppercase tracking-wider block leading-normal">Website</label>
              {editing ? (
                <input type="text" value={draft.website} onChange={(e) => updateDraft('website', e.target.value)} className="w-full h-8 px-2.5 text-sm border border-[#dddbda] rounded text-[#16325c] hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none" placeholder="https://company.com" />
              ) : (
                <div className="h-8 flex items-center px-2.5 text-sm text-[#16325c]">{company.website || <span className="text-slate-400">—</span>}</div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-[#514f4d] uppercase tracking-wider block leading-normal">Address</label>
              {editing ? (
                <div className="space-y-2 mt-0.5">
                  <input type="text" value={draft.address_line1} onChange={(e) => updateDraft('address_line1', e.target.value)} className="w-full h-8 px-2.5 text-sm border border-[#dddbda] rounded text-[#16325c] hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none" placeholder="Street address" />
                  <input type="text" value={draft.address_line2} onChange={(e) => updateDraft('address_line2', e.target.value)} className="w-full h-8 px-2.5 text-sm border border-[#dddbda] rounded text-[#16325c] hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none" placeholder="Apt, suite, unit (optional)" />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" value={draft.city} onChange={(e) => updateDraft('city', e.target.value)} className="w-full h-8 px-2.5 text-sm border border-[#dddbda] rounded text-[#16325c] hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none" placeholder="City" />
                    <input type="text" value={draft.state} onChange={(e) => updateDraft('state', e.target.value)} className="w-full h-8 px-2.5 text-sm border border-[#dddbda] rounded text-[#16325c] hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none" placeholder="State / Province" />
                    <input type="text" value={draft.postal_code} onChange={(e) => updateDraft('postal_code', e.target.value)} className="w-full h-8 px-2.5 text-sm border border-[#dddbda] rounded text-[#16325c] hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none" placeholder="Postal code" />
                  </div>
                  <input type="text" value={draft.country} onChange={(e) => updateDraft('country', e.target.value)} className="w-full h-8 px-2.5 text-sm border border-[#dddbda] rounded text-[#16325c] hover:border-[#0070d2] focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] focus:outline-none" placeholder="Country" />
                </div>
              ) : (
                <div className="text-sm text-[#16325c] mt-0.5">
                  {company.address_line1 || company.address_line2 || company.city || company.state || company.postal_code || company.country ? (
                    <>
                      {company.address_line1 && <div>{company.address_line1}</div>}
                      {company.address_line2 && <div>{company.address_line2}</div>}
                      {[company.city, company.state, company.postal_code].filter(Boolean).join(', ') && <div>{[company.city, company.state, company.postal_code].filter(Boolean).join(', ')}</div>}
                      {company.country && <div>{company.country}</div>}
                    </>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Superuser link */}
      {isSuperuser && (
        <Link to="/usermgmt" className="block bg-white border border-[#dddbda] rounded-lg shadow-sm p-5 hover:bg-[#fafaf9] transition-colors mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#16325c]">User Management</h3>
              <p className="text-xs text-[#514f4d] mt-0.5">Manage user types and menu access permissions</p>
            </div>
            <svg className="w-5 h-5 text-[#0070d2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      )}

      {/* Account Card */}
      {isOnline && (
        <div className="bg-white border border-[#dddbda] rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-[#dddbda]">
            <h2 className="text-sm font-bold text-[#514f4d] uppercase tracking-wider">Account</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[#514f4d] uppercase tracking-wider mb-1">Email</label>
              <div className="h-9 flex items-center px-3 text-sm text-[#16325c] bg-[#f3f3f3] border border-[#dddbda] rounded">{user.email}</div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#514f4d] uppercase tracking-wider mb-1">User ID</label>
              <div className="h-9 flex items-center px-3 text-sm font-mono text-[#16325c] bg-[#f3f3f3] border border-[#dddbda] rounded">{user.id}</div>
            </div>
            <div className="pt-2">
              <p className="text-xs text-[#514f4d]">Password and profile changes are managed through your authentication provider.</p>
            </div>
          </div>
        </div>
      )}

      {/* Demo notice */}
      {!isOnline && (
        <div className="bg-[#fef7e0] border border-[#f9d84a] p-4 rounded text-sm text-[#6b5200] mt-6">
          <strong>Demo Mode</strong> — Set{' '}
          <code className="font-mono bg-white px-1 rounded">VITE_SUPABASE_URL</code> and{' '}
          <code className="font-mono bg-white px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to enable real authentication.
        </div>
      )}
    </div>
    </PageLayout>
  )
}
