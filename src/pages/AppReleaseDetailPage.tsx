import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, deleteAppRelease, getAppRelease } from '../lib/api'
import { formatBytes, formatDate } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import type { WindowsAppReleaseMeta } from '../types'

export function AppReleaseDetailPage() {
  const { version: versionParam = '' } = useParams()
  const version = versionParam ? decodeURIComponent(versionParam) : ''
  const navigate = useNavigate()
  const { apiBase, adminAuth } = useAuth()

  const [row, setRow] = useState<WindowsAppReleaseMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!version) return
    setLoading(true)
    setError(null)
    try {
      const r = await getAppRelease(apiBase, adminAuth, version)
      setRow(r)
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setError('Release not found.')
      } else if (e instanceof ApiError && e.status === 401) {
        setError('Session expired or invalid credentials.')
      } else if (e instanceof ApiError) {
        setError(e.message)
      } else {
        setError('Failed to load release.')
      }
      setRow(null)
    } finally {
      setLoading(false)
    }
  }, [apiBase, adminAuth, version])

  useEffect(() => {
    void load()
  }, [load])

  async function onDelete() {
    if (!version) return
    if (
      !window.confirm(
        `Delete version ${version} and remove the installer binary from the database? This cannot be undone.`,
      )
    ) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      await deleteAppRelease(apiBase, adminAuth, version)
      navigate('/app-releases', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Could not delete release.')
    } finally {
      setBusy(false)
    }
  }

  if (loading && !row) {
    return (
      <div className="mx-auto max-w-3xl text-center text-zinc-500">Loading release…</div>
    )
  }

  if (!row && error) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link
          to="/app-releases"
          className="text-sm font-medium text-violet-400 hover:text-violet-300"
        >
          ← Windows releases
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

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/app-releases"
        className="text-sm font-medium text-violet-400 hover:text-violet-300"
      >
        ← Windows releases
      </Link>

      <h1 className="mt-4 font-mono text-2xl font-semibold tracking-tight text-white">{row.version}</h1>
      <p className="mt-1 font-mono text-xs text-zinc-500">{row.id}</p>

      {error ? (
        <div
          className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <dl className="mt-6 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">File name</dt>
          <dd className="mt-1 text-zinc-200">{row.fileName}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Size</dt>
          <dd className="mt-1 text-zinc-200">{formatBytes(row.fileSize)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">SHA-256</dt>
          <dd className="mt-1 break-all font-mono text-xs text-zinc-300">{row.sha256}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Timestamps</dt>
          <dd className="mt-1 text-xs text-zinc-400">
            Created {formatDate(row.createdAt)} · Updated {formatDate(row.updatedAt)}
          </dd>
        </div>
      </dl>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Release notes</h2>
        {row.releaseNotes ? (
          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words font-sans text-sm text-zinc-300">
            {row.releaseNotes}
          </pre>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">None</p>
        )}
      </div>

      <div className="mt-6">
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-500/15 disabled:opacity-50"
        >
          {busy ? 'Deleting…' : 'Delete this release'}
        </button>
      </div>
    </div>
  )
}
