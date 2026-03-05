import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getAlbumByToken, getPages, updatePage } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import AlbumCover from '../components/AlbumCover'
import PageCanvas from '../components/PageCanvas'

export default function SharedAlbum() {
  const { token } = useParams()
  const { user } = useAuth()
  const [album, setAlbum] = useState(null)
  const [pages, setPages] = useState([])
  const [cur, setCur] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    getAlbumByToken(token).then(({ data, error }) => {
      if (error || !data) { setNotFound(true); setLoading(false); return }
      setAlbum(data)
      getPages(data.id).then(({ data: p }) => { setPages(p || []); setLoading(false) })
    })
  }, [token])

  if (loading) return <div className="loader" style={{ marginTop:80 }} />

  if (notFound) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', textAlign:'center', padding:24, gap:12 }}>
      <div style={{ fontSize:64 }}>🔍</div>
      <h2 style={{ fontFamily:'var(--font-title)', fontSize:24, color:'var(--dark)' }}>Álbum não encontrado</h2>
      <p style={{ color:'rgba(27,58,31,0.55)', fontFamily:'var(--font-cute)' }}>Este link pode ter expirado 😢</p>
      <Link to="/" className="btn btn-primary">Ir para o início</Link>
    </div>
  )

  const canEdit = album.share_mode === 'edit'
  const page = pages[cur]

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <header style={{ background:'white', borderBottom:'2px solid rgba(27,58,31,0.07)', padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <span style={{ fontFamily:'var(--font-title)', fontSize:17, color:'var(--green)' }}>🍍 {album.name}</span>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:12, fontWeight:700, background:canEdit?'var(--green-light)':'#FFF8E1', color:canEdit?'var(--green-dark)':'#8d6e00', padding:'5px 12px', borderRadius:50 }}>
            {canEdit ? '✏️ Pode editar' : '👁️ Somente visualização'}
          </span>
          {!user && <Link to="/auth" className="btn btn-primary" style={{ fontSize:12, padding:'7px 14px' }}>Entrar</Link>}
        </div>
      </header>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        <aside style={{ width:180, flexShrink:0, background:'white', borderRight:'2px solid rgba(27,58,31,0.06)', overflowY:'auto' }} className="sidebar-desktop">
          <div style={{ padding:14, borderBottom:'2px solid rgba(27,58,31,0.06)', textAlign:'center' }}>
            <AlbumCover album={album} size={150} />
            {album.description && <p style={{ fontSize:11, color:'rgba(27,58,31,0.5)', fontFamily:'var(--font-cute)', marginTop:6 }}>{album.description}</p>}
          </div>
          <div style={{ padding:10 }}>
            <p style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(27,58,31,0.4)', marginBottom:8 }}>Páginas</p>
            {pages.map((p, i) => (
              <button key={p.id} onClick={() => setCur(i)}
                style={{ width:'100%', padding:'7px 10px', background: i===cur?'#C8E6C9':'#EAF5EA', border:`2px solid ${i===cur?'var(--green)':'transparent'}`, borderRadius:10, cursor:'pointer', textAlign:'left', marginBottom:4, fontWeight:700, fontSize:12, color:'var(--dark)' }}>
                Página {i+1}
              </button>
            ))}
            {pages.length === 0 && <p style={{ fontSize:11, color:'rgba(27,58,31,0.4)', textAlign:'center' }}>Sem páginas ainda</p>}
          </div>
        </aside>

        <main style={{ flex:1, overflow:'auto', background:'#f0f5e8', display:'flex', flexDirection:'column', alignItems:'center', padding:'20px 12px' }}>
          {pages.length === 0 ? (
            <div style={{ textAlign:'center', margin:'auto' }}>
              <div style={{ fontSize:56 }}>📖</div>
              <h2 style={{ fontFamily:'var(--font-title)', fontSize:22, color:'var(--dark)', margin:'14px 0 8px' }}>Sem páginas ainda</h2>
              <p style={{ color:'rgba(27,58,31,0.55)', fontFamily:'var(--font-cute)' }}>Em breve haverá memórias aqui 💛</p>
            </div>
          ) : page ? (
            <PageCanvas key={page.id} page={page} isOwner={canEdit} onSave={(els) => updatePage(page.id, els)} onDeletePage={null} userId={user?.id} />
          ) : null}
        </main>
      </div>

      {/* Mobile page bar */}
      <div style={{ display:'none', background:'white', borderTop:'2px solid rgba(27,58,31,0.06)', padding:'8px 12px', overflowX:'auto', flexShrink:0, gap:8, alignItems:'center' }} className="mobile-pagebar">
        {pages.map((p, i) => (
          <button key={p.id} onClick={() => setCur(i)}
            style={{ flexShrink:0, padding:'5px 12px', background: i===cur?'#C8E6C9':'#EAF5EA', border:`2px solid ${i===cur?'var(--green)':'transparent'}`, borderRadius:50, fontSize:12, fontWeight:700, color:'var(--dark)', cursor:'pointer' }}>
            Pág. {i+1}
          </button>
        ))}
      </div>

      <style>{`
        @media (max-width: 700px) {
          .sidebar-desktop { display: none !important; }
          .mobile-pagebar { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
