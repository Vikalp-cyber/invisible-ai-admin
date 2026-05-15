export type AuthProvider = string

export type Payment = {
  id: string
  amountPaise: number
  amountRupees: number
  tokensAdded: number
  note: string | null
  createdAt: string
}

export type AdminUser = {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  authProvider: AuthProvider
  tokensUsed: number
  tokenLimit: number
  tokensRemaining: number
  isActive: boolean
  totalPaidPaise: number
  totalPaidRupees: number
  createdAt: string
  updatedAt: string
}

export type AdminUserDetail = AdminUser & {
  payments: Payment[]
}

export type UsersListResponse = {
  total: number
  skip: number
  take: number
  items: AdminUser[]
}

export type ApiErrorBody = {
  statusCode?: number
  message?: string | string[]
  error?: string
}

/** Bootstrap admin row — `POST /admin/login` */
export type AdminProfile = {
  id: string
  email: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type AdminLoginResponse = {
  accessToken: string
  tokenType: string
  expiresIn: string
  admin: AdminProfile
}

export type AdminMeResponse =
  | { kind: 'jwt'; admin: AdminProfile }
  | { kind: 'apiKey' }

/** Credential sent on each admin request */
export type AdminAuth =
  | { kind: 'jwt'; accessToken: string }
  | { kind: 'apiKey'; apiKey: string }

/** Admin Groq keys — `/admin/groq-keys` */
export type GroqKeyListItem = {
  id: string
  label: string
  isActive: boolean
  isDefault: boolean
  notes: string | null
  apiKeyMasked: string
  apiKeyPreview: string
  createdAt: string
  updatedAt: string
}

export type GroqKeyDetail = GroqKeyListItem & {
  apiKey: string
}

export type GroqKeyCreateBody = {
  label: string
  apiKey: string
  isActive?: boolean
  isDefault?: boolean
  notes?: string
}

export type GroqKeyPatchBody = {
  label?: string
  apiKey?: string
  isActive?: boolean
  isDefault?: boolean
  /** Send `null` to clear notes */
  notes?: string | null
}

export type GroqKeyDeleteResponse = {
  id: string
  deleted: true
}

/** Admin Deepgram keys — `/admin/deepgram-keys` (same shape as Groq keys) */
export type DeepgramKeyListItem = {
  id: string
  label: string
  isActive: boolean
  isDefault: boolean
  notes: string | null
  apiKeyMasked: string
  apiKeyPreview: string
  createdAt: string
  updatedAt: string
}

export type DeepgramKeyDetail = DeepgramKeyListItem & {
  apiKey: string
}

export type DeepgramKeyCreateBody = {
  label: string
  apiKey: string
  isActive?: boolean
  isDefault?: boolean
  notes?: string
}

export type DeepgramKeyPatchBody = {
  label?: string
  apiKey?: string
  isActive?: boolean
  isDefault?: boolean
  notes?: string | null
}

export type DeepgramKeyDeleteResponse = {
  id: string
  deleted: true
}

export type PaymentRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/** Admin payment request row — `GET /admin/payment-requests` */
export type AdminPaymentRequestUserSnapshot = {
  id: string
  email: string
  name: string | null
  tokensUsed: number
  tokenLimit: number
  tokensRemaining: number
  isActive: boolean
  totalPaidPaise: number
  totalPaidRupees: number
}

export type AdminPaymentRequestPaymentSnapshot = {
  id: string
  amountPaise: number
  amountRupees: number
  tokensAdded: number
  createdAt: string
} | null

export type AdminPaymentRequest = {
  id: string
  amountPaise: number
  amountRupees: number
  utr: string
  userNote: string | null
  status: PaymentRequestStatus
  adminNote: string | null
  reviewedAt: string | null
  reviewedById: string | null
  createdAt: string
  updatedAt: string
  user: AdminPaymentRequestUserSnapshot
  payment: AdminPaymentRequestPaymentSnapshot
}

export type AdminPaymentRequestsListResponse = {
  total: number
  skip: number
  take: number
  items: AdminPaymentRequest[]
}

/** Windows installer metadata — `GET/POST /admin/app-releases` (no binary in JSON) */
export type WindowsAppReleaseMeta = {
  id: string
  version: string
  fileName: string
  fileSize: number
  sha256: string
  releaseNotes: string | null
  createdAt: string
  updatedAt: string
}

export type WindowsAppReleaseDeleteResponse = {
  version: string
  deleted: true
}
