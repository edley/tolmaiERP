import { supabase, isOnline } from './supabase'

export interface AuthUser {
  id: string
  email: string
  name: string
  phone: string | null
  date_of_birth: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
  avatar_url: string | null
  role: string
  password_reset_required: boolean
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
    options: { data: { name, role: 'User' } },
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

  let role = 'User'
  let avatarUrl: string | null = null
  let passwordResetRequired = false
  let extra: Record<string, any> = {}
  try {
    const { data: profile, error: profileErr } = await supabase!
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (!profileErr && profile) {
      if (profile.role) role = profile.role
      if (profile.avatar_url) avatarUrl = profile.avatar_url
      if (profile.password_reset_required) passwordResetRequired = profile.password_reset_required
      extra = profile
    }
  } catch {}

  return {
    id: user.id,
    email: user.email ?? '',
    name: extra.name ?? user.user_metadata?.name ?? user.email ?? 'Unknown',
    phone: extra.phone ?? null,
    date_of_birth: extra.date_of_birth ?? null,
    address_line1: extra.address_line1 ?? null,
    address_line2: extra.address_line2 ?? null,
    city: extra.city ?? null,
    state: extra.state ?? null,
    postal_code: extra.postal_code ?? null,
    country: extra.country ?? null,
    avatar_url: avatarUrl ?? user.user_metadata?.avatar_url ?? null,
    role,
    password_reset_required: passwordResetRequired,
  }
}

export async function updatePassword(newPassword: string, userId: string): Promise<void> {
  if (!isOnline()) throw new Error('Database not configured.')
  const { error: authError } = await supabase!.auth.updateUser({ password: newPassword })
  if (authError) throw authError
  const { error: profileError } = await supabase!
    .from('user_profiles')
    .update({ password_reset_required: false, updated_at: new Date().toISOString() })
    .eq('id', userId)
  if (profileError) throw profileError
}

export interface UserProfile {
  id: string
  email: string
  name: string | null
  role: string
  created_at: string
  updated_at: string
}

export async function fetchUserProfiles(): Promise<UserProfile[]> {
  if (!isOnline()) throw new Error('Database not configured.')
  const { data, error } = await supabase!.rpc('get_user_profiles')
  if (error) throw error
  return (data ?? []) as UserProfile[]
}

export async function updateUserProfile(userId: string, updates: Record<string, any>): Promise<void> {
  if (!isOnline()) throw new Error('Database not configured.')
  const { error } = await supabase!
    .from('user_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
  if (error) throw error
}

export interface UserCompanyAccess {
  user_id: string
  company_id: string
  is_default: boolean
}

export async function fetchUserCompanies(userId: string): Promise<UserCompanyAccess[]> {
  if (!isOnline()) return []
  const { data, error } = await supabase!
    .from('user_companies')
    .select('user_id, company_id, is_default')
    .eq('user_id', userId)
  if (error) throw error
  return (data ?? []) as UserCompanyAccess[]
}

export async function addUserCompanyAccess(userId: string, companyId: string, isDefault: boolean): Promise<void> {
  if (!isOnline()) throw new Error('Database not configured.')
  const { error } = await supabase!
    .from('user_companies')
    .insert({ user_id: userId, company_id: companyId, is_default: isDefault })
  if (error) throw error
}

export async function removeUserCompanyAccess(userId: string, companyId: string): Promise<void> {
  if (!isOnline()) throw new Error('Database not configured.')
  const { error } = await supabase!
    .from('user_companies')
    .delete()
    .eq('user_id', userId)
    .eq('company_id', companyId)
  if (error) throw error
}

export async function setUserDefaultCompany(userId: string, companyId: string): Promise<void> {
  if (!isOnline()) throw new Error('Database not configured.')
  await supabase!.rpc('set_default_company', { p_user_id: userId, p_company_id: companyId })
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!isOnline()) throw new Error('Database not configured.')
  const ext = file.name.split('.').pop() ?? 'png'
  const filePath = `${userId}/avatar.${ext}`

  const { error: uploadError } = await supabase!
    .storage
    .from('avatars')
    .upload(filePath, file, { upsert: true })

  if (uploadError) throw uploadError

  const { data: urlData } = supabase!
    .storage
    .from('avatars')
    .getPublicUrl(filePath)

  const publicUrl = urlData.publicUrl

  const { error: profileError } = await supabase!
    .from('user_profiles')
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (profileError) throw profileError

  return publicUrl
}

export async function deleteAvatar(userId: string): Promise<void> {
  if (!isOnline()) return
  const { data: files } = await supabase!
    .storage
    .from('avatars')
    .list(userId)

  if (files && files.length > 0) {
    await supabase!
      .storage
      .from('avatars')
      .remove(files.map((f) => `${userId}/${f.name}`))
  }

  await supabase!
    .from('user_profiles')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', userId)
}
