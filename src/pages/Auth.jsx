import { useState } from 'react'
import { Link } from 'react-router-dom'
import { signInWithGoogle } from '../lib/supabase'
import { useToast } from '../hooks/useToast'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const handleGoogle = async () => {
    setLoading(true)
    const { error } = await signInWithGoogle()
    if (error) { toast('Erro ao entrar com Google 😢', 'error'); setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#eaf5ea,#f7faf0,#fffde7)', padding:24, position:'relative' }}>
      <Link to="/" style={{ position:'absolute', top:20, left:20, color:'var(--green)', fontWeight:700, textDecoration:'none', fontSize:14 }}>← Voltar</Link>

      <div style={{ background:'white', borderRadius:28, padding:'44px 36px', maxWidth:380, width:'100%', boxShadow:'0 20px 60px rgba(58,140,63,0.15)', textAlign:'center', animation:'pop 0.4s ease' }}>
        <div style={{ fontSize:56, display:'block', marginBottom:8, animation:'float 3s ease-in-out infinite' }}>🍍</div>
        <h1 style={{ fontFamily:'var(--font-title)', color:'var(--green)', fontSize:24, marginBottom:8 }}>Pineapple Moments</h1>
        <p style={{ color:'rgba(27,58,31,0.6)', fontFamily:'var(--font-cute)', fontSize:14, marginBottom:32, lineHeight:1.5 }}>
          Entre para criar e compartilhar seus álbuns mais fofos 💛
        </p>

        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:12, padding:'13px 20px', background:'white', border:'2px solid rgba(27,58,31,0.15)', borderRadius:50, fontFamily:'var(--font-body)', fontWeight:700, fontSize:15, color:'var(--dark)', cursor:'pointer', transition:'all 0.2s', boxShadow:'0 2px 8px rgba(27,58,31,0.08)' }}
          onMouseOver={e => { e.currentTarget.style.borderColor='var(--green)'; e.currentTarget.style.background='#f0fff0' }}
          onMouseOut={e => { e.currentTarget.style.borderColor='rgba(27,58,31,0.15)'; e.currentTarget.style.background='white' }}
        >
          {loading ? (
            <span style={{ width:20, height:20, border:'3px solid rgba(58,140,63,0.2)', borderTopColor:'var(--green)', borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' }} />
          ) : (
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          )}
          {loading ? 'Entrando...' : 'Entrar com Google'}
        </button>

        <p style={{ marginTop:20, fontSize:11, color:'rgba(27,58,31,0.4)', fontFamily:'var(--font-cute)' }}>
          Ao entrar, você concorda com nossos termos 🌿
        </p>
      </div>
    </div>
  )
}
