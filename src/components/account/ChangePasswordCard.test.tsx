import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CloudController } from '../../hooks/usePlanner'
import { ChangePasswordCard } from './ChangePasswordCard'

const cloud = {
  active: true,
  offline: false,
} as CloudController

describe('ChangePasswordCard', () => {
  it('aggiorna la password con i dati corretti', async () => {
    const onChangePassword = vi.fn().mockResolvedValue({ error: null })
    render(<ChangePasswordCard cloud={cloud} onChangePassword={onChangePassword} />)

    await userEvent.type(screen.getByLabelText('Password attuale'), 'vecchia-password')
    await userEvent.type(screen.getByLabelText('Nuova password'), 'nuova-password')
    await userEvent.type(
      screen.getByLabelText('Conferma nuova password'),
      'nuova-password',
    )
    await userEvent.click(screen.getByRole('button', { name: /Aggiorna password/ }))

    expect(onChangePassword).toHaveBeenCalledWith('vecchia-password', 'nuova-password')
    expect(
      await screen.findByText(/Password aggiornata/),
    ).toBeInTheDocument()
  })

  it('rifiuta password nuove diverse', async () => {
    const onChangePassword = vi.fn().mockResolvedValue({ error: null })
    render(<ChangePasswordCard cloud={cloud} onChangePassword={onChangePassword} />)

    await userEvent.type(screen.getByLabelText('Password attuale'), 'vecchia-password')
    await userEvent.type(screen.getByLabelText('Nuova password'), 'nuova-password')
    await userEvent.type(screen.getByLabelText('Conferma nuova password'), 'diversa-password')
    await userEvent.click(screen.getByRole('button', { name: /Aggiorna password/ }))

    expect(screen.getByText('Le due nuove password non coincidono.')).toBeInTheDocument()
    expect(onChangePassword).not.toHaveBeenCalled()
  })

  it('rifiuta password nuove troppo corte', async () => {
    const onChangePassword = vi.fn().mockResolvedValue({ error: null })
    render(<ChangePasswordCard cloud={cloud} onChangePassword={onChangePassword} />)

    await userEvent.type(screen.getByLabelText('Password attuale'), 'vecchia-password')
    await userEvent.type(screen.getByLabelText('Nuova password'), 'corta')
    await userEvent.type(screen.getByLabelText('Conferma nuova password'), 'corta')
    await userEvent.click(screen.getByRole('button', { name: /Aggiorna password/ }))

    expect(
      screen.getByText('La nuova password deve avere almeno 8 caratteri.'),
    ).toBeInTheDocument()
    expect(onChangePassword).not.toHaveBeenCalled()
  })
})
