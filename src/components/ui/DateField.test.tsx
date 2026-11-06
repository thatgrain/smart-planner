import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateField } from './DateField'

describe('DateField', () => {
  it('mostra la data in formato italiano e la converte al blur', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<DateField label="Dal" value="2026-11-02" onChange={onChange} />)

    const input = screen.getByLabelText('Dal')
    expect(input).toHaveValue('02/11/2026')

    await user.clear(input)
    await user.type(input, '03/11/2026')
    expect(onChange).toHaveBeenLastCalledWith('2026-11-03')

    await user.tab()
    expect(input).toHaveValue('03/11/2026')
  })

  it('segnala una data non valida', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<DateField label="Dal" value="2026-11-02" onChange={onChange} />)

    const input = screen.getByLabelText('Dal')
    await user.clear(input)
    await user.type(input, '31/02/2026')
    await user.tab()

    expect(screen.getByText(/Data non valida/)).toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('seleziona un giorno dal calendario con settimane lunedì-first', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<DateField label="Dal" value="2026-11-02" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Apri calendario' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Lun')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Martedì 3 novembre 2026' }))
    expect(onChange).toHaveBeenLastCalledWith('2026-11-03')
  })
})
