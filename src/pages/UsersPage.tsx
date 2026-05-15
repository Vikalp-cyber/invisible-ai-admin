import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, listUsers } from '../lib/api'
import { formatDate, formatInr, formatInt } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import type { AdminUser } from '../types'

const PAGE_SIZE = 25

export function UsersPage() {
  const { apiBase, adminAuth } = useAuth()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [skip, setSkip] = useState(0)
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setSkip(0)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listUsers(apiBase, adminAuth, {
        skip,
        take: PAGE_SIZE,
        search: search || undefined,
      })
      setTotal(res.total)
      setItems(res.items)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setError('Session expired or invalid key. Sign in again.')
      } else if (e instanceof ApiError) {
        setError(e.message)
      } else {
        setError('Failed to load users.')
      }
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [apiBase, adminAuth, skip, search])

  useEffect(() => {
    void load()
  }, [load])

  const page = Math.floor(skip / PAGE_SIZE) + 1
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Users</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Search by email or name. Paginated list with token and billing snapshot.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-80">
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Search
          </label>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Email or name…"
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none ring-violet-500/0 transition focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/25"
          />
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
                <th className="px-4 py-3">Tokens</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Joined</th>
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
                    No users match this search.
                  </td>
                </tr>
              ) : (
                items.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-800/40">
                    <td className="px-4 py-3">
                      <Link
                        to={`/users/${u.id}`}
                        className="group block min-w-[200px]"
                      >
                        <div className="font-medium text-violet-300 group-hover:text-violet-200">
                          {u.email}
                        </div>
                        {u.name ? (
                          <div className="text-xs text-zinc-500">{u.name}</div>
                        ) : null}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      <span className="font-mono text-xs">
                        {formatInt(u.tokensUsed)} / {formatInt(u.tokenLimit)}
                      </span>
                      <div className="text-xs text-zinc-500">
                        {formatInt(u.tokensRemaining)} left
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-700/50 px-2.5 py-0.5 text-xs font-medium text-zinc-300 ring-1 ring-zinc-600">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{formatInr(u.totalPaidPaise)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                      {formatDate(u.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-500">
            Showing{' '}
            <span className="font-medium text-zinc-300">
              {total === 0 ? 0 : skip + 1}–{Math.min(skip + PAGE_SIZE, total)}
            </span>{' '}
            of <span className="font-medium text-zinc-300">{formatInt(total)}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={skip === 0 || loading}
              onClick={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-zinc-500">
              Page {page} / {pageCount}
            </span>
            <button
              type="button"
              disabled={skip + PAGE_SIZE >= total || loading}
              onClick={() => setSkip((s) => s + PAGE_SIZE)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
