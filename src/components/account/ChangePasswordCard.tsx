import { useState, type FormEvent } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react'
import type { CloudController } from '../../hooks/usePlanner'
import { changePassword } from '../../lib/cloud'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

type ChangePasswordHandler = (
  currentPassword: string,
  newPassword: string,
) => Promise<{ error: string | null }>

export function ChangePasswordCard({
  cloud,
  onChangePassword = changePassword,
}: {
  cloud: CloudController
  onChangePassword?: ChangePasswordHandler
}) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const disabled = cloud.offline || submitting

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Compila tutti i campi.')
      return
    }
    if (newPassword.length < 8) {
      setError('La nuova password deve avere almeno 8 caratteri.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Le due nuove password non coincidono.')
      return
    }
    if (newPassword === currentPassword) {
      setError('La nuova password deve essere diversa da quella attuale.')
      return
    }

    setSubmitting(true)
    const result = await onChangePassword(currentPassword, newPassword)
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setSuccess('Password aggiornata. La sessione attuale resta attiva.')
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Sicurezza
              </h3>
              <Badge variant="info">
                <KeyRound className="h-3 w-3" />
                Password
              </Badge>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
              Cambia la password del tuo account. La password attuale serve per confermare
              l'operazione.
            </p>
          </div>
        </div>
      </div>

      {!cloud.active ? (
        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
          Il cambio password è disponibile solo in modalità cloud.
        </div>
      ) : (
        <form className="mt-4 space-y-3" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-3">
            <PasswordField
              id="password-current"
              label="Password attuale"
              value={currentPassword}
              onChange={setCurrentPassword}
              visible={showPasswords}
              autoComplete="current-password"
              disabled={disabled}
            />
            <PasswordField
              id="password-new"
              label="Nuova password"
              value={newPassword}
              onChange={setNewPassword}
              visible={showPasswords}
              autoComplete="new-password"
              disabled={disabled}
            />
            <PasswordField
              id="password-confirm"
              label="Conferma nuova password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              visible={showPasswords}
              autoComplete="new-password"
              disabled={disabled}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setShowPasswords((value) => !value)}
              className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {showPasswords ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              {showPasswords ? 'Nascondi password' : 'Mostra password'}
            </button>

            <div className="flex items-center gap-2">
              {cloud.offline ? (
                <span className="text-[10px] text-amber-600 dark:text-amber-400">
                  Richiede una connessione.
                </span>
              ) : null}
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={disabled}
                className="w-full sm:w-auto"
              >
                {submitting ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <KeyRound className="h-3.5 w-3.5" />
                )}
                Aggiorna password
              </Button>
            </div>
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-[11px] leading-5 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {success ? (
            <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-[11px] leading-5 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          ) : null}
        </form>
      )}

      <div className="mt-3 flex items-start gap-1.5 text-[10px] leading-4 text-slate-400 dark:text-slate-500">
        <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
        La password è gestita da Supabase e non viene mai salvata in chiaro da SmartPlanner.
      </div>
    </Card>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  autoComplete,
  disabled,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  visible: boolean
  autoComplete: string
  disabled: boolean
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-[11px] font-medium text-slate-600 dark:text-slate-400"
      >
        {label}
      </label>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        disabled={disabled}
        className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:placeholder:text-slate-500 dark:focus:ring-indigo-900"
      />
    </div>
  )
}
