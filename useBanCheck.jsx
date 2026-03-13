import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isUserBanned } from '../lib/moderation'
import { signOut } from '../lib/supabase'

/**
 * Hook que verifica se o usuário está banido ao montar o componente.
 * Se estiver, faz logout e redireciona para /auth com mensagem de ban.
 */
export function useBanCheck(userId) {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!userId) { setChecking(false); return }
    isUserBanned(userId).then(banned => {
      setChecking(false)
      if (banned) {
        signOut().then(() => {
          navigate('/auth?banned=1', { replace: true })
        })
      }
    })
  }, [userId])

  return { checking }
}
