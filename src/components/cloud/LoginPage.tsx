import { useState, type FormEvent } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  Mail,
} from 'lucide-react'
import { Button } from '../ui/Button'

type Mode = 'login' | 'forgot' | 'sent'

export function LoginPage({
  onSignIn,
  onRequestReset,
  notice = null,
}: {
  onSignIn: (email: string, password: string) => Promise<{ error: string | null }>
  onRequestReset: (email: string) => Promise<{ error: string | null }>
  notice?: string | null
}) {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [requesting, setRequesting] = useState(false)

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Inserisci email e password.')
      return
    }

    setSubmitting(true)
    const result = await onSignIn(email, password)
    setSubmitting(false)
    if (result.error) setError(result.error)
  }

  const submitReset = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Inserisci la tua email.')
      return
    }

    setRequesting(true)
    const result = await onRequestReset(email)
    setRequesting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setMode('sent')
  }

  const backToLogin = () => {
    setMode('login')
    setError(null)
  }

  const title =
    mode === 'login'
      ? 'Accedi al piano'
      : mode === 'forgot'
        ? 'Recupera password'
        : 'Controlla la tua email'

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/15 dark:bg-indigo-600 dark:shadow-indigo-950/30">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              SmartPlanner
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pianificazione condivisa della stanza
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8 dark:border-slate-800/80 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-400">
            {mode === 'login' ? (
              <LockKeyhole className="h-3.5 w-3.5" />
            ) : (
              <KeyRound className="h-3.5 w-3.5" />
            )}
            {mode === 'login' ? 'Accesso riservato' : 'Recupero accesso'}
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            {title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {mode === 'login'
              ? 'Solo Grano e Pietro possono accedere. Usa l’email e la password create su Supabase.'
              : mode === 'forgot'
                ? 'Inserisci l’email del tuo account: riceverai un link per impostare una nuova password.'
                : 'Se l’indirizzo è registrato, riceverai un’email con il link per impostare una nuova password.'}
          </p>

          {notice && mode === 'login' ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-[11px] leading-5 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{notice}</span>
            </div>
          ) : null}

          {mode === 'sent' ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-2 rounded-xl bg-indigo-50 px-3 py-3 text-[11px] leading-5 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Controlla anche la cartella spam. Il link scade secondo le impostazioni di
                  Supabase e può essere usato una sola volta.
                </span>
              </div>
              <Button variant="secondary" className="w-full" onClick={backToLogin}>
                <ArrowLeft className="h-4 w-4" />
                Torna al login
              </Button>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={mode === 'login' ? submitLogin : submitReset}>
              <div>
                <label
                  htmlFor="login-email"
                  className="text-[11px] font-medium text-slate-600 dark:text-slate-400"
                >
                  Email
                </label>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nome@email.com"
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:ring-indigo-900"
                  />
                </div>
              </div>

              {mode === 'login' ? (
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="login-password"
                      className="text-[11px] font-medium text-slate-600 dark:text-slate-400"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot')
                        setError(null)
                      }}
                      className="text-[10px] font-medium text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      Password dimenticata?
                    </button>
                  </div>
                  <div className="relative mt-1.5">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="La tua password"
                      required
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:ring-indigo-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-[11px] leading-5 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={submitting || requesting}
              >
                {mode === 'login' ? (
                  submitting ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Accesso…
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      Accedi
                    </>
                  )
                ) : requesting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Invio…
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Invia link di reset
                  </>
                )}
              </Button>

              {mode === 'forgot' ? (
                <button
                  type="button"
                  onClick={backToLogin}
                  className="mx-auto flex items-center gap-1 text-[10px] font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Torna al login
                </button>
              ) : null}
            </form>
          )}

          {mode === 'login' ? (
            <p className="mt-5 text-center text-[10px] leading-4 text-slate-400 dark:text-slate-500">
              Se non hai ancora le credenziali, chiedi a Grano di creare il tuo account dalla
              dashboard Supabase.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
