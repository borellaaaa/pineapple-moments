import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { getMyAlbums, createAlbum, deleteAlbum, getSavedAlbums, unsaveAlbum, signOut, getProfile, getUnreadCount } from '../lib/supabase'
import AlbumCover from '../components/AlbumCover'
import NewAlbumModal from '../components/NewAlbumModal'
import { v4 as uuidv4 } from 'uuid'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [albums, setAlbums] = useState([])
  const [saved, setSaved] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [tab, setTab] = useState('mine')
  const [profile, setProfile] = useState(null)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user) return
    Promise.all([
      getMyAlbums(user.id),
      getSavedAlbums(user.id),
      getProfile(user.id),
      getUnreadCount(user.id)
    ]).then(([{ data: a }, { data: s }, { data: p }, u]) => {
      setAlbums(a || [])
      setSaved((s || []).map(r => r.albums).filter(Boolean))
      setProfile(p)
      setUnread(u)
      setLoading(false)
    })
  }, [user])

  async function handleCreate(data) {
    setCreating(true)
    const { data: album, error } = await createAlbum({ ...data, owner_id: user.id, share_token: uuidv4() })
    setCreating(false)
    if (error) { toast('Erro ao criar álbum 😢', 'error'); return }
    setShowModal(false)
    toast('Álbum criado! 🎉', 'success')
    navigate(`/album/${album.id}`)
  }

  async function handleDelete(id, e) {
    e.preventDefault(); e.stopPropagation()
    if (!confirm('Deletar este álbum? Esta ação não pode ser desfeita.')) return
    const { error } = await deleteAlbum(id)
    if (!error) { setAlbums(p => p.filter(a => a.id !== id)); toast('Álbum deletado!') }
    else toast('Erro ao deletar', 'error')
  }

  async function handleUnsave(albumId, e) {
    e.preventDefault(); e.stopPropagation()
    await unsaveAlbum(user.id, albumId)
    setSaved(p => p.filter(a => a.id !== albumId))
    toast('Removido dos salvos')
  }

  const displayName = profile?.display_name || user?.user_metadata?.full_name || 'Usuário'
  const avatarEmoji = profile?.avatar_emoji || '🍍'
  const username = profile?.username

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      {/* Header */}
      <header style={{ background: 'white', borderBottom: '2px solid var(--dark-faint)', padding: '0 20px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(27,58,31,0.06)' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-title)', fontSize: 18, color: 'var(--green)', flexShrink: 0 }}>🍍 Pineapple</span>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Link to="/dashboard" className="nav-item active">🏠 <span className="hide-mobile">Álbuns</span></Link>
            <Link to="/letters" className="nav-item" style={{ position: 'relative' }}>
              💌 <span className="hide-mobile">Cartinhas</span>
              {unread > 0 && <span className="badge" style={{ position: 'absolute', top: 2, right: 2, fontSize: 9, minWidth: 16, height: 16 }}>{unread}</span>}
            </Link>
            <Link to="/profile" className="nav-item">
              <span style={{ fontSize: 16 }}>{avatarEmoji}</span>
              <span className="hide-mobile">{username ? `@${username}` : 'Perfil'}</span>
            </Link>
          </nav>
          <button className="btn btn-ghost btn-sm" onClick={() => signOut().then(() => navigate('/'))}>Sair</button>
        </div>
      </header>

      <main style={{ maxWidth: 1060, margin: '0 auto', padding: '32px 20px 80px' }}>
        {/* Welcome */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(22px,5vw,30px)', color: 'var(--dark)' }}>
              Olá, {displayName.split(' ')[0]}! ✨
            </h1>
            <p style={{ color: 'var(--dark-muted)', fontFamily: 'var(--font-cute)', marginTop: 4, fontSize: 14 }}>
              {tab === 'mine' ? 'Seus álbuns de memórias 💛' : 'Álbuns salvos de amigos 🌸'}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Novo Álbum</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[['mine', '📷 Meus álbuns'], ['saved', '🔖 Salvos']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: '8px 20px', borderRadius: 50, border: `2px solid ${tab === key ? 'var(--green)' : 'var(--dark-faint)'}`, background: tab === key ? 'var(--green)' : 'white', color: tab === key ? 'white' : 'var(--dark-muted)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
              {label}
              <span style={{ marginLeft: 6, background: tab === key ? 'rgba(255,255,255,0.25)' : 'var(--dark-faint)', padding: '1px 7px', borderRadius: 99, fontSize: 11 }}>
                {key === 'mine' ? albums.length : saved.length}
              </span>
            </button>
          ))}
        </div>

        {loading ? <div className="loader" /> : (
          <>
            {tab === 'mine' && (
              albums.length === 0 ? (
                <EmptyState onNew={() => setShowModal(true)} />
              ) : (
                <AlbumGrid albums={albums} onDelete={handleDelete} isOwner />
              )
            )}
            {tab === 'saved' && (
              saved.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                  <div style={{ fontSize: 56, marginBottom: 14 }}>🔖</div>
                  <h2 style={{ fontFamily: 'var(--font-title)', fontSize: 20, marginBottom: 8 }}>Nenhum álbum salvo</h2>
                  <p style={{ color: 'var(--dark-muted)', fontFamily: 'var(--font-cute)', fontSize: 14 }}>
                    Quando alguém te compartilhar um álbum, você pode salvá-lo aqui!
                  </p>
                </div>
              ) : (
                <AlbumGrid albums={saved} onDelete={handleUnsave} isSaved />
              )
            )}
          </>
        )}
      </main>

      {showModal && <NewAlbumModal onClose={() => setShowModal(false)} onCreate={handleCreate} loading={creating} />}
    </div>
  )
}

