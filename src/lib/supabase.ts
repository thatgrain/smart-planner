import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim() || ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || ''
const config = url && key ? { url, key } : null
const isTest = import.meta.env.MODE === 'test'

/**
 * In test mode the cloud is disabled so the UI tests remain deterministic and
 * do not require a live Supabase project.
 */
export const isSupabaseConfigured = !isTest && Boolean(config)
export const supabaseUrl = config?.url ?? ''

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(config!.url, config!.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null
