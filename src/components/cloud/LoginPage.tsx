import { useState, type FormEvent } from 'react'
import {
  AlertCircle,
  CalendarDays,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  Mail,
} from 'lucide-react'
import { Button } from '../ui/Button'

export function LoginPage({
  onSignIn,
}: {
  onSignIn: (email: string, password: string) => Promise<{ error: string | null }>
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
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
            <LockKeyhole className="h-3.5 w-3.5" />
            Accesso riservato
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Accedi al piano
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Solo Grano e Pietro possono accedere. Usa l’email e la password create su Supabase.
          </p>

          <form className="mt-6 space-y-4" onSubmit={submit}>
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

            <div>
              <label
                htmlFor="login-password"
                className="text-[11px] font-medium text-slate-600 dark:text-slate-400"
              >
                Password
              </label>
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
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error ? (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-[11px] leading-5 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Accesso…
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Accedi
                </>
              )}
            </Button>
          </form>

          <p className="mt-5 text-center text-[10px] leading-4 text-slate-400 dark:text-slate-500">
            Se non hai ancora le credenziali, chiedi a Grano di creare il tuo account dalla
            dashboard Supabase.
          </p>
        </div>
      </div>
    </div>
  )
}
