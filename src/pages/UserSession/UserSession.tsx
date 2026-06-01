import { useState, useMemo, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { PageLayout } from '../../components/PageLayout'
import { getAllSessions, isOnline, type SessionRecord } from '../../lib/sessionTracker'
import { USER_TYPES } from '../../lib/rbac'
import { WifiOff, Clock, Shield } from 'lucide-react'

function fmtLastActive(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const ROLE_STYLES: Record<string, string> = {
  Superuser: 'bg-[#e8f4fe] text-[#0070d2]',
  Manager: 'bg-[#fef7e0] text-[#6b5200]',
  'Team Leader': 'bg-[#f3e8fe] text-[#5a20a0]',
  User: 'bg-[#f3f3f3] text-[#514f4d]',
}

export function UserSession() {
  const { user: currentUser } = useAuth()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(interval)
  }, [])

  const rows: SessionRecord[] = useMemo(() => {
    const sessions = getAllSessions()
    const allUserTypes = USER_TYPES
    const existing = new Set(sessions.map((s) => s.id))
    for (const ut of allUserTypes) {
      const key = `system-${ut.toLowerCase().replace(/\s+/g, '-')}`
      if (!existing.has(key)) {
        sessions.push({
          id: key,
          email: `${ut.toLowerCase().replace(/\s+/g, '.')}@tolmai.app`,
          name: `${ut} (System)`,
          role: ut,
          lastActive: 0,
        })
      }
    }
    sessions.sort((a, b) => b.lastActive - a.lastActive)
    return sessions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick])

  return (
    <PageLayout
      title="User Sessions"
      description="View users, their access levels, and connection status"
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">User</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Access Level</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Last Connected</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((session) => {
              const online = isOnline(session)
              const isCurrent = currentUser?.id === session.id
              return (
                <tr key={session.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCurrent
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {session.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-900">
                          {session.name}
                          {isCurrent && <span className="ml-1.5 text-[11px] font-medium text-emerald-600">(You)</span>}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">{session.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded ${ROLE_STYLES[session.role] || 'bg-slate-100 text-slate-500'}`}>
                      <Shield className="w-3 h-3" />
                      {session.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {session.lastActive === 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                        <WifiOff className="w-3.5 h-3.5" />
                        Never connected
                      </span>
                    ) : online ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Online
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                        <WifiOff className="w-3.5 h-3.5" />
                        Offline
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      {session.lastActive === 0 ? '-' : fmtLastActive(session.lastActive)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">No sessions found.</div>
        )}
      </div>
    </PageLayout>
  )
}
