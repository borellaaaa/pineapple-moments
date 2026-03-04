import { useState } from 'react'
import AlbumCover from './AlbumCover'
import styles from './NewAlbumModal.module.css'

const COLORS = [
  ['#FFD93D', '#FF6B9D'],
  ['#FF6B9D', '#C9B1FF'],
  ['#98F5E1', '#FFD93D'],
  ['#C9B1FF', '#FF6B9D'],
  ['#FFB347', '#FF6B9D'],
  ['#98F5E1', '#C9B1FF'],
  ['#FF6B9D', '#FFD93D'],
  ['#C9B1FF', '#98F5E1'],
]

export default function NewAlbumModal({ onClose, onCreate, loading }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [colorPair, setColorPair] = useState(0)
  const [shareMode, setShareMode] = useState('view')

  const previewAlbum = {
    name,
    description,
    cover_color: COLORS[colorPair][0],
    cover_accent: COLORS[colorPair][1],
  }

  const handle = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onCreate({
      name: name.trim(),
      description: description.trim(),
      cover_color: COLORS[colorPair][0],
      cover_accent: COLORS[colorPair][1],
      share_mode: shareMode,
    })
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:'560px'}}>
        <h2>Novo Álbum 🍍</h2>
        <div className={styles.layout}>
          <div className={styles.preview}>
            <AlbumCover album={previewAlbum} />
            <p className={styles.previewName}>{name || 'Nome do álbum'}</p>
            {description && <p className={styles.previewDesc}>{description}</p>}
          </div>
          <form onSubmit={handle} className={styles.form}>
            <div className={styles.field}>
              <label>Nome do álbum ✨</label>
              <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Viagem com a Mari" required maxLength={60} />
            </div>
            <div className={styles.field}>
              <label>Descrição (opcional) 💕</label>
              <textarea className="input" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Uma breve descrição..." rows={2} maxLength={200} />
            </div>

            <div className={styles.field}>
              <label>Cor da capa 🎨</label>
              <div className={styles.colorGrid}>
                {COLORS.map(([c1, c2], i) => (
                  <button
                    key={i}
                    type="button"
                    className={`${styles.colorBtn} ${colorPair===i?styles.selected:''}`}
                    style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                    onClick={()=>setColorPair(i)}
                  />
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label>Modo de compartilhamento 🔗</label>
              <div className={styles.modeRow}>
                <button
                  type="button"
                  className={`${styles.modeBtn} ${shareMode==='view'?styles.modeActive:''}`}
                  onClick={()=>setShareMode('view')}
                >
                  👁️ Só visualizar
                </button>
                <button
                  type="button"
                  className={`${styles.modeBtn} ${shareMode==='edit'?styles.modeActive:''}`}
                  onClick={()=>setShareMode('edit')}
                >
                  ✏️ Pode editar
                </button>
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
