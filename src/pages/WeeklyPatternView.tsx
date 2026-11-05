import { useMemo, useState } from 'react'
import { ArrowRightLeft, CalendarCheck2, Check, Info, Moon, Sparkles } from 'lucide-react'
import type { PlannerController } from '../hooks/usePlanner'
import { withAlpha } from '../lib/color'
import { cn } from '../lib/cn'
import { formatMonthLabel, weekdayName } from '../lib/domain/dates'
import type { PersonId, WeeklyPattern } from '../lib/domain/types'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { PersonAvatar } from '../components/ui/PersonAvatar'

const WORKDAYS = [1, 2, 3, 4, 5]

function derivedPresence(pattern: WeeklyPattern, isoDay: number): PersonId[] {
  if (!WORKDAYS.includes(isoDay)) return []
  const previous = isoDay === 1 ? 7 : isoDay - 1
  const people = new Set<PersonId>()
  if (pattern[previous]) people.add(pattern[previous])
  if (pattern[isoDay]) people.add(pattern[isoDay])
  return [...people]
}

function coveredWorkdays(isoDay: number): number[] {
  const days: number[] = []
  if (WORKDAYS.includes(isoDay)) days.push(isoDay)
  const next = isoDay === 7 ? 1 : isoDay + 1
  if (WORKDAYS.includes(next)) days.push(next)
  return days
}

export function WeeklyPatternView({ controller }: { controller: PlannerController }) {
  const { state, month, actions } = controller
  const [confirm, setConfirm] = useState<'month' | 'year' | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const typicalWeek = useMemo(() => {
    const presence: Record<PersonId, number[]> = { A: [], B: [] }
    for (const day of WORKDAYS) {
      for (const personId of derivedPresence(state.pattern, day)) {
        presence[personId].push(day)
      }
    }
    const handover = WORKDAYS.filter((day) => derivedPresence(state.pattern, day).length === 2)
    return { presence, handover }
  }, [state.pattern])

  const apply = (scope: 'month' | 'year') => {
    if (scope === 'month') {
      actions.applyPattern()
      setMessage(`Settimana tipo applicata a ${formatMonthLabel(month)}.`)
    } else {
      actions.applyPatternToNextMonths(12)
      setMessage(`Settimana tipo applicata ai prossimi 12 mesi da ${formatMonthLabel(month)}.`)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50/80 via-white to-white p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
              <Sparkles className="h-3.5 w-3.5" />
              Modello ricorrente
            </div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
              Settimana tipo
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
              Definisci chi dorme in stanza in ogni notte. L'app calcola automaticamente le
              presenze possibili: una notte copre il giorno stesso e quello successivo. La
              domenica, ad esempio, copre il lunedì.
            </p>
          </div>
          <Badge variant="info" className="w-fit">
            <Moon className="h-3 w-3" />
            {Object.values(state.pattern).filter(Boolean).length} notti tipo
          </Badge>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5, 6, 7].map((isoDay) => {
            const selected = state.pattern[isoDay] ?? null
            const presence = derivedPresence(state.pattern, isoDay)
            const cover = coveredWorkdays(isoDay)
            const weekend = state.settings.weekendDays.includes(isoDay)
            const isHandover = presence.length === 2

            return (
              <div
                key={isoDay}
                className={cn(
                  'grid gap-3 px-4 py-3 sm:grid-cols-[110px_1fr_auto] sm:items-center sm:px-5',
                  weekend && 'bg-slate-50/60',
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="w-20 text-xs font-semibold text-slate-700">
                    {weekdayName(isoDay)}
                  </div>
                  {weekend ? <Badge variant="neutral">Weekend</Badge> : null}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {state.people.map((person) => {
                    const active = selected === person.id
                    return (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => actions.updatePattern(isoDay, person.id)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
                          active
                            ? 'text-slate-900 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50',
                        )}
                        style={
                          active
                            ? {
                                borderColor: withAlpha(person.color, 0.5),
                                backgroundColor: withAlpha(person.color, 0.1),
                              }
                            : undefined
                        }
                      >
                        <PersonAvatar person={person} size="xs" />
                        {person.name}
                        {active ? <Check className="h-3 w-3" style={{ color: person.color }} /> : null}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => actions.updatePattern(isoDay, null)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
                      selected === null
                        ? 'border-slate-300 bg-slate-100 text-slate-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50',
                    )}
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200">
                      <Moon className="h-2.5 w-2.5" />
                    </span>
                    Libera
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                  {presence.length > 0 ? (
                    <>
                      {presence.map((personId) => {
                        const person = state.people.find((item) => item.id === personId)!
                        return (
                          <span
                            key={personId}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                            style={{ backgroundColor: person.color }}
                          >
                            <CalendarCheck2 className="h-3 w-3" />
                            {person.name}
                          </span>
                        )
                      })}
                      {isHandover ? (
                        <Badge variant="info">
                          <ArrowRightLeft className="h-3 w-3" />
                          Passaggio
                        </Badge>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-400">
                      {isoDay > 5 ? 'Nessuna presenza lavorativa' : 'Nessuna presenza'}
                    </span>
                  )}
                  {cover.length > 0 ? (
                    <span className="text-[10px] text-slate-400">
                      copre {cover.map((day) => weekdayName(day, true)).join(' · ')}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">non copre feriali</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="text-[10px] leading-4 text-slate-500">
            <Info className="mr-1 inline h-3 w-3" />
            Le modifiche alla settimana tipo non cambiano i mesi già pianificati finché non premi
            Applica.
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirm('year')}>
              Applica ai prossimi 12 mesi
            </Button>
            <Button variant="primary" size="sm" onClick={() => setConfirm('month')}>
              <CalendarCheck2 className="h-3.5 w-3.5" />
              Applica a {formatMonthLabel(month, { short: true })}
            </Button>
          </div>
        </div>
      </Card>

      {message ? (
        <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {message}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {state.people.map((person) => {
          const presence = typicalWeek.presence[person.id]
          const sw = WORKDAYS.filter((day) => !presence.includes(day))
          return (
            <Card key={person.id} className="p-4">
              <div className="flex items-center gap-2">
                <PersonAvatar person={person} size="sm" />
                <div className="text-xs font-semibold text-slate-900">{person.name}</div>
                <Badge variant="neutral" className="ml-auto">
                  settimana tipo
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {presence.length > 0 ? (
                  presence.map((day) => (
                    <span
                      key={day}
                      className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold text-white"
                      style={{ backgroundColor: person.color }}
                    >
                      {weekdayName(day, true)}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-400">Nessuna presenza</span>
                )}
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                {presence.length} presenze · {sw.length} giorni di SW in una settimana piena
              </div>
            </Card>
          )
        })}
      </div>

      {typicalWeek.handover.length > 0 ? (
        <div className="flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5 text-[11px] leading-5 text-indigo-700">
          <ArrowRightLeft className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Giorno di passaggio: {typicalWeek.handover.map((day) => weekdayName(day)).join(', ')}.
            Entrambi in ufficio, ma solo una persona dorme in stanza quella notte.
          </span>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) apply(confirm)
        }}
        title={confirm === 'year' ? 'Applicare la settimana tipo?' : 'Applicare al mese?'}
        message={
          confirm === 'year'
            ? `Verranno generate le notti per i prossimi 12 mesi a partire da ${formatMonthLabel(month)}. Le notti esistenti in quei mesi verranno sovrascritte; le presenze manuali restano.`
            : `Verranno generate le notti di ${formatMonthLabel(month)}. Le notti esistenti nel mese verranno sovrascritte; le presenze manuali restano.`
        }
        confirmLabel="Applica"
      />
    </div>
  )
}
