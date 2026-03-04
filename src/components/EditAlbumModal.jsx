import { useState } from 'react'
import AlbumCover from './AlbumCover'
import styles from './NewAlbumModal.module.css'

const COLORS = [
  ['#F5C800', '#3A8C3F'],
  ['#3A8C3F', '#8BC34A'],
  ['#8BC34A', '#F5C800'],
  ['#F5C800', '#AED581'],
  ['#2A6B2E', '#F5C800'],
  ['#AED581', '#3A8C3F'],
  ['#FFB300', '#3A8C3F'],
  ['#3A8C3F', '#F5C800'],
]

export default function EditAlbumModal({ album, onClose, onSave }) {
  const [name, setName] = useState(album.name)
  const [description, setDescription] = useState(album.description || '')
  const [colorPair, setColorPair] = useState(() => {
    const idx = COLORS.findIndex(([c]) => c === album.cover_color)
    return idx >= 0 ? idx : 0
  })
  const [shareMode, setShareMode] = useState(album.share_mode || 'view')
  const [loading, setLoading] = useState(false)

  const previewAlbum = {
    name, description,
    cover_color: COLORS[colorPair][0],
    cover_accent: COLORS[colorPair][1],
  }

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true)
    await onSave({
      name: name.trim(),
      description: description.trim(),
      cover_color: COLORS[colorPair][0],
      cover_accent: COLORS[colorPair][1],
      share_mode: shareMode,
    })
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:'560px'}}>
        <h2>Editar Álbum ✏️</h2>
        <div className={styles.layout}>
          <div className={styles.preview}>
            <AlbumCover album={previewAlbum} />
            <p className={styles.previewName}>{name || 'Nome do álbum'}</p>
          </div>
          <form onSubmit={handle} className={styles.form}>
            <div className={styles.field}>
              <label>Nome do álbum ✨</label>
              <input className="input" value={name} onChange={e=>setName(e.target.value)} required maxLength={60} />
            </div>
            <div className={styles.field}>
              <label>Descrição (opcional) 💛</label>
              <textarea className="input" value={description} onChange={e=>setDescription(e.target.value)} rows={2} maxLength={200} />
            </div>
            <div className={styles.field}>
              <label>Cor da capa 🎨</label>
              <div className={styles.colorGrid}>
                {COLORS.map(([c1, c2], i) => (
                  <button key={i} type="button"
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
                <button type="button" className={`${styles.modeBtn} ${shareMode==='view'?styles.modeActive:''}`} onClick={()=>setShareMode('view')}>👁️ Só visualizar</button>
                <button type="button" className={`${styles.modeBtn} ${shareMode==='edit'?styles.modeActive:''}`} onClick={()=>setShareMode('edit')}>✏️ Pode editar</button>
              </div>
            </div>
            <div className={styles.actions}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
                {loading ? 'Salvando...' : 'Salvar ✨'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
