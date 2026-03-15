import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      // Grava log de login
      if (event === 'SIGNED_IN' && session?.user) {
        supabase.from('technical_logs').insert({
          user_id:    session.user.id,
          event_type: 'login',
          details:    { provider: session.user.app_metadata?.provider || 'google' },
          created_at: new Date().toISOString(),
        }).then(() => {})
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  return <Ctx.Provider value={{ user, loading }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
