import type {
  AdminAuth,
  AdminLoginResponse,
  AdminMeResponse,
  AdminPaymentRequest,
  AdminPaymentRequestsListResponse,
  AdminUser,
  AdminUserDetail,
  ApiErrorBody,
  DeepgramKeyCreateBody,
  DeepgramKeyDeleteResponse,
  DeepgramKeyDetail,
  DeepgramKeyListItem,
  DeepgramKeyPatchBody,
  GroqKeyCreateBody,
  GroqKeyDeleteResponse,
  GroqKeyDetail,
  GroqKeyListItem,
  GroqKeyPatchBody,
  PaymentRequestStatus,
  UsersListResponse,
  WindowsAppReleaseDeleteResponse,
  WindowsAppReleaseMeta,
} from '../types'
import {
  logFetchFailure,
  NetworkError,
  userMessageForFetchFailure,
} from './fetchDebug'

export type { AdminAuth } from '../types'
export { NetworkError } from './fetchDebug'

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

function normalizeMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object' || !('message' in body)) return undefined
  const m = (body as ApiErrorBody).message
  if (typeof m === 'string' && m.trim()) return m
  if (Array.isArray(m) && m.length > 0 && typeof m[0] === 'string') return m.join(' ')
  return undefined
}

function parseErrorMessage(status: number, body: unknown): string {
  const fromBody = normalizeMessage(body)
  if (fromBody) return fromBody
  if (status === 401) return 'Unauthorized — check your credentials.'
  if (status === 404) return 'Not found.'
  if (status === 413) return 'Payload too large — file exceeds the server limit.'
  if (status === 400) return 'Bad request — check your input.'
  if (status === 409) return 'Conflict — this version or resource already exists.'
  return `Request failed (${status}).`
}

export function credentialToAuth(
  c:
    | { kind: 'jwt'; accessToken: string }
    | { kind: 'apiKey'; apiKey: string },
): AdminAuth {
  if (c.kind === 'jwt') return { kind: 'jwt', accessToken: c.accessToken }
  return { kind: 'apiKey', apiKey: c.apiKey }
}

export async function adminFetch<T>(
  apiBase: string,
  auth: AdminAuth,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = apiBase.replace(/\/+$/, '')
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const headers = new Headers(init?.headers)
  if (auth.kind === 'jwt') {
    headers.set('Authorization', `Bearer ${auth.accessToken}`)
  } else {
    headers.set('x-admin-key', auth.apiKey)
  }
  if (
    init?.body !== undefined &&
    !headers.has('Content-Type') &&
    !(typeof FormData !== 'undefined' && init.body instanceof FormData)
  ) {
    headers.set('Content-Type', 'application/json')
  }

  const method = (init?.method ?? 'GET').toUpperCase()
  let res: Response
  try {
    res = await fetch(url, { ...init, headers })
  } catch (err) {
    logFetchFailure(url, method, err, {
      auth: auth.kind === 'jwt' ? 'Bearer' : 'x-admin-key',
    })
    throw new NetworkError(userMessageForFetchFailure(), {
      url,
      method,
      cause: err,
    })
  }
  const text = await res.text()
  let json: unknown = undefined
  if (text) {
    try {
      json = JSON.parse(text) as unknown
    } catch {
      json = text
    }
  }

  if (!res.ok) {
    throw new ApiError(parseErrorMessage(res.status, json), res.status, json)
  }

  return json as T
}

/** No auth — use for `POST /admin/login` only */
async function publicPost<T>(apiBase: string, path: string, body: unknown): Promise<T> {
  const base = apiBase.replace(/\/+$/, '')
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    logFetchFailure(url, 'POST', err, { endpoint: 'adminLogin' })
    throw new NetworkError(userMessageForFetchFailure(), {
      url,
      method: 'POST',
      cause: err,
    })
  }
  const text = await res.text()
  let json: unknown = undefined
  if (text) {
    try {
      json = JSON.parse(text) as unknown
    } catch {
      json = text
    }
  }
  if (!res.ok) {
    throw new ApiError(parseErrorMessage(res.status, json), res.status, json)
  }
  return json as T
}

export function adminLogin(
  apiBase: string,
  body: { email: string; password: string },
): Promise<AdminLoginResponse> {
  return publicPost<AdminLoginResponse>(apiBase, '/admin/login', body)
}

export function adminMe(apiBase: string, auth: AdminAuth): Promise<AdminMeResponse> {
  return adminFetch<AdminMeResponse>(apiBase, auth, '/admin/me')
}

export function listUsers(
  apiBase: string,
  auth: AdminAuth,
  params: { skip?: number; take?: number; search?: string },
) {
  const q = new URLSearchParams()
  if (params.skip !== undefined) q.set('skip', String(params.skip))
  if (params.take !== undefined) q.set('take', String(params.take))
  if (params.search?.trim()) q.set('search', params.search.trim())
  const qs = q.toString()
  return adminFetch<UsersListResponse>(
    apiBase,
    auth,
    `/admin/users${qs ? `?${qs}` : ''}`,
  )
}

export function getUser(apiBase: string, auth: AdminAuth, userId: string) {
  return adminFetch<AdminUserDetail>(apiBase, auth, `/admin/users/${userId}`)
}

