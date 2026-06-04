import { useState, useMemo, useEffect } from 'react'
import { useRBAC } from '../../hooks/useRBAC'
import { LookupField } from '../../components/LookupField'
import { PageLayout } from '../../components/PageLayout'
import { supabase, isOnline } from '../../lib/supabase'
import { fetchUserProfiles, updateUserProfile, fetchUserCompanies, addUserCompanyAccess, removeUserCompanyAccess, setUserDefaultCompany, type UserProfile } from '../../lib/auth'
import { USER_TYPES, getPermissions, resetPermissions as resetMenuPerms, grantMenu, revokeMenu } from '../../lib/rbac'
import { getMenuByKey, getModules, getFlatMenus } from '../../lib/menus'
import { DOC_TYPES, DOC_TYPE_LABELS, getCrud, setCrudPerm, resetCrud, type CrudOp } from '../../lib/permissions'
import type { Company } from '../../types'

const CRUD_OPS: CrudOp[] = ['create', 'read', 'update', 'delete']
const ROLE_OPTIONS = [
  { value: 'User', label: 'User' },
  { value: 'Team Leader', label: 'Team Leader' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Superuser', label: 'Superuser' },
]

export function UserManagement() {
  const { isSuperuser } = useRBAC()
  const [tick, setTick] = useState(0)
  const [confirmReset, setConfirmReset] = useState(false)
  const [activeTab, setActiveTab] = useState<'menus' | 'crud' | 'roles' | 'companies'>('menus')
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [profilesLoading, setProfilesLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [allCompanies, setAllCompanies] = useState<Company[]>([])
  const [userCompanyMap, setUserCompanyMap] = useState<Record<string, string[]>>({})
  const [userDefaultMap, setUserDefaultMap] = useState<Record<string, string>>({})

  const refresh = () => setTick((t) => t + 1)

  const loadProfiles = async () => {
    setProfilesLoading(true)
    setProfileError(null)
    try {
      const data = await fetchUserProfiles()
      setProfiles(data)

      if (isOnline() && supabase) {
        const { data: companies } = await supabase.from('companies').select('*').order('name')
        setAllCompanies((companies ?? []) as Company[])

        const accessMap: Record<string, string[]> = {}
        const defaultMap: Record<string, string> = {}
        for (const p of data) {
          try {
            const access = await fetchUserCompanies(p.id)
            accessMap[p.id] = access.map((a) => a.company_id)
            const def = access.find((a) => a.is_default)
            if (def) defaultMap[p.id] = def.company_id
          } catch {}
        }
        setUserCompanyMap(accessMap)
        setUserDefaultMap(defaultMap)
      }
    } catch (e: any) {
      setProfileError(e?.message ?? 'Failed to load user profiles')
    }
    setProfilesLoading(false)
  }

  useEffect(() => {
    if (activeTab === 'roles' || activeTab === 'companies') loadProfiles()
  }, [activeTab])

  const toggleCompanyAccess = async (userId: string, companyId: string, add: boolean) => {
    try {
      if (add) {
        const isDefault = allCompanies.length > 0 && !Object.values(userDefaultMap).some(Boolean)
        await addUserCompanyAccess(userId, companyId, isDefault)
      } else {
        await removeUserCompanyAccess(userId, companyId)
      }
      setUserCompanyMap((prev) => {
        const current = prev[userId] ?? []
        const next = add ? [...current, companyId] : current.filter((c) => c !== companyId)
        return { ...prev, [userId]: next }
      })
    } catch (e: any) {
      setProfileError(e?.message ?? 'Failed to update company access')
    }
  }

  const handleSetDefault = async (userId: string, companyId: string) => {
    try {
      await setUserDefaultCompany(userId, companyId)
      setUserDefaultMap((prev) => ({ ...prev, [userId]: companyId }))
    } catch (e: any) {
      setProfileError(e?.message ?? 'Failed to set default company')
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setSavingId(userId)
    try {
      await updateUserProfile(userId, { role: newRole })
      setProfiles((prev) => prev.map((p) => (p.id === userId ? { ...p, role: newRole } : p)))
    } catch (e: any) {
      setProfileError(e?.message ?? 'Failed to update role')
    }
    setSavingId(null)
  }

  const permissions = useMemo(() => {
    getPermissions()
    return getPermissions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick])

  const crudPerms = useMemo(() => {
    getCrud()
    return getCrud()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick])

  const handleResetAll = () => {
    resetMenuPerms()
    resetCrud()
    setConfirmReset(false)
    refresh()
  }

  if (!isSuperuser) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="bg-[#fef0f0] border border-[#c23934] p-4 rounded text-sm text-[#c23934]">
          Access denied. Only Superusers can manage permissions.
        </div>
      </div>
    )
  }

  const menuOptions = getFlatMenus().map((m) => ({ id: m.key, label: m.label, sublabel: m.module }))

  const groupedAccess = useMemo(() => {
    const result: Record<string, Record<string, string[]>> = {}
    for (const ut of USER_TYPES) {
      const allowed = permissions[ut]
      const groups: Record<string, string[]> = {}
      allowed.forEach((key: string) => {
        const menu = getMenuByKey(key)
        const mod = menu?.module ?? 'Other'
        if (!groups[mod]) groups[mod] = []
        groups[mod].push(key)
      })
      result[ut] = groups
    }
    return result
  }, [permissions])

  return (
    <PageLayout
      title="User Management"
      description="Manage user roles, menu access, and CRUD permissions"
      actions={
        confirmReset ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#c23934] font-medium">Reset all permissions to defaults?</span>
            <button onClick={handleResetAll} className="px-3 py-1.5 text-xs font-semibold text-white bg-[#c23934] rounded hover:bg-[#a2302c] transition-colors">Confirm</button>
            <button onClick={() => setConfirmReset(false)} className="px-3 py-1.5 text-xs font-semibold text-[#514f4d] bg-white border border-[#dddbda] rounded hover:bg-[#f3f3f3] transition-colors">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmReset(true)} className="px-3 py-1.5 text-xs font-semibold text-[#514f4d] bg-white border border-[#dddbda] rounded hover:bg-[#f3f3f3] transition-colors">Reset All to Defaults</button>
        )
      }
    >
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#f3f3f3] rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('menus')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'menus' ? 'bg-white text-[#0070d2] shadow-sm' : 'text-[#514f4d] hover:text-[#16325c]'}`}
        >
          Menu Access
        </button>
        <button
          onClick={() => setActiveTab('crud')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'crud' ? 'bg-white text-[#0070d2] shadow-sm' : 'text-[#514f4d] hover:text-[#16325c]'}`}
        >
          CRUD Permissions
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'roles' ? 'bg-white text-[#0070d2] shadow-sm' : 'text-[#514f4d] hover:text-[#16325c]'}`}
        >
          User Roles
        </button>
        <button
          onClick={() => setActiveTab('companies')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'companies' ? 'bg-white text-[#0070d2] shadow-sm' : 'text-[#514f4d] hover:text-[#16325c]'}`}
        >
          Company Access
        </button>
      </div>

      {activeTab === 'menus' && (
        <div className="space-y-4">
          {USER_TYPES.map((userType) => {
            const allowed = permissions[userType]
            const isLocked = userType === 'Superuser'
            const isWildcard = allowed.includes('*')
            const grouped = groupedAccess[userType]

            return (
              <div key={userType} className="bg-white border border-[#dddbda] rounded-lg shadow-sm">
                <div className="px-5 py-3.5 border-b border-[#dddbda] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#16325c]">{userType}</span>
                    {isLocked && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-[#e8f4fe] text-[#0070d2] border border-[#0070d2] rounded">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth="2" /><path d="M7 11V7a5 5 0 0110 0v4" strokeWidth="2" /></svg>
                        Superuser
                      </span>
                    )}
                  </div>
                  {!isLocked && (
                    <div className="w-48">
                      <LookupField
                        value=""
                        onChange={(key) => { if (key) { grantMenu(userType, key as any); refresh() } }}
                        options={menuOptions.filter((o) => !allowed.includes(o.id))}
                        placeholder="Add menu..."
                        searchPlaceholder="Search menus..."
                        emptyMessage="All menus already added"
                      />
                    </div>
                  )}
                </div>
                <div className="px-5 py-3.5">
                  {isWildcard || isLocked ? (
                    <div className="flex items-center gap-2 text-sm text-[#007a33]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Full access to all menus
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {getModules().map((mod) => {
                        const keys = grouped[mod] ?? []
                        if (keys.length === 0) return null
                        return (
                          <div key={mod}>
                            <span className="text-[10px] font-bold text-[#514f4d] uppercase tracking-wider block mb-1.5">{mod}</span>
                            <div className="flex flex-wrap gap-1.5">
                              {keys.map((key) => {
                                const menu = getMenuByKey(key)
                                return (
                                  <span key={key} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[#e8f4fe] text-[#0070d2] border border-[#0070d2] rounded-full group">
                                    {menu?.label ?? key}
                                    <button type="button" onClick={() => { revokeMenu(userType, key as any); refresh() }} className="text-[#0070d2]/60 hover:text-[#c23934] transition-colors" title={`Remove ${menu?.label ?? key}`}>
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                      {allowed.length === 0 && <div className="text-sm text-slate-400 italic">No menus assigned.</div>}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'crud' && (
        <div className="bg-white border border-[#dddbda] rounded-lg shadow-sm overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[140px_repeat(4,1fr)] gap-0 px-4 py-3 bg-[#f3f3f3] border-b border-[#dddbda] text-[11px] font-bold text-[#514f4d] uppercase tracking-wider">
            <span>User Type</span>
            <span className="text-center">Create</span>
            <span className="text-center">Read</span>
            <span className="text-center">Update</span>
            <span className="text-center">Delete</span>
          </div>
          {USER_TYPES.map((userType) => {
            const isLocked = userType === 'Superuser'
            return (
              <div key={userType} className="border-b border-[#dddbda] last:border-b-0">
                <div className="grid grid-cols-[140px_repeat(4,1fr)] gap-0 px-4 py-2 bg-[#fafaf9] border-b border-[#dddbda] text-sm font-semibold text-[#16325c]">
                  <span className="flex items-center gap-2">
                    {userType}
                    {isLocked && <span className="text-[10px] text-[#0070d2] bg-[#e8f4fe] px-1.5 py-0.5 rounded">Locked</span>}
                  </span>
                  <span className="text-center" />
                  <span className="text-center" />
                  <span className="text-center" />
                  <span className="text-center" />
                </div>
                {DOC_TYPES.map((docType) => (
                  <div key={docType} className="grid grid-cols-[140px_repeat(4,1fr)] gap-0 px-4 py-2 hover:bg-[#fafaf9] transition-colors text-sm">
                    <span className="text-[#514f4d]">{DOC_TYPE_LABELS[docType]}</span>
                    {CRUD_OPS.map((op) => {
                      const allowed = isLocked ? true : (crudPerms[userType]?.[docType]?.[op] ?? false)
                      return (
                        <div key={op} className="flex justify-center">
                          {isLocked ? (
                            <span className="w-5 h-5 rounded bg-[#007a33] flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setCrudPerm(userType, docType, op, !allowed); refresh() }}
                              className={`w-5 h-5 rounded border transition-colors flex items-center justify-center ${
                                allowed
                                  ? 'bg-[#0070d2] border-[#0070d2] text-white hover:bg-[#005fb2] cursor-pointer'
                                  : 'bg-white border-[#dddbda] hover:border-[#0070d2] cursor-pointer'
                              }`}
                            >
                              {allowed && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="bg-white border border-[#dddbda] rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#dddbda] flex items-center justify-between">
            <span className="text-sm font-bold text-[#16325c]">User Roles</span>
            <button
              onClick={loadProfiles}
              disabled={profilesLoading}
              className="px-3 py-1.5 text-xs font-semibold text-[#514f4d] bg-white border border-[#dddbda] rounded hover:bg-[#f3f3f3] transition-colors disabled:opacity-50"
            >
              {profilesLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {profileError && (
            <div className="mx-5 mt-3 px-4 py-2 bg-[#fef0f0] border border-[#c23934] rounded text-xs text-[#c23934]">
              {profileError}
            </div>
          )}

          <div className="divide-y divide-[#dddbda]">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_1fr_140px] gap-4 px-5 py-3 bg-[#f3f3f3] text-[11px] font-bold text-[#514f4d] uppercase tracking-wider">
              <span>Email</span>
              <span>Name</span>
              <span>Role</span>
            </div>

            {profiles.length === 0 && !profilesLoading && (
              <div className="px-5 py-8 text-center text-sm text-slate-400 italic">
                {profileError ? 'Failed to load users.' : 'No users found.'}
              </div>
            )}

            {profilesLoading && (
              <div className="px-5 py-8 text-center text-sm text-[#514f4d]">
                Loading users...
              </div>
            )}

            {profiles.map((p) => (
              <div key={p.id} className="px-5 py-3 hover:bg-[#fafaf9] transition-colors">
                <div className="grid grid-cols-[1fr_1fr_140px] gap-4 items-center text-sm">
                  <span className="text-[#514f4d] truncate">{p.email}</span>
                  <span className="text-[#514f4d] truncate">{p.name ?? '-'}</span>
                  <div>
                    <select
                      value={p.role}
                      onChange={(e) => handleRoleChange(p.id, e.target.value)}
                      disabled={savingId === p.id}
                      className="w-full px-2 py-1.5 text-xs border border-[#dddbda] rounded bg-white text-[#16325c] focus:outline-none focus:border-[#0070d2] disabled:opacity-50"
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'companies' && (
        <div className="bg-white border border-[#dddbda] rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#dddbda] flex items-center justify-between">
            <span className="text-sm font-bold text-[#16325c]">Company Access</span>
            <button
              onClick={loadProfiles}
              disabled={profilesLoading}
              className="px-3 py-1.5 text-xs font-semibold text-[#514f4d] bg-white border border-[#dddbda] rounded hover:bg-[#f3f3f3] transition-colors disabled:opacity-50"
            >
              {profilesLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {profileError && (
            <div className="mx-5 mt-3 px-4 py-2 bg-[#fef0f0] border border-[#c23934] rounded text-xs text-[#c23934]">
              {profileError}
            </div>
          )}

          {allCompanies.length === 0 && !profilesLoading && (
            <div className="px-5 py-8 text-center text-sm text-slate-400 italic">
              No companies found. Create one in Settings &rarr; Companies first.
            </div>
          )}

          {allCompanies.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f3f3f3] text-[11px] font-bold text-[#514f4d] uppercase tracking-wider">
                    <th className="px-5 py-3 text-left whitespace-nowrap">User</th>
                    {allCompanies.map((c) => (
                      <th key={c.id} className="px-3 py-3 text-center whitespace-nowrap" title={c.name}>
                        {c.code}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dddbda]">
                  {profiles.length === 0 && !profilesLoading && (
                    <tr>
                      <td colSpan={allCompanies.length + 1} className="px-5 py-8 text-center text-slate-400 italic">
                        No users found.
                      </td>
                    </tr>
                  )}
                  {profilesLoading && (
                    <tr>
                      <td colSpan={allCompanies.length + 1} className="px-5 py-8 text-center text-[#514f4d]">
                        Loading users...
                      </td>
                    </tr>
                  )}
                  {profiles.map((p) => {
                    const userCompanies = userCompanyMap[p.id] ?? []
                    const userDefault = userDefaultMap[p.id]
                    return (
                      <tr key={p.id} className="hover:bg-[#fafaf9] transition-colors">
                        <td className="px-5 py-3 text-[#514f4d] whitespace-nowrap">
                          <div className="text-sm font-medium text-[#16325c]">{p.email}</div>
                          {p.name && <div className="text-[11px] text-[#514f4d]">{p.name}</div>}
                        </td>
                        {allCompanies.map((c) => {
                          const hasAccess = userCompanies.includes(c.id)
                          const isDefault = userDefault === c.id
                          return (
                            <td key={c.id} className="px-3 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Access checkbox */}
                                <button
                                  type="button"
                                  onClick={() => toggleCompanyAccess(p.id, c.id, !hasAccess)}
                                  title={hasAccess ? `Revoke access to ${c.name}` : `Grant access to ${c.name}`}
                                  className={`w-5 h-5 rounded border transition-colors flex items-center justify-center ${
                                    hasAccess
                                      ? 'bg-[#0070d2] border-[#0070d2] text-white hover:bg-[#005fb2]'
                                      : 'bg-white border-[#dddbda] hover:border-[#0070d2]'
                                  }`}
                                >
                                  {hasAccess && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                                </button>
                                {/* Default radio */}
                                <button
                                  type="button"
                                  onClick={() => hasAccess && handleSetDefault(p.id, c.id)}
                                  disabled={!hasAccess}
                                  title={isDefault ? 'Default company' : hasAccess ? 'Set as default company' : 'Grant access first'}
                                  className={`w-4 h-4 rounded-full border transition-colors flex items-center justify-center ${
                                    isDefault
                                      ? 'bg-[#0070d2] border-[#0070d2]'
                                      : hasAccess
                                        ? 'bg-white border-[#dddbda] hover:border-[#0070d2] cursor-pointer'
                                        : 'bg-white border-[#dddbda] opacity-30'
                                  }`}
                                >
                                  {isDefault && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </button>
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-[#514f4d] mt-4">
        Menu access and CRUD permissions are saved to browser. User roles and company access are saved to the database.
      </p>
    </PageLayout>
  )
}