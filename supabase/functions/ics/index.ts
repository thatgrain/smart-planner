import {
  generateCalendar,
  getFeedMonths,
  type FeedId,
  type FeedState,
} from './calendar.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
}

function textResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function isFeedState(value: unknown): value is FeedState {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<FeedState>
  return (
    Array.isArray(state.people) &&
    state.people.length > 0 &&
    Array.isArray(state.nights) &&
    Array.isArray(state.presence) &&
    Array.isArray(state.absences) &&
    Array.isArray(state.holidays)
  )
}

/**
 * Supabase injects the legacy service role JWT and/or the newer secret keys
 * (SUPABASE_SECRET_KEYS). We prefer the legacy variable, so older projects keep
 * working, and fall back to the new keys when needed.
 */
function getServiceKey(): string | undefined {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return legacy

  const raw =
    Deno.env.get('SUPABASE_SECRET_KEYS') ??
    Deno.env.get('SUPABASE_SECRET_KEY') ??
    Deno.env.get('SUPABASE_SERVICE_KEY')

  if (!raw) return undefined

  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed === 'string') return parsed
    if (Array.isArray(parsed) && typeof parsed[0] === 'string') return parsed[0]
    if (parsed && typeof parsed === 'object') {
      const first = Object.values(parsed).find((value) => typeof value === 'string')
      if (typeof first === 'string') return first
    }
  } catch {
    return raw
  }

  return raw
}

function restHeaders(serviceKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: serviceKey,
    Accept: 'application/json',
  }

  // New sb_secret_ keys are not JWTs and must only be sent in the apikey header.
  if (serviceKey.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${serviceKey}`
  }

  return headers
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return textResponse('Metodo non consentito', 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = getServiceKey()

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('SUPABASE_URL or a server key is missing')
    return textResponse('Configurazione server mancante', 500)
  }

  const token = new URL(request.url).searchParams.get('token')?.trim()
  if (!token) return textResponse('Token mancante', 400)

  try {
    const headers = restHeaders(serviceRoleKey)

    const tokenResponse = await fetch(
      `${supabaseUrl}/rest/v1/feed_tokens?select=feed,include_office,include_smart,include_absences,include_holidays&token=eq.${encodeURIComponent(token)}&limit=1`,
      { headers },
    )

    if (!tokenResponse.ok) {
      console.error('feed_tokens query failed', tokenResponse.status)
      return textResponse('Feed non disponibile', 500)
    }

    const tokenRows = (await tokenResponse.json()) as Array<{
      feed: FeedId
      include_office: boolean
      include_smart: boolean
      include_absences: boolean
      include_holidays: boolean
    }>
    const tokenRow = tokenRows[0]
    const feed = tokenRow?.feed
    if (!feed || !tokenRow) return textResponse('Feed non trovato', 404)

    const stateResponse = await fetch(
      `${supabaseUrl}/rest/v1/planner_state?select=data&id=eq.1&limit=1`,
      { headers },
    )

    if (!stateResponse.ok) {
      console.error('planner_state query failed', stateResponse.status)
      return textResponse('Piano non disponibile', 500)
    }

    const stateRows = (await stateResponse.json()) as Array<{ data: unknown }>
    const state = stateRows[0]?.data

    if (!state) return textResponse('Piano non trovato', 404)
    if (!isFeedState(state)) {
      console.error('planner_state has an invalid shape')
      return textResponse('Piano non valido', 500)
    }

    const ics = generateCalendar(state, feed, {
      months: getFeedMonths(state),
      now: new Date(),
      includeOffice: tokenRow.include_office,
      includeSmart: tokenRow.include_smart,
      includeAbsences: tokenRow.include_absences,
      includeHolidays: tokenRow.include_holidays,
    })

    const headersOut = {
      ...corsHeaders,
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="smartplanner.ics"',
      'Cache-Control': 'public, max-age=900',
      'X-Robots-Tag': 'noindex, nofollow',
    }

    if (request.method === 'HEAD') {
      return new Response(null, { status: 200, headers: headersOut })
    }

    return new Response(ics, { status: 200, headers: headersOut })
  } catch (error) {
    console.error('ics feed error', error)
    return textResponse('Errore interno del feed', 500)
  }
})
