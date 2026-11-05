import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from './useTheme'

function Probe() {
  const { preference, isDark, setPreference, toggle } = useTheme()
  return (
    <div>
      <span data-testid="preference">{preference}</span>
      <span data-testid="is-dark">{String(isDark)}</span>
      <button type="button" onClick={toggle}>
        toggle
      </button>
      <button type="button" onClick={() => setPreference('dark')}>
        set-dark
      </button>
      <button type="button" onClick={() => setPreference('light')}>
        set-light
      </button>
    </div>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    window.localStorage.removeItem('smartplanner.theme.v1')
    document.documentElement.classList.remove('dark')
  })

  it('applica e memorizza il tema scuro', async () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'set-dark' }))

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(window.localStorage.getItem('smartplanner.theme.v1')).toBe('dark')
    expect(screen.getByTestId('is-dark')).toHaveTextContent('true')

    await userEvent.click(screen.getByRole('button', { name: 'toggle' }))

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(window.localStorage.getItem('smartplanner.theme.v1')).toBe('light')
  })
})
