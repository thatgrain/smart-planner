// oxlint-disable react/only-export-components
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

const THEME_KEY = 'smartplanner.theme.v1'

interface ThemeContextValue {
  preference: ThemePreference
  isDark: boolean
  setPreference: (preference: ThemePreference) => void
  toggle: () => void
}

const fallback: ThemeContextValue = {
  preference: 'system',
  isDark: false,
  setPreference: () => {},
  toggle: () => {},
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  try {
    const value = window.localStorage.getItem(THEME_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    // Ignore storage errors.
  }
  return 'system'
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveDark(preference: ThemePreference, systemDark: boolean): boolean {
  if (preference === 'dark') return true
  if (preference === 'light') return false
  return systemDark
}

function applyTheme(isDark: boolean): void {
  if (typeof document === 'undefined') return

  document.documentElement.classList.toggle('dark', isDark)
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
  document.documentElement.style.backgroundColor = isDark ? '#020617' : '#f8fafc'

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', isDark ? '#0f172a' : '#f8fafc')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  const isDark = resolveDark(preference, systemDark)

  useEffect(() => {
    applyTheme(isDark)
  }, [isDark])

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    media.addEventListener?.('change', onChange)
    return () => media.removeEventListener?.('change', onChange)
  }, [])

  const setPreference = useCallback((value: ThemePreference) => {
    setPreferenceState(value)
    try {
      window.localStorage.setItem(THEME_KEY, value)
    } catch {
      // Ignore storage errors.
    }
  }, [])

  const toggle = useCallback(() => {
    setPreference(isDark ? 'light' : 'dark')
  }, [isDark, setPreference])

  const value = useMemo(
    () => ({ preference, isDark, setPreference, toggle }),
    [preference, isDark, setPreference, toggle],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext) ?? fallback
}
