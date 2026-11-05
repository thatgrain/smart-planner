import type {
  AuthError,
  RealtimePostgresChangesPayload,
  Session,
} from '@supabase/supabase-js'
import { isPlannerState, normaliseState } from './storage'
import { supabase, supabaseUrl } from './supabase'
import type { PlannerState } from './domain/types'

export const PLANNER_ROW_ID = 1

export type FeedId = 'A' | 'B' | 'room'

export interface FeedTokenRow {
  feed: FeedId
  token: string
}

export interface CloudLoadResult {
  state: PlannerState | null
  updatedAt: string | null
}

export interface CloudErrorInfo {
  code: string
  title: string
  message: string
  hint?: string
  canRetry: boolean
}

export type SyncStatus = 'local' | 'loading' | 'saving' | 'saved' | 'error' | 'offline'

interface PlannerStateRow {
  data: unknown
  updated_at: string | null
}

const projectRef = (() => {
  try {
    return new URL(import.meta.env.VITE_SUPABASE_URL ?? '').hostname.split('.')[0]
  } catch {
    return 'local'
  }
})()

const CLOUD_LINKED_KEY = `smartplanner.cloud.${projectRef}.linked.v1`

export function isCloudLinked(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(CLOUD_LINKED_KEY) === '1'
  } catch {
    return false
  }
}

export function markCloudLinked(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CLOUD_LINKED_KEY, '1')
  } catch {
    // Ignore storage errors.
  }
}

export function unmarkCloudLinked(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(CLOUD_LINKED_KEY)
  } catch {
    // Ignore storage errors.
  }
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase non configurato.' }

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })

  if (!error) return { error: null }
  return { error: mapAuthError(error) }
}

export async function signOutFromCloud(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function loadCloudState(): Promise<CloudLoadResult> {
  if (!supabase) return { state: null, updatedAt: null }

  const { data, error } = await supabase
    .from('planner_state')
    .select('data, updated_at')
    .eq('id', PLANNER_ROW_ID)
    .maybeSingle()

  if (error) throw error
  if (!data) return { state: null, updatedAt: null }

  const row = data as PlannerStateRow
  if (!isPlannerState(row.data)) {
    return { state: null, updatedAt: row.updated_at }
  }

  return { state: normaliseState(row.data), updatedAt: row.updated_at }
}

export async function saveCloudState(state: PlannerState): Promise<string> {
  if (!supabase) throw new Error('Supabase non configurato')

  const { data, error } = await supabase
    .from('planner_state')
    .upsert(
      {
        id: PLANNER_ROW_ID,
        data: state,
      },
      { onConflict: 'id' },
    )
    .select('updated_at')
    .single()

  if (error) throw error
  return (data as { updated_at: string }).updated_at
}

export function subscribeToCloudState(
  onChange: (state: PlannerState, updatedAt: string) => void,
): () => void {
  const client = supabase
  if (!client) return () => {}

  const channel = client
    .channel('planner-state-realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'planner_state',
        filter: `id=eq.${PLANNER_ROW_ID}`,
      },
      (payload: RealtimePostgresChangesPayload<PlannerStateRow>) => {
        const row = payload.new as PlannerStateRow | undefined
        if (!row?.updated_at || !isPlannerState(row.data)) return
        onChange(normaliseState(row.data), row.updated_at)
      },
    )
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}

export async function loadFeedTokens(): Promise<Partial<Record<FeedId, string>>> {
  if (!supabase) return {}

  const { data, error } = await supabase.from('feed_tokens').select('feed, token')
  if (error) throw error

  const tokens: Partial<Record<FeedId, string>> = {}
  for (const row of data as FeedTokenRow[]) {
    tokens[row.feed] = row.token
  }
  return tokens
}

export function generateFeedToken(): string {
  const bytes = new Uint8Array(32)
  const webCrypto = globalThis.crypto

  if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
    webCrypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function saveFeedToken(feed: FeedId): Promise<string> {
  if (!supabase) throw new Error('Supabase non configurato')

  const token = generateFeedToken()
  const { data, error } = await supabase
    .from('feed_tokens')
    .upsert({ feed, token }, { onConflict: 'feed' })
    .select('token')
    .single()

  if (error) throw error
  return (data as { token: string }).token
}

export function getFeedUrl(token: string): string {
  const base = supabaseUrl.replace(/\/$/, '')
  if (!base) return ''
  return `${base}/functions/v1/ics?token=${encodeURIComponent(token)}`
}

function mapAuthError(error: AuthError): string {
  const message = error.message.toLowerCase()
  if (message.includes('invalid login credentials')) return 'Email o password non corretti.'
  if (message.includes('email not confirmed')) {
    return "Email non confermata. Conferma l'utente dalla dashboard Supabase."
  }
  if (message.includes('user not found')) {
    return "Account non trovato. Crea l'utente dalla dashboard Supabase."
  }
  if (message.includes('rate limit')) return 'Troppi tentativi. Attendi qualche minuto.'
  return error.message
}

export function formatCloudError(error: unknown): CloudErrorInfo {
  const typed = error as
    | { code?: string; message?: string; status?: number; hint?: string }
    | null
  const code = typed?.code ?? ''
  const message = typed?.message ?? String(error)
  const lower = message.toLowerCase()

  if (
    code === '42P01' ||
    code === 'PGRST205' ||
    lower.includes('relation "public.planner_state" does not exist') ||
    lower.includes("could not find the table 'public.planner_state'")
  ) {
    return {
      code: code || 'TABLE_MISSING',
      title: 'Database non inizializzato',
      message: 'La tabella planner_state non esiste ancora.',
      hint:
        'Apri il SQL Editor di Supabase, incolla il contenuto di supabase/migrations/0001_init.sql e premi Run. Poi riprova.',
      canRetry: true,
    }
  }

  if (
    code === '42501' ||
    lower.includes('row-level security') ||
    lower.includes('permission denied')
  ) {
    return {
      code: code || 'RLS',
      title: 'Account non autorizzato',
      message: "Questo account non è nell'allowlist del piano.",
      hint:
        'Accedi con massimiliano.granello@gmail.com o pietro.cargnel26@gmail.com. Se hai cambiato email, aggiorna la funzione is_smartplanner_user nel database.',
      canRetry: true,
    }
  }

  if (code === 'PGRST301' || typed?.status === 401 || lower.includes('jwt')) {
    return {
      code: code || 'AUTH',
      title: 'Sessione non valida',
      message: 'La sessione è scaduta o non è valida.',
      hint: 'Esci e accedi di nuovo.',
      canRetry: false,
    }
  }

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('load failed')
  ) {
    return {
      code: 'NETWORK',
      title: 'Impossibile raggiungere Supabase',
      message: 'Controlla la connessione e riprova.',
      hint: 'Se il progetto è in pausa, riattivalo dalla dashboard Supabase.',
      canRetry: true,
    }
  }

  return {
    code: code || 'UNKNOWN',
    title: 'Errore di sincronizzazione',
    message,
    hint: typed?.hint,
    canRetry: true,
  }
}
