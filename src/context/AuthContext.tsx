import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { adminLogin, adminMe, ApiError, credentialToAuth } from '../lib/api'
import { defaultApiBase } from '../lib/config'
import type { AdminAuth, AdminProfile } from '../types'

const STORAGE_BASE = 'invisible_admin_api_base'
const STORAGE_AUTH_KIND = 'invisible_admin_auth_kind'
const STORAGE_JWT = 'invisible_admin_jwt'
const STORAGE_PROFILE = 'invisible_admin_profile'
const STORAGE_API_KEY = 'invisible_admin_api_key'

export type AuthCredential =
  | { kind: 'jwt'; accessToken: string; admin: AdminProfile }
  | { kind: 'apiKey'; apiKey: string }

type AuthState = {
  apiBase: string
  credential: AuthCredential
}

type AuthContextValue = {
  apiBase: string
  adminAuth: AdminAuth
  /** Primary line: email (JWT) or label for API key */
  displayEmail: string
  /** Secondary line: admin name (JWT) or empty */
  displayName: string | null
  authKind: 'jwt' | 'apiKey'
  isAuthenticated: boolean
  login: (email: string, password: string, apiBaseOverride?: string) => Promise<void>
  loginWithApiKey: (apiKey: string, apiBaseOverride?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function persist(state: AuthState) {
  sessionStorage.setItem(STORAGE_BASE, state.apiBase)
  if (state.credential.kind === 'jwt') {
    sessionStorage.setItem(STORAGE_AUTH_KIND, 'jwt')
    sessionStorage.setItem(STORAGE_JWT, state.credential.accessToken)
    sessionStorage.setItem(STORAGE_PROFILE, JSON.stringify(state.credential.admin))
    sessionStorage.removeItem(STORAGE_API_KEY)
  } else {
    sessionStorage.setItem(STORAGE_AUTH_KIND, 'apiKey')
    sessionStorage.setItem(STORAGE_API_KEY, state.credential.apiKey)
    sessionStorage.removeItem(STORAGE_JWT)
    sessionStorage.removeItem(STORAGE_PROFILE)
  }
}

function clearStorage() {
  sessionStorage.removeItem(STORAGE_BASE)
  sessionStorage.removeItem(STORAGE_AUTH_KIND)
  sessionStorage.removeItem(STORAGE_JWT)
  sessionStorage.removeItem(STORAGE_PROFILE)
  sessionStorage.removeItem(STORAGE_API_KEY)
}

function readInitial(): AuthState | null {
  try {
    const apiBase = sessionStorage.getItem(STORAGE_BASE)
    const kind = sessionStorage.getItem(STORAGE_AUTH_KIND)
    if (!apiBase?.trim() || !kind) return null
    if (kind === 'jwt') {
      const token = sessionStorage.getItem(STORAGE_JWT)
      const raw = sessionStorage.getItem(STORAGE_PROFILE)
      if (!token || !raw) return null
      const admin = JSON.parse(raw) as AdminProfile
      return { apiBase, credential: { kind: 'jwt', accessToken: token, admin } }
    }
    if (kind === 'apiKey') {
      const apiKey = sessionStorage.getItem(STORAGE_API_KEY)
      if (!apiKey) return null
      return { apiBase, credential: { kind: 'apiKey', apiKey } }
    }
  } catch {
    /* ignore */
  }
  return null
}

function isValidEmail(email: string): boolean {
  const t = email.trim()
  if (!t) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
}

function resolveBase(apiBaseOverride?: string): string {
  const raw = apiBaseOverride?.trim()
  const base = raw ? raw.replace(/\/+$/, '') : defaultApiBase()
  return base || defaultApiBase()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState | null>(() => readInitial())

  const logout = useCallback(() => {
    clearStorage()
    setState(null)
  }, [])

  const jwtToken = state?.credential.kind === 'jwt' ? state.credential.accessToken : null
  const apiKeyValue = state?.credential.kind === 'apiKey' ? state.credential.apiKey : null

  useEffect(() => {
    if (!state || (!jwtToken && !apiKeyValue)) return
    const auth = credentialToAuth(
      jwtToken
        ? { kind: 'jwt', accessToken: jwtToken }
        : { kind: 'apiKey', apiKey: apiKeyValue! },
    )
    let cancelled = false
    void adminMe(state.apiBase, auth).catch((e: unknown) => {
      if (cancelled) return
      if (e instanceof ApiError && e.status === 401) logout()
    })
    return () => {
      cancelled = true
    }
  }, [state?.apiBase, jwtToken, apiKeyValue, logout])

  const login = useCallback(
    async (email: string, password: string, apiBaseOverride?: string) => {
      const em = email.trim()
      if (!isValidEmail(em)) {
        throw new Error('Enter a valid email address.')
      }
      const pw = password
      if (!pw) throw new Error('Password is required.')

      const base = resolveBase(apiBaseOverride)
      const res = await adminLogin(base, { email: em, password: pw })
      const next: AuthState = {
        apiBase: base,
        credential: {
          kind: 'jwt',
          accessToken: res.accessToken,
          admin: res.admin,
        },
      }
      persist(next)
      setState(next)
    },
    [],
  )

  const loginWithApiKey = useCallback(async (apiKey: string, apiBaseOverride?: string) => {
    const key = apiKey.trim()
    if (!key) throw new Error('API key is required.')

    const base = resolveBase(apiBaseOverride)
    const credential: AuthCredential = { kind: 'apiKey', apiKey: key }
    await adminMe(base, credentialToAuth(credential))

    const next: AuthState = { apiBase: base, credential }
    persist(next)
    setState(next)
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    if (!state) {
      return {
        apiBase: '',
        adminAuth: { kind: 'apiKey', apiKey: '' },
        displayEmail: '',
        displayName: null,
        authKind: 'jwt',
        isAuthenticated: false,
        login,
        loginWithApiKey,
        logout,
      }
    }
    const c = state.credential
    const adminAuth = credentialToAuth(
      c.kind === 'jwt'
        ? { kind: 'jwt', accessToken: c.accessToken }
        : { kind: 'apiKey', apiKey: c.apiKey },
    )
    const displayEmail = c.kind === 'jwt' ? c.admin.email : 'API key'
    const displayName = c.kind === 'jwt' ? c.admin.name : null
    return {
      apiBase: state.apiBase,
      adminAuth,
      displayEmail,
      displayName,
      authKind: c.kind,
      isAuthenticated: true,
      login,
      loginWithApiKey,
      logout,
    }
  }, [state, login, loginWithApiKey, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
