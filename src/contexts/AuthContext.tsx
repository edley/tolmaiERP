import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple, signOut, getCurrentSession, updatePassword as updateAuthPassword, updateUserProfile, type AuthUser } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { registerSession, heartbeatSession, removeSession } from '../lib/sessionTracker'

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
  updatePassword: (newPassword: string) => Promise<void>
  passwordResetRequired: boolean
  updateProfile: (updates: Partial<AuthUser>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const IDLE_TIMEOUT = 5 * 60 * 1000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const passwordResetRequired = user?.password_reset_required ?? false
  const [loading, setLoading] = useState(true)
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoutRef = useRef<() => Promise<void>>(undefined)

  const isOnline = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem('tolmai_user_id', user.id)
    } else {
      localStorage.removeItem('tolmai_user_id')
    }
  }, [user])

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

  const fetchProfile = async (userId: string): Promise<Partial<AuthUser>> => {
    try {
      const { data: profile, error: profileErr } = await supabase!
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (!profileErr && profile) {
        const role = profile.role && ['Superuser', 'Manager', 'Team Leader', 'User'].includes(profile.role)
          ? profile.role : 'User'
        return {
          role,
          name: profile.name ?? undefined,
          avatar_url: profile.avatar_url ?? null,
          password_reset_required: !!profile.password_reset_required,
          phone: profile.phone ?? null,
          date_of_birth: profile.date_of_birth ?? null,
          address_line1: profile.address_line1 ?? null,
          address_line2: profile.address_line2 ?? null,
          city: profile.city ?? null,
          state: profile.state ?? null,
          postal_code: profile.postal_code ?? null,
          country: profile.country ?? null,
        }
      }
    } catch {}
    return { role: 'User', name: undefined, avatar_url: null, password_reset_required: false }
  }

  const login = async (email: string, password: string) => {
    const data = await signInWithEmail(email, password)
    const u = data.user
    if (u) {
      const profile = await fetchProfile(u.id)
      const resolved: AuthUser = {
        id: u.id,
        email: u.email ?? '',
        name: profile.name ?? u.user_metadata?.name ?? u.email ?? '',
        phone: profile.phone ?? null,
        date_of_birth: profile.date_of_birth ?? null,
        address_line1: profile.address_line1 ?? null,
        address_line2: profile.address_line2 ?? null,
        city: profile.city ?? null,
        state: profile.state ?? null,
        postal_code: profile.postal_code ?? null,
        country: profile.country ?? null,
        avatar_url: profile.avatar_url ?? null,
        role: profile.role ?? 'User',
        password_reset_required: profile.password_reset_required ?? false,
      }
      setUser(resolved)
      setSessionFlag()
      registerSession(resolved)
    }
  }

  const signup = async (email: string, password: string, name: string) => {
    const data = await signUpWithEmail(email, password, name)
    const u = data.user
    if (u) {
      const profile = await fetchProfile(u.id)
      const resolved: AuthUser = {
        id: u.id,
        email: u.email ?? '',
        name: name,
        phone: profile.phone ?? null,
        date_of_birth: profile.date_of_birth ?? null,
        address_line1: profile.address_line1 ?? null,
        address_line2: profile.address_line2 ?? null,
        city: profile.city ?? null,
        state: profile.state ?? null,
        postal_code: profile.postal_code ?? null,
        country: profile.country ?? null,
        avatar_url: profile.avatar_url ?? null,
        role: profile.role ?? 'User',
        password_reset_required: profile.password_reset_required ?? false,
      }
      setUser(resolved)
      registerSession(resolved)
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

  const handleUpdatePassword = async (newPassword: string) => {
    if (!user) throw new Error('Not logged in')
    await updateAuthPassword(newPassword, user.id)
    setUser((prev) => prev ? { ...prev, password_reset_required: false } : null)
  }

  const handleUpdateProfile = useCallback(async (updates: Partial<AuthUser>) => {
    if (!user) throw new Error('Not logged in')
    await updateUserProfile(user.id, updates)
    setUser((prev) => prev ? { ...prev, ...updates } : null)
  }, [user])

  const loginAsDemo = useCallback(() => {
    const demoUser: AuthUser = {
      id: 'demo-user',
      email: 'demo@tolmai.app',
      name: 'Demo User',
      phone: null,
      date_of_birth: null,
      address_line1: null,
      address_line2: null,
      city: null,
      state: null,
      postal_code: null,
      country: null,
      avatar_url: null,
      role: 'Superuser',
      password_reset_required: false,
    }
    setUser(demoUser)
    setSessionFlag()
    registerSession(demoUser)
  }, [])

  const logout = useCallback(async () => {
    if (user) removeSession(user.id)
    await signOut()
    setUser(null)
    clearSessionFlag()
    if (idleRef.current) {
      clearTimeout(idleRef.current)
      idleRef.current = null
    }
  }, [user])

  logoutRef.current = logout

  const resetIdleTimer = useCallback(() => {
    if (idleRef.current) clearTimeout(idleRef.current)
    if (user) heartbeatSession(user.id)
    idleRef.current = setTimeout(() => {
      logoutRef.current?.()
    }, IDLE_TIMEOUT)
  }, [user])

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
    <AuthContext.Provider value={{ user, loading, login, signup, loginWithGoogle, loginWithApple, loginAsDemo, logout, isOnline, updatePassword: handleUpdatePassword, passwordResetRequired, updateProfile: handleUpdateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
