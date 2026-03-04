import { useState } from 'react'
import AlbumCover from './AlbumCover'
import styles from './NewAlbumModal.module.css'

const PRESETS = [
  ['#F5C800', '#3A8C3F'],
  ['#3A8C3F', '#8BC34A'],
  ['#FF6B6B', '#FF8E53'],
  ['#667EEA', '#764BA2'],
  ['#F093FB', '#F5576C'],
  ['#4FACFE', '#00F2FE'],
  ['#43E97B', '#38F9D7'],
  ['#FA709A', '#FEE140'],
  ['#A18CD1', '#FBC2EB'],
  ['#FD7043', '#FF8A65'],
  ['#26C6DA', '#00ACC1'],
  ['#EC407A', '#F48FB1'],
]

const EMOJIS = [
  '🍍','📸','💛','🌿','🌸','⭐','🦋','🍓','🌈','💖',
  '🌙','🍦','🎀','✨','🌺','🍭','🐱','🐰','🌻','🍉',
  '🎵','🎨','🌷','🦄','🍋','💫','🌊','🍄','🎠','🧸',
  '🍰','🌼','🦩','🎡','🍩','🌟','💝','🎈','🐝','🌿',
  '🏖️','🎪','🦊','🐸','🍀','🌍','🏔️','🎭','🦋','🌙',
]

export default function NewAlbumModal({ onClose, onCreate, loading }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color1, setColor1] = useState('#F5C800')
  const [color2, setColor2] = useState('#3A8C3F')
  const [emoji, setEmoji] = useState('🍍')
  const [shareMode, setShareMode] = useState('view')
  const [tab, setTab] = useState('presets')
  const [showEmojis, setShowEmojis] = useState(false)

  const previewAlbum = {
    name, description,
    cover_color: color1,
    cover_accent: color2,
    cover_emoji: emoji,
  }

  const handle = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onCreate({
      name: name.trim(),
      description: description.trim(),
      cover_color: color1,
      cover_accent: color2,
      cover_emoji: emoji,
      share_mode: shareMode,
    })
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:'580px'}}>
        <h2>Novo Álbum 🍍</h2>
        <div className={styles.layout}>
          <div className={styles.preview}>
            <AlbumCover album={previewAlbum} />
            <p className={styles.previewName}>{name || 'Nome do álbum'}</p>
            {description && <p className={styles.previewDesc}>{description}</p>}
            <div className={styles.colorDots}>
              <span style={{background: color1}} className={styles.dot}/>
              <span style={{background: color2}} className={styles.dot}/>
            </div>
          </div>

          <form onSubmit={handle} className={styles.form}>
            <div className={styles.field}>
              <label>Nome do álbum ✨</label>
              <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Viagem com a Mari" required maxLength={60} />
            </div>
            <div className={styles.field}>
              <label>Descrição (opcional) 💛</label>
              <textarea className="input" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Uma breve descrição..." rows={2} maxLength={200} />
            </div>

            {/* Emoji picker */}
            <div className={styles.field}>
              <label>Emoji da capa</label>
              <div className={styles.emojiRow}>
                <button type="button" className={styles.emojiSelected} onClick={()=>setShowEmojis(!showEmojis)}>
                  {emoji} <span className={styles.emojiArrow}>{showEmojis ? '▲' : '▼'}</span>
                </button>
                <span className={styles.emojiHint}>Clique para trocar</span>
              </div>
              {showEmojis && (
                <div className={styles.emojiGrid}>
                  {EMOJIS.map(e => (
                    <button
                      key={e}
                      type="button"
                      className={`${styles.emojiBtn} ${emoji===e?styles.emojiActive:''}`}
                      onClick={()=>{ setEmoji(e); setShowEmojis(false) }}
                    >{e}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Color picker */}
            <div className={styles.field}>
              <label>Cor da capa 🎨</label>
              <div className={styles.colorTabs}>
                <button type="button" className={`${styles.colorTab} ${tab==='presets'?styles.colorTabActive:''}`} onClick={()=>setTab('presets')}>Paletas prontas</button>
                <button type="button" className={`${styles.colorTab} ${tab==='custom'?styles.colorTabActive:''}`} onClick={()=>setTab('custom')}>Personalizar</button>
              </div>
              {tab === 'presets' && (
                <div className={styles.colorGrid}>
                  {PRESETS.map(([c1, c2], i) => (
                    <button key={i} type="button"
                      className={`${styles.colorBtn} ${color1===c1&&color2===c2?styles.selected:''}`}
                      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                      onClick={()=>{ setColor1(c1); setColor2(c2) }}
                    />
                  ))}
                </div>
              )}
              {tab === 'custom' && (
                <div className={styles.customColors}>
                  <div className={styles.colorPickerRow}>
                    <label>Cor 1</label>
                    <div className={styles.pickerWrap}>
                      <input type="color" value={color1} onChange={e=>setColor1(e.target.value)} className={styles.colorInput} />
                      <span className={styles.colorHex}>{color1}</span>
                    </div>
                  </div>
                  <div className={styles.colorPickerRow}>
                    <label>Cor 2</label>
                    <div className={styles.pickerWrap}>
                      <input type="color" value={color2} onChange={e=>setColor2(e.target.value)} className={styles.colorInput} />
                      <span className={styles.colorHex}>{color2}</span>
                    </div>
                  </div>
                  <div className={styles.previewGradient} style={{background:`linear-gradient(135deg, ${color1}, ${color2})`}} />
                </div>
              )}
            </div>

            <div className={styles.field}>
              <label>Modo de compartilhamento 🔗</label>
              <div className={styles.modeRow}>
                <button type="button" className={`${styles.modeBtn} ${shareMode==='view'?styles.modeActive:''}`} onClick={()=>setShareMode('view')}>👁️ Só visualizar</button>
                <button type="button" className={`${styles.modeBtn} ${shareMode==='edit'?styles.modeActive:''}`} onClick={()=>setShareMode('edit')}>✏️ Pode editar</button>
              </div>
            </div>

            <div className={styles.actions}>
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
