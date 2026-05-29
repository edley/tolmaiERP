import { createClient } from '@supabase/supabase-js'
import { isSupabaseConfigured } from './demo'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null

export const isOnline = isSupabaseConfigured
