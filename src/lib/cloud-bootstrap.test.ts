import { describe, expect, it } from 'vitest'
import { decideBootstrap } from './cloud-bootstrap'
import { createInitialState } from './domain/state'
import type { PlannerState } from './domain/types'

function state(): PlannerState {
  return createInitialState(new Date(2026, 10, 1))
}

function modifiedState(): PlannerState {
  const base = state()
  return {
    ...base,
    nights: [...base.nights, { date: '2026-11-02', personId: 'A' }],
  }
}

describe('bootstrap cloud', () => {
  it('crea lo stato iniziale se non c’è nulla', () => {
    expect(
      decideBootstrap({
        hasLocal: false,
        hasRemote: false,
        linked: false,
        local: state(),
        remote: null,
      }),
    ).toBe('create-initial')
  })

  it('carica il piano locale se il cloud è vuoto', () => {
    expect(
      decideBootstrap({
        hasLocal: true,
        hasRemote: false,
        linked: false,
        local: state(),
        remote: null,
      }),
    ).toBe('upload-local')
  })

  it('usa il cloud se non ci sono dati locali', () => {
    expect(
      decideBootstrap({
        hasLocal: false,
        hasRemote: true,
        linked: false,
        local: state(),
        remote: state(),
      }),
    ).toBe('use-cloud')
  })

  it('usa il cloud se i due piani sono identici', () => {
    expect(
      decideBootstrap({
        hasLocal: true,
        hasRemote: true,
        linked: false,
        local: state(),
        remote: state(),
      }),
    ).toBe('use-cloud')
  })

  it('chiede una scelta se i due piani sono diversi', () => {
    expect(
      decideBootstrap({
        hasLocal: true,
        hasRemote: true,
        linked: false,
        local: modifiedState(),
        remote: state(),
      }),
    ).toBe('conflict')
  })

  it('dopo il primo collegamento usa sempre il cloud', () => {
    expect(
      decideBootstrap({
        hasLocal: true,
        hasRemote: true,
        linked: true,
        local: modifiedState(),
        remote: state(),
      }),
    ).toBe('use-cloud')
  })

  it('se il cloud sparisce dopo il collegamento ricarica il locale', () => {
    expect(
      decideBootstrap({
        hasLocal: true,
        hasRemote: false,
        linked: true,
        local: state(),
        remote: null,
      }),
    ).toBe('upload-local')
  })
})
