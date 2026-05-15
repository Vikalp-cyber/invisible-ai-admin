import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, deleteGroqKey, getGroqKey, patchGroqKey } from '../lib/api'
import { formatDate } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import type { GroqKeyDetail, GroqKeyPatchBody } from '../types'

export function GroqKeyDetailPage() {
  const { keyId = '' } = useParams()
  const navigate = useNavigate()
  const { apiBase, adminAuth } = useAuth()

  const [key, setKey] = useState<GroqKeyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [label, setLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isDefault, setIsDefault] = useState(false)
  const [rotateKey, setRotateKey] = useState('')
  const [showSecret, setShowSecret] = useState(false)

  const load = useCallback(async () => {
    if (!keyId) return
    setLoading(true)
    setError(null)
    try {
      const k = await getGroqKey(apiBase, adminAuth, keyId)
      setKey(k)
      setLabel(k.label)
      setNotes(k.notes ?? '')
      setIsActive(k.isActive)
      setIsDefault(k.isDefault)
      setRotateKey('')
      setShowSecret(false)
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setError('Key not found.')
      } else if (e instanceof ApiError && e.status === 401) {
        setError('Session expired or invalid credentials.')
      } else if (e instanceof ApiError) {
        setError(e.message)
      } else {
        setError('Failed to load key.')
      }
      setKey(null)
    } finally {
      setLoading(false)
    }
  }, [apiBase, adminAuth, keyId])

  useEffect(() => {
    void load()
  }, [load])

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!keyId) return
    setBusy(true)
    setError(null)
    try {
      const body: GroqKeyPatchBody = {
        label: label.trim(),
        notes: notes.trim() === '' ? null : notes.trim(),
        isActive,
        isDefault,
      }
      const trimmedRotate = rotateKey.trim()
      if (trimmedRotate) body.apiKey = trimmedRotate

      const updated = await patchGroqKey(apiBase, adminAuth, keyId, body)
      setKey(updated)
      setRotateKey('')
      setShowSecret(false)
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Could not update key.')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete() {
    if (!keyId) return
    if (
      !window.confirm(
        'Permanently delete this key row? Prefer disabling (inactive) unless you need it gone.',
      )
    ) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      await deleteGroqKey(apiBase, adminAuth, keyId)
      navigate('/groq-keys', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Could not delete key.')
    } finally {
      setBusy(false)
    }
  }

  if (loading && !key) {
    return (
      <div className="mx-auto max-w-2xl text-center text-zinc-500">Loading key…</div>
    )
  }

  if (!key && error) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link to="/groq-keys" className="text-sm font-medium text-violet-400 hover:text-violet-300">
          ← Groq keys
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

  if (!key) return null

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/groq-keys" className="text-sm font-medium text-violet-400 hover:text-violet-300">
        ← Groq keys
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">Edit key</h1>
      <p className="mt-1 font-mono text-xs text-zinc-500">{key.id}</p>

      {error ? (
        <div
          className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-100/90">
        Full secret is shown only on this page. Do not paste it into logs or chat.
      </div>

      <form onSubmit={onSave} className="mt-6 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <label className="block text-sm font-medium text-zinc-300">
          Stored API key
          <div className="mt-1.5 flex gap-2">
            <input
              type={showSecret ? 'text' : 'password'}
              readOnly
              value={key.apiKey}
              className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-white"
            />
            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              className="shrink-0 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
            >
              {showSecret ? 'Hide' : 'Reveal'}
            </button>
          </div>
          <span className="mt-1 block text-xs text-zinc-500">
            Masked in lists: {key.apiKeyMasked} · preview: {key.apiKeyPreview}
          </span>
        </label>

        <label className="block text-sm font-medium text-zinc-300">
          Rotate to new key (optional)
          <input
            type="password"
            value={rotateKey}
            onChange={(e) => setRotateKey(e.target.value)}
            minLength={10}
            maxLength={500}
            autoComplete="off"
            placeholder="Leave blank to keep current value"
            className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-white outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/25"
          />
        </label>

        <label className="block text-sm font-medium text-zinc-300">
          Label
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={120}
            required
            className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/25"
          />
        </label>

        <label className="block text-sm font-medium text-zinc-300">
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={3}
            className="mt-1.5 w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/25"
          />
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-violet-600"
          />
          Active (flags the row; client-config may still expose inactive keys to signed-in users)
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-violet-600"
          />
          Default key (demotes other defaults)
        </label>

        <div className="flex flex-wrap gap-2 border-t border-zinc-800 pt-4">
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-500/15 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </form>

      <p className="mt-4 text-xs text-zinc-600">
        Created {formatDate(key.createdAt)} · Updated {formatDate(key.updatedAt)}
      </p>
    </div>
  )
}
