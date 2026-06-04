// Supabase Edge Function — notify-waitlist
// Sends an email notification when someone joins the waitlist.
//
// Environment variables (set in Supabase Dashboard → Edge Functions):
//   RESEND_API_KEY   — API key from https://resend.com
//   ADMIN_EMAIL      — where to send the notification
//
// Deploy:  supabase functions deploy notify-waitlist --verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Payload {
  email: string
  name?: string
  user_id?: string
  company_id?: string
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Verify JWT
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const { email, name, user_id, company_id }: Payload = await req.json()

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const adminEmail = Deno.env.get('ADMIN_EMAIL')

    if (!resendApiKey || !adminEmail) {
      console.warn('RESEND_API_KEY or ADMIN_EMAIL not configured — skipping email')
      return new Response(JSON.stringify({ ok: true, emailed: false }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const subject = name
      ? `New waitlist signup: ${name} <${email}>`
      : `New waitlist signup: ${email}`

    const companyInfo = company_id ? `\nCompany ID: ${company_id}` : ''
    const userInfo = user_id ? `\nUser ID: ${user_id}` : ''

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Waitlist <onboarding@resend.dev>',
        to: [adminEmail],
        subject,
        text: [
          `Someone joined the waitlist.\n`,
          `Email: ${email}`,
          name ? `Name: ${name}` : '',
          companyInfo,
          userInfo,
          `\nTimestamp: ${new Date().toISOString()}`,
        ]
          .filter(Boolean)
          .join('\n'),
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Resend API error:', err)
    }

    return new Response(JSON.stringify({ ok: true, emailed: res.ok }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('notify-waitlist error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
