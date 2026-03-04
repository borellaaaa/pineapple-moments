import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { getMyAlbums, createAlbum, deleteAlbum, signOut } from '../lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import NewAlbumModal from '../components/NewAlbumModal'
import AlbumCover from '../components/AlbumCover'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadAlbums()
  }, [user])

  async function loadAlbums() {
    if (!user) return
    setLoading(true)
    const { data, error } = await getMyAlbums(user.id)
    if (!error) setAlbums(data || [])
    setLoading(false)
  }

  async function handleCreate(formData) {
    setCreating(true)
    const { album, error } = await createAlbum(user.id, {
      ...formData,
      share_token: uuidv4(),
    })
    setCreating(false)
    if (error) { toast('Erro ao criar álbum 😢', 'error'); return }
    setShowModal(false)
    toast('Álbum criado! 🎉', 'success')
    navigate(`/album/${album.id}`)
  }

  async function handleDelete(albumId, e) {
    e.stopPropagation()
    e.preventDefault()
    if (!confirm('Deletar esse álbum? Essa ação é irreversível 😢')) return
    const { error } = await deleteAlbum(albumId)
    if (!error) {
      setAlbums(prev => prev.filter(a => a.id !== albumId))
      toast('Álbum deletado', 'default')
    } else {
      toast('Erro ao deletar', 'error')
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className={styles.page + ' bg-dots'}>
      <header className={styles.header}>
        <div className={styles.logo}>🍍 Pineapple Moments</div>
        <div className={styles.headerRight}>
          <span className={styles.email}>{user?.email}</span>
          <button className="btn btn-ghost" onClick={handleSignOut} style={{fontSize:'13px',padding:'8px 16px'}}>
            Sair
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.topRow}>
          <div>
            <h1 className={styles.title}>Meus Álbuns ✨</h1>
            <p className={styles.sub}>Suas memórias mais fofas, todas aqui 💕</p>
          </div>
          <button className="btn btn-primary" onClick={()=>setShowModal(true)}>
            + Novo Álbum
          </button>
        </div>

        {loading ? (
          <div className="loader" />
        ) : albums.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📷</div>
            <h2>Nenhum álbum ainda!</h2>
            <p>Crie seu primeiro álbum e comece a guardar memórias fofas 🌸</p>
            <button className="btn btn-primary" onClick={()=>setShowModal(true)}>
              Criar meu primeiro álbum 🍍
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {albums.map((album, i) => (
              <Link key={album.id} to={`/album/${album.id}`} className={styles.albumLink} style={{animationDelay:`${i*0.08}s`}}>
                <div className={styles.albumCard}>
                  <AlbumCover album={album} small />
                  <div className={styles.albumInfo}>
                    <h3 className={styles.albumName}>{album.name}</h3>
                    {album.description && <p className={styles.albumDesc}>{album.description}</p>}
                    <div className={styles.albumMeta}>
                      {album.share_mode === 'edit' ? '✏️ Colaborativo' : '👁️ Somente leitura'}
                    </div>
                  </div>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e)=>handleDelete(album.id, e)}
                    title="Deletar álbum"
                  >🗑️</button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <NewAlbumModal
          onClose={()=>setShowModal(false)}
          onCreate={handleCreate}
          loading={creating}
        />
      )}
    </div>
  )
}
