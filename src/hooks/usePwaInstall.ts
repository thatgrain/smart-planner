import { useCallback, useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DISMISS_KEY = 'smartplanner.pwa.install.dismissed.v1'

function readDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof window.matchMedia !== 'function') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  )
}

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const isIpad =
    /Macintosh/.test(navigator.userAgent) && (navigator.maxTouchPoints ?? 0) > 1
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || isIpad
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

export function usePwaInstall() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(isStandaloneMode)
  const [isIos] = useState(isIosDevice)
  const [dismissed, setDismissed] = useState(readDismissed)

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
    }

    const onInstalled = () => {
      setPromptEvent(null)
      setIsStandalone(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)

    const media =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(display-mode: standalone)')
        : null
    const onDisplayModeChange = () => setIsStandalone(isStandaloneMode())
    media?.addEventListener?.('change', onDisplayModeChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
      media?.removeEventListener?.('change', onDisplayModeChange)
    }
  }, [])

  const install = useCallback(async (): Promise<InstallOutcome> => {
    if (!promptEvent) return 'unavailable'

    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    if (choice.outcome === 'accepted') {
      setPromptEvent(null)
      setIsStandalone(true)
    }
    return choice.outcome
  }, [promptEvent])

  const dismiss = useCallback(() => {
    setDismissed(true)
    try {
      window.localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Ignore storage errors.
    }
  }, [])

  return {
    canInstall: Boolean(promptEvent),
    isIos,
    isStandalone,
    dismissed,
    install,
    dismiss,
  }
}
