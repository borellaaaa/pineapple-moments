import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { getAlbumById, updateAlbum, getPages, createPage, updatePage, deletePage, deleteAlbum } from '../lib/supabase'
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
  const [deleting, setDeleting] = useState(false)

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

  async function savePage(elements, bgColor, svgPaths) {
    const page = pages[cur]
    if (!page) return
    const { data } = await updatePage(page.id, elements, bgColor, svgPaths)
    if (data) setPages(p => p.map((pg, i) => i === cur ? { ...pg, elements, bg_color: bgColor, svg_paths: svgPaths } : pg))
  }

  async function handleDeletePage() {
    if (pages.length <= 1) { toast('Precisa ter ao menos 1 página!', 'error'); return }
    if (!confirm('Deletar esta página?')) return
    await deletePage(pages[cur].id)
    setPages(p => p.filter((_, i) => i !== cur))
    setCur(c => Math.max(0, c - 1))
    toast('Página deletada')
  }

  async function handleDeleteAlbum() {
    if (!confirm('Deletar este álbum permanentemente? Todas as páginas e fotos serão perdidas.')) return
    setDeleting(true)
    const { error } = await deleteAlbum(albumId)
    if (error) { toast('Erro ao deletar', 'error'); setDeleting(false); return }
    toast('Álbum deletado!', 'success')
    navigate('/dashboard')
  }

  async function handleSaveAlbum(data) {
    const { data: updated, error } = await updateAlbum(albumId, data)
    if (!error) { setAlbum(updated); setShowEdit(false); toast('Álbum atualizado! ✨', 'success') }
    else toast('Erro ao atualizar', 'error')
  }

  if (loading) return <div className="loader" style={{ marginTop: 80 }} />
  if (!album) return null

  const isOwner = album.owner_id === user?.id
  const canEdit = isOwner || album.share_mode === 'edit'
  const page = pages[cur]

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <header style={{ background: 'white', borderBottom: '2px solid var(--dark-faint)', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, zIndex: 100, height: 56, boxShadow: '0 2px 12px rgba(27,58,31,0.06)' }}>
        <Link to="/dashboard" style={{ color: 'var(--green)', fontWeight: 700, textDecoration: 'none', fontSize: 13, flexShrink: 0 }}>← Álbuns</Link>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-title)', fontSize: 15, color: 'var(--dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.name}</span>
          {isOwner && (
            <button onClick={() => setShowEdit(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, opacity: 0.55, flexShrink: 0, padding: 4, borderRadius: 6, transition: 'opacity 0.15s' }}
              onMouseOver={e => e.currentTarget.style.opacity = '1'}
              onMouseOut={e => e.currentTarget.style.opacity = '0.55'}>✏️</button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {isOwner && (
            <button className="btn btn-danger btn-sm" onClick={handleDeleteAlbum} disabled={deleting} title="Deletar álbum">
              {deleting ? '...' : '🗑️'}<span className="hide-mobile">Deletar</span>
            </button>
          )}
          <button className="btn btn-yellow btn-sm" onClick={() => setShowShare(true)}>🔗 <span className="hide-mobile">Compartilhar</span></button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <aside style={{ width: 185, flexShrink: 0, background: 'white', borderRight: '2px solid var(--dark-faint)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }} className="sidebar-desktop">
          <div style={{ padding: 16, borderBottom: '2px solid var(--dark-faint)', textAlign: 'center' }}>
            <AlbumCover album={album} size={155} />
            <p style={{ fontFamily: 'var(--font-title)', fontSize: 12, color: 'var(--dark)', marginTop: 8 }}>{album.name}</p>
          </div>
          <div style={{ padding: 12, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span className="section-label">Páginas</span>
              {isOwner && (
                <button onClick={addPage}
                  style={{ background: 'var(--green)', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--green-dark)'}
                  onMouseOut={e => e.currentTarget.style.background = 'var(--green)'}>+</button>
              )}
            </div>
            {pages.length === 0 ? (
              isOwner
                ? <button className="btn btn-primary" onClick={addPage} style={{ fontSize: 11, padding: '7px 12px', width: '100%' }}>+ Criar página</button>
                : <p style={{ fontSize: 11, color: 'var(--dark-muted)', textAlign: 'center' }}>Sem páginas</p>
            ) : pages.map((p, i) => (
              <button key={p.id} onClick={() => setCur(i)}
                style={{ width: '100%', padding: '8px 10px', background: i === cur ? '#C8E6C9' : 'transparent', border: `2px solid ${i === cur ? 'var(--green)' : 'transparent'}`, borderRadius: 10, cursor: 'pointer', textAlign: 'left', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.15s' }}
                onMouseOver={e => { if (i !== cur) e.currentTarget.style.background = '#EAF5EA' }}
                onMouseOut={e => { if (i !== cur) e.currentTarget.style.background = 'transparent' }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--dark)' }}>Página {i + 1}</span>
                <span style={{ fontSize: 10, color: 'var(--dark-muted)' }}>{(p.elements || []).length} elem.</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Canvas */}
        <main style={{ flex: 1, overflow: 'auto', background: '#f0f5e8', backgroundImage: 'radial-gradient(circle,rgba(58,140,63,0.07) 1px,transparent 1px)', backgroundSize: '24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 12px' }}>
          {pages.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto', padding: 40 }}>
              <div style={{ fontSize: 56, animation: 'float 3s ease-in-out infinite' }}>📖</div>
              <h2 style={{ fontFamily: 'var(--font-title)', fontSize: 22, color: 'var(--dark)', margin: '14px 0 8px' }}>Nenhuma página ainda</h2>
              <p style={{ color: 'var(--dark-muted)', fontFamily: 'var(--font-cute)', marginBottom: 20 }}>Adicione uma página para começar!</p>
              {isOwner && <button className="btn btn-primary" onClick={addPage}>+ Adicionar página</button>}
            </div>
          ) : (
            <>
              {/* Desktop: mostra só a página atual */}
              <div className="desktop-canvas">
                {page && <PageCanvas key={page.id} page={page} isOwner={canEdit} onSave={savePage} onDeletePage={isOwner ? handleDeletePage : null} userId={user?.id} />}
              </div>
              {/* Mobile: todas as páginas empilhadas */}
              <div className="mobile-canvas-stack">
                {pages.map((p, i) => (
                  <div key={p.id} style={{ width: '100%', marginBottom: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, padding: '0 4px' }}>
                      <span style={{ fontFamily: 'var(--font-title)', fontSize: 12, color: 'var(--dark-muted)', fontWeight: 700 }}>Página {i + 1}</span>
                      {i === cur && <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 800 }}>● editando</span>}
                    </div>
                    <div onClick={() => { if (i !== cur) setCur(i) }}>
                      <PageCanvas key={p.id} page={p} isOwner={canEdit && i === cur} onSave={i === cur ? savePage : () => {}} onDeletePage={isOwner && i === cur ? handleDeletePage : null} userId={user?.id} />
                    </div>
                  </div>
                ))}
                {isOwner && (
                  <button className="btn btn-primary" onClick={addPage} style={{ width: '100%', marginTop: 4 }}>+ Nova página</button>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Mobile page bar */}
      <div style={{ display: 'none', background: 'white', borderTop: '2px solid var(--dark-faint)', padding: '8px 12px', overflowX: 'auto', flexShrink: 0, gap: 8, alignItems: 'center' }} className="mobile-pagebar">
        {pages.map((p, i) => (
          <button key={p.id} onClick={() => setCur(i)}
            style={{ flexShrink: 0, padding: '5px 12px', background: i === cur ? '#C8E6C9' : '#EAF5EA', border: `2px solid ${i === cur ? 'var(--green)' : 'transparent'}`, borderRadius: 50, fontSize: 12, fontWeight: 700, color: 'var(--dark)', cursor: 'pointer' }}>
            Pág. {i + 1}
          </button>
        ))}
        {isOwner && <button onClick={addPage} style={{ flexShrink: 0, width: 32, height: 32, background: 'var(--green)', color: 'white', border: 'none', borderRadius: '50%', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>}
      </div>

      <style>{`
        .desktop-canvas { display: flex; flex-direction: column; align-items: center; width: 100%; }
        .mobile-canvas-stack { display: none; width: 100%; }
        @media (max-width: 700px) {
          .sidebar-desktop { display: none !important; }
          .mobile-pagebar { display: flex !important; }
          .desktop-canvas { display: none !important; }
          .mobile-canvas-stack { display: flex !important; flex-direction: column; align-items: center; }
        }
      `}</style>

      {showShare && <ShareModal album={album} onClose={() => setShowShare(false)} />}
      {showEdit && <EditAlbumModal album={album} onClose={() => setShowEdit(false)} onSave={handleSaveAlbum} />}
    </div>
  )
}
