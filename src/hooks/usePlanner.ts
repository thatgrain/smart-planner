import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  addMonthsToMonthKey,
  currentMonthKey,
  monthKeyOf,
} from '../lib/domain/dates'
import {
  diffPlannerStates,
  mergeChangeSummaries,
  totalChanges,
  type PlanChangeSummary,
} from '../lib/domain/changes'
import { getMonthMetrics } from '../lib/domain/metrics'
import {
  addAbsence,
  addHoliday,
  applyPatternToMonth,
  applyPatternToMonths,
  createInitialState,
  removeAbsence,
  removeHoliday,
  resetPresenceForDay,
  setNight,
  togglePresence,
  updateAbsence,
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
  formatCloudError,
  getSession,
  isCloudLinked,
  loadCloudState,
  markCloudLinked,
  saveCloudState,
  signInWithEmail,
  signOutFromCloud,
  subscribeToCloudState,
  type CloudErrorInfo,
  type SyncStatus,
} from '../lib/cloud'
import { decideBootstrap } from '../lib/cloud-bootstrap'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { loadLastSeen, saveLastSeen } from '../lib/lastSeen'
import {
  clearStoredState,
  hasStoredState,
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

export interface CloudConflict {
  local: PlannerState
  remote: PlannerState
  remoteUpdatedAt: string | null
}

export interface CloudController {
  configured: boolean
  active: boolean
  ready: boolean
  authLoading: boolean
  sessionEmail: string | null
  syncStatus: SyncStatus
  error: CloudErrorInfo | null
  syncError: CloudErrorInfo | null
  conflict: CloudConflict | null
  conflictBusy: boolean
  message: string | null
  forceLocal: boolean
  offline: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  retry: () => void
  resolveConflict: (choice: 'cloud' | 'local') => Promise<void>
  continueLocally: () => void
  retryCloud: () => void
  syncNow: () => Promise<void>
  reloadCloud: () => Promise<void>
  dismissMessage: () => void
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

  const [unreadChanges, setUnreadChanges] = useState<PlanChangeSummary[]>([])
  const [changesModalData, setChangesModalData] = useState<PlanChangeSummary[]>([])
  const [changesOpen, setChangesOpen] = useState(false)
  const [changeToast, setChangeToast] = useState<PlanChangeSummary[] | null>(null)

  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured)
  const [cloudReady, setCloudReady] = useState(!isSupabaseConfigured)
  const [cloudError, setCloudError] = useState<CloudErrorInfo | null>(null)
  const [syncError, setSyncError] = useState<CloudErrorInfo | null>(null)
  const [conflict, setConflict] = useState<CloudConflict | null>(null)
  const [conflictBusy, setConflictBusy] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    isSupabaseConfigured ? 'loading' : 'local',
  )
  const [cloudMessage, setCloudMessage] = useState<string | null>(null)
  const [forceLocal, setForceLocal] = useState(false)
  const [offline, setOffline] = useState(() => {
    if (typeof navigator === 'undefined') return false
    return !navigator.onLine && hasStoredState()
  })
  const [authRetryKey, setAuthRetryKey] = useState(0)

  const stateRef = useRef(state)
  const skipNextCloudSave = useRef(false)
  const lastRemoteUpdatedAt = useRef<string | null>(null)
  const bootstrappedUserId = useRef<string | null>(null)
  const hadLocalStateAtMount = useRef(hasStoredState())

  const cloudActive = isSupabaseConfigured && !forceLocal
  const sessionUserId = session?.user.id ?? null
  const sessionEmail = session?.user.email?.trim().toLowerCase() ?? null
  const notificationScope = sessionEmail ?? sessionUserId ?? 'local'
  const notificationScopeRef = useRef(notificationScope)
  const unreadOrigin = useRef<'open' | 'hidden' | null>(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    notificationScopeRef.current = notificationScope
  }, [notificationScope])

  useEffect(() => {
    if (!changeToast) return
    const timeout = window.setTimeout(() => setChangeToast(null), 7000)
    return () => window.clearTimeout(timeout)
  }, [changeToast])

  // Local cache: keep a copy in the browser (also useful for offline/backup).
  // Before the first cloud bootstrap, do not persist the auto-generated initial
  // state on a fresh browser, otherwise it would look like a real local plan.
  useEffect(() => {
    if (cloudActive && !cloudReady && !hadLocalStateAtMount.current) return
    saveState(state)
  }, [cloudActive, cloudReady, state])

  const processIncomingState = useCallback(
    (
      remoteState: PlannerState,
      updatedAt: string | null,
      mode: 'open' | 'live',
    ) => {
      const scope = notificationScopeRef.current
      const previous = loadLastSeen(scope)
      const changes = previous ? diffPlannerStates(previous, remoteState) : []
      const isVisible =
        typeof document === 'undefined' || document.visibilityState === 'visible'

      if (mode === 'open') {
        // Opening the app is the moment "changes since last open" is computed:
        // the new snapshot becomes the baseline and unseen changes go to the banner.
        saveLastSeen(scope, remoteState)
        if (changes.length > 0) {
          setUnreadChanges(changes)
          unreadOrigin.current = 'open'
        }
      } else if (isVisible) {
        // While the app is visible, changes are shown immediately as a toast and
        // considered seen, so they do not pile up in the notification bell.
        saveLastSeen(scope, remoteState)
        if (changes.length > 0) {
          setChangeToast(changes)
          setUnreadChanges([])
          unreadOrigin.current = null
        }
      } else if (changes.length > 0) {
        // Hidden tab: do not advance the snapshot, otherwise closing the app
        // before reopening would lose the notification entirely. Two hidden
        // updates are diffed from the same baseline, so the newest diff already
        // includes the previous one and must replace it instead of adding up.
        const shouldMerge = unreadOrigin.current !== 'hidden'
        setUnreadChanges((current) =>
          shouldMerge && current.length > 0
            ? mergeChangeSummaries(current, changes)
            : changes,
        )
        unreadOrigin.current = 'hidden'
      }

      lastRemoteUpdatedAt.current = updatedAt
      skipNextCloudSave.current = true
      stateRef.current = remoteState
      setState(remoteState)
      saveState(remoteState)
    },
    [],
  )

  const applyRemote = useCallback(
    (remoteState: PlannerState, updatedAt: string | null) => {
      processIncomingState(remoteState, updatedAt, 'open')
    },
    [processIncomingState],
  )

  const applyLocal = useCallback(
    (updater: (current: PlannerState) => PlannerState) => {
      const next = updater(stateRef.current)
      stateRef.current = next
      setState(next)
      saveLastSeen(notificationScopeRef.current, next)
    },
    [],
  )

  const bootstrapCloud = useCallback(async () => {
    if (!cloudActive) return

    setOffline(false)
    setCloudReady(false)
    setCloudError(null)
    setSyncError(null)
    setConflict(null)
    setSyncStatus('loading')

    try {
      const remote = await loadCloudState()
      const local = stateRef.current
      const decision = decideBootstrap({
        hasLocal: hasStoredState(),
        hasRemote: Boolean(remote.state),
        linked: isCloudLinked(),
        local,
        remote: remote.state,
      })

      if (decision === 'use-cloud') {
        if (!remote.state) throw new Error('Stato cloud non valido')
        applyRemote(remote.state, remote.updatedAt)
        markCloudLinked()
        setCloudReady(true)
        setSyncStatus('saved')
        return
      }

      if (decision === 'upload-local') {
        const updatedAt = await saveCloudState(local)
        lastRemoteUpdatedAt.current = updatedAt
        markCloudLinked()
        skipNextCloudSave.current = true
        saveLastSeen(notificationScopeRef.current, local)
        setCloudReady(true)
        setSyncStatus('saved')
        setCloudMessage('Piano locale caricato nel cloud.')
        return
      }

      if (decision === 'create-initial') {
        const initial = createInitialState()
        const updatedAt = await saveCloudState(initial)
        lastRemoteUpdatedAt.current = updatedAt
        markCloudLinked()
        skipNextCloudSave.current = true
        saveLastSeen(notificationScopeRef.current, initial)
        setState(initial)
        setCloudReady(true)
        setSyncStatus('saved')
        setCloudMessage('Piano iniziale creato nel cloud.')
        return
      }

      if (remote.state) {
        setConflict({
          local,
          remote: remote.state,
          remoteUpdatedAt: remote.updatedAt,
        })
        setSyncStatus('saved')
      }
    } catch (error) {
      const info = formatCloudError(error)
      if (info.code === 'NETWORK' && hasStoredState()) {
        setOffline(true)
        setCloudError(null)
        setCloudReady(false)
        setSyncStatus('offline')
        setSyncError(null)
        setConflict(null)
        return
      }

      setCloudError(info)
      setCloudReady(false)
      setSyncStatus('error')
    }
  }, [applyRemote, cloudActive])

  // Auth session bootstrap.
  useEffect(() => {
    if (!isSupabaseConfigured || forceLocal || !supabase) return

    const controller = new AbortController()

    void getSession()
      .then((currentSession) => {
        if (controller.signal.aborted) return
        setSession(currentSession)
        setAuthLoading(false)
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setCloudError(formatCloudError(error))
        setAuthLoading(false)
        setSyncStatus('error')
      })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)

      if (!nextSession) {
        setCloudReady(false)
        setConflict(null)
        setCloudError(null)
        setSyncError(null)
        setSyncStatus('local')
        bootstrappedUserId.current = null
      }
    })

    return () => {
      controller.abort()
      data.subscription.unsubscribe()
    }
  }, [authRetryKey, forceLocal])

  // Bootstrap when a user session becomes available.
  useEffect(() => {
    if (!cloudActive || !sessionUserId) return
    if (bootstrappedUserId.current === sessionUserId) return
    bootstrappedUserId.current = sessionUserId
    void bootstrapCloud()
  }, [authRetryKey, bootstrapCloud, cloudActive, sessionUserId])

  // When the connection comes back, re-authenticate and bootstrap the cloud.
  useEffect(() => {
    if (!cloudActive || !offline) return

    const onOnline = () => {
      setOffline(false)
      setAuthLoading(true)
      setSyncStatus('loading')
      bootstrappedUserId.current = null
      setAuthRetryKey((value) => value + 1)
    }

    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [cloudActive, offline])

  // Realtime updates from the other browser.
  useEffect(() => {
    if (!cloudActive || !cloudReady || !sessionUserId) return

    return subscribeToCloudState((remoteState, updatedAt) => {
      if (lastRemoteUpdatedAt.current && updatedAt <= lastRemoteUpdatedAt.current) return
      processIncomingState(remoteState, updatedAt, 'live')
      setSyncStatus('saved')
      setSyncError(null)
    })
  }, [cloudActive, cloudReady, processIncomingState, sessionUserId])

  // Debounced cloud save. Realtime updates and bootstrap pulls skip this effect.
  useEffect(() => {
    if (!cloudActive || !cloudReady || !sessionUserId) return

    if (skipNextCloudSave.current) {
      skipNextCloudSave.current = false
      return
    }

    setSyncStatus('saving')
    const timeout = window.setTimeout(() => {
      void saveCloudState(state)
        .then((updatedAt) => {
          lastRemoteUpdatedAt.current = updatedAt
          setSyncStatus('saved')
          setSyncError(null)
        })
        .catch((error) => {
          setSyncStatus('error')
          setSyncError(formatCloudError(error))
        })
    }, 450)

    return () => window.clearTimeout(timeout)
  }, [cloudActive, cloudReady, sessionUserId, state])

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

  const handleSetNight = useCallback(
    (date: string, personId: PersonId | null) => {
      applyLocal((current) => setNight(current, date, personId))
    },
    [applyLocal],
  )

  const handleTogglePresence = useCallback(
    (date: string, personId: PersonId) => {
      applyLocal((current) => togglePresence(current, date, personId))
    },
    [applyLocal],
  )

  const handleResetPresence = useCallback(
    (date: string, personId?: PersonId) => {
      applyLocal((current) => resetPresenceForDay(current, date, personId))
    },
    [applyLocal],
  )

  const handleApplyPattern = useCallback(() => {
    applyLocal((current) => applyPatternToMonth(current, month))
  }, [applyLocal, month])

  const handleApplyPatternToNextMonths = useCallback(
    (count = 12) => {
      const months = Array.from({ length: count }, (_, index) =>
        addMonthsToMonthKey(month, index),
      )
      applyLocal((current) => applyPatternToMonths(current, months))
    },
    [applyLocal, month],
  )

  const handleAddAbsence = useCallback(
    (input: AddAbsenceInput) => {
      const absence = {
        id: makeId(),
        personId: input.personId,
        type: input.type,
        start: input.start,
        end: input.end,
        note: input.note?.trim() || undefined,
      }
      applyLocal((current) => addAbsence(current, absence))
    },
    [applyLocal],
  )

  const handleUpdateAbsence = useCallback(
    (absenceId: string, input: AddAbsenceInput) => {
      applyLocal((current) =>
        updateAbsence(current, absenceId, {
          personId: input.personId,
          type: input.type,
          start: input.start,
          end: input.end,
          note: input.note?.trim() || undefined,
        }),
      )
    },
    [applyLocal],
  )

  const handleRemoveAbsence = useCallback(
    (absenceId: string) => {
      applyLocal((current) => removeAbsence(current, absenceId))
    },
    [applyLocal],
  )

  const handleAddHoliday = useCallback(
    (holiday: Holiday) => {
      applyLocal((current) => addHoliday(current, holiday))
    },
    [applyLocal],
  )

  const handleRemoveHoliday = useCallback(
    (date: string) => {
      applyLocal((current) => removeHoliday(current, date))
    },
    [applyLocal],
  )

  const handleUpdateSettings = useCallback(
    (settings: Partial<PlannerSettings>) => {
      applyLocal((current) => updateSettings(current, settings))
    },
    [applyLocal],
  )

  const handleUpdatePerson = useCallback(
    (personId: PersonId, updates: { name?: string; color?: string }) => {
      applyLocal((current) => updatePerson(current, personId, updates))
    },
    [applyLocal],
  )

  const handleUpdatePattern = useCallback(
    (weekday: number, personId: PersonId | null) => {
      applyLocal((current) => updatePattern(current, weekday, personId))
    },
    [applyLocal],
  )

  const handleResetDemo = useCallback(() => {
    clearStoredState()
    const next = resetToDemoState()
    stateRef.current = next
    setState(next)
    saveLastSeen(notificationScopeRef.current, next)
    setMonth(currentMonthKey())
    setSelectedDate(null)
    setTab('calendar')
  }, [])

  const handleImport = useCallback((raw: string) => {
    const parsed = parseImportedState(raw)
    if (!parsed) return false
    stateRef.current = parsed
    setState(parsed)
    saveLastSeen(notificationScopeRef.current, parsed)
    setMonth(currentMonthKey())
    setSelectedDate(null)
    return true
  }, [])

  const handleResetState = useCallback(() => {
    clearStoredState()
    const next = createInitialState()
    stateRef.current = next
    setState(next)
    saveLastSeen(notificationScopeRef.current, next)
  }, [])

  const handleSignIn = useCallback(async (email: string, password: string) => {
    setOffline(false)
    setCloudError(null)
    setSyncError(null)
    return signInWithEmail(email, password)
  }, [])

  const handleSignOut = useCallback(async () => {
    await signOutFromCloud()
    clearStoredState()
    setSession(null)
    setOffline(false)
    setCloudReady(false)
    setConflict(null)
    setCloudError(null)
    setSyncError(null)
    setSyncStatus('local')
    setCloudMessage(null)
    bootstrappedUserId.current = null
    setUnreadChanges([])
    setChangesModalData([])
    setChangesOpen(false)
    setChangeToast(null)
    unreadOrigin.current = null
    setTab('calendar')
    setSelectedDate(null)
  }, [])

  const resolveConflict = useCallback(
    async (choice: 'cloud' | 'local') => {
      if (!conflict) return
      setOffline(false)
      setConflictBusy(true)
      setSyncError(null)
      try {
        if (choice === 'cloud') {
          applyRemote(conflict.remote, conflict.remoteUpdatedAt)
          markCloudLinked()
          setCloudReady(true)
          setSyncStatus('saved')
          setConflict(null)
        } else {
          const updatedAt = await saveCloudState(conflict.local)
          lastRemoteUpdatedAt.current = updatedAt
          markCloudLinked()
          skipNextCloudSave.current = true
          saveLastSeen(notificationScopeRef.current, conflict.local)
          stateRef.current = conflict.local
          setState(conflict.local)
          setCloudReady(true)
          setSyncStatus('saved')
          setConflict(null)
          setCloudMessage('Piano locale caricato nel cloud.')
        }
      } catch (error) {
        setSyncStatus('error')
        setSyncError(formatCloudError(error))
      } finally {
        setConflictBusy(false)
      }
    },
    [applyRemote, conflict],
  )

  const continueLocally = useCallback(() => {
    setForceLocal(true)
    setOffline(false)
    setCloudError(null)
    setConflict(null)
    setSyncError(null)
    setCloudReady(true)
    setSyncStatus('local')
    setAuthLoading(false)
  }, [])

  const retryCloud = useCallback(() => {
    setForceLocal(false)
    setOffline(false)
    setCloudError(null)
    setSyncError(null)
    setCloudReady(false)
    setAuthLoading(true)
    setSyncStatus('loading')
    bootstrappedUserId.current = null
    setAuthRetryKey((value) => value + 1)
  }, [])

  const retry = useCallback(() => {
    setOffline(false)
    setCloudError(null)
    setSyncError(null)
    if (sessionUserId) {
      bootstrappedUserId.current = null
      void bootstrapCloud()
    } else {
      window.location.reload()
    }
  }, [bootstrapCloud, sessionUserId])

  const syncNow = useCallback(async () => {
    if (!cloudActive || !cloudReady || !sessionUserId) return
    setSyncStatus('saving')
    setSyncError(null)
    try {
      const updatedAt = await saveCloudState(stateRef.current)
      lastRemoteUpdatedAt.current = updatedAt
      setSyncStatus('saved')
    } catch (error) {
      setSyncStatus('error')
      setSyncError(formatCloudError(error))
    }
  }, [cloudActive, cloudReady, sessionUserId])

  const reloadCloud = useCallback(async () => {
    if (!cloudActive || !sessionUserId) return
    setSyncStatus('loading')
    setSyncError(null)
    try {
      const remote = await loadCloudState()
      if (!remote.state) {
        setCloudMessage('Nessun piano presente nel cloud.')
        setSyncStatus('saved')
        return
      }
      applyRemote(remote.state, remote.updatedAt)
      markCloudLinked()
      setCloudReady(true)
      setSyncStatus('saved')
    } catch (error) {
      setSyncStatus('error')
      setSyncError(formatCloudError(error))
    }
  }, [applyRemote, cloudActive, sessionUserId])

  const dismissMessage = useCallback(() => setCloudMessage(null), [])

  const openChanges = useCallback(
    (changes?: PlanChangeSummary[]) => {
      const payload = changes?.length ? changes : unreadChanges
      if (payload.length === 0) return
      setChangesModalData(payload)
      setChangesOpen(true)
      if (!changes?.length) {
        setUnreadChanges([])
        unreadOrigin.current = null
      }
    },
    [unreadChanges],
  )

  const closeChanges = useCallback(() => setChangesOpen(false), [])

  const dismissChanges = useCallback(() => {
    setUnreadChanges([])
    unreadOrigin.current = null
  }, [])

  const dismissToast = useCallback(() => setChangeToast(null), [])

  const cloud: CloudController = {
    configured: isSupabaseConfigured,
    active: cloudActive,
    ready: cloudReady,
    authLoading,
    sessionEmail: session?.user.email ?? null,
    syncStatus,
    error: cloudError,
    syncError,
    conflict,
    conflictBusy,
    message: cloudMessage,
    forceLocal,
    offline,
    signIn: handleSignIn,
    signOut: handleSignOut,
    retry,
    resolveConflict,
    continueLocally,
    retryCloud,
    syncNow,
    reloadCloud,
    dismissMessage,
  }

  return {
    state,
    month,
    tab,
    selectedDate,
    metrics,
    cloud,
    notifications: {
      unread: unreadChanges,
      count: totalChanges(unreadChanges),
      modalOpen: changesOpen,
      modalChanges: changesModalData,
      toast: changeToast,
      open: openChanges,
      close: closeChanges,
      dismiss: dismissChanges,
      dismissToast,
    },
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
      addAbsence: handleAddAbsence,
      updateAbsence: handleUpdateAbsence,
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