function EmptyState({ onNew }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px', animation: 'fadeIn 0.4s ease' }}>
      <div style={{ fontSize: 72, marginBottom: 18, animation: 'float 3s ease-in-out infinite' }}>📷</div>
      <h2 style={{ fontFamily: 'var(--font-title)', fontSize: 24, marginBottom: 10 }}>Nenhum álbum ainda!</h2>
      <p style={{ color: 'var(--dark-muted)', fontFamily: 'var(--font-cute)', marginBottom: 28, fontSize: 15 }}>
        Crie seu primeiro álbum e guarde memórias fofas 🌸
      </p>
      <button className="btn btn-primary" style={{ fontSize: 16, padding: '13px 30px' }} onClick={onNew}>
        Criar meu primeiro álbum 🍍
      </button>
    </div>
  )
}

function AlbumGrid({ albums, onDelete, isOwner, isSaved }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(185px,1fr))', gap: 18 }}>
      {albums.map((album, i) => (
        <Link key={album.id} to={`/album/${album.id}`}
          style={{ textDecoration: 'none', animation: 'fadeIn 0.4s ease forwards', opacity: 0, animationDelay: `${i * 0.06}s` }}>
          <div className="card" style={{ overflow: 'hidden', position: 'relative' }}>
            <AlbumCover album={album} size="100%" />
            <div style={{ padding: '12px 14px 14px' }}>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: 13, color: 'var(--dark)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.name}</h3>
              {album.description && (
                <p style={{ fontSize: 11, color: 'var(--dark-muted)', fontFamily: 'var(--font-cute)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 }}>{album.description}</p>
              )}
              <div style={{ marginTop: 8 }}>
                <span className={`chip ${album.share_mode === 'edit' ? 'chip-green' : 'chip-yellow'}`} style={{ fontSize: 10 }}>
                  {album.share_mode === 'edit' ? '✏️ Colaborativo' : '👁️ Só leitura'}
                </span>
              </div>
            </div>
            <button onClick={e => onDelete(album.id, e)}
              style={{ position: 'absolute', top: 8, right: 8, background: 'white', border: 'none', borderRadius: '50%', width: 30, height: 30, fontSize: 13, cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              className="album-delete-btn">
              {isSaved ? '🔖' : '🗑️'}
            </button>
          </div>
        </Link>
      ))}
      <style>{`.card:hover .album-delete-btn { opacity: 1 !important; }`}</style>
    </div>
  )
}
