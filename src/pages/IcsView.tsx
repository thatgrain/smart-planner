import { useMemo } from 'react'
import {
  CalendarPlus,
  Download,
  Info,
  Link2,
  Lock,
  Moon,
  Smartphone,
} from 'lucide-react'
import type { PlannerController } from '../hooks/usePlanner'
import { formatMonthLabel } from '../lib/domain/dates'
import { generateIcs, getDefaultIcsMonths, type IcsFeed } from '../lib/domain/ics'
import { downloadTextFile } from '../lib/download'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PersonAvatar } from '../components/ui/PersonAvatar'

export function IcsView({ controller }: { controller: PlannerController }) {
  const { state, month } = controller
  const months = useMemo(() => getDefaultIcsMonths(month, 12), [month])

  const feeds: Array<{
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
          Scarica un file <code className="rounded bg-slate-100 px-1">.ics</code> con i prossimi
          12 mesi e importalo in Google Calendar, Apple Calendar o Outlook. Gli eventi sono
          giornalieri e non bloccano gli orari.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {feeds.map((feed) => {
          const content = generate(feed.id)
          const eventCount = content.split('BEGIN:VEVENT').length - 1
          const person = feed.id === 'room' ? null : state.people.find((item) => item.id === feed.id)

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

              <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => download(feed.id)}>
                <Download className="h-3.5 w-3.5" />
                Scarica .ics
              </Button>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-900">Aggiungere a Google Calendar</h3>
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
              Apri Google Calendar sul web, poi{' '}
              <span className="font-medium text-slate-700">
                Impostazioni → Importa ed esporta → Importa
              </span>
              .
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-semibold text-indigo-700">
                3
              </span>
              Seleziona il file e il calendario di destinazione. Gli eventi appariranno come
              giornate intere.
            </li>
          </ol>
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-700">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Il download è un'istantanea: se modifichi il piano, devi riscaricare e reimportare il
            file. Il feed in abbonamento aggiornato automaticamente arriverà con Supabase.
          </div>
        </Card>

        <Card className="border-dashed p-5">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900">Feed in abbonamento</h3>
            <Badge variant="neutral" className="ml-auto">
              <Lock className="h-3 w-3" />
              Fase 4
            </Badge>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            Un URL segreto per ogni calendario permetterà a Google Calendar di aggiornarsi da solo
            ogni 12–24 ore, senza reimportare il file. Sarà gratis con Supabase Edge Functions e
            arriverà dopo la sincronizzazione dei dati.
          </p>
          <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[10px] text-slate-400">
            Esempio: <span className="font-mono">https://…/functions/v1/ics?token=••••</span>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-start gap-2 text-[11px] leading-5 text-slate-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
          <span>
            I feed personali includono ufficio, smart working e assenze. Il feed stanza contiene
            solo i pernottamenti. I festivi nazionali non vengono esportati per evitare duplicati
            con i calendari già presenti. I mesi senza notti, assenze o piano confermato
            esportano solo le presenze esplicite.
          </span>
        </div>
      </Card>
    </div>
  )
}
