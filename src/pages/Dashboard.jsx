import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { getMyAlbums, createAlbum, deleteAlbum, signOut } from '../lib/supabase'
import AlbumCover from '../components/AlbumCover'
import NewAlbumModal from '../components/NewAlbumModal'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => { loadAlbums() }, [user])

  async function loadAlbums() {
    if (!user) return
    const { data, error } = await getMyAlbums(user.id)
    if (!error) setAlbums(data || [])
    setLoading(false)
  }

  async function handleCreate(data) {
    setCreating(true)
    const { data: album, error } = await createAlbum({ ...data, owner_id: user.id })
    setCreating(false)
    if (error) { toast('Erro ao criar álbum 😢', 'error'); return }
    setShowModal(false)
    toast('Álbum criado! 🎉', 'success')
    navigate(`/album/${album.id}`)
  }

  async function handleDelete(id, e) {
    e.preventDefault(); e.stopPropagation()
    if (!confirm('Deletar este álbum?')) return
    const { error } = await deleteAlbum(id)
    if (!error) { setAlbums(p => p.filter(a => a.id !== id)); toast('Deletado!') }
    else toast('Erro ao deletar', 'error')
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--cream)' }}>
      {/* Header */}
      <header style={{ background:'white', borderBottom:'2px solid rgba(27,58,31,0.07)', padding:'14px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:100 }}>
        <span style={{ fontFamily:'var(--font-title)', fontSize:18, color:'var(--green)' }}>🍍 Pineapple Moments</span>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:12, color:'rgba(27,58,31,0.45)', fontFamily:'var(--font-cute)' }}>{user?.email}</span>
          <button className="btn btn-ghost" onClick={() => signOut().then(() => navigate('/'))} style={{ fontSize:13, padding:'7px 14px' }}>Sair</button>
        </div>
      </header>

      <main style={{ maxWidth:1000, margin:'0 auto', padding:'36px 20px 80px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:36, flexWrap:'wrap', gap:14 }}>
          <div>
            <h1 style={{ fontFamily:'var(--font-title)', fontSize:28, color:'var(--dark)' }}>Meus Álbuns ✨</h1>
            <p style={{ color:'rgba(27,58,31,0.55)', fontFamily:'var(--font-cute)', marginTop:4, fontSize:14 }}>Suas memórias mais fofas, todas aqui 💛</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Novo Álbum</button>
        </div>

        {loading ? <div className="loader" /> : albums.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 24px' }}>
            <div style={{ fontSize:64, marginBottom:16 }}>📷</div>
            <h2 style={{ fontFamily:'var(--font-title)', fontSize:22, marginBottom:8 }}>Nenhum álbum ainda!</h2>
            <p style={{ color:'rgba(27,58,31,0.55)', fontFamily:'var(--font-cute)', marginBottom:24 }}>Crie seu primeiro álbum e guarde memórias fofas 🌸</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Criar meu primeiro álbum 🍍</button>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:20 }}>
            {albums.map((album, i) => (
              <Link key={album.id} to={`/album/${album.id}`} style={{ textDecoration:'none', animation:'fadeIn 0.4s ease forwards', opacity:0, animationDelay:`${i*0.07}s` }}>
                <div style={{ background:'white', borderRadius:'var(--radius)', overflow:'hidden', boxShadow:'var(--shadow)', transition:'transform 0.2s,box-shadow 0.2s', position:'relative' }}
                  onMouseOver={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='var(--shadow-lg)' }}
                  onMouseOut={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='var(--shadow)' }}>
                  <AlbumCover album={album} size={200} />
                  <div style={{ padding:'12px 14px' }}>
                    <h3 style={{ fontFamily:'var(--font-title)', fontSize:14, color:'var(--dark)', marginBottom:3 }}>{album.name}</h3>
                    {album.description && <p style={{ fontSize:11, color:'rgba(27,58,31,0.55)', fontFamily:'var(--font-cute)', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{album.description}</p>}
                    <p style={{ fontSize:10, color:'rgba(27,58,31,0.4)', marginTop:5 }}>{album.share_mode==='edit'?'✏️ Colaborativo':'👁️ Somente leitura'}</p>
                  </div>
                  <button onClick={e => handleDelete(album.id, e)}
                    style={{ position:'absolute', top:8, right:8, background:'white', border:'none', borderRadius:'50%', width:30, height:30, fontSize:13, cursor:'pointer', opacity:0, transition:'opacity 0.2s', boxShadow:'var(--shadow)' }}
                    onMouseOver={e => e.stopPropagation()}
                    ref={el => {
                      if (el) {
                        el.parentElement.addEventListener('mouseenter', () => el.style.opacity = '1')
                        el.parentElement.addEventListener('mouseleave', () => el.style.opacity = '0')
                      }
                    }}>🗑️</button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {showModal && <NewAlbumModal onClose={() => setShowModal(false)} onCreate={handleCreate} loading={creating} />}
    </div>
  )
}
