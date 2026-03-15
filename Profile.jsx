import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { getProfile, upsertProfile, isUsernameAvailable, signOut, supabase } from '../lib/supabase'

const AVATARS = ['🍍','📸','💛','🌿','🌸','⭐','🦋','🍓','🌈','💖','🌙','🍦','🎀','✨','🌺','🍭','🐱','🐰','🌻','🍉','🎵','🎨','🌷','🦄','🍋','💫','🌊','🍄','🧸','🍰','🌼','🦩','🍩','🌟','💝','🎈','🐝','🍀','🎪','🦊']

export default function Profile() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [profile,           setProfile]           = useState(null)
  const [loading,           setLoading]           = useState(true)
  const [saving,            setSaving]            = useState(false)
  const [deleting,          setDeleting]          = useState(false)
  const [form,              setForm]              = useState({ display_name:'', username:'', bio:'', avatar_emoji:'🍍', birth_date:'' })
  const [isStaff,           setIsStaff]           = useState(false)
  const [usernameStatus,    setUsernameStatus]    = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteInput,       setDeleteInput]       = useState('')
  const [showAvatars,       setShowAvatars]       = useState(false)
  const usernameTimer = useRef(null)

  useEffect(() => {
    getProfile(user.id).then(({ data }) => {
      setProfile(data)
      if (data) setForm({
        display_name: data.display_name || '',
        username:     data.username     || '',
        bio:          data.bio          || '',
        avatar_emoji: data.avatar_emoji || '🍍',
        birth_date:   data.birth_date   || '',
      })
      // Checar se é admin/staff
      const { data: staffData } = await supabase.from('admin_staff').select('role').eq('user_id', user.id).maybeSingle()
      setIsStaff(!!staffData)
      setLoading(false)
    })
  }, [user])

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

  const canSave = () => {
    if (!form.display_name.trim()) return false
    if (form.username && (usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'checking')) return false
    return true
  }

  const handleSave = async () => {
    if (!canSave()) return
    setSaving(true)
    const { error } = await upsertProfile(user.id, {
      display_name: form.display_name.trim(),
      username:     form.username.trim() || null,
      bio:          form.bio.trim(),
      avatar_emoji: form.avatar_emoji,
      birth_date:   form.birth_date || null,
    })
    setSaving(false)
    if (error) { toast('Erro ao salvar perfil 😢','error'); return }
    toast('Perfil atualizado! ✨','success')
    setUsernameStatus(null)
  }

  // ── EXCLUSÃO TOTAL DA CONTA ──────────────────────────
  // Usa RPC com SECURITY DEFINER que roda no servidor com permissões
  // para deletar o registro em auth.users (o client SDK não pode fazer isso).
  // Isso garante que username, perfil, álbuns, cartinhas e o login somem de verdade.
  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETAR') return
    setDeleting(true)
    try {
      // Tenta via RPC primeiro (deleta tudo incluindo auth.users)
      const { error } = await supabase.rpc('delete_user_account')
      if (error) {
        // Fallback: deleta dados manualmente se RPC não existir ainda
        await supabase.from('letters').delete().eq('sender_id', user.id)
        await supabase.from('letters').delete().eq('recipient_id', user.id)
        await supabase.from('saved_albums').delete().eq('user_id', user.id)
        const { data: userAlbums } = await supabase.from('albums').select('id').eq('owner_id', user.id)
        if (userAlbums?.length > 0) {
          await supabase.from('pages').delete().in('album_id', userAlbums.map(a => a.id))
          await supabase.from('albums').delete().eq('owner_id', user.id)
        }
        await supabase.from('profiles').delete().eq('id', user.id)
      }
      // Remove fotos do storage
      const { data: files } = await supabase.storage.from('album-photos').list(user.id)
      if (files?.length > 0) {
        await supabase.storage.from('album-photos').remove(files.map(f => `${user.id}/${f.name}`))
      }
    } catch (err) {
      console.error('Erro ao deletar conta:', err)
    }
    await signOut()
    navigate('/')
  }

  if (loading) return <div className="loader" style={{ marginTop:80 }}/>

  const usernameHint = {
    null:     null,
    checking: { color:'var(--dark-muted)', text:'Verificando...' },
    ok:       { color:'var(--green)',      text:'✅ Disponível!' },
    taken:    { color:'var(--red)',        text:'❌ Já está em uso' },
    invalid:  { color:'var(--red)',        text:'❌ Use letras, números, _ ou . (mín. 3)' },
  }[usernameStatus]

  return (
    <div style={{ minHeight:'100vh', background:'var(--cream)' }}>
      <header style={{ background:'white', borderBottom:'2px solid var(--dark-faint)', padding:'0 20px', position:'sticky', top:0, zIndex:100, boxShadow:'0 2px 12px rgba(27,58,31,0.06)' }}>
        <div style={{ maxWidth:640, margin:'0 auto', height:60, display:'flex', alignItems:'center', gap:16 }}>
          <Link to="/dashboard" style={{ color:'var(--green)', fontWeight:700, textDecoration:'none', fontSize:13 }}>← Voltar</Link>
          <span style={{ fontFamily:'var(--font-title)', fontSize:17, color:'var(--dark)' }}>Meu Perfil</span>
        </div>
      </header>

      <main style={{ maxWidth:640, margin:'0 auto', padding:'32px 20px 80px' }}>
        {/* Avatar */}
        <div style={{ textAlign:'center', marginBottom:32, animation:'fadeInUp 0.4s ease' }}>
          <button onClick={() => setShowAvatars(!showAvatars)}
            style={{ fontSize:64, background:'white', border:'4px solid var(--green-light)', borderRadius:'50%', width:110, height:110, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', boxShadow:'var(--shadow-md)', transition:'all 0.2s', lineHeight:1 }}
            onMouseOver={e => e.currentTarget.style.transform='scale(1.07)'}
            onMouseOut={e  => e.currentTarget.style.transform=''}>
            {form.avatar_emoji}
          </button>
          <p style={{ marginTop:8, fontSize:12, color:'var(--dark-muted)', fontFamily:'var(--font-cute)' }}>Clique para trocar</p>
          {showAvatars && (
            <div style={{ background:'white', border:'2px solid var(--dark-faint)', borderRadius:'var(--radius)', padding:12, marginTop:10, display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:4, animation:'slideDown 0.2s ease', boxShadow:'var(--shadow)' }}>
              {AVATARS.map(a => (
                <button key={a} onClick={() => { setForm(f => ({...f,avatar_emoji:a})); setShowAvatars(false) }}
                  style={{ fontSize:22, background:a===form.avatar_emoji?'var(--green-light)':'none', border:a===form.avatar_emoji?'2px solid var(--green)':'2px solid transparent', borderRadius:8, cursor:'pointer', padding:4, transition:'all 0.1s', lineHeight:1 }}>
                  {a}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Form */}
        <div style={{ background:'white', borderRadius:'var(--radius)', padding:28, boxShadow:'var(--shadow)', marginBottom:20, animation:'fadeInUp 0.4s ease 0.1s both' }}>
          <h2 style={{ fontFamily:'var(--font-title)', fontSize:18, color:'var(--green)', marginBottom:22 }}>Informações do perfil</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <div>
              <label style={{ display:'block', fontWeight:700, fontSize:12, color:'var(--dark)', marginBottom:6 }}>Nome de exibição ✨</label>
              <input className="input" value={form.display_name} onChange={e => setForm(f => ({...f,display_name:e.target.value}))} placeholder="Como você quer ser chamado?" maxLength={50}/>
            </div>
            <div>
              <label style={{ display:'block', fontWeight:700, fontSize:12, color:'var(--dark)', marginBottom:6 }}>Nome de usuário 🔖</label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--dark-muted)', fontSize:14, fontWeight:700 }}>@</span>
                <input className={`input ${usernameStatus==='taken'||usernameStatus==='invalid'?'input-error':''}`}
                  style={{ paddingLeft:30 }} value={form.username} onChange={e => handleUsernameChange(e.target.value)} placeholder="seu.usuario" maxLength={30}/>
              </div>
              {usernameHint && <p style={{ fontSize:11, marginTop:5, color:usernameHint.color, fontWeight:600 }}>{usernameHint.text}</p>}
              <p style={{ fontSize:11, marginTop:4, color:'var(--dark-muted)' }}>Usado para receber cartinhas 💌</p>
            </div>
            <div>
              <label style={{ display:'block', fontWeight:700, fontSize:12, color:'var(--dark)', marginBottom:6 }}>Data de nascimento 🎂</label>
              <input type="date" className="input" value={form.birth_date}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setForm(f => ({...f, birth_date: e.target.value}))} />
              <p style={{ fontSize:11, color:'var(--dark-muted)', marginTop:3 }}>Necessária para conformidade com a LGPD</p>
            </div>
            <div>
              <label style={{ display:'block', fontWeight:700, fontSize:12, color:'var(--dark)', marginBottom:6 }}>Bio (opcional)</label>
              <textarea className="input" value={form.bio} onChange={e => setForm(f => ({...f,bio:e.target.value}))} placeholder="Conte um pouco sobre você..." maxLength={160} rows={3}/>
              <p style={{ fontSize:11, color:'var(--dark-muted)', marginTop:4, textAlign:'right' }}>{form.bio.length}/160</p>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:8 }}>
              <p style={{ fontSize:11, color:'var(--dark-muted)', fontFamily:'var(--font-cute)' }}>📧 {user?.email}</p>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving||!canSave()}>
                {saving ? <><span className="loader loader-sm" style={{margin:0}}/> Salvando...</> : 'Salvar ✨'}
              </button>
            </div>
          </div>
        </div>

        {/* Admin link */}
        {isStaff && (
          <div style={{ background:'white', borderRadius:'var(--radius)', padding:20, boxShadow:'var(--shadow)', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', animation:'fadeInUp 0.4s ease 0.15s both' }}>
            <div>
              <p style={{ fontWeight:700, fontSize:14, color:'var(--dark)' }}>🛡️ Painel Administrativo</p>
              <p style={{ fontSize:12, color:'var(--dark-muted)', fontFamily:'var(--font-cute)' }}>Gerencie usuários e conteúdo da plataforma</p>
            </div>
            <a href="/admin" style={{ textDecoration:'none' }}>
              <button className="btn btn-primary btn-sm">Acessar Admin</button>
            </a>
          </div>
        )}

        {/* Exportar dados */}
        <div style={{ background:'white', borderRadius:'var(--radius)', padding:28, boxShadow:'var(--shadow)', marginBottom:20, animation:'fadeInUp 0.4s ease 0.18s both' }}>
          <h2 style={{ fontFamily:'var(--font-title)', fontSize:18, color:'var(--dark)', marginBottom:10 }}>Seus dados 📦</h2>
          <p style={{ color:'var(--dark-muted)', fontSize:13, fontFamily:'var(--font-cute)', marginBottom:16, lineHeight:1.6 }}>
            Conforme a LGPD, você pode solicitar uma cópia de todos os seus dados pessoais armazenados na plataforma.
          </p>
          <button className="btn btn-ghost btn-sm" onClick={async () => {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
            const { data: albums } = await supabase.from('albums').select('name, description, created_at').eq('owner_id', user.id)
            const { data: letters } = await supabase.from('letters').select('message, created_at').eq('sender_id', user.id)
            const exportData = { perfil: profile, albuns: albums, cartinhas_enviadas: letters, exportado_em: new Date().toISOString() }
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url; a.download = 'meus-dados-pineapple.json'; a.click()
            URL.revokeObjectURL(url)
            toast('Dados exportados! 📦', 'success')
          }}>
            📥 Exportar meus dados (JSON)
          </button>
        </div>

        {/* Danger Zone */}
        <div style={{ background:'white', borderRadius:'var(--radius)', padding:28, boxShadow:'var(--shadow)', border:'2px solid rgba(229,57,53,0.12)', animation:'fadeInUp 0.4s ease 0.2s both' }}>
          <h2 style={{ fontFamily:'var(--font-title)', fontSize:18, color:'var(--red)', marginBottom:10 }}>Zona de perigo ⚠️</h2>
          <p style={{ color:'var(--dark-muted)', fontSize:13, fontFamily:'var(--font-cute)', marginBottom:16, lineHeight:1.6 }}>
            Ao deletar sua conta, <strong>todos os seus dados serão apagados permanentemente</strong>: álbuns, páginas, fotos, cartinhas, nome de usuário e perfil. Esta ação não pode ser desfeita.
          </p>
          {!showDeleteConfirm ? (
            <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>🗑️ Deletar minha conta</button>
          ) : (
            <div style={{ background:'rgba(229,57,53,0.05)', borderRadius:'var(--radius-sm)', padding:16 }}>
              <p style={{ fontWeight:700, fontSize:13, marginBottom:10, color:'var(--red)' }}>
                Digite <strong>DELETAR</strong> para confirmar a exclusão total:
              </p>
              <input className="input input-error" value={deleteInput} onChange={e => setDeleteInput(e.target.value)} placeholder="DELETAR" style={{ marginBottom:10 }}/>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { setShowDeleteConfirm(false); setDeleteInput('') }}>Cancelar</button>
                <button className="btn btn-sm" style={{ background:'var(--red)', color:'white' }}
                  onClick={handleDeleteAccount} disabled={deleteInput!=='DELETAR'||deleting}>
                  {deleting ? 'Deletando tudo...' : 'Confirmar exclusão total'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
