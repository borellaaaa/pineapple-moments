import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { upsertProfile, isUsernameAvailable } from '../lib/supabase'

const AVATARS = ['🍍','📸','💛','🌿','🌸','⭐','🦋','🍓','🌈','💖','🌙','🍦','🎀','✨','🌺','🍭','🐱','🐰','🌻','🍉','🎵','🎨','🌷','🦄','🍋','💫','🌊','🍄','🧸','🍰','🌼','🦩','🍩','🌟','💝','🎈','🐝','🍀','🎪','🦊']

function calcAge(birthDate) {
  if (!birthDate) return null
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const usernameTimer = useRef(null)

  const [step, setStep] = useState(1) // 1=info, 2=avatar, 3=termos
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    display_name: user?.user_metadata?.full_name || '',
    username: '',
    birth_date: '',
    avatar_emoji: '🍍',
    accepted_terms: false,
    accepted_privacy: false,
  })
  const [usernameStatus, setUsernameStatus] = useState(null)

  const handleUsernameChange = (val) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_.]/g, '')
    setForm(f => ({ ...f, username: clean }))
    setUsernameStatus(null)
    clearTimeout(usernameTimer.current)
    if (!clean || clean.length < 3) return
    if (!/^[a-z0-9][a-z0-9_.]{2,}$/.test(clean)) { setUsernameStatus('invalid'); return }
    setUsernameStatus('checking')
    usernameTimer.current = setTimeout(async () => {
      const ok = await isUsernameAvailable(clean, user.id)
      setUsernameStatus(ok ? 'ok' : 'taken')
    }, 600)
  }

  const age = calcAge(form.birth_date)
  const isUnderage = age !== null && age < 13

  const canStep1 = form.display_name.trim().length >= 2 &&
    form.username.length >= 3 &&
    usernameStatus === 'ok' &&
    form.birth_date &&
    !isUnderage

  const canFinish = form.accepted_terms && form.accepted_privacy

  const handleFinish = async () => {
    if (!canFinish) return
    setSaving(true)
    const { error } = await upsertProfile(user.id, {
      display_name:      form.display_name.trim(),
      username:          form.username.trim(),
      avatar_emoji:      form.avatar_emoji,
      birth_date:        form.birth_date,
      is_onboarded:      true,
      accepted_terms:    true,
      terms_accepted_at: new Date().toISOString(),
    })
    setSaving(false)
    if (error) { toast('Erro ao salvar perfil 😢', 'error'); return }
    toast('Bem-vindo ao Pineapple Moments! 🍍', 'success')
    navigate('/dashboard')
  }

  const usernameHint = {
    null: null,
    checking: { color: 'var(--dark-muted)', text: 'Verificando...' },
    ok:       { color: 'var(--green)',      text: '✅ Disponível!' },
    taken:    { color: 'var(--red)',        text: '❌ Já está em uso' },
    invalid:  { color: 'var(--red)',        text: '❌ Use letras, números, _ ou . (mín. 3)' },
  }[usernameStatus]

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#eaf5ea,#f7faf0,#fffde7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'white', borderRadius: 28, padding: '40px 36px', maxWidth: 460, width: '100%', boxShadow: '0 24px 64px rgba(58,140,63,0.14)', animation: 'pop 0.4s ease' }}>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 99, background: s <= step ? 'var(--green)' : 'var(--dark-faint)', transition: 'background 0.3s' }} />
          ))}
        </div>

        {/* ── Step 1: Informações básicas ── */}
        {step === 1 && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 52, marginBottom: 8 }}>👋</div>
              <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 22, color: 'var(--green)', marginBottom: 6 }}>Bem-vindo!</h1>
              <p style={{ color: 'var(--dark-muted)', fontFamily: 'var(--font-cute)', fontSize: 14 }}>
                Vamos configurar seu perfil rapidinho 🌸
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: 12, color: 'var(--dark)', marginBottom: 6 }}>
                  Como você quer ser chamado? ✨ <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <input className="input" value={form.display_name}
                  onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                  placeholder="Seu nome ou apelido" maxLength={50} />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: 12, color: 'var(--dark)', marginBottom: 6 }}>
                  Escolha seu @usuário 🔖 <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--dark-muted)', fontWeight: 700 }}>@</span>
                  <input className="input" style={{ paddingLeft: 30 }}
                    value={form.username} onChange={e => handleUsernameChange(e.target.value)}
                    placeholder="seu.usuario" maxLength={30} />
                </div>
                {usernameHint && <p style={{ fontSize: 11, marginTop: 4, color: usernameHint.color, fontWeight: 600 }}>{usernameHint.text}</p>}
                <p style={{ fontSize: 11, marginTop: 3, color: 'var(--dark-muted)' }}>Usado para receber cartinhas 💌 (não pode ser alterado facilmente)</p>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: 12, color: 'var(--dark)', marginBottom: 6 }}>
                  Data de nascimento 🎂 <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <input type="date" className="input"
                  value={form.birth_date}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} />
                {isUnderage && (
                  <p style={{ fontSize: 12, marginTop: 5, color: 'var(--red)', fontWeight: 700 }}>
                    ⚠️ É necessário ter pelo menos 13 anos para usar o Pineapple Moments.
                  </p>
                )}
                {age !== null && !isUnderage && (
                  <p style={{ fontSize: 11, marginTop: 4, color: 'var(--green)', fontWeight: 600 }}>✅ {age} anos</p>
                )}
                <p style={{ fontSize: 11, marginTop: 3, color: 'var(--dark-muted)' }}>
                  Necessária para conformidade com a LGPD e proteção de menores
                </p>
              </div>

              <button className="btn btn-primary" style={{ marginTop: 8 }}
                onClick={() => setStep(2)} disabled={!canStep1}>
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Avatar ── */}
        {step === 2 && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 72, marginBottom: 8, display: 'inline-block', background: 'var(--green-light)', borderRadius: '50%', width: 100, height: 100, lineHeight: '100px' }}>{form.avatar_emoji}</div>
              <h2 style={{ fontFamily: 'var(--font-title)', fontSize: 20, color: 'var(--green)', marginBottom: 6 }}>Escolha seu avatar 🎨</h2>
              <p style={{ color: 'var(--dark-muted)', fontFamily: 'var(--font-cute)', fontSize: 13 }}>Ele vai aparecer no seu perfil e nas cartinhas</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, marginBottom: 24 }}>
              {AVATARS.map(a => (
                <button key={a} onClick={() => setForm(f => ({ ...f, avatar_emoji: a }))}
                  style={{ fontSize: 24, background: a === form.avatar_emoji ? 'var(--green-light)' : 'none', border: a === form.avatar_emoji ? '2px solid var(--green)' : '2px solid transparent', borderRadius: 10, cursor: 'pointer', padding: 6, transition: 'all 0.1s', lineHeight: 1 }}>
                  {a}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>← Voltar</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep(3)}>Continuar →</button>
            </div>
          </div>
        )}

        {/* ── Step 3: Termos ── */}
        {step === 3 && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>📋</div>
              <h2 style={{ fontFamily: 'var(--font-title)', fontSize: 20, color: 'var(--green)', marginBottom: 6 }}>Quase lá!</h2>
              <p style={{ color: 'var(--dark-muted)', fontFamily: 'var(--font-cute)', fontSize: 13 }}>Leia e aceite nossos termos para continuar</p>
            </div>

            <div style={{ background: 'var(--cream)', borderRadius: 12, padding: 16, marginBottom: 20, fontSize: 13, color: 'var(--dark)', lineHeight: 1.7, maxHeight: 160, overflowY: 'auto' }}>
              <p><strong>Ao usar o Pineapple Moments você concorda que:</strong></p>
              <ul style={{ paddingLeft: 18, marginTop: 8 }}>
                <li>Tem pelo menos 13 anos de idade</li>
                <li>Não publicará conteúdo ofensivo, violento ou sexual</li>
                <li>Não assediará outros usuários</li>
                <li>Não publicará conteúdo envolvendo menores de forma inapropriada</li>
                <li>Seus dados serão tratados conforme a LGPD</li>
                <li>Violações graves resultam em banimento permanente</li>
              </ul>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.accepted_terms}
                  onChange={e => setForm(f => ({ ...f, accepted_terms: e.target.checked }))}
                  style={{ marginTop: 2, width: 18, height: 18, accentColor: 'var(--green)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--dark)', lineHeight: 1.5 }}>
                  Li e aceito os <Link to="/terms" target="_blank" style={{ color: 'var(--green)', fontWeight: 700 }}>Termos de Serviço</Link> <span style={{ color: 'var(--red)' }}>*</span>
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.accepted_privacy}
                  onChange={e => setForm(f => ({ ...f, accepted_privacy: e.target.checked }))}
                  style={{ marginTop: 2, width: 18, height: 18, accentColor: 'var(--green)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--dark)', lineHeight: 1.5 }}>
                  Li e aceito a <Link to="/privacy" target="_blank" style={{ color: 'var(--green)', fontWeight: 700 }}>Política de Privacidade</Link> e o tratamento dos meus dados <span style={{ color: 'var(--red)' }}>*</span>
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setStep(2)}>← Voltar</button>
              <button className="btn btn-primary" style={{ flex: 1 }}
                onClick={handleFinish} disabled={!canFinish || saving}>
                {saving ? <><span className="loader loader-sm" style={{ margin: 0 }} /> Criando...</> : '🍍 Entrar no Pineapple!'}
              </button>
            </div>

            <p style={{ fontSize: 11, color: 'var(--dark-muted)', textAlign: 'center', marginTop: 16, fontFamily: 'var(--font-cute)' }}>
              Você pode excluir sua conta a qualquer momento nas configurações de perfil
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
