import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { CloudController, PlannerController } from '../hooks/usePlanner'
import { currentMonthKey } from '../lib/domain/dates'
import { getMonthMetrics } from '../lib/domain/metrics'
import { createInitialState } from '../lib/domain/state'
import { OfflineView } from './OfflineView'

function cloudController(): CloudController {
  return {
    configured: true,
    active: true,
    ready: false,
    authLoading: false,
    sessionEmail: 'grano@example.com',
    syncStatus: 'offline',
    error: null,
    syncError: null,
    conflict: null,
    conflictBusy: false,
    message: null,
    forceLocal: false,
    offline: true,
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue(undefined),
    retry: vi.fn(),
    resolveConflict: vi.fn().mockResolvedValue(undefined),
    continueLocally: vi.fn(),
    retryCloud: vi.fn(),
    syncNow: vi.fn().mockResolvedValue(undefined),
    reloadCloud: vi.fn().mockResolvedValue(undefined),
    dismissMessage: vi.fn(),
  }
}

function controller(): PlannerController {
  const state = createInitialState()
  const month = currentMonthKey()

  return {
    state,
    month,
    tab: 'calendar',
    selectedDate: null,
    metrics: getMonthMetrics(state, month),
    cloud: cloudController(),
    notifications: {
      unread: [],
      count: 0,
      modalOpen: false,
      modalChanges: [],
      toast: null,
      open: vi.fn(),
      close: vi.fn(),
      dismiss: vi.fn(),
      dismissToast: vi.fn(),
    },
    setTab: vi.fn(),
    setMonth: vi.fn(),
    goToPreviousMonth: vi.fn(),
    goToNextMonth: vi.fn(),
    goToToday: vi.fn(),
    openDay: vi.fn(),
    closeDay: vi.fn(),
    actions: {} as PlannerController['actions'],
  }
}

describe('OfflineView', () => {
  it('mostra il piano salvato in sola lettura', () => {
    render(<OfflineView controller={controller()} />)

    expect(screen.getByText(/Sei offline/)).toBeInTheDocument()
    expect(screen.getByText('Ultimo piano disponibile offline')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Riprova/ })).toBeInTheDocument()
  })
})
