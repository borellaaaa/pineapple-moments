import { useState } from 'react'
import { Link } from 'react-router-dom'
import { signIn, signUp } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import styles from './Auth.module.css'

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) throw error
        toast('Bem-vinda de volta! 💕', 'success')
      } else {
        const { error } = await signUp(email, password)
        if (error) throw error
        toast('Conta criada! Verifique seu e-mail 📬', 'success')
      }
    } catch (err) {
      toast(err.message || 'Algo deu errado 😢', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.backLink}>← Voltar</Link>
      <div className={styles.card}>
        <div className={styles.logo}>🍍</div>
        <h1 className={styles.title}>Pineapple Moments</h1>

        <div className={styles.tabs}>
          <button className={`${styles.tab} ${mode==='login'?styles.active:''}`} onClick={()=>setMode('login')}>
            Entrar
          </button>
          <button className={`${styles.tab} ${mode==='signup'?styles.active:''}`} onClick={()=>setMode('signup')}>
            Criar conta
          </button>
        </div>

        <form onSubmit={handle} className={styles.form}>
          <div className={styles.field}>
            <label>E-mail</label>
            <input
              className="input"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label>Senha</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{width:'100%',justifyContent:'center'}}>
            {loading ? '...' : mode==='login' ? 'Entrar ✨' : 'Criar conta 🍍'}
          </button>
        </form>

        <p className={styles.hint}>
          {mode==='login' ? 'Sem conta ainda? ' : 'Já tem conta? '}
          <button onClick={()=>setMode(mode==='login'?'signup':'login')} className={styles.switchBtn}>
            {mode==='login' ? 'Criar conta' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  )
}
