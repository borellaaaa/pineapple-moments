import { useToast } from '../hooks/useToast'

export default function ShareModal({ album, onClose }) {
  const toast = useToast()
  const url = `${window.location.origin}/shared/${album.share_token}`

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Compartilhar 🔗</h2>
        <p style={{ color:'rgba(27,58,31,0.65)', fontFamily:'var(--font-cute)', fontSize:14, marginBottom:16 }}>
          Envie este link para quem você quiser!
        </p>
        <div style={{ background:'#f0fff0', border:'2px solid var(--green-light)', borderRadius:10, padding:'6px 10px', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:13 }}>{album.share_mode==='edit'?'✏️ Convidados podem editar':'👁️ Somente visualização'}</span>
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <input readOnly value={url} onFocus={e=>e.target.select()}
            style={{ flex:1, padding:'10px 12px', border:'2px solid rgba(27,58,31,0.15)', borderRadius:10, fontFamily:'var(--font-cute)', fontSize:12, color:'var(--dark)', outline:'none', background:'white' }} />
          <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(url); toast('Link copiado! 🔗','success') }}>
            Copiar
          </button>
        </div>
        <p style={{ fontSize:11, color:'rgba(27,58,31,0.45)', fontFamily:'var(--font-cute)' }}>
          💡 Para alterar o modo de compartilhamento, edite o álbum.
        </p>
        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:20 }}>
          <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}
