import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarPlus,
  Check,
  Cloud,
  Copy,
  Download,
  ExternalLink,
  Info,
  Link2,
  LoaderCircle,
  Lock,
  Moon,
  RefreshCw,
  Smartphone,
} from 'lucide-react'
import type { PlannerController } from '../hooks/usePlanner'
import { formatMonthLabel } from '../lib/domain/dates'
import { generateIcs, getDefaultIcsMonths, type IcsFeed } from '../lib/domain/ics'
import { downloadTextFile } from '../lib/download'
import {
  formatCloudError,
  getFeedUrl,
  loadFeedTokens,
  saveFeedToken,
  type FeedId,
} from '../lib/cloud'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { PersonAvatar } from '../components/ui/PersonAvatar'
import type { Person } from '../lib/domain/types'

function formatFeedTokensError(error: unknown): string {
  const typed = error as { code?: string; message?: string } | null
  const message = typed?.message ?? String(error)
  const lower = message.toLowerCase()

  if (
    typed?.code === '42P01' ||
    typed?.code === 'PGRST205' ||
    lower.includes('feed_tokens') ||
    lower.includes('does not exist')
  ) {
    return 'La tabella feed_tokens non esiste. Esegui supabase/migrations/0002_feed_tokens.sql nel SQL Editor di Supabase, poi premi Riprova.'
  }

  return formatCloudError(error).message
}

