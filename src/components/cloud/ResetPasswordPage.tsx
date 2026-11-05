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
  ShieldCheck,
} from 'lucide-react'
import type { CloudController } from '../../hooks/usePlanner'
import { Button } from '../ui/Button'

export function ResetPasswordPage({ cloud }: { cloud: CloudController }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const linkError =
    cloud.recoveryError ??
    (!cloud.authLoading && !cloud.sessionEmail
      ? 'Il link di recupero non è valido o è scaduto. Richiedine uno nuovo dalla schermata di login.'
      : null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!password || !confirmPassword) {
      setError('Compila tutti i campi.')
      return
    }
    if (password.length < 8) {
      setError('La nuova password deve avere almeno 8 caratteri.')
      return
    }
    if (password !== confirmPassword) {
      setError('Le due password non coincidono.')
      return
    }

    setSubmitting(true)
    const result = await cloud.completeRecovery(password)
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setSuccess(true)
  }

  const cancel = () => {
    void cloud.cancelRecovery()
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
            <KeyRound className="h-3.5 w-3.5" />
            Recupero accesso
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Imposta nuova password
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {cloud.sessionEmail
              ? `Account: ${cloud.sessionEmail}`
              : 'Inserisci una nuova password per il tuo account.'}
          </p>

          {cloud.authLoading && !linkError ? (
            <div className="mt-6 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-[11px] text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <LoaderCircle className="h-4 w-4 animate-spin text-indigo-500" />
              Verifica del link di recupero…
            </div>
          ) : linkError ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-3 text-[11px] leading-5 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{linkError}</span>
              </div>
              <Button variant="secondary" className="w-full" onClick={cancel}>
                <ArrowLeft className="h-4 w-4" />
                Torna al login
              </Button>
            </div>
          ) : success ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-3 text-[11px] leading-5 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                Password aggiornata. Ora puoi accedere con la nuova password.
              </div>
              <Button variant="secondary" className="w-full" onClick={cancel}>
                <ArrowLeft className="h-4 w-4" />
                Vai al login
              </Button>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={submit}>
              <div>
                <label
                  htmlFor="recovery-password"
                  className="text-[11px] font-medium text-slate-600 dark:text-slate-400"
                >
                  Nuova password
                </label>
                <div className="relative mt-1.5">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    id="recovery-password"
                    type={showPasswords ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Almeno 8 caratteri"
                    required
                    disabled={cloud.offline || submitting}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:ring-indigo-900"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="recovery-confirm"
                  className="text-[11px] font-medium text-slate-600 dark:text-slate-400"
                >
                  Conferma nuova password
                </label>
                <div className="relative mt-1.5">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    id="recovery-confirm"
                    type={showPasswords ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Ripeti la nuova password"
                    required
                    disabled={cloud.offline || submitting}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:ring-indigo-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((value) => !value)}
                    aria-label={showPasswords ? 'Nascondi password' : 'Mostra password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                  >
                    {showPasswords ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error || cloud.recoveryError ? (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-[11px] leading-5 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error ?? cloud.recoveryError}</span>
                </div>
              ) : null}

              {cloud.offline ? (
                <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-[11px] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  Serve una connessione per aggiornare la password.
                </div>
              ) : null}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={cloud.offline || submitting}
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Aggiornamento…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Imposta nuova password
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={cancel}
                className="mx-auto flex items-center gap-1 text-[10px] font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <ArrowLeft className="h-3 w-3" />
                Annulla e torna al login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
