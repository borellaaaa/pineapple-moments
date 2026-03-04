import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { getAlbumById, updateAlbum, getPages, createPage, updatePage, deletePage } from '../lib/supabase'
import AlbumCover from '../components/AlbumCover'
import PageCanvas from '../components/PageCanvas'
import ShareModal from '../components/ShareModal'
import EditAlbumModal from '../components/EditAlbumModal'
import styles from './AlbumEditor.module.css'

export default function AlbumEditor() {
  const { albumId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [album, setAlbum] = useState(null)
  const [pages, setPages] = useState([])
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  useEffect(() => { loadAll() }, [albumId])

  async function loadAll() {
    setLoading(true)
    const [{ data: a }, { data: p }] = await Promise.all([
      getAlbumById(albumId),
      getPages(albumId),
    ])
    if (!a) { navigate('/dashboard'); return }
    setAlbum(a)
    setPages(p || [])
    setLoading(false)
  }

  async function addPage() {
    const { data, error } = await createPage(albumId, pages.length + 1)
    if (error) { toast('Erro ao criar página', 'error'); return }
    setPages(prev => [...prev, data])
    setCurrentPage(pages.length)
    toast('Página adicionada! 📄', 'success')
  }

  async function savePage(elements) {
    const page = pages[currentPage]
    if (!page) return
    setSaving(true)
    const { data, error } = await updatePage(page.id, elements)
    setSaving(false)
    if (!error) setPages(prev => prev.map((p, i) => i === currentPage ? { ...p, elements } : p))
    else toast('Erro ao salvar', 'error')
  }

  async function handleDeletePage() {
    if (pages.length <= 1) { toast('O álbum precisa ter pelo menos 1 página!', 'error'); return }
    if (!confirm('Deletar esta página?')) return
    const page = pages[currentPage]
    const { error } = await deletePage(page.id)
    if (!error) {
      setPages(prev => prev.filter((_, i) => i !== currentPage))
      setCurrentPage(prev => Math.max(0, prev - 1))
      toast('Página deletada', 'default')
    }
  }

  async function handleUpdateAlbum(updates) {
    const { data, error } = await updateAlbum(albumId, updates)
    if (!error) { setAlbum(data); setShowEdit(false); toast('Álbum atualizado! ✨', 'success') }
    else toast('Erro ao atualizar', 'error')
  }

  if (loading) return <div style={{display:'flex',justifyContent:'center',paddingTop:'80px'}}><div className="loader"/></div>
  if (!album) return null

  const isOwner = album.owner_id === user?.id
  const canEdit = isOwner || album.share_mode === 'edit'
  const page = pages[currentPage]

  return (
    <div className={styles.editor}>
      <header className={styles.topBar}>
        <Link to="/dashboard" className={styles.backBtn}>← Álbuns</Link>
        <div className={styles.albumTitle}>
          <span className={styles.titleText}>{album.name}</span>
          {isOwner && <button className={styles.editBtn} onClick={()=>setShowEdit(true)}>✏️</button>}
        </div>
        <div className={styles.topActions}>
          {saving && <span className={styles.saving}>Salvando...</span>}
          <button className="btn btn-yellow" onClick={()=>setShowShare(true)} style={{fontSize:'13px',padding:'8px 16px'}}>
            🔗 Compartilhar
          </button>
        </div>
      </header>

      <div className={styles.body}>
        {/* Desktop sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.coverSection}>
            <AlbumCover album={album} small />
            <p className={styles.coverName}>{album.name}</p>
            {album.description && <p className={styles.coverDesc}>{album.description}</p>}
          </div>
          <div className={styles.pagesSection}>
            <div className={styles.pagesHeader}>
              <span>Páginas</span>
              {isOwner && <button className={styles.addPageBtn} onClick={addPage}>+</button>}
            </div>
            <div className={styles.pagesList}>
              {pages.length === 0 && (
                <div className={styles.noPagesHint}>
                  {isOwner ? (
                    <button className="btn btn-primary" onClick={addPage} style={{fontSize:'12px',padding:'8px 14px'}}>+ Criar página</button>
                  ) : <p style={{fontSize:'12px',color:'rgba(27,58,31,0.5)'}}>Sem páginas ainda</p>}
                </div>
              )}
              {pages.map((p, i) => (
                <button key={p.id} className={`${styles.pageThumb} ${i===currentPage?styles.activePage:''}`} onClick={()=>setCurrentPage(i)}>
                  <span className={styles.pageNum}>Página {i+1}</span>
                  <span className={styles.pageElem}>{(p.elements||[]).length} elem.</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main canvas */}
        <main className={styles.canvasArea}>
          {pages.length === 0 ? (
            <div className={styles.emptyState}>
              <div style={{fontSize:'56px'}}>📖</div>
              <h2>Nenhuma página ainda</h2>
              <p>Adicione uma página para começar!</p>
              {isOwner && <button className="btn btn-primary" onClick={addPage}>+ Adicionar página</button>}
            </div>
          ) : page ? (
            <PageCanvas
              key={page.id}
              page={page}
              isOwner={canEdit}
              onSave={savePage}
              onDeletePage={isOwner ? handleDeletePage : null}
              userId={user?.id}
            />
          ) : null}
        </main>
      </div>

      {/* Mobile page bar */}
      <div className={styles.mobilePageBar}>
        {pages.map((p, i) => (
          <button key={p.id} className={`${styles.mobilePageBtn} ${i===currentPage?styles.activePage:''}`} onClick={()=>setCurrentPage(i)}>
            Pág. {i+1}
          </button>
        ))}
        {isOwner && (
          <button className={styles.mobileAddBtn} onClick={addPage}>+</button>
        )}
      </div>

      {showShare && <ShareModal album={album} onClose={()=>setShowShare(false)} />}
      {showEdit && <EditAlbumModal album={album} onClose={()=>setShowEdit(false)} onSave={handleUpdateAlbum} />}
    </div>
  )
}
