import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getAlbumByToken, getPages, updatePage, uploadPhoto } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import AlbumCover from '../components/AlbumCover'
import PageCanvas from '../components/PageCanvas'
import styles from './SharedAlbum.module.css'

export default function SharedAlbum() {
  const { token } = useParams()
  const { user } = useAuth()
  const [album, setAlbum] = useState(null)
  const [pages, setPages] = useState([])
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    loadAlbum()
  }, [token])

  async function loadAlbum() {
    const { data, error } = await getAlbumByToken(token)
    if (error || !data) { setNotFound(true); setLoading(false); return }
    setAlbum(data)
    const { data: p } = await getPages(data.id)
    setPages(p || [])
    setLoading(false)
  }

  async function savePage(elements) {
    const page = pages[currentPage]
    if (!page) return
    await updatePage(page.id, elements)
  }

  if (loading) return <div style={{display:'flex',justifyContent:'center',paddingTop:'80px'}}><div className="loader"/></div>

  if (notFound) return (
    <div className={styles.notFound}>
      <div className={styles.notFoundIcon}>🔍</div>
      <h2>Álbum não encontrado</h2>
      <p>Este link pode ter expirado ou não existe mais 😢</p>
      <Link to="/" className="btn btn-primary">Ir para o início</Link>
    </div>
  )

  const canEdit = album.share_mode === 'edit'
  const page = pages[currentPage]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>🍍 Pineapple Moments</div>
        <div className={styles.badge}>
          {canEdit ? '✏️ Você pode editar' : '👁️ Somente visualização'}
        </div>
        {!user && (
          <Link to="/auth" className="btn btn-primary" style={{fontSize:'13px',padding:'8px 16px'}}>
            Entrar / Criar conta
          </Link>
        )}
      </header>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <div className={styles.coverSection}>
            <AlbumCover album={album} small />
            <p className={styles.coverName}>{album.name}</p>
            {album.description && <p className={styles.coverDesc}>{album.description}</p>}
          </div>
          <div className={styles.pagesSection}>
            <p className={styles.pagesLabel}>Páginas</p>
            <div className={styles.pagesList}>
              {pages.map((p, i) => (
                <button
                  key={p.id}
                  className={`${styles.pageThumb} ${i===currentPage?styles.activePage:''}`}
                  onClick={()=>setCurrentPage(i)}
                >
                  Página {i + 1}
                </button>
              ))}
              {pages.length === 0 && <p className={styles.noPages}>Sem páginas ainda 📖</p>}
            </div>
          </div>
        </aside>

        <main className={styles.canvasArea}>
          {pages.length === 0 ? (
            <div className={styles.emptyState}>
              <div style={{fontSize:'64px'}}>📖</div>
              <h2>Este álbum ainda não tem páginas</h2>
              <p>Em breve haverá memórias lindas aqui! 💕</p>
            </div>
          ) : page ? (
            <PageCanvas
              key={page.id}
              page={page}
              isOwner={canEdit}
              onSave={savePage}
              onDeletePage={null}
              userId={user?.id}
            />
          ) : null}
        </main>
      </div>
    </div>
  )
}