export function recordPayment(
  apiBase: string,
  auth: AdminAuth,
  userId: string,
  body: {
    amountPaise: number
    tokensToAdd: number
    note?: string
    reactivate?: boolean
  },
) {
  return adminFetch<AdminUser>(apiBase, auth, `/admin/users/${userId}/payment`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function patchUserStatus(
  apiBase: string,
  auth: AdminAuth,
  userId: string,
  isActive: boolean,
) {
  return adminFetch<AdminUser>(apiBase, auth, `/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  })
}

export function patchTokenLimit(
  apiBase: string,
  auth: AdminAuth,
  userId: string,
  tokenLimit: number,
) {
  return adminFetch<AdminUser>(apiBase, auth, `/admin/users/${userId}/limit`, {
    method: 'PATCH',
    body: JSON.stringify({ tokenLimit }),
  })
}

export function resetUsage(apiBase: string, auth: AdminAuth, userId: string) {
  return adminFetch<AdminUser>(apiBase, auth, `/admin/users/${userId}/reset-usage`, {
    method: 'POST',
  })
}

export function listGroqKeys(
  apiBase: string,
  auth: AdminAuth,
  params?: { includeInactive?: boolean },
) {
  const q = new URLSearchParams()
  if (params?.includeInactive !== undefined) {
    q.set('includeInactive', String(params.includeInactive))
  }
  const qs = q.toString()
  return adminFetch<GroqKeyListItem[]>(
    apiBase,
    auth,
    `/admin/groq-keys${qs ? `?${qs}` : ''}`,
  )
}

export function getGroqKey(apiBase: string, auth: AdminAuth, id: string) {
  return adminFetch<GroqKeyDetail>(apiBase, auth, `/admin/groq-keys/${id}`)
}

export function createGroqKey(
  apiBase: string,
  auth: AdminAuth,
  body: GroqKeyCreateBody,
) {
  return adminFetch<GroqKeyDetail>(apiBase, auth, '/admin/groq-keys', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function patchGroqKey(
  apiBase: string,
  auth: AdminAuth,
  id: string,
  body: GroqKeyPatchBody,
) {
  return adminFetch<GroqKeyDetail>(apiBase, auth, `/admin/groq-keys/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteGroqKey(apiBase: string, auth: AdminAuth, id: string) {
  return adminFetch<GroqKeyDeleteResponse>(apiBase, auth, `/admin/groq-keys/${id}`, {
    method: 'DELETE',
  })
}

export function listDeepgramKeys(
  apiBase: string,
  auth: AdminAuth,
  params?: { includeInactive?: boolean },
) {
  const q = new URLSearchParams()
  if (params?.includeInactive !== undefined) {
    q.set('includeInactive', String(params.includeInactive))
  }
  const qs = q.toString()
  return adminFetch<DeepgramKeyListItem[]>(
    apiBase,
    auth,
    `/admin/deepgram-keys${qs ? `?${qs}` : ''}`,
  )
}

export function getDeepgramKey(apiBase: string, auth: AdminAuth, id: string) {
  return adminFetch<DeepgramKeyDetail>(apiBase, auth, `/admin/deepgram-keys/${id}`)
}

export function createDeepgramKey(
  apiBase: string,
  auth: AdminAuth,
  body: DeepgramKeyCreateBody,
) {
  return adminFetch<DeepgramKeyDetail>(apiBase, auth, '/admin/deepgram-keys', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function patchDeepgramKey(
  apiBase: string,
  auth: AdminAuth,
  id: string,
  body: DeepgramKeyPatchBody,
) {
  return adminFetch<DeepgramKeyDetail>(apiBase, auth, `/admin/deepgram-keys/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteDeepgramKey(apiBase: string, auth: AdminAuth, id: string) {
  return adminFetch<DeepgramKeyDeleteResponse>(apiBase, auth, `/admin/deepgram-keys/${id}`, {
    method: 'DELETE',
  })
}

export function listPaymentRequests(
  apiBase: string,
  auth: AdminAuth,
  params?: {
    status?: PaymentRequestStatus
    search?: string
    skip?: number
    take?: number
  },
) {
  const q = new URLSearchParams()
  if (params?.status) q.set('status', params.status)
  if (params?.search?.trim()) q.set('search', params.search.trim())
  if (params?.skip !== undefined) q.set('skip', String(params.skip))
  if (params?.take !== undefined) q.set('take', String(params.take))
  const qs = q.toString()
  return adminFetch<AdminPaymentRequestsListResponse>(
    apiBase,
    auth,
    `/admin/payment-requests${qs ? `?${qs}` : ''}`,
  )
}

export function getPaymentRequest(apiBase: string, auth: AdminAuth, id: string) {
  return adminFetch<AdminPaymentRequest>(apiBase, auth, `/admin/payment-requests/${id}`)
}

export function approvePaymentRequest(
  apiBase: string,
  auth: AdminAuth,
  id: string,
  body: { tokensToAdd: number; adminNote?: string; reactivate?: boolean },
) {
  return adminFetch<AdminPaymentRequest>(apiBase, auth, `/admin/payment-requests/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function rejectPaymentRequest(
  apiBase: string,
  auth: AdminAuth,
  id: string,
  body: { adminNote?: string },
) {
  return adminFetch<AdminPaymentRequest>(apiBase, auth, `/admin/payment-requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const encVersion = (version: string) => encodeURIComponent(version)

export function listAppReleases(apiBase: string, auth: AdminAuth) {
  return adminFetch<WindowsAppReleaseMeta[]>(apiBase, auth, '/admin/app-releases')
}

export function getAppRelease(apiBase: string, auth: AdminAuth, version: string) {
  return adminFetch<WindowsAppReleaseMeta>(apiBase, auth, `/admin/app-releases/${encVersion(version)}`)
}

export function uploadAppRelease(apiBase: string, auth: AdminAuth, form: FormData) {
  return adminFetch<WindowsAppReleaseMeta>(apiBase, auth, '/admin/app-releases', {
    method: 'POST',
    body: form,
  })
}

export function deleteAppRelease(apiBase: string, auth: AdminAuth, version: string) {
  return adminFetch<WindowsAppReleaseDeleteResponse>(
    apiBase,
    auth,
    `/admin/app-releases/${encVersion(version)}`,
    { method: 'DELETE' },
  )
}
