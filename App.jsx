import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loader" style={{ marginTop: 80 }} />
  return user ? children : <Navigate to="/auth" replace />
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
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/album/:albumId" element={<Protected><AlbumEditor /></Protected>} />
            <Route path="/shared/:token" element={<SharedAlbum />} />
            <Route path="/profile" element={<Protected><Profile /></Protected>} />
            <Route path="/letters" element={<Protected><Letters /></Protected>} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
