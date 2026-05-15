import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError, NetworkError } from '../lib/api'
import { defaultApiBase } from '../lib/config'
import { useAuth } from '../context/AuthContext'

type SignInMode = 'email' | 'apiKey'

export function LoginPage() {
  const { login, loginWithApiKey, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/users'

  const [mode, setMode] = useState<SignInMode>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [apiBaseOverride, setApiBaseOverride] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  async function onSubmitEmail(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const override = showAdvanced && apiBaseOverride.trim() ? apiBaseOverride.trim() : undefined
      await login(email, password, override)
      navigate(from, { replace: true })
    } catch (err) {
      if (err instanceof NetworkError) {
        setError(err.message)
      } else if (err instanceof ApiError) {
        setError(err.message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Could not sign in.')
      }
    } finally {
      setBusy(false)
    }
  }

  async function onSubmitApiKey(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const override = showAdvanced && apiBaseOverride.trim() ? apiBaseOverride.trim() : undefined
      await loginWithApiKey(apiKey, override)
      navigate(from, { replace: true })
    } catch (err) {
      if (err instanceof NetworkError) {
        setError(err.message)
      } else if (err instanceof ApiError) {
        setError(err.message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Could not sign in.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(139, 92, 246, 0.35), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(34, 211, 238, 0.12), transparent)',
        }}
      />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/90">
            Internal
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Admin console
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            {mode === 'email'
              ? 'Sign in with the bootstrap admin email and password. The server returns a JWT; this app sends Authorization: Bearer on every request to routes under your API base (…/api).'
              : 'Use ADMIN_API_KEY only from a trusted environment (automation, server-side, or this tab). Do not embed it in a public SPA bundle or source repo — prefer a backend-for-frontend or env on a secure host.'}
          </p>
        </div>

        <div className="mb-4 flex rounded-xl border border-zinc-800 bg-zinc-900/50 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('email')
              setError(null)
            }}
            className={
              mode === 'email'
                ? 'flex-1 rounded-lg bg-zinc-800 py-2 text-sm font-semibold text-white shadow-sm'
                : 'flex-1 rounded-lg py-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-300'
            }
          >
            Email & password
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('apiKey')
              setError(null)
            }}
            className={
              mode === 'apiKey'
                ? 'flex-1 rounded-lg bg-zinc-800 py-2 text-sm font-semibold text-white shadow-sm'
                : 'flex-1 rounded-lg py-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-300'
            }
          >
            API key
          </button>
        </div>

        {mode === 'email' ? (
          <form
            onSubmit={onSubmitEmail}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-2xl shadow-black/50 backdrop-blur"
          >
            {error ? (
              <div
                className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <label className="block text-sm font-medium text-zinc-300">
              Email
              <input
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none ring-violet-500/0 transition placeholder:text-zinc-600 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/30"
                placeholder="admin@invisibleai.local"
                required
              />
            </label>

            <label className="mt-4 block text-sm font-medium text-zinc-300">
              Password
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none ring-violet-500/0 transition focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/30"
                placeholder="••••••••"
                required
              />
            </label>

            <AdvancedApiBase
              showAdvanced={showAdvanced}
              onToggle={() => setShowAdvanced((v) => !v)}
              apiBaseOverride={apiBaseOverride}
              onApiBaseOverrideChange={setApiBaseOverride}
            />

            <button
              type="submit"
              disabled={busy}
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : (
          <form
            onSubmit={onSubmitApiKey}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-2xl shadow-black/50 backdrop-blur"
          >
            {error ? (
              <div
                className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <label className="block text-sm font-medium text-zinc-300">
              Admin API key
              <input
                type="password"
                name="admin-api-key"
                autoComplete="off"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-mono text-sm text-white outline-none ring-violet-500/0 transition focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/30"
                placeholder="ADMIN_API_KEY value"
                required
              />
            </label>
            <p className="mt-2 text-xs text-zinc-500">
              Verified with <span className="font-mono text-zinc-400">GET /admin/me</span> (under your
              API base, e.g. <span className="font-mono text-zinc-400">/api/admin/me</span>) — expect{' '}
              <span className="font-mono text-zinc-400">kind: &quot;apiKey&quot;</span>.
            </p>

            <AdvancedApiBase
              showAdvanced={showAdvanced}
              onToggle={() => setShowAdvanced((v) => !v)}
              apiBaseOverride={apiBaseOverride}
              onApiBaseOverrideChange={setApiBaseOverride}
            />

            <button
              type="submit"
              disabled={busy}
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Verifying…' : 'Sign in with key'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-zinc-600">
          Session only — credentials stored in{' '}
          <span className="font-mono">sessionStorage</span> for this tab. JWT is never sent to
          third parties from this app.
        </p>
      </div>
    </div>
  )
}

function AdvancedApiBase({
  showAdvanced,
  onToggle,
  apiBaseOverride,
  onApiBaseOverrideChange,
}: {
  showAdvanced: boolean
  onToggle: () => void
  apiBaseOverride: string
  onApiBaseOverrideChange: (v: string) => void
}) {
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onToggle}
        className="text-xs font-medium text-zinc-500 hover:text-zinc-400"
      >
        {showAdvanced ? 'Hide' : 'Advanced'} — API base URL
      </button>
      {showAdvanced ? (
        <label className="mt-2 block text-sm font-medium text-zinc-300">
          <span className="text-xs font-normal text-zinc-500">
            Leave blank to use <span className="font-mono text-zinc-400">{defaultApiBase()}</span>{' '}
            from env. Must include the <span className="font-mono text-zinc-400">/api</span> prefix
            (e.g. <span className="font-mono text-zinc-400">https://host/api</span>).
          </span>
          <input
            type="url"
            value={apiBaseOverride}
            onChange={(e) => onApiBaseOverrideChange(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-mono text-sm text-white outline-none ring-violet-500/0 transition placeholder:text-zinc-600 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/30"
            placeholder="https://flowdesk-backend.luminoai.online/api"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
            If this page is on a different origin than the API, configure the backend{' '}
            <span className="font-mono text-zinc-400">CORS_ORIGINS</span> (comma-separated exact
            origins). Localhost ports are handled per deploy notes.
          </p>
        </label>
      ) : null}
    </div>
  )
}
