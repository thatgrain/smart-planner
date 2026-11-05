import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim() || ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || ''
const config = url && key ? { url, key } : null
const isTest = import.meta.env.MODE === 'test'

// Captured before createClient processes the auth callback, so the app can
// still show the recovery screen even if the event fires before React mounts.
const initialAuthUrl = typeof window !== 'undefined' ? window.location.href : ''
export const isRecoveryLink = /[#?&]type=recovery/.test(initialAuthUrl)
export const isRecoveryError =
  /error=access_denied|error_code=otp_expired|error_description=/.test(initialAuthUrl)

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
        detectSessionInUrl: true,
      },
    })
  : null
