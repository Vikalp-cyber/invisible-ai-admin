import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppReleaseDetailPage } from './pages/AppReleaseDetailPage'
import { AppReleasesPage } from './pages/AppReleasesPage'
import { DeepgramKeyDetailPage } from './pages/DeepgramKeyDetailPage'
import { DeepgramKeysPage } from './pages/DeepgramKeysPage'
import { GroqKeyDetailPage } from './pages/GroqKeyDetailPage'
import { GroqKeysPage } from './pages/GroqKeysPage'
import { LoginPage } from './pages/LoginPage'
import { PaymentRequestDetailPage } from './pages/PaymentRequestDetailPage'
import { PaymentRequestsPage } from './pages/PaymentRequestsPage'
import { PricingPage } from './pages/PricingPage'
import { UserDetailPage } from './pages/UserDetailPage'
import { UsersPage } from './pages/UsersPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/users" replace />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/users/:userId" element={<UserDetailPage />} />
              <Route path="/payment-requests" element={<PaymentRequestsPage />} />
              <Route path="/payment-requests/:requestId" element={<PaymentRequestDetailPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/groq-keys" element={<GroqKeysPage />} />
              <Route path="/groq-keys/:keyId" element={<GroqKeyDetailPage />} />
              <Route path="/deepgram-keys" element={<DeepgramKeysPage />} />
              <Route path="/deepgram-keys/:keyId" element={<DeepgramKeyDetailPage />} />
              <Route path="/app-releases" element={<AppReleasesPage />} />
              <Route path="/app-releases/:version" element={<AppReleaseDetailPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/users" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
