import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Modal } from '../components/Modal'
import {
  ApiError,
  getUser,
  patchTokenLimit,
  patchUserStatus,
  recordPayment,
  resetUsage,
} from '../lib/api'
import { formatDate, formatInr, formatInt } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import type { AdminUserDetail } from '../types'

export function UserDetailPage() {
  const { userId = '' } = useParams()
  const { apiBase, adminAuth } = useAuth()

  const [user, setUser] = useState<AdminUserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [payOpen, setPayOpen] = useState(false)
  const [limitOpen, setLimitOpen] = useState(false)

  const [amountRupees, setAmountRupees] = useState('100')
  const [tokensToAdd, setTokensToAdd] = useState('50000')
  const [note, setNote] = useState('')
  const [reactivate, setReactivate] = useState(true)

  const [tokenLimitInput, setTokenLimitInput] = useState('')

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const u = await getUser(apiBase, adminAuth, userId)
      setUser(u)
      setTokenLimitInput(String(u.tokenLimit))
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setError('User not found.')
      } else if (e instanceof ApiError && e.status === 401) {
        setError('Session expired or invalid key.')
      } else if (e instanceof ApiError) {
        setError(e.message)
      } else {
        setError('Failed to load user.')
      }
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [apiBase, adminAuth, userId])

  useEffect(() => {
    void load()
  }, [load])

  async function onRecordPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    const rupees = Number(amountRupees)
    const tokens = Number(tokensToAdd)
    const amountPaise = Math.round(rupees * 100)
    if (!Number.isFinite(rupees) || amountPaise < 1) {
      setError('Enter a valid amount in rupees (minimum ₹0.01).')
      return
    }
    if (!Number.isFinite(tokens) || tokens < 1 || !Number.isInteger(tokens)) {
      setError('Tokens to add must be a whole number ≥ 1.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await recordPayment(apiBase, adminAuth, userId, {
        amountPaise,
        tokensToAdd: tokens,
        note: note.trim() || undefined,
        reactivate,
      })
      await refreshUser()
      setPayOpen(false)
      setNote('')
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Could not record payment.')
    } finally {
      setBusy(false)
    }
  }

  async function onSetLimit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    const lim = Number(tokenLimitInput)
    if (!Number.isFinite(lim) || lim < 0 || !Number.isInteger(lim)) {
      setError('Token limit must be a non-negative integer.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await patchTokenLimit(apiBase, adminAuth, userId, lim)
      await refreshUser()
      setLimitOpen(false)
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Could not update limit.')
    } finally {
      setBusy(false)
    }
  }

  async function refreshUser() {
    if (!userId) return
    const full = await getUser(apiBase, adminAuth, userId)
    setUser(full)
    setTokenLimitInput(String(full.tokenLimit))
  }

  async function onToggleActive(next: boolean) {
    if (!userId) return
    setBusy(true)
    setError(null)
    try {
      await patchUserStatus(apiBase, adminAuth, userId, next)
      await refreshUser()
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Could not update status.')
    } finally {
      setBusy(false)
    }
  }

  async function onResetUsage() {
    if (!userId) return
    if (
      !window.confirm(
        'Reset tokens used to 0 and re-activate this user? Token limit and payment history stay the same.',
      )
    ) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      await resetUsage(apiBase, adminAuth, userId)
      await refreshUser()
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Could not reset usage.')
    } finally {
      setBusy(false)
    }
  }

  if (loading && !user) {
    return (
      <div className="mx-auto max-w-5xl text-center text-zinc-500">Loading user…</div>
    )
  }

  if (!user && error) {
    return (
      <div className="mx-auto max-w-5xl">
        <Link
          to="/users"
          className="text-sm font-medium text-violet-400 hover:text-violet-300"
        >
          ← Back to users
        </Link>
        <div
          className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to="/users"
            className="text-sm font-medium text-violet-400 hover:text-violet-300"
          >
            ← Users
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            {user.email}
          </h1>
          {user.name ? <p className="text-sm text-zinc-400">{user.name}</p> : null}
          <p className="mt-1 font-mono text-xs text-zinc-500">{user.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => setPayOpen(true)}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/25 hover:bg-violet-500 disabled:opacity-50"
          >
            Record payment
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setLimitOpen(true)}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
          >
            Set token limit
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onResetUsage}
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/15 disabled:opacity-50"
          >
            Reset usage
          </button>
        </div>
      </div>

      {error ? (
        <div
          className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-zinc-700/80 bg-zinc-900/50 p-4 text-sm text-zinc-300">
        <p>
          <span className="font-medium text-zinc-200">Manual payment</span> (
          <span className="font-mono text-xs">POST /admin/users/:id/payment</span>) — for bank/UPI
          you recorded yourself.{' '}
          <span className="font-medium text-zinc-200">UTR requests</span> (
          <span className="font-mono text-xs">/admin/payment-requests</span>) — user-submitted
          offline payments; approve or reject on the payment-requests queue.
        </p>
        <Link
          to={`/payment-requests?search=${encodeURIComponent(user.email)}&status=PENDING`}
          className="mt-2 inline-block text-sm font-medium text-violet-400 hover:text-violet-300"
        >
          View pending UTR requests for this user →
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Tokens
          </div>
          <div className="mt-2 font-mono text-lg text-white">
            {formatInt(user.tokensUsed)} / {formatInt(user.tokenLimit)}
          </div>
          <div className="text-xs text-zinc-500">{formatInt(user.tokensRemaining)} remaining</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Account
          </div>
          <div className="mt-2 flex items-center gap-2">
            {user.isActive ? (
              <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                Active
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-zinc-700/50 px-2.5 py-0.5 text-xs font-medium text-zinc-300 ring-1 ring-zinc-600">
                Inactive
              </span>
            )}
            <span className="text-xs text-zinc-500">{user.authProvider}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || user.isActive}
              onClick={() => onToggleActive(true)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-200 disabled:opacity-40"
            >
              Activate
            </button>
            <button
              type="button"
              disabled={busy || !user.isActive}
              onClick={() => onToggleActive(false)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-200 disabled:opacity-40"
            >
              Deactivate
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Total paid
          </div>
          <div className="mt-2 text-lg text-white">{formatInr(user.totalPaidPaise)}</div>
          <div className="text-xs text-zinc-500">
            API: {formatInt(user.totalPaidPaise)} paise
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Timestamps
          </div>
          <div className="mt-2 text-xs text-zinc-300">
            <div>Created {formatDate(user.createdAt)}</div>
            <div className="mt-1 text-zinc-500">Updated {formatDate(user.updatedAt)}</div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white">Payment history</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Immutable audit log — reconcile notes with your bank or UPI statement.
        </p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Tokens</th>
                  <th className="px-4 py-3">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {user.payments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                      No payments yet.
                    </td>
                  </tr>
                ) : (
                  user.payments.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-800/30">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-400">
                        {formatDate(p.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-zinc-200">{formatInr(p.amountPaise)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                        +{formatInt(p.tokensAdded)}
                      </td>
                      <td className="max-w-md px-4 py-3 text-xs text-zinc-500">
                        {p.note || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        open={payOpen}
        title="Record manual payment"
        onClose={() => {
          if (!busy) setPayOpen(false)
        }}
        footer={
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => setPayOpen(false)}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="payment-form"
              disabled={busy}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Grant tokens'}
            </button>
          </>
        }
      >
        <form id="payment-form" onSubmit={onRecordPayment} className="space-y-4">
          <p className="text-xs text-zinc-500">
            Creates a payment row, increases <span className="text-zinc-400">totalPaidPaise</span>,
            sets <span className="text-zinc-400">tokenLimit</span> to max(current limit, used) +
            tokens to add, and optionally re-activates the user.
          </p>
          <label className="block text-sm font-medium text-zinc-300">
            Amount (₹)
            <input
              type="number"
              inputMode="decimal"
              min={0.01}
              step={0.01}
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/25"
            />
            <span className="mt-1 block text-xs text-zinc-500">
              Sent to API as integer paise (₹1 = 100 paise).
            </span>
          </label>
          <label className="block text-sm font-medium text-zinc-300">
            Tokens to add
            <input
              type="number"
              min={1}
              step={1}
              value={tokensToAdd}
              onChange={(e) => setTokensToAdd(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-white outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/25"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-300">
            Note (optional)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="UPI / bank reference"
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/25"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={reactivate}
              onChange={(e) => setReactivate(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-violet-600 focus:ring-violet-500/40"
            />
            Reactivate user (default)
          </label>
        </form>
      </Modal>

      <Modal
        open={limitOpen}
        title="Set absolute token limit"
        onClose={() => {
          if (!busy) setLimitOpen(false)
        }}
        footer={
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => setLimitOpen(false)}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="limit-form"
              disabled={busy}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Overwrite limit'}
            </button>
          </>
        }
      >
        <form id="limit-form" onSubmit={onSetLimit} className="space-y-4">
          <p className="text-xs text-amber-200/90">
            This overwrites <span className="font-mono">tokenLimit</span> — it does not add to the
            current cap. If usage already exceeds the new limit, the next consume may return{' '}
            <span className="font-mono">TOKEN_LIMIT_EXCEEDED</span>.
          </p>
          <label className="block text-sm font-medium text-zinc-300">
            Token limit
            <input
              type="number"
              min={0}
              step={1}
              value={tokenLimitInput}
              onChange={(e) => setTokenLimitInput(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-white outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/25"
            />
          </label>
        </form>
      </Modal>
    </div>
  )
}
