import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { STORAGE_KEY } from './lib/storage'

describe('SmartPlanner app', () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY)
  })

  it('naviga tra le sezioni principali', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText('SmartPlanner')).toBeInTheDocument()
    expect(screen.getAllByRole('tab', { name: /Calendario/ })).not.toHaveLength(0)

    await user.click(screen.getByRole('tab', { name: /Settimana tipo/ }))
    expect(screen.getByText('Modello ricorrente')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Assenze e festivi/ }))
    expect(screen.getByText('Nuova assenza')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Calendario ICS/ }))
    expect(screen.getByRole('heading', { name: 'Calendario ICS' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Impostazioni/ }))
    expect(screen.getByText('Persone')).toBeInTheDocument()
  })

  it('apre il dettaglio di un giorno dal calendario', async () => {
    const user = userEvent.setup()
    render(<App />)

    const dayCells = screen.getAllByRole('button', { name: /notte di/i })
    expect(dayCells.length).toBeGreaterThan(0)
    await user.click(dayCells[0]!)

    expect(screen.getByText('Dettaglio giornata')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Notte in stanza' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByText('Dettaglio giornata')).not.toBeInTheDocument()
  })
})
