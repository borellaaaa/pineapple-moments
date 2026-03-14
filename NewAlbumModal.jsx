import { useState } from 'react'
import { moderateText } from '../lib/moderation'
import { useAuth } from '../hooks/useAuth'
import AlbumCover from './AlbumCover'
import { v4 as uuidv4 } from 'uuid'

const PRESETS = [
  ['#F5C800','#3A8C3F'],['#3A8C3F','#8BC34A'],['#FF6B6B','#FF8E53'],
  ['#667EEA','#764BA2'],['#F093FB','#F5576C'],['#4FACFE','#00F2FE'],
  ['#43E97B','#38F9D7'],['#FA709A','#FEE140'],['#A18CD1','#FBC2EB'],
  ['#FD7043','#FF8A65'],['#26C6DA','#00ACC1'],['#EC407A','#F48FB1'],
]

const EMOJIS = ['🍍','📸','💛','🌿','🌸','⭐','🦋','🍓','🌈','💖','🌙','🍦','🎀','✨','🌺','🍭','🐱','🐰','🌻','🍉','🎵','🎨','🌷','🦄','🍋','💫','🌊','🍄','🧸','🍰','🌼','🦩','🍩','🌟','💝','🎈','🐝','🍀','🎪','🦊']

export default function NewAlbumModal({ onClose, onCreate, loading }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [c1, setC1] = useState('#F5C800')
  const [c2, setC2] = useState('#3A8C3F')
  const [emoji, setEmoji] = useState('🍍')
  const [shareMode, setShareMode] = useState('view')
  const [tab, setTab] = useState('presets')
  const [showEmojis, setShowEmojis] = useState(false)

  const preview = { name, cover_color: c1, cover_accent: c2, cover_emoji: emoji }

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    const modName = await moderateText(name.trim())
    if (modName.blocked) { alert(`Nome bloqueado: ${modName.label} ⚠️`); return }
    if (desc.trim()) {
      const modDesc = await moderateText(desc.trim())
      if (modDesc.blocked) { alert(`Descrição bloqueada: ${modDesc.label} ⚠️`); return }
    }
    onCreate({ name: name.trim(), description: desc.trim(), cover_color: c1, cover_accent: c2, cover_emoji: emoji, share_mode: shareMode, share_token: uuidv4() })
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Novo Álbum 🍍</h2>

        <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
          {/* Preview */}
          <div style={{ textAlign:'center', minWidth:120 }}>
            <AlbumCover album={preview} size={130} />
            <p style={{ fontFamily:'var(--font-title)', fontSize:12, color:'var(--dark)', marginTop:8, maxWidth:130, wordBreak:'break-word' }}>{name || 'Nome do álbum'}</p>
          </div>

          {/* Form */}
          <form onSubmit={submit} style={{ flex:1, minWidth:220, display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={{ display:'block', fontWeight:700, fontSize:12, color:'var(--dark)', marginBottom:5 }}>Nome ✨</label>
              <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Viagem com a Mari" required maxLength={60} />
            </div>

            <div>
              <label style={{ display:'block', fontWeight:700, fontSize:12, color:'var(--dark)', marginBottom:5 }}>Descrição (opcional)</label>
              <textarea className="input" value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Uma breve descrição..." rows={2} maxLength={200} />
            </div>

            {/* Emoji */}
            <div>
              <label style={{ display:'block', fontWeight:700, fontSize:12, color:'var(--dark)', marginBottom:5 }}>Emoji da capa</label>
              <button type="button" onClick={() => setShowEmojis(!showEmojis)}
                style={{ fontSize:24, background:'white', border:'2px solid rgba(27,58,31,0.15)', borderRadius:10, padding:'4px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                {emoji} <span style={{ fontSize:10, color:'rgba(27,58,31,0.4)' }}>{showEmojis?'▲':'▼'}</span>
              </button>
              {showEmojis && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:4, background:'#f7faf0', border:'2px solid rgba(27,58,31,0.1)', borderRadius:10, padding:8, marginTop:6, maxHeight:140, overflowY:'auto' }}>
                  {EMOJIS.map(em => (
                    <button key={em} type="button"
                      style={{ fontSize:20, background: em===emoji?'var(--green-light)':'none', border: em===emoji?'2px solid var(--green)':'2px solid transparent', borderRadius:6, cursor:'pointer', padding:3, lineHeight:1 }}
                      onClick={() => { setEmoji(em); setShowEmojis(false) }}>{em}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Color */}
            <div>
              <label style={{ display:'block', fontWeight:700, fontSize:12, color:'var(--dark)', marginBottom:5 }}>Cor da capa 🎨</label>
              <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                {['presets','custom'].map(t => (
                  <button key={t} type="button" onClick={() => setTab(t)}
                    style={{ flex:1, padding:'6px', border:`2px solid ${tab===t?'var(--green)':'rgba(27,58,31,0.15)'}`, borderRadius:8, background: tab===t?'var(--green-light)':'white', color: tab===t?'var(--green-dark)':'rgba(27,58,31,0.5)', fontFamily:'var(--font-body)', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                    {t==='presets'?'Paletas':'Personalizar'}
                  </button>
                ))}
              </div>
              {tab === 'presets' && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:6 }}>
                  {PRESETS.map(([a,b],i) => (
                    <button key={i} type="button"
                      style={{ height:28, borderRadius:8, background:`linear-gradient(135deg,${a},${b})`, border: c1===a&&c2===b?'3px solid var(--dark)':'3px solid transparent', cursor:'pointer', transition:'transform 0.1s' }}
                      onClick={() => { setC1(a); setC2(b) }} />
                  ))}
                </div>
              )}
              {tab === 'custom' && (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[['Cor 1',c1,setC1],['Cor 2',c2,setC2]].map(([lbl,val,set]) => (
                    <div key={lbl} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:'var(--dark)', width:40 }}>{lbl}</span>
                      <input type="color" value={val} onChange={e=>set(e.target.value)} style={{ width:44, height:44, border:'2px solid rgba(27,58,31,0.15)', borderRadius:10, cursor:'pointer', padding:2 }} />
                      <span style={{ fontFamily:'var(--font-hand)', fontSize:14, color:'rgba(27,58,31,0.5)' }}>{val}</span>
                    </div>
                  ))}
                  <div style={{ height:24, borderRadius:8, background:`linear-gradient(135deg,${c1},${c2})`, boxShadow:'var(--shadow)' }} />
                </div>
              )}
            </div>

            {/* Share mode */}
            <div>
              <label style={{ display:'block', fontWeight:700, fontSize:12, color:'var(--dark)', marginBottom:5 }}>Compartilhamento</label>
              <div style={{ display:'flex', gap:8 }}>
                {[['view','👁️ Só ver'],['edit','✏️ Pode editar']].map(([val,lbl]) => (
                  <button key={val} type="button" onClick={() => setShareMode(val)}
                    style={{ flex:1, padding:'9px', border:`2px solid ${shareMode===val?'var(--green)':'rgba(27,58,31,0.15)'}`, borderRadius:10, background: shareMode===val?'var(--green-light)':'white', color: shareMode===val?'var(--green-dark)':'rgba(27,58,31,0.6)', fontFamily:'var(--font-body)', fontWeight:600, fontSize:13, cursor:'pointer' }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
                {loading ? 'Criando...' : 'Criar álbum 🎉'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
