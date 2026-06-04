import { supabase } from './supabase'

export async function joinWaitlist(email: string) {
  const userId = localStorage.getItem('tolmai_user_id') || null
  const companyId = localStorage.getItem('tolmai_company_id') || null

  const { error } = await supabase!.from('waitlist_signups').insert({
    email,
    user_id: userId,
    company_id: companyId,
    source: 'app',
  })

  if (error) {
    console.error('Failed to save waitlist signup:', error)
    throw error
  }

  try {
    const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL
    if (functionsUrl) {
      await fetch(`${functionsUrl}/notify-waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, user_id: userId, company_id: companyId }),
      })
    }
  } catch (err) {
    console.warn('Failed to notify waitlist (function may not be deployed):', err)
  }
}