function SubscriptionFeedCard({
  title,
  description,
  person,
  token,
  busy,
  copied,
  onCopy,
  onGenerate,
  onRotate,
}: {
  title: string
  description: string
  person?: Person
  token?: string
  busy: boolean
  copied: boolean
  onCopy: () => void
  onGenerate: () => void
  onRotate: () => void
}) {
  const url = token ? getFeedUrl(token) : ''

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {person ? (
            <PersonAvatar person={person} size="md" />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
              <Moon className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-slate-900">{title}</div>
            <div className="truncate text-[10px] text-slate-400">Feed in abbonamento</div>
          </div>
        </div>
        <Badge variant={token ? 'success' : 'neutral'}>
          {token ? 'Attivo' : 'Da generare'}
        </Badge>
      </div>

      <p className="mt-3 flex-1 text-[11px] leading-5 text-slate-500">{description}</p>

      {token ? (
        <div className="mt-3 space-y-2">
          <input
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
            aria-label={`URL feed ${title}`}
            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 font-mono text-[10px] text-slate-600 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="secondary" size="sm" onClick={onCopy} disabled={busy}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copiato' : 'Copia URL'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onRotate} disabled={busy}>
              {busy ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Rigenera
            </Button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Anteprima
            </a>
          </div>
        </div>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          className="mt-3 w-full"
          onClick={onGenerate}
          disabled={busy}
        >
          {busy ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Link2 className="h-3.5 w-3.5" />
          )}
          Genera feed
        </Button>
      )}

      <div className="mt-3 flex items-start gap-1.5 text-[10px] leading-4 text-slate-400">
        <Lock className="mt-0.5 h-3 w-3 shrink-0" />
        Non condividere questo URL: contiene un token segreto.
      </div>
    </Card>
  )
}

export function IcsView({ controller }: { controller: PlannerController }) {
  const { state, month, cloud } = controller
  const months = useMemo(() => getDefaultIcsMonths(month, 12), [month])

  const [tokens, setTokens] = useState<Partial<Record<FeedId, string>>>({})
  const [tokensLoading, setTokensLoading] = useState(false)
  const [tokensLoadError, setTokensLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyFeed, setBusyFeed] = useState<FeedId | null>(null)
  const [copiedFeed, setCopiedFeed] = useState<FeedId | null>(null)
  const [rotateFeed, setRotateFeed] = useState<FeedId | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!cloud.active) return

    const controllerAbort = new AbortController()

    const load = async () => {
      setTokensLoading(true)
      setTokensLoadError(null)
      setActionError(null)

      try {
        const value = await loadFeedTokens()
        if (controllerAbort.signal.aborted) return
        setTokens(value)
      } catch (error) {
        if (controllerAbort.signal.aborted) return
        setTokensLoadError(formatFeedTokensError(error))
      } finally {
        if (!controllerAbort.signal.aborted) setTokensLoading(false)
      }
    }

    void load()
    return () => controllerAbort.abort()
  }, [cloud.active, refreshKey])

  const downloadFeeds: Array<{
    id: IcsFeed
    title: string
    description: string
    calendarName: string
  }> = [
    ...state.people.map((person) => ({
      id: person.id,
      title: `Calendario di ${person.name}`,
      description: 'Ufficio, smart working e assenze personali.',
      calendarName: `SmartPlanner – ${person.name}`,
    })),
    {
      id: 'room',
      title: 'Calendario della stanza',
      description: 'Solo le notti: chi dorme in stanza.',
      calendarName: 'SmartPlanner – Stanza',
    },
  ]

  const subscriptionFeeds: Array<{
    id: FeedId
    title: string
    description: string
    person?: Person
  }> = [
    ...state.people.map((person) => ({
      id: person.id,
      title: `Calendario di ${person.name}`,
      description: 'Ufficio, smart working e assenze personali.',
      person,
    })),
    {
      id: 'room',
      title: 'Calendario della stanza',
      description: 'Solo le notti: chi dorme in stanza.',
    },
  ]

  const generate = (feed: IcsFeed) =>
    generateIcs(state, feed, {
      months,
      includeAbsences: feed !== 'room',
      includeHolidays: false,
    })

  const download = (feed: IcsFeed) => {
    const content = generate(feed)
    const label = feed === 'room' ? 'stanza' : feed.toLowerCase()
    downloadTextFile(
      `smartplanner-${label}-${month}.ics`,
      content,
      'text/calendar;charset=utf-8',
    )
  }

  const handleGenerate = async (feed: FeedId) => {
    setBusyFeed(feed)
    setActionError(null)
    try {
      const token = await saveFeedToken(feed)
      setTokens((current) => ({ ...current, [feed]: token }))
      setCopiedFeed(null)
    } catch (error) {
      setActionError(formatFeedTokensError(error))
    } finally {
      setBusyFeed(null)
    }
  }

  const handleCopy = async (feed: FeedId) => {
    const token = tokens[feed]
    if (!token) return
    const url = getFeedUrl(token)

    try {
      await navigator.clipboard.writeText(url)
      setCopiedFeed(feed)
      window.setTimeout(() => setCopiedFeed(null), 2200)
      setActionError(null)
    } catch {
      setActionError("Copia non riuscita: seleziona l'URL e copialo manualmente.")
    }
  }

  const rotateFeedData = rotateFeed
    ? subscriptionFeeds.find((feed) => feed.id === rotateFeed)
    : null

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50/80 via-white to-white p-5 shadow-soft">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
          <CalendarPlus className="h-3.5 w-3.5" />
          Esportazione calendario
        </div>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
          Calendario ICS
        </h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
          Puoi scaricare un file <code className="rounded bg-slate-100 px-1">.ics</code> oppure
          usare un feed in abbonamento: Google Calendar si aggiorna da solo ogni 12–24 ore.
        </p>
      </div>

      <section className="space-y-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Feed in abbonamento</h2>
              <Badge variant="info">
                <Cloud className="h-3 w-3" />
                Cloud
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500">
              URL fissi da aggiungere a Google Calendar. Il feed legge sempre il piano aggiornato.
            </p>
          </div>
          {cloud.active ? (
            <span className="text-[10px] text-slate-400">
              Aggiornamento Google: 12–24 ore
            </span>
          ) : null}
        </div>

        {!cloud.active ? (
          <Card className="border-dashed p-5">
            <div className="flex items-start gap-2 text-[11px] leading-5 text-slate-500">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
              I feed in abbonamento sono disponibili in modalità cloud. Sei in modalità locale:
              accedi con Supabase per generarli.
            </div>
          </Card>
        ) : tokensLoading ? (
          <Card className="flex items-center gap-2 p-5 text-xs text-slate-500">
            <LoaderCircle className="h-4 w-4 animate-spin text-indigo-500" />
            Caricamento feed…
          </Card>
        ) : tokensLoadError ? (
          <Card className="border-rose-200 bg-rose-50 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <div className="flex-1 text-[11px] leading-5 text-rose-700">
                <div className="font-medium">Feed non disponibili</div>
                <div>{tokensLoadError}</div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setRefreshKey((value) => value + 1)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Riprova
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-3">
            {subscriptionFeeds.map((feed) => (
              <SubscriptionFeedCard
                key={feed.id}
                title={feed.title}
                description={feed.description}
                person={feed.person}
                token={tokens[feed.id]}
                busy={busyFeed === feed.id}
                copied={copiedFeed === feed.id}
                onCopy={() => void handleCopy(feed.id)}
                onGenerate={() => void handleGenerate(feed.id)}
                onRotate={() => setRotateFeed(feed.id)}
              />
            ))}
          </div>
        )}

        {actionError ? (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-[11px] leading-5 text-rose-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {actionError}
          </div>
        ) : null}

        <div className="flex items-start gap-1.5 text-[10px] leading-4 text-slate-400">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          Se l'anteprima restituisce 404, la Edge Function <code>ics</code> non è ancora stata
          deployata su Supabase.
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-900">Feed in abbonamento</h3>
          </div>
          <ol className="mt-3 space-y-2 text-[11px] leading-5 text-slate-600">
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-semibold text-indigo-700">
                1
              </span>
              Apri Google Calendar sul web.
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-semibold text-indigo-700">
                2
              </span>
              Accanto a <span className="font-medium text-slate-700">Altri calendari</span> premi{' '}
              <span className="font-medium text-slate-700">+ → Da URL</span>.
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-semibold text-indigo-700">
                3
              </span>
              Incolla l'URL del feed e premi <span className="font-medium text-slate-700">Aggiungi calendario</span>.
            </li>
          </ol>
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-700">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Google aggiorna ogni 12–24 ore. Per forzare, rimuovi e riaggiungi il calendario con
            <code className="mx-1 rounded bg-amber-100 px-1">#2</code> in fondo all'URL.
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-900">File .ics una tantum</h3>
          </div>
          <ol className="mt-3 space-y-2 text-[11px] leading-5 text-slate-600">
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-semibold text-indigo-700">
                1
              </span>
              Scarica il file <code className="rounded bg-slate-100 px-1">.ics</code> del
              calendario che ti interessa.
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-semibold text-indigo-700">
                2
              </span>
              In Google Calendar: <span className="font-medium text-slate-700">Impostazioni → Importa ed esporta → Importa</span>.
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-semibold text-indigo-700">
                3
              </span>
              Seleziona il file e il calendario di destinazione.
            </li>
          </ol>
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[10px] leading-4 text-slate-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Il download è un'istantanea: se modifichi il piano, devi riscaricare e reimportare il
            file. Per l'uso continuativo usa il feed in abbonamento.
          </div>
        </Card>
      </div>

      <section className="space-y-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Download .ics</h2>
          <p className="text-[11px] text-slate-500">
            File pronti da importare, generati dai prossimi 12 mesi.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {downloadFeeds.map((feed) => {
            const content = generate(feed.id)
            const eventCount = content.split('BEGIN:VEVENT').length - 1
            const person =
              feed.id === 'room' ? null : state.people.find((item) => item.id === feed.id)

            return (
              <Card key={feed.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {person ? (
                      <PersonAvatar person={person} size="md" />
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white">
                        <Moon className="h-4 w-4" />
                      </span>
                    )}
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{feed.title}</div>
                      <div className="text-[10px] text-slate-400">{feed.calendarName}</div>
                    </div>
                  </div>
                  <Badge variant="neutral">{eventCount} eventi</Badge>
                </div>

                <p className="mt-3 flex-1 text-[11px] leading-5 text-slate-500">
                  {feed.description} Periodo: {formatMonthLabel(month, { short: true })} →{' '}
                  {formatMonthLabel(months[months.length - 1], { short: true })}.
                </p>

                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => download(feed.id)}
                >
                  <Download className="h-3.5 w-3.5" />
                  Scarica .ics
                </Button>
              </Card>
            )
          })}
        </div>
      </section>

      <Card className="p-4">
        <div className="flex items-start gap-2 text-[11px] leading-5 text-slate-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
          <span>
            I feed personali includono ufficio, smart working e assenze. Il feed stanza contiene
            solo i pernottamenti. I festivi nazionali non vengono esportati per evitare duplicati
            con i calendari già presenti. I mesi senza notti, assenze o piano confermato esportano
            solo le presenze esplicite.
          </span>
        </div>
      </Card>

      <ConfirmDialog
        open={rotateFeed !== null}
        onClose={() => setRotateFeed(null)}
        onConfirm={() => {
          if (rotateFeed) void handleGenerate(rotateFeed)
        }}
        title="Rigenerare il token del feed?"
        message={
          rotateFeedData
            ? `Il vecchio URL di "${rotateFeedData.title}" smetterà di funzionare. Dovrai aggiornare Google Calendar con il nuovo URL.`
            : 'Il vecchio URL smetterà di funzionare.'
        }
        confirmLabel="Rigenera"
        danger
      />
    </div>
  )
}
