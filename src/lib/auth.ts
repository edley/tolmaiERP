import { supabase, isOnline } from './supabase'

export interface AuthUser {
  id: string
  email: string
  name: string
  avatar_url: string | null
  role: string
}

export async function signInWithEmail(email: string, password: string) {
  if (!isOnline()) throw new Error('Database not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env')
  const { data, error } = await supabase!.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUpWithEmail(email: string, password: string, name: string) {
  if (!isOnline()) throw new Error('Database not configured.')
  const { data, error } = await supabase!.auth.signUp({
    email,
    password,
    options: { data: { name, role: 'Accounts User' } },
  })
  if (error) throw error
  return data
}

export async function signInWithGoogle() {
  if (!isOnline()) throw new Error('Database not configured.')
  const { data, error } = await supabase!.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  if (error) throw error
  return data
}

export async function signInWithApple() {
  if (!isOnline()) throw new Error('Database not configured.')
  const { data, error } = await supabase!.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo: window.location.origin },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  if (!isOnline()) return
  const { error } = await supabase!.auth.signOut()
  if (error) throw error
}

export async function getCurrentSession(): Promise<AuthUser | null> {
  if (!isOnline()) return null
  const { data, error } = await supabase!.auth.getSession()
  if (error || !data.session) return null
  const { user } = data.session
  return {
    id: user.id,
    email: user.email ?? '',
    name: user.user_metadata?.name ?? user.email ?? 'Unknown',
    avatar_url: user.user_metadata?.avatar_url ?? null,
    role: user.user_metadata?.role ?? 'Accounts User',
  }
}
