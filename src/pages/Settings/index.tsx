import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useRBAC } from '../../hooks/useRBAC'
import { PageLayout } from '../../components/PageLayout'
import { getPermissions } from '../../lib/rbac'
import { getMenuByKey, getModules } from '../../lib/menus'
import { MFASettings } from '../../components/MFA/MFASettings'

export function Settings() {
  const { user, isOnline } = useAuth()
  const { userType, isSuperuser } = useRBAC()

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

      {/* Superuser link */}
      {isSuperuser && (
        <Link to="/companies" className="block bg-white border border-[#dddbda] rounded-lg shadow-sm p-5 hover:bg-[#fafaf9] transition-colors mb-6">
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

      {/* User Management link */}
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

      {/* MFA Settings */}
      {isOnline && (
        <MFASettings />
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
