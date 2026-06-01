export interface SessionRecord {
  id: string
  email: string
  name: string
  role: string
  lastActive: number
}

const SESSION_KEY = 'user_sessions'
const ONLINE_THRESHOLD = 120_000

function getSessions(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveSessions(sessions: SessionRecord[]) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessions))
}

export function registerSession(user: { id: string; email: string; name: string; role: string }) {
  const sessions = getSessions()
  const idx = sessions.findIndex((s) => s.id === user.id)
  const record: SessionRecord = { ...user, lastActive: Date.now() }
  if (idx >= 0) {
    sessions[idx] = record
  } else {
    sessions.push(record)
  }
  saveSessions(sessions)
}

export function heartbeatSession(userId: string) {
  const sessions = getSessions()
  const idx = sessions.findIndex((s) => s.id === userId)
  if (idx >= 0) {
    sessions[idx].lastActive = Date.now()
    saveSessions(sessions)
  }
}

export function removeSession(userId: string) {
  const sessions = getSessions().filter((s) => s.id !== userId)
  saveSessions(sessions)
}

export function getAllSessions(): SessionRecord[] {
  return getSessions()
}

export function isOnline(session: SessionRecord): boolean {
  return Date.now() - session.lastActive < ONLINE_THRESHOLD
}
