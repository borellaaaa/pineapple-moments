import { useState } from 'react'
import { Link } from 'react-router-dom'
import { signInWithGoogle } from '../lib/supabase'
import { useToast } from '../hooks/useToast'

export default function Auth() {
  const banned = new URLSearchParams(window.location.search).get('banned') === '1'
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const handleGoogle = async () => {
    setLoading(true)
    const { error } = await signInWithGoogle()
    if (error) { toast('Erro ao entrar com Google 😢', 'error'); setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg,#eaf5ea,#f7faf0,#fffde7)', padding: 24, position: 'relative' }}>
      <Link to="/" style={{ position: 'absolute', top: 20, left: 20, color: 'var(--green)', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>← Voltar</Link>

      <div style={{ background: 'white', borderRadius: 28, padding: '48px 40px', maxWidth: 400, width: '100%', boxShadow: '0 24px 64px rgba(58,140,63,0.14)', textAlign: 'center', animation: 'pop 0.4s ease' }}>
        <div style={{ fontSize: 60, display: 'block', marginBottom: 10, animation: 'float 3s ease-in-out infinite' }}>🍍</div>
        <h1 style={{ fontFamily: 'var(--font-title)', color: 'var(--green)', fontSize: 26, marginBottom: 10 }}>Pineapple Moments</h1>
        <p style={{ color: 'var(--dark-muted)', fontFamily: 'var(--font-cute)', fontSize: 15, marginBottom: 36, lineHeight: 1.6 }}>
          Entre para criar e compartilhar seus álbuns mais fofos 💛
        </p>

        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '14px 22px', background: 'white', border: '2px solid var(--dark-faint)', borderRadius: 50, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15, color: 'var(--dark)', cursor: 'pointer', transition: 'all 0.2s', boxShadow: 'var(--shadow)' }}
          onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--green)'; e.currentTarget.style.background = '#f0fff0' }}
          onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--dark-faint)'; e.currentTarget.style.background = 'white' }}>
          {loading ? (
            <span className="loader loader-sm" style={{ margin: 0 }} />
          ) : (
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
          )}
          {loading ? 'Entrando...' : 'Entrar com Google'}
        </button>

        <div style={{ margin: '24px 0', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ flex: 1, borderTop: '2px solid var(--dark-faint)' }} />
          <span style={{ fontSize: 11, color: 'var(--dark-muted)', fontWeight: 700 }}>Ambiente seguro</span>
          <div style={{ flex: 1, borderTop: '2px solid var(--dark-faint)' }} />
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', fontSize: 12, color: 'var(--dark-muted)', fontFamily: 'var(--font-cute)' }}>
          {['🔒 Seguro', '🌸 Fofo', '✨ Grátis'].map(t => (
            <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
