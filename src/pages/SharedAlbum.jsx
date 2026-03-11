import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getAlbumByToken, getPages, updatePage, saveAlbum, isAlbumSaved, unsaveAlbum } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import AlbumCover from '../components/AlbumCover'
import PageCanvas from '../components/PageCanvas'

export default function SharedAlbum() {
  const { token } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [album, setAlbum] = useState(null)
  const [pages, setPages] = useState([])
  const [cur, setCur] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getAlbumByToken(token).then(async ({ data, error }) => {
      if (error || !data) { setNotFound(true); setLoading(false); return }
      setAlbum(data)
      const { data: p } = await getPages(data.id)
      setPages(p || [])
      // Check if already saved
      if (user) {
        const s = await isAlbumSaved(user.id, data.id)
        setSaved(s)
      }
      setLoading(false)
    })
  }, [token, user])

  const handleSave = async () => {
    if (!user) { navigate('/auth'); return }
    setSaving(true)
    if (saved) {
      await unsaveAlbum(user.id, album.id)
      setSaved(false)
      toast('Removido dos salvos')
    } else {
      const { error } = await saveAlbum(user.id, album.id)
      if (error && error.code !== '23505') { toast('Erro ao salvar', 'error'); setSaving(false); return }
      setSaved(true)
      toast('Álbum salvo no seu dashboard! 🔖', 'success')
    }
    setSaving(false)
  }

  if (loading) return <div className="loader" style={{ marginTop: 80 }} />

  if (notFound) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', padding: 24, gap: 12 }}>
      <div style={{ fontSize: 72 }}>🔍</div>
      <h2 style={{ fontFamily: 'var(--font-title)', fontSize: 24, color: 'var(--dark)' }}>Álbum não encontrado</h2>
      <p style={{ color: 'var(--dark-muted)', fontFamily: 'var(--font-cute)' }}>Este link pode ter expirado ou sido removido 😢</p>
      <Link to="/" className="btn btn-primary">Ir para o início</Link>
    </div>
  )

  const canEdit = album.share_mode === 'edit'
  const page = pages[cur]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: 'white', borderBottom: '2px solid var(--dark-faint)', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, boxShadow: '0 2px 12px rgba(27,58,31,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to={user ? '/dashboard' : '/'} style={{ color: 'var(--green)', fontWeight: 700, textDecoration: 'none', fontSize: 13 }}>
            {user ? '← Meus álbuns' : '🍍 Pineapple'}
          </Link>
          <span style={{ fontFamily: 'var(--font-title)', fontSize: 15, color: 'var(--dark)' }}>{album.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={`chip ${canEdit ? 'chip-green' : 'chip-yellow'}`}>
            {canEdit ? '✏️ Pode editar' : '👁️ Somente visualização'}
          </span>
          {user ? (
            <button className={`btn btn-sm ${saved ? 'btn-ghost' : 'btn-yellow'}`} onClick={handleSave} disabled={saving}>
              {saving ? '...' : saved ? '🔖 Salvo' : '🔖 Salvar'}
            </button>
          ) : (
            <Link to="/auth" className="btn btn-primary btn-sm">Entrar para salvar</Link>
          )}
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <aside style={{ width: 180, flexShrink: 0, background: 'white', borderRight: '2px solid var(--dark-faint)', overflowY: 'auto' }} className="sidebar-desktop">
          <div style={{ padding: 14, borderBottom: '2px solid var(--dark-faint)', textAlign: 'center' }}>
            <AlbumCover album={album} size={150} />
            {album.description && <p style={{ fontSize: 11, color: 'var(--dark-muted)', fontFamily: 'var(--font-cute)', marginTop: 6, lineHeight: 1.4 }}>{album.description}</p>}
          </div>
          <div style={{ padding: 10 }}>
            <p className="section-label" style={{ marginBottom: 8 }}>Páginas</p>
            {pages.map((p, i) => (
              <button key={p.id} onClick={() => setCur(i)}
                style={{ width: '100%', padding: '7px 10px', background: i === cur ? '#C8E6C9' : '#EAF5EA', border: `2px solid ${i === cur ? 'var(--green)' : 'transparent'}`, borderRadius: 10, cursor: 'pointer', textAlign: 'left', marginBottom: 4, fontWeight: 700, fontSize: 12, color: 'var(--dark)', transition: 'all 0.15s' }}>
                Página {i + 1}
              </button>
            ))}
            {pages.length === 0 && <p style={{ fontSize: 11, color: 'var(--dark-muted)', textAlign: 'center' }}>Sem páginas ainda</p>}
          </div>
        </aside>

        <main style={{ flex: 1, overflow: 'auto', background: '#f0f5e8', backgroundImage: 'radial-gradient(circle,rgba(58,140,63,0.07) 1px,transparent 1px)', backgroundSize: '24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 12px' }}>
          {pages.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto' }}>
              <div style={{ fontSize: 56 }}>📖</div>
              <h2 style={{ fontFamily: 'var(--font-title)', fontSize: 22, color: 'var(--dark)', margin: '14px 0 8px' }}>Sem páginas ainda</h2>
              <p style={{ color: 'var(--dark-muted)', fontFamily: 'var(--font-cute)' }}>Em breve haverá memórias aqui 💛</p>
            </div>
          ) : page ? (
            <PageCanvas key={page.id} page={page} isOwner={canEdit} onSave={(els) => updatePage(page.id, els)} onDeletePage={null} userId={user?.id} />
          ) : null}
        </main>
      </div>

      <div style={{ display: 'none', background: 'white', borderTop: '2px solid var(--dark-faint)', padding: '8px 12px', overflowX: 'auto', flexShrink: 0, gap: 8, alignItems: 'center' }} className="mobile-pagebar">
        {pages.map((p, i) => (
          <button key={p.id} onClick={() => setCur(i)}
            style={{ flexShrink: 0, padding: '5px 12px', background: i === cur ? '#C8E6C9' : '#EAF5EA', border: `2px solid ${i === cur ? 'var(--green)' : 'transparent'}`, borderRadius: 50, fontSize: 12, fontWeight: 700, color: 'var(--dark)', cursor: 'pointer' }}>
            Pág. {i + 1}
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
