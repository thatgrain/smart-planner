import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CloudController } from '../../hooks/usePlanner'
import type { CloudErrorInfo } from '../../lib/cloud'
import { createInitialState } from '../../lib/domain/state'
import { CloudConflictScreen } from './CloudConflictScreen'
import { CloudErrorPage } from './CloudErrorPage'
import { LoginPage } from './LoginPage'
import { ResetPasswordPage } from './ResetPasswordPage'

describe('schermate cloud', () => {
  it('invia email e password dal login', async () => {
    const onSignIn = vi.fn().mockResolvedValue({ error: null })
    render(<LoginPage onSignIn={onSignIn} onRequestReset={vi.fn().mockResolvedValue({ error: null })} />)

    await userEvent.type(screen.getByLabelText('Email'), 'grano@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'segreta')
    await userEvent.click(screen.getByRole('button', { name: /Accedi/ }))

    expect(onSignIn).toHaveBeenCalledWith('grano@example.com', 'segreta')
  })

  it('mostra l’errore restituito dal login', async () => {
    const onSignIn = vi
      .fn()
      .mockResolvedValue({ error: 'Email o password non corretti.' })
    render(<LoginPage onSignIn={onSignIn} onRequestReset={vi.fn().mockResolvedValue({ error: null })} />)

    await userEvent.type(screen.getByLabelText('Email'), 'grano@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'sbagliata')
    await userEvent.click(screen.getByRole('button', { name: /Accedi/ }))

    expect(await screen.findByText('Email o password non corretti.')).toBeInTheDocument()
  })

  it('richiede il link di reset password', async () => {
    const onRequestReset = vi.fn().mockResolvedValue({ error: null })
    render(
      <LoginPage
        onSignIn={vi.fn().mockResolvedValue({ error: null })}
        onRequestReset={onRequestReset}
      />,
    )

    await userEvent.click(
      screen.getByRole('button', { name: /Password dimenticata/ }),
    )
    await userEvent.type(screen.getByLabelText('Email'), 'grano@example.com')
    await userEvent.click(screen.getByRole('button', { name: /Invia link di reset/ }))

    expect(onRequestReset).toHaveBeenCalledWith('grano@example.com')
    expect(
      await screen.findByText(/Se l.+indirizzo è registrato/),
    ).toBeInTheDocument()
  })

  it('imposta la nuova password dalla schermata di recupero', async () => {
    const completeRecovery = vi.fn().mockResolvedValue({ error: null })
    const cloud = {
      recovery: true,
      recoveryError: null,
      sessionEmail: 'grano@example.com',
      authLoading: false,
      offline: false,
      completeRecovery,
      cancelRecovery: vi.fn().mockResolvedValue(undefined),
    } as unknown as CloudController

    render(<ResetPasswordPage cloud={cloud} />)

    await userEvent.type(screen.getByLabelText('Nuova password'), 'nuova-password')
    await userEvent.type(
      screen.getByLabelText('Conferma nuova password'),
      'nuova-password',
    )
    await userEvent.click(
      screen.getByRole('button', { name: /Imposta nuova password/ }),
    )

    expect(completeRecovery).toHaveBeenCalledWith('nuova-password')
    expect(
      await screen.findByText(/Password aggiornata/),
    ).toBeInTheDocument()
  })

  it('mostra la pagina di errore per il database mancante', () => {
    const error: CloudErrorInfo = {
      code: 'TABLE_MISSING',
      title: 'Database non inizializzato',
      message: 'La tabella planner_state non esiste ancora.',
      hint: 'Esegui la migrazione SQL.',
      canRetry: true,
    }
    render(
      <CloudErrorPage
        error={error}
        onRetry={vi.fn()}
        onSignOut={vi.fn()}
        onContinueLocal={vi.fn()}
      />,
    )

    expect(screen.getByText('Database non inizializzato')).toBeInTheDocument()
    expect(screen.getByText('supabase/migrations/0001_init.sql')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Riprova/ })).toBeInTheDocument()
  })

  it('mostra il conflitto tra piano locale e cloud', () => {
    const state = createInitialState()
    render(
      <CloudConflictScreen
        local={state}
        remote={state}
        remoteUpdatedAt="2026-11-05T12:00:00Z"
        onUseCloud={vi.fn()}
        onUseLocal={vi.fn()}
      />,
    )

    expect(screen.getByText('Quale piano vuoi usare?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Usa il piano cloud/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Carica il piano locale/ })).toBeInTheDocument()
  })
})
