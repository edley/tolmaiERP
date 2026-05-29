import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple, signOut, getCurrentSession, type AuthUser } from '../lib/auth'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  loginWithApple: () => Promise<void>
  loginAsDemo: () => void
  logout: () => Promise<void>
  isOnline: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

const IDLE_TIMEOUT = 5 * 60 * 1000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoutRef = useRef<() => Promise<void>>(undefined)

  const isOnline = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY

  useEffect(() => {
    const init = async () => {
      if (isOnline) {
        const stored = localStorage.getItem('tolmai_session')
        if (stored === 'active') {
          const session = await getCurrentSession()
          setUser(session)
        }
      }
      setLoading(false)
    }
    init()
  }, [isOnline])

  const resolveRole = (email: string, metadata?: Record<string, unknown>) => {
    const fromMetadata = metadata?.role as string | undefined
    if (fromMetadata && ['Superuser', 'Manager', 'Team Leader', 'User'].includes(fromMetadata)) return fromMetadata
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string | undefined
    if (adminEmail && email.toLowerCase() === adminEmail.toLowerCase()) return 'Superuser'
    return 'User'
  }

  const login = async (email: string, password: string) => {
    const data = await signInWithEmail(email, password)
    const u = data.user
    if (u) {
      setUser({
        id: u.id,
        email: u.email ?? '',
        name: u.user_metadata?.name ?? u.email ?? '',
        avatar_url: u.user_metadata?.avatar_url ?? null,
        role: resolveRole(u.email ?? '', u.user_metadata as Record<string, unknown> | undefined),
      })
      setSessionFlag()
    }
  }

  const signup = async (email: string, password: string, name: string) => {
    const data = await signUpWithEmail(email, password, name)
    const u = data.user
    if (u) {
      setUser({
        id: u.id,
        email: u.email ?? '',
        name: name,
        avatar_url: null,
        role: resolveRole(email),
      })
    }
  }

  const loginWithGoogle = async () => {
    await signInWithGoogle()
  }

  const loginWithApple = async () => {
    await signInWithApple()
  }

  const setSessionFlag = () => localStorage.setItem('tolmai_session', 'active')
  const clearSessionFlag = () => localStorage.removeItem('tolmai_session')

  const loginAsDemo = useCallback(() => {
    setUser({
      id: 'demo-user',
      email: 'demo@tolmai.app',
      name: 'Demo User',
      avatar_url: null,
      role: 'Superuser',
    })
    setSessionFlag()
  }, [])

  const logout = useCallback(async () => {
    await signOut()
    setUser(null)
    clearSessionFlag()
    if (idleRef.current) {
      clearTimeout(idleRef.current)
      idleRef.current = null
    }
  }, [])

  logoutRef.current = logout

  const resetIdleTimer = useCallback(() => {
    if (idleRef.current) clearTimeout(idleRef.current)
    idleRef.current = setTimeout(() => {
      logoutRef.current?.()
    }, IDLE_TIMEOUT)
  }, [])

  useEffect(() => {
    if (!user) {
      if (idleRef.current) {
        clearTimeout(idleRef.current)
        idleRef.current = null
      }
      return
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel']
    for (const ev of events) {
      window.addEventListener(ev, resetIdleTimer, { passive: true })
    }
    resetIdleTimer()

    return () => {
      for (const ev of events) {
        window.removeEventListener(ev, resetIdleTimer)
      }
      if (idleRef.current) {
        clearTimeout(idleRef.current)
        idleRef.current = null
      }
    }
  }, [user, resetIdleTimer])

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginWithGoogle, loginWithApple, loginAsDemo, logout, isOnline }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
