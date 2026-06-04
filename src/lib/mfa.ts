import { supabase, isOnline } from './supabase'

export interface MFAFactor {
  id: string
  friendly_name: string | null
  factor_type: 'totp' | 'phone'
  status: 'verified' | 'unverified'
  created_at: string
  updated_at: string
}

export interface AALResult {
  currentLevel: 'aal1' | 'aal2'
  nextLevel: 'aal1' | 'aal2'
  currentAuthenticationMethods: string[]
}

export interface EnrollResult {
  id: string
  type: 'totp' | 'phone'
  totp: {
    qr_code: string
    secret: string
    uri: string
  } | null
  phone: {
    phone_number: string
  } | null
}

export async function enrollTOTP(friendlyName?: string): Promise<EnrollResult> {
  if (!isOnline()) throw new Error('Database not configured.')
  const { data, error } = await supabase!.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: friendlyName ?? 'Authenticator App',
  })
  if (error) throw error
  return data as unknown as EnrollResult
}

export async function challengeFactor(factorId: string): Promise<string> {
  if (!isOnline()) throw new Error('Database not configured.')
  const { data, error } = await supabase!.auth.mfa.challenge({ factorId })
  if (error) throw error
  return data.id
}

export async function verifyFactor(factorId: string, challengeId: string, code: string): Promise<void> {
  if (!isOnline()) throw new Error('Database not configured.')
  const { error } = await supabase!.auth.mfa.verify({ factorId, challengeId, code })
  if (error) throw error
}

export async function unenrollFactor(factorId: string): Promise<void> {
  if (!isOnline()) throw new Error('Database not configured.')
  const { error } = await supabase!.auth.mfa.unenroll({ factorId })
  if (error) throw error
}

export async function getAuthenticatorAssuranceLevel(): Promise<AALResult | null> {
  if (!isOnline()) return null
  const { data, error } = await supabase!.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error || !data) return null
  return data as AALResult
}

export async function listFactors(): Promise<MFAFactor[]> {
  if (!isOnline()) return []
  const { data, error } = await supabase!.auth.mfa.listFactors()
  if (error || !data) return []
  return [...(data.totp ?? []), ...(data.phone ?? [])] as MFAFactor[]
}
