import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '../components/Modal'
import { ApiError, createDeepgramKey, listDeepgramKeys } from '../lib/api'
import { formatDate } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import type { DeepgramKeyListItem } from '../types'

export function DeepgramKeysPage() {
  const { apiBase, adminAuth } = useAuth()
  const [includeInactive, setIncludeInactive] = useState(true)
  const [items, setItems] = useState<DeepgramKeyListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createLabel, setCreateLabel] = useState('')
  const [createApiKey, setCreateApiKey] = useState('')
  const [createNotes, setCreateNotes] = useState('')
  const [createActive, setCreateActive] = useState(true)
  const [createDefault, setCreateDefault] = useState(false)
  const [createBusy, setCreateBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await listDeepgramKeys(apiBase, adminAuth, { includeInactive })
      setItems(list)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setError('Session expired or invalid credentials.')
      } else if (e instanceof ApiError) {
        setError(e.message)
      } else {
        setError('Failed to load Deepgram keys.')
      }
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [apiBase, adminAuth, includeInactive])

  useEffect(() => {
    void load()
  }, [load])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateBusy(true)
    setError(null)
    try {
      await createDeepgramKey(apiBase, adminAuth, {
        label: createLabel.trim(),
        apiKey: createApiKey.trim(),
        isActive: createActive,
        isDefault: createDefault,
        notes: createNotes.trim() || undefined,
      })
      setCreateOpen(false)
      setCreateLabel('')
      setCreateApiKey('')
      setCreateNotes('')
      setCreateActive(true)
      setCreateDefault(false)
      await load()
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Could not create key.')
    } finally {
      setCreateBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Deepgram API keys</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage stored keys for the desktop app via{' '}
            <span className="font-mono text-zinc-500">GET /api/client-config</span> (user JWT). List
            shows masked values only. An empty Deepgram list is valid for the client.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-violet-600"
            />
            Show inactive
          </label>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/25 hover:bg-violet-500"
          >
            Add key
          </button>
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

      <div className="mt-6 space-y-3 rounded-2xl border border-zinc-700/80 bg-zinc-900/50 p-4 text-sm text-zinc-300">
        <p>
          <span className="font-medium text-zinc-200">Default:</span> only one active key should be
          primary; the backend demotes the previous default when you set a new one.
        </p>
        <p>
          <span className="font-medium text-zinc-200">Inactive:</span> inactive rows remain in the
          database. Client config may still include them for signed-in users — disabling does not by
          itself hide the secret from the desktop app.
        </p>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Flags</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">Updated</th>
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
                    No Deepgram keys yet. Add one to get started.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-800/40">
                    <td className="px-4 py-3">
                      <Link
                        to={`/deepgram-keys/${row.id}`}
                        className="font-medium text-violet-300 hover:text-violet-200"
                      >
                        {row.label}
                      </Link>
                      <div className="mt-0.5 font-mono text-[10px] text-zinc-600">{row.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-zinc-300">{row.apiKeyMasked}</span>
                      <div className="text-[10px] text-zinc-600">preview: {row.apiKeyPreview}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {row.isDefault ? (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-200 ring-1 ring-amber-500/30">
                            Default
                          </span>
                        ) : null}
                        {row.isActive ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-zinc-700/50 px-2 py-0.5 text-[10px] font-medium text-zinc-400 ring-1 ring-zinc-600">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-xs text-zinc-500">
                      {row.notes || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                      {formatDate(row.updatedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={createOpen}
        title="Add Deepgram API key"
        onClose={() => {
          if (!createBusy) setCreateOpen(false)
        }}
        footer={
          <>
            <button
              type="button"
              disabled={createBusy}
              onClick={() => setCreateOpen(false)}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="deepgram-create-form"
              disabled={createBusy}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {createBusy ? 'Saving…' : 'Create'}
            </button>
          </>
        }
      >
        <form id="deepgram-create-form" onSubmit={onCreate} className="space-y-4">
          <p className="text-xs text-zinc-500">
            The full key is returned once in the response. After that, open the key detail page to
            view or rotate it.
          </p>
          <label className="block text-sm font-medium text-zinc-300">
            Label
            <input
              value={createLabel}
              onChange={(e) => setCreateLabel(e.target.value)}
              maxLength={120}
              required
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/25"
              placeholder="Production primary"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-300">
            API key
            <input
              type="password"
              value={createApiKey}
              onChange={(e) => setCreateApiKey(e.target.value)}
              required
              minLength={10}
              maxLength={500}
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-white outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/25"
              placeholder="Deepgram project key"
              autoComplete="off"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-300">
            Notes (optional)
            <textarea
              value={createNotes}
              onChange={(e) => setCreateNotes(e.target.value)}
              maxLength={500}
              rows={2}
              className="mt-1.5 w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/25"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={createActive}
              onChange={(e) => setCreateActive(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-violet-600"
            />
            Active
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={createDefault}
              onChange={(e) => setCreateDefault(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-violet-600"
            />
            Set as default (demotes previous default)
          </label>
        </form>
      </Modal>
    </div>
  )
}
