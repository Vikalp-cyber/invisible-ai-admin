const trimTrailingSlash = (s: string) => s.replace(/\/+$/, '')

/** Backend admin routes are mounted at `/api/...` (e.g. `POST /api/admin/login`). Value must include the `/api` prefix. */
export function defaultApiBase(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL as string | undefined
  if (fromEnv && fromEnv.trim()) return trimTrailingSlash(fromEnv.trim())
  return 'https://flowdesk-backend.luminoai.online/api'
}
