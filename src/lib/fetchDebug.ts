const PREFIX = '[admin-api]'

export class NetworkError extends Error {
  readonly url: string
  readonly method: string
  readonly causeDetail: unknown

  constructor(
    message: string,
    detail: { url: string; method: string; cause: unknown },
  ) {
    super(message)
    this.name = 'NetworkError'
    this.url = detail.url
    this.method = detail.method
    this.causeDetail = detail.cause
  }
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.location !== 'undefined'
}

/**
 * Logs everything useful when `fetch` throws (typical message: "Failed to fetch").
 * Open DevTools → Console and expand the group.
 */
export function logFetchFailure(
  url: string,
  method: string,
  err: unknown,
  extra?: Record<string, unknown>,
): void {
  const cause =
    err instanceof Error && 'cause' in err && err.cause !== undefined
      ? (err as Error & { cause: unknown }).cause
      : undefined

  // eslint-disable-next-line no-console
  console.groupCollapsed(`${PREFIX} ${method} ${url} — network error`)
  // eslint-disable-next-line no-console
  console.error('Error:', err)
  if (cause !== undefined) {
    // eslint-disable-next-line no-console
    console.error('Error.cause:', cause)
  }
  // eslint-disable-next-line no-console
  console.log('Request URL:', url)
  // eslint-disable-next-line no-console
  console.log('HTTP method:', method)
  if (isBrowser()) {
    // eslint-disable-next-line no-console
    console.log('This page origin:', window.location.origin)
    // eslint-disable-next-line no-console
    console.log('API origin (from URL):', safeOrigin(url))
  }
  // eslint-disable-next-line no-console
  console.log('Common causes:')
  // eslint-disable-next-line no-console
  console.log(
    '  • API not running or wrong URL (check Advanced API base / VITE_API_BASE_URL)',
  )
  // eslint-disable-next-line no-console
  console.log(
    '  • CORS: backend must send Access-Control-Allow-Origin for this page’s origin (or use a Vite dev proxy)',
  )
  // eslint-disable-next-line no-console
  console.log('  • Mixed content: https page cannot call http API (use https API or local http page)')
  if (extra && Object.keys(extra).length > 0) {
    // eslint-disable-next-line no-console
    console.log('Extra:', extra)
  }
  // eslint-disable-next-line no-console
  console.groupEnd()
}

function safeOrigin(url: string): string {
  try {
    return new URL(url).origin
  } catch {
    return '(invalid URL)'
  }
}

export function userMessageForFetchFailure(): string {
  return 'Could not reach the API. Open DevTools (F12) → Console and look for logs starting with [admin-api].'
}
