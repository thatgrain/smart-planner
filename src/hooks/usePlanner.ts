import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  addMonthsToMonthKey,
  currentMonthKey,
  monthKeyOf,
} from '../lib/domain/dates'
import { getMonthMetrics } from '../lib/domain/metrics'
import {
  addAbsence,
  addHoliday,
  applyPatternToMonth,
  applyPatternToMonths,
  confirmMonth,
  createInitialState,
  removeAbsence,
  removeHoliday,
  reopenMonth,
  resetPresenceForDay,
  setNight,
  togglePresence,
  updatePattern,
  updatePerson,
  updateSettings,
} from '../lib/domain/state'
import type {
  AbsenceType,
  Holiday,
  PersonId,
  PlannerSettings,
  PlannerState,
  PlannerTab,
} from '../lib/domain/types'
import {
  clearStoredState,
  loadState,
  parseImportedState,
  resetToDemoState,
  saveState,
} from '../lib/storage'

export interface AddAbsenceInput {
  personId: PersonId | null
  type: AbsenceType
  start: string
  end: string
  note?: string
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `absence-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function usePlanner() {
  const [state, setState] = useState<PlannerState>(() => loadState())
  const [month, setMonth] = useState(currentMonthKey())
  const [tab, setTab] = useState<PlannerTab>('calendar')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    saveState(state)
  }, [state])

  const metrics = useMemo(() => getMonthMetrics(state, month), [state, month])

  const navigateMonth = useCallback((nextMonth: string) => {
    setMonth(nextMonth)
    setSelectedDate(null)
  }, [])

  const goToPreviousMonth = useCallback(() => {
    setMonth((current) => addMonthsToMonthKey(current, -1))
    setSelectedDate(null)
  }, [])

  const goToNextMonth = useCallback(() => {
    setMonth((current) => addMonthsToMonthKey(current, 1))
    setSelectedDate(null)
  }, [])

  const goToToday = useCallback(() => {
    setMonth(currentMonthKey())
    setSelectedDate(null)
  }, [])

  const openDay = useCallback(
    (date: string) => {
      const dateMonth = monthKeyOf(date)
      if (dateMonth !== month) setMonth(dateMonth)
      setSelectedDate(date)
    },
    [month],
  )

  const closeDay = useCallback(() => setSelectedDate(null), [])

  const handleSetNight = useCallback((date: string, personId: PersonId | null) => {
    setState((current) => setNight(current, date, personId))
  }, [])

  const handleTogglePresence = useCallback((date: string, personId: PersonId) => {
    setState((current) => togglePresence(current, date, personId))
  }, [])

  const handleResetPresence = useCallback((date: string, personId?: PersonId) => {
    setState((current) => resetPresenceForDay(current, date, personId))
  }, [])

  const handleApplyPattern = useCallback(() => {
    setState((current) => applyPatternToMonth(current, month))
  }, [month])

  const handleApplyPatternToNextMonths = useCallback(
    (count = 12) => {
      const months = Array.from({ length: count }, (_, index) =>
        addMonthsToMonthKey(month, index),
      )
      setState((current) => applyPatternToMonths(current, months))
    },
    [month],
  )

  const handleConfirmMonth = useCallback(() => {
    setState((current) => confirmMonth(current, month))
  }, [month])

  const handleReopenMonth = useCallback(() => {
    setState((current) => reopenMonth(current, month))
  }, [month])

  const handleAddAbsence = useCallback((input: AddAbsenceInput) => {
    const absence = {
      id: makeId(),
      personId: input.personId,
      type: input.type,
      start: input.start,
      end: input.end,
      note: input.note?.trim() || undefined,
    }
    setState((current) => addAbsence(current, absence))
  }, [])

  const handleRemoveAbsence = useCallback((absenceId: string) => {
    setState((current) => removeAbsence(current, absenceId))
  }, [])

  const handleAddHoliday = useCallback((holiday: Holiday) => {
    setState((current) => addHoliday(current, holiday))
  }, [])

  const handleRemoveHoliday = useCallback((date: string) => {
    setState((current) => removeHoliday(current, date))
  }, [])

  const handleUpdateSettings = useCallback((settings: Partial<PlannerSettings>) => {
    setState((current) => updateSettings(current, settings))
  }, [])

  const handleUpdatePerson = useCallback(
    (personId: PersonId, updates: { name?: string; color?: string }) => {
      setState((current) => updatePerson(current, personId, updates))
    },
    [],
  )

  const handleUpdatePattern = useCallback(
    (weekday: number, personId: PersonId | null) => {
      setState((current) => updatePattern(current, weekday, personId))
    },
    [],
  )

  const handleResetDemo = useCallback(() => {
    clearStoredState()
    const next = resetToDemoState()
    setState(next)
    setMonth(currentMonthKey())
    setSelectedDate(null)
    setTab('calendar')
  }, [])

  const handleImport = useCallback((raw: string) => {
    const parsed = parseImportedState(raw)
    if (!parsed) return false
    setState(parsed)
    setMonth(currentMonthKey())
    setSelectedDate(null)
    return true
  }, [])

  const handleResetState = useCallback(() => {
    clearStoredState()
    const next = createInitialState()
    setState(next)
  }, [])

  return {
    state,
    month,
    tab,
    selectedDate,
    metrics,
    setTab,
    setMonth: navigateMonth,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    openDay,
    closeDay,
    actions: {
      setNight: handleSetNight,
      togglePresence: handleTogglePresence,
      resetPresence: handleResetPresence,
      applyPattern: handleApplyPattern,
      applyPatternToNextMonths: handleApplyPatternToNextMonths,
      confirmMonth: handleConfirmMonth,
      reopenMonth: handleReopenMonth,
      addAbsence: handleAddAbsence,
      removeAbsence: handleRemoveAbsence,
      addHoliday: handleAddHoliday,
      removeHoliday: handleRemoveHoliday,
      updateSettings: handleUpdateSettings,
      updatePerson: handleUpdatePerson,
      updatePattern: handleUpdatePattern,
      resetDemo: handleResetDemo,
      resetState: handleResetState,
      importState: handleImport,
    },
  }
}

export type PlannerController = ReturnType<typeof usePlanner>
