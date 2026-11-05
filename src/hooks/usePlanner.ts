import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
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
  clearAuthUrl,
  formatCloudError,
  getSession,
  isCloudLinked,
  loadCloudState,
  markCloudLinked,
  requestPasswordReset,
  revokeOtherSessions,
  saveCloudState,
  signInWithEmail,
  signOutFromCloud,
  subscribeToCloudState,
  updatePasswordWithRecovery,
  type CloudErrorInfo,
  type SyncStatus,
} from '../lib/cloud'
import { decideBootstrap } from '../lib/cloud-bootstrap'
import {
  isRecoveryError,
  isRecoveryLink,
  isSupabaseConfigured,
  supabase,
} from '../lib/supabase'
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
  recovery: boolean
  recoveryError: string | null
  loginNotice: string | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  requestReset: (email: string) => Promise<{ error: string | null }>
  completeRecovery: (newPassword: string) => Promise<{ error: string | null }>
  cancelRecovery: () => Promise<void>
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
  const [recovery, setRecovery] = useState(isRecoveryLink || isRecoveryError)
  const [recoveryError, setRecoveryError] = useState<string | null>(
    isRecoveryError
      ? 'Il link di recupero non è valido o è scaduto. Richiedine uno nuovo.'
      : null,
  )
  const [loginNotice, setLoginNotice] = useState<string | null>(null)

  const stateRef = useRef(state)
  const skipNextCloudSave = useRef(false)
  const lastRemoteUpdatedAt = useRef<string | null>(null)
  const bootstrappedUserId = useRef<string | null>(null)
  const hadLocalStateAtMount = useRef(hasStoredState())

  const cloudActive = isSupabaseConfigured && !forceLocal
  const sessionUserId = session?.user.id ?? null

  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Local cache: keep a copy in the browser (also useful for offline/backup).
  // Before the first cloud bootstrap, do not persist the auto-generated initial
  // state on a fresh browser, otherwise it would look like a real local plan.
  useEffect(() => {
    if (cloudActive && !cloudReady && !hadLocalStateAtMount.current) return
    saveState(state)
  }, [cloudActive, cloudReady, state])

  const applyRemote = useCallback((remoteState: PlannerState, updatedAt: string | null) => {
    lastRemoteUpdatedAt.current = updatedAt
    skipNextCloudSave.current = true
    setState(remoteState)
    saveState(remoteState)
  }, [])

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

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)

      if (event === 'PASSWORD_RECOVERY') {
        setRecovery(true)
        setRecoveryError(null)
      }

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
      lastRemoteUpdatedAt.current = updatedAt
      skipNextCloudSave.current = true
      setState(remoteState)
      setSyncStatus('saved')
      setSyncError(null)
    })
  }, [cloudActive, cloudReady, sessionUserId])

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

  const handleSignIn = useCallback(async (email: string, password: string) => {
    setOffline(false)
    setCloudError(null)
    setSyncError(null)
    setLoginNotice(null)
    setRecovery(false)
    setRecoveryError(null)
    return signInWithEmail(email, password)
  }, [])

  const handleSignOut = useCallback(async () => {
    await signOutFromCloud()
    clearStoredState()
    setSession(null)
    setOffline(false)
    setRecovery(false)
    setRecoveryError(null)
    setLoginNotice(null)
    setCloudReady(false)
    setConflict(null)
    setCloudError(null)
    setSyncError(null)
    setSyncStatus('local')
    setCloudMessage(null)
    bootstrappedUserId.current = null
    setTab('calendar')
    setSelectedDate(null)
  }, [])

  const handleRequestReset = useCallback(async (email: string) => {
    setLoginNotice(null)
    return requestPasswordReset(email)
  }, [])

  const handleCompleteRecovery = useCallback(async (newPassword: string) => {
    setRecoveryError(null)

    const result = await updatePasswordWithRecovery(newPassword)
    if (result.error) {
      return result
    }

    await revokeOtherSessions()
    try {
      await signOutFromCloud()
    } catch {
      // The password is already updated; proceed with the local cleanup.
    }

    clearAuthUrl()
    setRecovery(false)
    setRecoveryError(null)
    setSession(null)
    setOffline(false)
    setCloudReady(false)
    setCloudError(null)
    setSyncError(null)
    setSyncStatus('local')
    setCloudMessage(null)
    setLoginNotice('Password aggiornata. Accedi con la nuova password.')
    setTab('calendar')
    setSelectedDate(null)
    bootstrappedUserId.current = null

    return { error: null }
  }, [])

  const handleCancelRecovery = useCallback(async () => {
    try {
      await signOutFromCloud()
    } catch {
      // Best effort: the important part is clearing the local recovery state.
    }

    clearAuthUrl()
    setRecovery(false)
    setRecoveryError(null)
    setSession(null)
    setOffline(false)
    setCloudReady(false)
    setCloudError(null)
    setSyncError(null)
    setSyncStatus('local')
    setCloudMessage(null)
    bootstrappedUserId.current = null
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
    recovery,
    recoveryError,
    loginNotice,
    signIn: handleSignIn,
    signOut: handleSignOut,
    requestReset: handleRequestReset,
    completeRecovery: handleCompleteRecovery,
    cancelRecovery: handleCancelRecovery,
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
