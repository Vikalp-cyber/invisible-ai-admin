import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, listAppReleases, uploadAppRelease } from '../lib/api'
import { formatBytes, formatDate } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import type { WindowsAppReleaseMeta } from '../types'

/** Mirrors backend `UploadWindowsReleaseDto.version` */
const SEMVER_RE = /^\d+\.\d+\.\d+([.-][a-zA-Z0-9]+)*$/

const DEFAULT_MAX_BYTES = 150 * 1024 * 1024
const NOTES_MAX = 20_000

function shortHash(hex: string, head = 12, tail = 8): string {
  const t = hex.trim()
  if (t.length <= head + tail + 3) return t
  return `${t.slice(0, head)}…${t.slice(-tail)}`
}

export function AppReleasesPage() {
  const { apiBase, adminAuth } = useAuth()
  const [items, setItems] = useState<WindowsAppReleaseMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [version, setVersion] = useState('')
  const [releaseNotes, setReleaseNotes] = useState('')
  const [uploadBusy, setUploadBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await listAppReleases(apiBase, adminAuth)
      setItems(list)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setError('Session expired or invalid credentials.')
      } else if (e instanceof ApiError) {
        setError(e.message)
      } else {
        setError('Failed to load releases.')
      }
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [apiBase, adminAuth])

  useEffect(() => {
    void load()
  }, [load])

  async function onUpload(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!file) {
      setError('Choose an .exe file.')
      return
    }
    const name = file.name.toLowerCase()
    if (!name.endsWith('.exe')) {
      setError('Only filenames ending in .exe are accepted.')
      return
    }
    const v = version.trim()
    if (!SEMVER_RE.test(v)) {
      setError('Version must look like semver (e.g. 1.4.0 or 1.2.3-beta1).')
      return
    }
    if (file.size > DEFAULT_MAX_BYTES) {
      setError(
        `File is larger than the default server limit (${formatBytes(DEFAULT_MAX_BYTES)}). Raise WINDOWS_RELEASE_MAX_BYTES on the host if appropriate.`,
      )
      return
    }

    const fd = new FormData()
    fd.set('file', file)
    fd.set('version', v)
    if (releaseNotes.trim()) fd.set('releaseNotes', releaseNotes.trim())

    setUploadBusy(true)
    try {
      await uploadAppRelease(apiBase, adminAuth, fd)
      setFile(null)
      setVersion('')
      setReleaseNotes('')
      const input = document.getElementById('win-release-file') as HTMLInputElement | null
      if (input) input.value = ''
      await load()
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Upload failed.')
    } finally {
      setUploadBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Windows releases</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Upload versioned installers (<span className="font-mono">multipart/form-data</span>, field{' '}
          <span className="font-mono">file</span>). The desktop app downloads via public update routes
          — this page only manages metadata and stored binaries in the database.
        </p>
      </div>

      {error ? (
        <div
          className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-semibold text-white">Upload new release</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Server default max size {formatBytes(DEFAULT_MAX_BYTES)} (
          <span className="font-mono">WINDOWS_RELEASE_MAX_BYTES</span>). Duplicate semver returns 409.
        </p>
        <form onSubmit={onUpload} className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-zinc-300">
            Installer (.exe)
            <input
              id="win-release-file"
              type="file"
              accept=".exe,application/x-msdownload"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1.5 block w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-violet-500"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-300">
            Version (semver)
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.4.0"
              required
              className="mt-1.5 w-full max-w-xs rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-white outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/25"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-300">
            Release notes (optional)
            <textarea
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              maxLength={NOTES_MAX}
              rows={4}
              placeholder="Plain text or markdown…"
              className="mt-1.5 w-full resize-y rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/25"
            />
            <span className="mt-1 block text-xs text-zinc-600">
              {releaseNotes.length.toLocaleString()} / {NOTES_MAX.toLocaleString()}
            </span>
          </label>
          <button
            type="submit"
            disabled={uploadBusy}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/25 hover:bg-violet-500 disabled:opacity-50"
          >
            {uploadBusy ? 'Uploading…' : 'Upload release'}
          </button>
        </form>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
        <div className="border-b border-zinc-800 bg-zinc-900/80 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-200">All releases</h2>
          <p className="text-xs text-zinc-500">Newest first. Metadata only — no binary in this list.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">SHA-256</th>
                <th className="px-4 py-3">Created</th>
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
                    No releases yet. Upload an .exe above.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-800/40">
                    <td className="px-4 py-3">
                      <Link
                        to={`/app-releases/${encodeURIComponent(row.version)}`}
                        className="font-mono font-medium text-violet-300 hover:text-violet-200"
                      >
                        {row.version}
                      </Link>
                      <div className="mt-0.5 font-mono text-[10px] text-zinc-600">{row.id}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{row.fileName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                      {formatBytes(row.fileSize)}
                    </td>
                    <td className="max-w-[200px] px-4 py-3">
                      <span className="font-mono text-[11px] text-zinc-500" title={row.sha256}>
                        {shortHash(row.sha256)}
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
    </div>
  )
}
