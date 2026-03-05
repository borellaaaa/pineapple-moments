import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { getAlbumById, updateAlbum, getPages, createPage, updatePage, deletePage } from '../lib/supabase'
import AlbumCover from '../components/AlbumCover'
import PageCanvas from '../components/PageCanvas'
import ShareModal from '../components/ShareModal'
import EditAlbumModal from '../components/EditAlbumModal'

export default function AlbumEditor() {
  const { albumId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [album, setAlbum] = useState(null)
  const [pages, setPages] = useState([])
  const [cur, setCur] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showShare, setShowShare] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  useEffect(() => { load() }, [albumId])

  async function load() {
    setLoading(true)
    const [{ data: a }, { data: p }] = await Promise.all([getAlbumById(albumId), getPages(albumId)])
    if (!a) { navigate('/dashboard'); return }
    setAlbum(a); setPages(p || []); setLoading(false)
  }

  async function addPage() {
    const { data, error } = await createPage(albumId, pages.length + 1)
    if (error) { toast('Erro ao criar página', 'error'); return }
    setPages(p => [...p, data]); setCur(pages.length); toast('Página adicionada! 📄', 'success')
  }

  async function savePage(elements) {
    const page = pages[cur]
    if (!page) return
    const { data, error } = await updatePage(page.id, elements)
    if (!error) setPages(p => p.map((pg, i) => i === cur ? { ...pg, elements } : pg))
  }

  async function handleDeletePage() {
    if (pages.length <= 1) { toast('Precisa ter ao menos 1 página!', 'error'); return }
    if (!confirm('Deletar esta página?')) return
    await deletePage(pages[cur].id)
    setPages(p => p.filter((_, i) => i !== cur))
    setCur(c => Math.max(0, c - 1))
    toast('Página deletada')
  }

  async function handleSaveAlbum(data) {
    const { data: updated, error } = await updateAlbum(albumId, data)
    if (!error) { setAlbum(updated); setShowEdit(false); toast('Álbum atualizado! ✨', 'success') }
    else toast('Erro ao atualizar', 'error')
  }

  if (loading) return <div className="loader" style={{ marginTop:80 }} />
  if (!album) return null

  const isOwner = album.owner_id === user?.id
  const canEdit = isOwner || album.share_mode === 'edit'
  const page = pages[cur]

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Top bar */}
      <header style={{ background:'white', borderBottom:'2px solid rgba(27,58,31,0.07)', padding:'10px 16px', display:'flex', alignItems:'center', gap:12, flexShrink:0, zIndex:100 }}>
        <Link to="/dashboard" style={{ color:'var(--green)', fontWeight:700, textDecoration:'none', fontSize:13, flexShrink:0 }}>← Álbuns</Link>
        <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
          <span style={{ fontFamily:'var(--font-title)', fontSize:16, color:'var(--dark)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{album.name}</span>
          {isOwner && <button onClick={() => setShowEdit(true)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, opacity:0.6, flexShrink:0 }}>✏️</button>}
        </div>
        <button className="btn btn-yellow" onClick={() => setShowShare(true)} style={{ fontSize:12, padding:'7px 14px', flexShrink:0 }}>🔗 Compartilhar</button>
      </header>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        {/* Sidebar - desktop only */}
        <aside style={{ width:190, flexShrink:0, background:'white', borderRight:'2px solid rgba(27,58,31,0.06)', overflowY:'auto', display:'flex', flexDirection:'column' }}
          className="sidebar-desktop">
          <div style={{ padding:16, borderBottom:'2px solid rgba(27,58,31,0.06)', textAlign:'center' }}>
            <AlbumCover album={album} size={160} />
            <p style={{ fontFamily:'var(--font-title)', fontSize:12, color:'var(--dark)', marginTop:8 }}>{album.name}</p>
          </div>
          <div style={{ padding:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <span style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(27,58,31,0.4)' }}>Páginas</span>
              {isOwner && <button onClick={addPage} style={{ background:'var(--green)', color:'white', border:'none', borderRadius:'50%', width:22, height:22, fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>}
            </div>
            {pages.length === 0 ? (
              isOwner ? <button className="btn btn-primary" onClick={addPage} style={{ fontSize:11, padding:'7px 12px', width:'100%' }}>+ Criar página</button>
              : <p style={{ fontSize:11, color:'rgba(27,58,31,0.4)', textAlign:'center' }}>Sem páginas</p>
            ) : pages.map((p, i) => (
              <button key={p.id} onClick={() => setCur(i)}
                style={{ width:'100%', padding:'7px 10px', background: i===cur?'#C8E6C9':'#EAF5EA', border:`2px solid ${i===cur?'var(--green)':'transparent'}`, borderRadius:10, cursor:'pointer', textAlign:'left', marginBottom:4, display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontWeight:700, fontSize:12, color:'var(--dark)' }}>Página {i+1}</span>
                <span style={{ fontSize:10, color:'rgba(27,58,31,0.5)' }}>{(p.elements||[]).length} elem.</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Canvas area */}
        <main style={{ flex:1, overflow:'auto', background:'#f0f5e8', backgroundImage:'radial-gradient(circle,rgba(58,140,63,0.07) 1px,transparent 1px)', backgroundSize:'24px 24px', display:'flex', flexDirection:'column', alignItems:'center', padding:'20px 12px' }}>
          {pages.length === 0 ? (
            <div style={{ textAlign:'center', margin:'auto', padding:40 }}>
              <div style={{ fontSize:56 }}>📖</div>
              <h2 style={{ fontFamily:'var(--font-title)', fontSize:22, color:'var(--dark)', margin:'14px 0 8px' }}>Nenhuma página ainda</h2>
              <p style={{ color:'rgba(27,58,31,0.55)', fontFamily:'var(--font-cute)', marginBottom:20 }}>Adicione uma página para começar!</p>
              {isOwner && <button className="btn btn-primary" onClick={addPage}>+ Adicionar página</button>}
            </div>
          ) : page ? (
            <PageCanvas key={page.id} page={page} isOwner={canEdit} onSave={savePage} onDeletePage={isOwner?handleDeletePage:null} userId={user?.id} />
          ) : null}
        </main>
      </div>

      {/* Mobile page bar */}
      <div style={{ display:'none', background:'white', borderTop:'2px solid rgba(27,58,31,0.06)', padding:'8px 12px', overflowX:'auto', flexShrink:0, gap:8, alignItems:'center' }} className="mobile-pagebar">
        {pages.map((p, i) => (
          <button key={p.id} onClick={() => setCur(i)}
            style={{ flexShrink:0, padding:'5px 12px', background: i===cur?'#C8E6C9':'#EAF5EA', border:`2px solid ${i===cur?'var(--green)':'transparent'}`, borderRadius:50, fontSize:12, fontWeight:700, color:'var(--dark)', cursor:'pointer', whiteSpace:'nowrap' }}>
            Pág. {i+1}
          </button>
        ))}
        {isOwner && <button onClick={addPage} style={{ flexShrink:0, width:30, height:30, background:'var(--green)', color:'white', border:'none', borderRadius:'50%', fontSize:18, cursor:'pointer' }}>+</button>}
      </div>

      <style>{`
        @media (max-width: 700px) {
          .sidebar-desktop { display: none !important; }
          .mobile-pagebar { display: flex !important; }
        }
      `}</style>

      {showShare && <ShareModal album={album} onClose={() => setShowShare(false)} />}
      {showEdit && <EditAlbumModal album={album} onClose={() => setShowEdit(false)} onSave={handleSaveAlbum} />}
    </div>
  )
}
