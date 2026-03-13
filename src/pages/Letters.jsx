import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useBanCheck } from '../hooks/useBanCheck'
import { useToast } from '../hooks/useToast'
import {
  getInboxLetters, getSentLetters, sendLetter, markLetterRead,
  deleteLetter, uploadPhoto, getProfile, getProfileByUsername
} from '../lib/supabase'

const LETTER_COLORS = ['#FFF8E1','#FCE4EC','#E8F5E9','#E3F2FD','#F3E5F5','#FFFDE7']

export default function Letters() {
  const { user } = useAuth()
  const toast = useToast()
  useBanCheck(user?.id)
  const [tab, setTab] = useState('inbox')
  const [inbox, setInbox] = useState([])
  const [sent, setSent] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCompose, setShowCompose] = useState(false)
  const [openLetter, setOpenLetter] = useState(null)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (!user) return
    Promise.all([
      getInboxLetters(user.id),
      getSentLetters(user.id),
      getProfile(user.id)
    ]).then(([{ data: i }, { data: s }, { data: p }]) => {
      setInbox(i || [])
      setSent(s || [])
      setProfile(p)
      setLoading(false)
    })
  }, [user])

  const handleOpen = async (letter) => {
    setOpenLetter(letter)
    if (!letter.is_read && letter.recipient_id === user.id) {
      await markLetterRead(letter.id)
      setInbox(p => p.map(l => l.id === letter.id ? { ...l, is_read: true } : l))
    }
  }

  const handleDelete = async (letterId, e) => {
    e.stopPropagation()
    await deleteLetter(letterId)
    setInbox(p => p.filter(l => l.id !== letterId))
    setSent(p => p.filter(l => l.id !== letterId))
    if (openLetter?.id === letterId) setOpenLetter(null)
    toast('Carta deletada')
  }

  const handleSend = async (data) => {
    const { data: letter, error } = await sendLetter({ senderId: user.id, ...data })
    if (error?.message === 'BANNED') {
      toast('Sua conta foi bloqueada por violações. 🚫', 'error'); return false
    }
    if (error?.message?.startsWith('MODERATION:')) {
      const label = error.message.replace('MODERATION:', '')
      toast(`Mensagem bloqueada: ${label} detectado. ⚠️`, 'error'); return false
    }
    if (error) { toast(error.message, 'error'); return false }
    setSent(p => [letter, ...p])
    toast('Cartinha enviada! 💌', 'success')
    return true
  }

  const unreadCount = inbox.filter(l => !l.is_read).length
  const currentList = tab === 'inbox' ? inbox : sent

  if (loading) return <div className="loader" style={{ marginTop: 80 }} />

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      {/* Header */}
      <header style={{ background: 'white', borderBottom: '2px solid var(--dark-faint)', padding: '0 20px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(27,58,31,0.06)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/dashboard" style={{ color: 'var(--green)', fontWeight: 700, textDecoration: 'none', fontSize: 13 }}>← Voltar</Link>
          <span style={{ fontFamily: 'var(--font-title)', fontSize: 17, color: 'var(--dark)', flex: 1 }}>💌 Cartinhas</span>
          <button className="btn btn-pink btn-sm" onClick={() => setShowCompose(true)}>✍️ Escrever</button>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '24px 20px 80px' }}>
        {/* No username warning */}
        {!profile?.username && (
          <div style={{ background: 'var(--yellow-light)', border: '2px solid var(--yellow)', borderRadius: 'var(--radius-sm)', padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, animation: 'fadeIn 0.3s ease' }}>
            <span style={{ fontSize: 22 }}>⚠️</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: 13 }}>Configure seu @usuário para receber cartinhas!</p>
              <Link to="/profile" style={{ color: 'var(--green)', fontSize: 12, fontWeight: 700 }}>Ir para o perfil →</Link>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[['inbox', `📬 Recebidas`, unreadCount], ['sent', '📤 Enviadas', 0]].map(([key, label, count]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: '8px 20px', borderRadius: 50, border: `2px solid ${tab === key ? 'var(--pink)' : 'var(--dark-faint)'}`, background: tab === key ? 'var(--pink)' : 'white', color: tab === key ? 'white' : 'var(--dark-muted)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', position: 'relative' }}>
              {label}
              {count > 0 && <span style={{ marginLeft: 6, background: 'rgba(255,255,255,0.35)', padding: '1px 7px', borderRadius: 99, fontSize: 11 }}>{count}</span>}
            </button>
          ))}
        </div>

        {/* Letter list */}
        {currentList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', animation: 'fadeIn 0.4s ease' }}>
            <div style={{ fontSize: 64, marginBottom: 14, animation: 'float 3s ease-in-out infinite' }}>💌</div>
            <h2 style={{ fontFamily: 'var(--font-title)', fontSize: 20, marginBottom: 8 }}>
              {tab === 'inbox' ? 'Nenhuma cartinha ainda!' : 'Você ainda não enviou cartinhas'}
            </h2>
            <p style={{ color: 'var(--dark-muted)', fontFamily: 'var(--font-cute)', fontSize: 14, marginBottom: 20 }}>
              {tab === 'inbox' ? 'Compartilhe seu @usuário para receber mensagens fofinhas 🌸' : 'Escreva para alguém especial! 💕'}
            </p>
            <button className="btn btn-pink" onClick={() => setShowCompose(true)}>✍️ Escrever cartinha</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {currentList.map((letter, i) => {
              const isUnread = !letter.is_read && tab === 'inbox'
              const person = tab === 'inbox' ? letter.sender : letter.recipient
              const color = LETTER_COLORS[i % LETTER_COLORS.length]
              return (
                <div key={letter.id}
                  onClick={() => handleOpen(letter)}
                  className="letter-card"
                  style={{
                    borderLeft: `4px solid ${isUnread ? 'var(--green)' : 'var(--pink)'}`,
                    background: isUnread ? '#f0fff4' : 'white',
                    animation: `fadeIn 0.35s ease both`,
                    animationDelay: `${i * 0.05}s`,
                    opacity: 0
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0 }}>
                      <div style={{ width: 42, height: 42, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, border: '2px solid rgba(27,58,31,0.08)' }}>
                        {person?.avatar_emoji || '💌'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--dark)' }}>
                            {tab === 'inbox' ? (person?.display_name || 'Alguém') : `Para @${letter.recipient_username}`}
                          </span>
                          {isUnread && <span className="chip chip-green" style={{ fontSize: 9 }}>NOVA</span>}
                        </div>
                        {person?.username && <p style={{ fontSize: 11, color: 'var(--dark-muted)' }}>@{person.username}</p>}
                        <p style={{ fontSize: 13, color: 'var(--dark-muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {letter.photo_url ? '📷 ' : ''}{letter.message}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: 'var(--dark-muted)' }}>{new Date(letter.created_at).toLocaleDateString('pt-BR')}</span>
                      <button onClick={e => handleDelete(letter.id, e)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, fontSize: 14, padding: 4, borderRadius: 6, transition: 'opacity 0.15s' }}
                        onMouseOver={e => e.currentTarget.style.opacity = '1'}
                        onMouseOut={e => e.currentTarget.style.opacity = '0.5'}>🗑️</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {showCompose && <ComposeLetter userId={user.id} onSend={handleSend} onClose={() => setShowCompose(false)} />}
      {openLetter && <LetterModal letter={openLetter} userId={user.id} onClose={() => setOpenLetter(null)} />}
    </div>
  )
}

// ── Compose Letter Modal ────────────────────────────────────────
function ComposeLetter({ userId, onSend, onClose }) {
  const toast = useToast()
  const [to, setTo] = useState('')
  const [msg, setMsg] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [recipientInfo, setRecipientInfo] = useState(null)
  const [lookupTimer, setLookupTimer] = useState(null)
  const fileRef = useRef(null)

  const handleToChange = (val) => {
    const clean = val.replace('@', '').toLowerCase()
    setTo(clean)
    setRecipientInfo(null)
    clearTimeout(lookupTimer)
    if (clean.length >= 3) {
      setLookupTimer(setTimeout(async () => {
        const { data } = await getProfileByUsername(clean)
        setRecipientInfo(data || null)
      }, 700))
    }
  }

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg','image/png','image/webp']
    if (!allowed.includes(file.type)) { toast('Use JPG, PNG ou WEBP', 'error'); return }
    if (file.size > 3 * 1024 * 1024) { toast('Imagem até 3MB', 'error'); return }
    setPhotoPreview(URL.createObjectURL(file))
    setUploading(true)
    const { url, error } = await uploadPhoto(file, userId)
    setUploading(false)
    if (error) { toast('Erro ao enviar foto 😢', 'error'); setPhotoPreview(null); return }
    setPhoto(url)
    toast('Foto adicionada! 📷', 'success')
    e.target.value = ''
  }

  const handleSend = async () => {
    if (!to.trim() || !msg.trim()) return
    setSending(true)
    const ok = await onSend({ recipientUsername: to, message: msg, photoUrl: photo })
    setSending(false)
    if (ok) onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ background: '#FFFEF7', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, animation: 'envelope 2s ease-in-out infinite' }}>✉️</div>
          <h2 style={{ fontFamily: 'var(--font-title)', color: 'var(--pink)', fontSize: 22, marginTop: 8, marginBottom: 0 }}>Escrever Cartinha 💌</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* To */}
          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: 12, color: 'var(--dark)', marginBottom: 6 }}>Para quem? 💕</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--dark-muted)', fontWeight: 700 }}>@</span>
              <input className="input" style={{ paddingLeft: 30 }} value={to} onChange={e => handleToChange(e.target.value)} placeholder="usuário da pessoa" />
            </div>
            {to.length >= 3 && (
              <div style={{ marginTop: 6, padding: '8px 12px', borderRadius: 'var(--radius-xs)', background: recipientInfo ? 'var(--green-muted)' : 'rgba(229,57,53,0.06)', border: `1.5px solid ${recipientInfo ? 'var(--green-light)' : 'rgba(229,57,53,0.15)'}`, fontSize: 12 }}>
                {recipientInfo
                  ? <span style={{ color: 'var(--green-dark)', fontWeight: 700 }}>{recipientInfo.avatar_emoji} {recipientInfo.display_name} encontrado!</span>
                  : <span style={{ color: 'var(--red)' }}>Usuário não encontrado 😢</span>}
              </div>
            )}
          </div>

          {/* Message */}
          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: 12, color: 'var(--dark)', marginBottom: 6 }}>Mensagem 💬</label>
            <textarea className="input" value={msg} onChange={e => setMsg(e.target.value)}
              placeholder="Escreva algo fofo e especial... 🌸" rows={5} maxLength={500}
              style={{ fontFamily: 'var(--font-hand)', fontSize: 17, lineHeight: 1.6 }} />
            <p style={{ textAlign: 'right', fontSize: 11, color: 'var(--dark-muted)', marginTop: 3 }}>{msg.length}/500</p>
          </div>

          {/* Photo */}
          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: 12, color: 'var(--dark)', marginBottom: 6 }}>Foto (opcional) 📷</label>
            {photoPreview ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={photoPreview} alt="" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 10, border: '3px solid var(--green-light)' }} />
                <button onClick={() => { setPhoto(null); setPhotoPreview(null) }}
                  style={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: '50%', background: 'var(--red)', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                {uploading && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}><div className="loader loader-sm" style={{ margin: 0 }} /></div>}
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                style={{ width: '100%', padding: '14px', border: '2px dashed var(--dark-faint)', borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--dark-muted)', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}
                onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--green)'; e.currentTarget.style.background = 'var(--green-muted)' }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--dark-faint)'; e.currentTarget.style.background = 'none' }}>
                📷 Adicionar foto
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePhoto} />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn btn-pink" onClick={handleSend}
              disabled={sending || !to.trim() || !msg.trim() || !recipientInfo || uploading}>
              {sending ? 'Enviando...' : '💌 Enviar cartinha'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Letter View Modal ────────────────────────────────────────
function LetterModal({ letter, userId, onClose }) {
  const [confetti, setConfetti] = useState([])
  const person = letter.sender_id === userId ? letter.recipient : letter.sender

  useEffect(() => {
    // Generate confetti on open
    setConfetti(Array.from({ length: 12 }, (_, i) => ({
      id: i,
      emoji: ['💖','⭐','🌸','✨','💛','🎀'][i % 6],
      left: `${8 + (i * 8) % 88}%`,
      delay: `${i * 0.1}s`,
      color: ['#FF6B9D','#F5C800','#3A8C3F','#667EEA'][i % 4]
    })))
  }, [])

  const isReceived = letter.recipient_id === userId

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      {/* Confetti */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, pointerEvents: 'none', zIndex: 1001 }}>
        {confetti.map(c => (
          <span key={c.id} style={{ position: 'absolute', left: c.left, top: '-10px', fontSize: 20, animation: `confetti 2.5s ease forwards`, animationDelay: c.delay }}>
            {c.emoji}
          </span>
        ))}
      </div>

      <div style={{
        background: 'linear-gradient(145deg, #FFFEF7, #FFF8E1)',
        borderRadius: 'var(--radius)', padding: '36px 32px',
        maxWidth: 480, width: '100%',
        boxShadow: '0 20px 60px rgba(27,58,31,0.22)',
        animation: 'letterOpen 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        border: '3px solid var(--yellow-light)',
        position: 'relative', overflow: 'hidden'
      }}>
        {/* Decorative corner */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: 'linear-gradient(135deg, var(--pink-light), var(--yellow-light))', borderBottomLeftRadius: '100%', opacity: 0.5 }} />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, animation: 'heartbeat 1.5s ease infinite', display: 'inline-block' }}>💌</div>
          <p style={{ fontFamily: 'var(--font-cute)', fontSize: 13, color: 'var(--dark-muted)', marginTop: 8 }}>
            {isReceived ? 'Você recebeu uma cartinha de' : 'Você enviou para'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 24 }}>{person?.avatar_emoji || '💌'}</span>
            <div>
              <p style={{ fontWeight: 800, fontSize: 15 }}>{person?.display_name || 'Alguém especial'}</p>
              {person?.username && <p style={{ fontSize: 11, color: 'var(--dark-muted)' }}>@{person.username}</p>}
            </div>
          </div>
          <p style={{ fontSize: 10, color: 'var(--dark-muted)', marginTop: 6 }}>
            {new Date(letter.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Divider */}
        <div style={{ border: 'none', borderTop: '2px dashed rgba(245,200,0,0.4)', margin: '16px 0' }} />

        {/* Photo */}
        {letter.photo_url && (
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <img src={letter.photo_url} alt="" style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 16, boxShadow: '0 6px 24px rgba(27,58,31,0.12)', border: '3px solid var(--yellow-light)' }} />
          </div>
        )}

        {/* Message */}
        <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 16, padding: 20, backdropFilter: 'blur(4px)' }}>
          <p style={{ fontFamily: 'var(--font-hand)', fontSize: 20, color: 'var(--dark)', lineHeight: 1.7, whiteSpace: 'pre-wrap', textAlign: 'center' }}>
            {letter.message}
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <button className="btn btn-yellow" onClick={onClose}>Fechar 💛</button>
        </div>
      </div>
    </div>
  )
}
