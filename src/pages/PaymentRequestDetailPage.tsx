import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ApiError,
  approvePaymentRequest,
  getPaymentRequest,
  rejectPaymentRequest,
} from '../lib/api'
import { formatDate, formatInr, formatInt } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import type { AdminPaymentRequest } from '../types'

export function PaymentRequestDetailPage() {
  const { requestId = '' } = useParams()
  const { apiBase, adminAuth } = useAuth()

  const [row, setRow] = useState<AdminPaymentRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [tokensToAdd, setTokensToAdd] = useState('')
  const [approveNote, setApproveNote] = useState('')
  const [reactivate, setReactivate] = useState(true)
  const [rejectNote, setRejectNote] = useState('')

  const load = useCallback(async () => {
    if (!requestId) return
    setLoading(true)
    setError(null)
    try {
      const r = await getPaymentRequest(apiBase, adminAuth, requestId)
      setRow(r)
      setTokensToAdd('')
      setApproveNote('')
      setReactivate(true)
      setRejectNote('')
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setError('Payment request not found.')
      } else if (e instanceof ApiError && e.status === 401) {
        setError('Session expired or invalid credentials.')
      } else if (e instanceof ApiError) {
        setError(e.message)
      } else {
        setError('Failed to load payment request.')
      }
      setRow(null)
    } finally {
      setLoading(false)
    }
  }, [apiBase, adminAuth, requestId])

  useEffect(() => {
    void load()
  }, [load])

  async function onApprove(e: React.FormEvent) {
    e.preventDefault()
    if (!requestId || !row) return
    const n = Number.parseInt(tokensToAdd, 10)
    if (!Number.isFinite(n) || n < 1) {
      setError('Enter a whole number of tokens to add (at least 1).')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const updated = await approvePaymentRequest(apiBase, adminAuth, requestId, {
        tokensToAdd: n,
        adminNote: approveNote.trim() || undefined,
        reactivate,
      })
      setRow(updated)
      setTokensToAdd('')
      setApproveNote('')
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Could not approve request.')
    } finally {
      setBusy(false)
    }
  }

  async function onReject(e: React.FormEvent) {
    e.preventDefault()
    if (!requestId || !row) return
    if (
      !window.confirm(
        'Reject this payment request? The user will see your note if you provide one.',
      )
    ) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const updated = await rejectPaymentRequest(apiBase, adminAuth, requestId, {
        adminNote: rejectNote.trim() || undefined,
      })
      setRow(updated)
      setRejectNote('')
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Could not reject request.')
    } finally {
      setBusy(false)
    }
  }

  if (loading && !row) {
    return (
      <div className="mx-auto max-w-3xl text-center text-zinc-500">Loading payment request…</div>
    )
  }

  if (!row && error) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link
          to="/payment-requests"
          className="text-sm font-medium text-violet-400 hover:text-violet-300"
        >
          ← Payment requests
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

  if (!row) return null

  const u = row.user

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/payment-requests"
        className="text-sm font-medium text-violet-400 hover:text-violet-300"
      >
        ← Payment requests
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">UTR payment request</h1>
      <p className="mt-1 font-mono text-xs text-zinc-500">{row.id}</p>

      {error ? (
        <div
          className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">User</h2>
          <p className="mt-2 font-medium text-white">{u.email}</p>
          {u.name ? <p className="text-sm text-zinc-400">{u.name}</p> : null}
          <Link
            to={`/users/${u.id}`}
            className="mt-3 inline-block text-sm font-medium text-violet-400 hover:text-violet-300"
          >
            Open user →
          </Link>
          <dl className="mt-4 space-y-2 text-xs text-zinc-400">
            <div className="flex justify-between gap-2">
              <dt>Tokens used</dt>
              <dd className="font-mono text-zinc-300">{formatInt(u.tokensUsed)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Token limit</dt>
              <dd className="font-mono text-zinc-300">{formatInt(u.tokenLimit)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Remaining</dt>
              <dd className="font-mono text-zinc-300">{formatInt(u.tokensRemaining)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Account</dt>
              <dd className={u.isActive ? 'text-emerald-400' : 'text-zinc-500'}>
                {u.isActive ? 'Active' : 'Inactive'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Request</h2>
          <p className="mt-2 text-lg font-semibold text-white">{formatInr(row.amountPaise)}</p>
          <p className="mt-1 font-mono text-sm text-zinc-300">UTR: {row.utr}</p>
          <p className="mt-3 text-xs text-zinc-500">
            Status:{' '}
            <span className="font-medium text-zinc-300">{row.status}</span>
          </p>
          {row.userNote ? (
            <p className="mt-2 text-sm text-zinc-400">
              <span className="text-zinc-500">User note: </span>
              {row.userNote}
            </p>
          ) : null}
          {row.adminNote ? (
            <p className="mt-2 text-sm text-amber-200/90">
              <span className="text-zinc-500">Admin note: </span>
              {row.adminNote}
            </p>
          ) : null}
          {row.reviewedAt ? (
            <p className="mt-2 text-xs text-zinc-500">Reviewed {formatDate(row.reviewedAt)}</p>
          ) : null}
          {row.payment ? (
            <p className="mt-2 text-xs text-zinc-500">
              Linked payment: {formatInr(row.payment.amountPaise)} → +{formatInt(row.payment.tokensAdded)}{' '}
              tokens
            </p>
          ) : null}
          <p className="mt-3 text-xs text-zinc-600">
            Created {formatDate(row.createdAt)} · Updated {formatDate(row.updatedAt)}
          </p>
        </div>
      </div>

      {row.status === 'PENDING' ? (
        <>
          <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <h2 className="text-sm font-semibold text-emerald-100">Approve</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Grants tokens (new limit = max(current limit, used) + tokens to add), records payment,
              and marks this request approved.
            </p>
            <form onSubmit={onApprove} className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-zinc-300">
                Tokens to add
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={tokensToAdd}
                  onChange={(e) => setTokensToAdd(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-white outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/25"
                  placeholder="e.g. 50000"
                />
              </label>
              <label className="block text-sm font-medium text-zinc-300">
                Admin note (optional)
                <textarea
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                  maxLength={300}
                  rows={2}
                  className="mt-1.5 w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/25"
                />
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={reactivate}
                  onChange={(e) => setReactivate(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-violet-600"
                />
                Reactivate user if inactive (default on server)
              </label>
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {busy ? 'Working…' : 'Approve & grant tokens'}
              </button>
            </form>
          </div>

          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
            <h2 className="text-sm font-semibold text-red-200">Reject</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Optional note is stored and may be visible to the user on their request view.
            </p>
            <form onSubmit={onReject} className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-zinc-300">
                Reason (optional)
                <textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  maxLength={300}
                  rows={2}
                  className="mt-1.5 w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/25"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl border border-red-500/50 bg-red-500/15 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-500/25 disabled:opacity-50"
              >
                {busy ? 'Working…' : 'Reject request'}
              </button>
            </form>
          </div>
        </>
      ) : (
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 text-sm text-zinc-400">
          This request is {row.status}. No further admin actions apply.
        </div>
      )}
    </div>
  )
}
