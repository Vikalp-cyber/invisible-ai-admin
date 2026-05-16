import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError, listPaymentRequests } from '../lib/api'
import { formatDate, formatInr, formatInt } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import type { AdminPaymentRequest, PaymentRequestStatus } from '../types'

const PAGE_SIZE = 25

const STATUS_OPTIONS: { value: '' | PaymentRequestStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
]

function statusBadge(status: PaymentRequestStatus) {
  if (status === 'PENDING') {
    return 'bg-amber-500/15 text-amber-200 ring-amber-500/30'
  }
  if (status === 'APPROVED') {
    return 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/30'
  }
  return 'bg-zinc-600/30 text-zinc-300 ring-zinc-500/30'
}

export function PaymentRequestsPage() {
  const { apiBase, adminAuth } = useAuth()
  const [searchParams] = useSearchParams()
  const initialSearch = searchParams.get('search')?.trim() ?? ''

  const statusFromUrl = searchParams.get('status')
  const validStatuses: PaymentRequestStatus[] = ['PENDING', 'APPROVED', 'REJECTED']
  const initialStatus: '' | PaymentRequestStatus =
    statusFromUrl === null
      ? 'PENDING'
      : statusFromUrl === ''
        ? ''
        : validStatuses.includes(statusFromUrl as PaymentRequestStatus)
          ? (statusFromUrl as PaymentRequestStatus)
          : 'PENDING'

  const [statusFilter, setStatusFilter] = useState<'' | PaymentRequestStatus>(initialStatus)
  const [searchInput, setSearchInput] = useState(initialSearch)
  const [search, setSearch] = useState(initialSearch)
  const [skip, setSkip] = useState(0)
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState<AdminPaymentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setSkip(0)
  }, [search, statusFilter])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listPaymentRequests(apiBase, adminAuth, {
        skip,
        take: PAGE_SIZE,
        search: search || undefined,
        status: statusFilter || undefined,
      })
      setTotal(res.total)
      setItems(res.items)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setError('Session expired or invalid key. Sign in again.')
      } else if (e instanceof ApiError) {
        setError(e.message)
      } else {
        setError('Failed to load payment requests.')
      }
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [apiBase, adminAuth, skip, search, statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  const page = Math.floor(skip / PAGE_SIZE) + 1
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Payment requests</h1>
          <p className="mt-1 text-sm text-zinc-400">
            UTR submissions from users. Approve to grant tokens and record payment, or reject with a
            note.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
          <label className="flex w-full flex-col gap-1 sm:w-44">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Status</span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as '' | PaymentRequestStatus)
              }
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/25"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1 sm:w-72">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Search</span>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Email, name, or UTR…"
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none ring-violet-500/0 transition focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/25"
            />
          </label>
        </div>
      </div>

      {error ? (
        <div
          className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">UTR</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">
                    No payment requests match these filters.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-800/40">
                    <td className="px-4 py-3">
                      <Link
                        to={`/payment-requests/${row.id}`}
                        className="font-medium text-violet-300 hover:text-violet-200"
                      >
                        {row.user.email}
                      </Link>
                      {row.user.name ? (
                        <div className="text-xs text-zinc-500">{row.user.name}</div>
                      ) : null}
                      <div className="mt-0.5 font-mono text-[10px] text-zinc-600">{row.id}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-200">
                      {formatInr(row.amountPaise)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-zinc-300">{row.utr}</span>
                      {row.userNote ? (
                        <div className="mt-0.5 max-w-[200px] truncate text-[10px] text-zinc-500">
                          {row.userNote}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${statusBadge(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                      {formatDate(row.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && total > 0 ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-500">
            Showing {formatInt(skip + 1)}–{formatInt(Math.min(skip + PAGE_SIZE, total))} of{' '}
            {formatInt(total)}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={skip === 0}
              onClick={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="self-center px-2 text-xs text-zinc-500">
              Page {page} / {pageCount}
            </span>
            <button
              type="button"
              disabled={skip + PAGE_SIZE >= total}
              onClick={() => setSkip((s) => s + PAGE_SIZE)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
