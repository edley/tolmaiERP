import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useRBAC } from '../../hooks/useRBAC'
import { PageLayout } from '../../components/PageLayout'
import { AvatarUpload } from '../../components/ui/avatar-upload'
import { getPermissions } from '../../lib/rbac'
import { getMenuByKey, getModules } from '../../lib/menus'
import { MFASettings } from '../../components/MFA/MFASettings'
import { Save } from 'lucide-react'

export function Settings() {
  const { user, isOnline, updateProfile } = useAuth()
  const { userType, isSuperuser } = useRBAC()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setName(user.name ?? '')
    setPhone(user.phone ?? '')
    setDateOfBirth(user.date_of_birth ?? '')
    setAddressLine1(user.address_line1 ?? '')
    setAddressLine2(user.address_line2 ?? '')
    setCity(user.city ?? '')
    setState(user.state ?? '')
    setPostalCode(user.postal_code ?? '')
    setCountry(user.country ?? '')
    setAvatarUrl(user.avatar_url)
  }, [user])

  const hasChanges = useMemo(() => {
    if (!user) return false
    return (
      name !== (user.name ?? '') ||
      phone !== (user.phone ?? '') ||
      dateOfBirth !== (user.date_of_birth ?? '') ||
      addressLine1 !== (user.address_line1 ?? '') ||
      addressLine2 !== (user.address_line2 ?? '') ||
      city !== (user.city ?? '') ||
      state !== (user.state ?? '') ||
      postalCode !== (user.postal_code ?? '') ||
      country !== (user.country ?? '')
    )
  }, [user, name, phone, dateOfBirth, addressLine1, addressLine2, city, state, postalCode, country])

  const initials = useMemo(() => {
    if (!user) return '??'
    return user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  }, [user])

  const allowedMenus = useMemo(() => {
    if (!userType) return []
    if (isSuperuser) return null
    const perms = getPermissions()
    return perms[userType] ?? []
  }, [userType, isSuperuser])

  const handleSave = async () => {
    if (!user || !isOnline) return
    setSaving(true)
    setSaved(false)
    try {
      await updateProfile({
        name,
        phone: phone || null,
        date_of_birth: dateOfBirth || null,
        address_line1: addressLine1 || null,
        address_line2: addressLine2 || null,
        city: city || null,
        state: state || null,
        postal_code: postalCode || null,
        country: country || null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.error('Failed to update profile:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpdate = (url: string | null) => {
    setAvatarUrl(url)
    if (user && isOnline) {
      updateProfile({ avatar_url: url }).catch(console.error)
    }
  }

  if (!user) return null

  return (
    <PageLayout title="Settings" description="Manage your profile, role, and permissions">
      <div className="max-w-3xl mx-auto space-y-6">

      {/* Profile Card */}
      <div className="bg-white border border-[#dddbda] rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-[#dddbda] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#514f4d] uppercase tracking-wider">User Profile</h2>
          {isOnline && (
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0070d2] rounded hover:bg-[#005fb2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
        <div className="p-6 space-y-5">
          {isOnline ? (
            <AvatarUpload
              userId={user.id}
              currentUrl={avatarUrl}
              userName={user.name}
              onUpdate={handleAvatarUpdate}
            />
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#0070d2] text-white text-lg font-bold flex items-center justify-center shrink-0 border-2 border-slate-200">
                {initials}
              </div>
              <div>
                <p className="text-xs text-slate-400 italic">Avatar editing unavailable in demo mode</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#514f4d] uppercase tracking-wider mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isOnline}
                className="w-full h-9 px-3 text-sm text-[#16325c] border border-[#dddbda] rounded focus:outline-none focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] disabled:bg-[#f3f3f3] disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#514f4d] uppercase tracking-wider mb-1">Email</label>
              <div className="h-9 flex items-center px-3 text-sm text-[#16325c] bg-[#f3f3f3] border border-[#dddbda] rounded">{user.email}</div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#514f4d] uppercase tracking-wider mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!isOnline}
                placeholder="+1 (555) 123-4567"
                className="w-full h-9 px-3 text-sm text-[#16325c] border border-[#dddbda] rounded focus:outline-none focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] disabled:bg-[#f3f3f3] disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#514f4d] uppercase tracking-wider mb-1">Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                disabled={!isOnline}
                className="w-full h-9 px-3 text-sm text-[#16325c] border border-[#dddbda] rounded focus:outline-none focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] disabled:bg-[#f3f3f3] disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-bold text-[#514f4d] uppercase tracking-wider mb-2">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-medium text-[#514f4d] mb-1">Address Line 1</label>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  disabled={!isOnline}
                  placeholder="Street address, P.O. box"
                  className="w-full h-9 px-3 text-sm text-[#16325c] border border-[#dddbda] rounded focus:outline-none focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] disabled:bg-[#f3f3f3] disabled:cursor-not-allowed"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-medium text-[#514f4d] mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  disabled={!isOnline}
                  placeholder="Apartment, suite, unit, building, floor, etc."
                  className="w-full h-9 px-3 text-sm text-[#16325c] border border-[#dddbda] rounded focus:outline-none focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] disabled:bg-[#f3f3f3] disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#514f4d] mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!isOnline}
                  className="w-full h-9 px-3 text-sm text-[#16325c] border border-[#dddbda] rounded focus:outline-none focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] disabled:bg-[#f3f3f3] disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#514f4d] mb-1">State / Province</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  disabled={!isOnline}
                  className="w-full h-9 px-3 text-sm text-[#16325c] border border-[#dddbda] rounded focus:outline-none focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] disabled:bg-[#f3f3f3] disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#514f4d] mb-1">Postal Code</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  disabled={!isOnline}
                  className="w-full h-9 px-3 text-sm text-[#16325c] border border-[#dddbda] rounded focus:outline-none focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] disabled:bg-[#f3f3f3] disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#514f4d] mb-1">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={!isOnline}
                  className="w-full h-9 px-3 text-sm text-[#16325c] border border-[#dddbda] rounded focus:outline-none focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] disabled:bg-[#f3f3f3] disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {saved && (
            <div className="text-xs text-emerald-600 font-medium">Profile saved successfully.</div>
          )}
        </div>
      </div>

      {/* Menu Access Card */}
      <div className="bg-white border border-[#dddbda] rounded-lg shadow-sm">
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

      {/* Superuser links */}
      {isSuperuser && (
        <Link to="/companies" className="block bg-white border border-[#dddbda] rounded-lg shadow-sm p-5 hover:bg-[#fafaf9] transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#16325c]">Company Settings</h3>
              <p className="text-xs text-[#514f4d] mt-0.5">Manage company legal details, addresses, and currency</p>
            </div>
            <svg className="w-5 h-5 text-[#0070d2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      )}

      {isSuperuser && (
        <Link to="/usermgmt" className="block bg-white border border-[#dddbda] rounded-lg shadow-sm p-5 hover:bg-[#fafaf9] transition-colors">
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
            <div className="flex items-center gap-2">
              {userType && (
                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-[#e8f4fe] text-[#0070d2] border border-[#0070d2]">
                  {userType}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MFA Settings */}
      {isOnline && (
        <MFASettings />
      )}

      {/* Demo notice */}
      {!isOnline && (
        <div className="bg-[#fef7e0] border border-[#f9d84a] p-4 rounded text-sm text-[#6b5200]">
          <strong>Demo Mode</strong> — Set{' '}
          <code className="font-mono bg-white px-1 rounded">VITE_SUPABASE_URL</code> and{' '}
          <code className="font-mono bg-white px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to enable real authentication and profile editing.
        </div>
      )}
    </div>
    </PageLayout>
  )
}

