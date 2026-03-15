import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider } from './hooks/useToast'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import AlbumEditor from './pages/AlbumEditor'
import SharedAlbum from './pages/SharedAlbum'
import Profile from './pages/Profile'
import Letters from './pages/Letters'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Onboarding from './pages/Onboarding'
import Admin from './pages/Admin'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loader" style={{ marginTop: 80 }} />
  return user ? children : <Navigate to="/auth" replace />
}

function OnboardingGuard({ children }) {
  const { user, loading } = useAuth()
  const [checked, setChecked] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  useEffect(() => {
    if (!user) { setChecked(true); return }
    import('./lib/supabase').then(({ supabase }) => {
      supabase.from('profiles').select('is_onboarded').eq('id', user.id).single().then(({ data }) => {
        setNeedsOnboarding(!data?.is_onboarded)
        setChecked(true)
      })
    })
  }, [user])
  if (loading || !checked) return <div className="loader" style={{ marginTop: 80 }} />
  if (!user) return <Navigate to="/auth" replace />
  if (needsOnboarding) return <Navigate to="/onboarding" replace />
  return children
}

function Public({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loader" style={{ marginTop: 80 }} />
  return user ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Public><Landing /></Public>} />
            <Route path="/auth" element={<Public><Auth /></Public>} />
            <Route path="/dashboard" element={<OnboardingGuard><Dashboard /></OnboardingGuard>} />
            <Route path="/album/:albumId" element={<OnboardingGuard><AlbumEditor /></OnboardingGuard>} />
            <Route path="/shared/:token" element={<SharedAlbum />} />
            <Route path="/profile" element={<OnboardingGuard><Profile /></OnboardingGuard>} />
            <Route path="/letters" element={<OnboardingGuard><Letters /></OnboardingGuard>} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />
            <Route path="/admin" element={<Protected><Admin /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
