import { useState } from 'react'
import { useToast } from '../hooks/useToast'
import styles from './ShareModal.module.css'

export default function ShareModal({ album, onClose }) {
  const toast = useToast()
  const shareUrl = `${window.location.origin}/shared/${album.share_token}`

  const copy = () => {
    navigator.clipboard.writeText(shareUrl)
    toast('Link copiado! 🔗', 'success')
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <h2>Compartilhar Álbum 🔗</h2>
        <p className={styles.desc}>
          Compartilhe este link com quem você quiser ver (ou editar) seu álbum!
        </p>

        <div className={styles.modeInfo}>
          <span className={styles.modeBadge}>
            {album.share_mode === 'edit' ? '✏️ Convidados podem editar' : '👁️ Somente visualização'}
          </span>
        </div>

        <div className={styles.linkBox}>
          <input
            className={styles.linkInput}
            value={shareUrl}
            readOnly
            onFocus={e=>e.target.select()}
          />
          <button className="btn btn-pink" onClick={copy} style={{background:'var(--pink)',color:'white'}}>
            Copiar
          </button>
        </div>

        <p className={styles.hint}>
          💡 Para mudar o modo de compartilhamento, edite o álbum na página anterior.
        </p>

        <div style={{display:'flex',justifyContent:'flex-end',marginTop:'20px'}}>
          <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}
