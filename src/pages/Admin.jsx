import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { supabase } from '../lib/supabase'

// ─── Admin ID — substitua pelo seu user ID do Supabase ───────────────────────
// Vá em Authentication > Users e copie seu ID
const ADMIN_EMAIL = 'rafaelborella49@gmail.com'

export default function Admin() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [tab, setTab] = useState('users')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [staff, setStaff] = useState([])
  const [violations, setViolations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [banReason, setBanReason] = useState('')
  const [showBanModal, setShowBanModal] = useState(false)
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [newStaffEmail, setNewStaffEmail] = useState('')

  // Verificar se é admin
  useEffect(() => {
    if (!user) return
    supabase.from('admin_staff').select('role').eq('user_id', user.id).single()
      .then(({ data }) => {
        if (!data) { navigate('/dashboard'); return }
        setIsAdmin(data.role === 'admin')
        loadData()
      })
  }, [user])

  const loadData = useCallback(async () => {
    setLoading(true)
    const [statsRes, usersRes, staffRes, violationsRes] = await Promise.all([
      supabase.rpc('admin_get_stats'),
      supabase.rpc('admin_get_users', { search_term: search || null, page_num: page, page_size: 50 }),
      supabase.from('admin_staff').select('*, profiles(display_name, username, avatar_emoji)'),
      supabase.from('moderation_violations').select('*').order('created_at', { ascending: false }).limit(100),
    ])
    setStats(statsRes.data)
    setUsers(usersRes.data || [])
    setStaff(staffRes.data || [])
    setViolations(violationsRes.data || [])
    setLoading(false)
  }, [search, page])

  useEffect(() => { if (isAdmin !== null) loadData() }, [tab, page, search])

  const handleBan = async () => {
    if (!selectedUser || !banReason.trim()) return
    const { error } = await supabase.rpc('admin_ban_user', {
      target_id: selectedUser.id,
      ban_reason_text: banReason
    })
    if (error) { toast('Erro ao banir: ' + error.message, 'error'); return }
    toast(`${selectedUser.username || selectedUser.display_name} banido! 🚫`, 'success')
    setShowBanModal(false); setBanReason(''); setSelectedUser(null)
    loadData()
  }

  const handleUnban = async (u) => {
    const { error } = await supabase.rpc('admin_unban_user', { target_id: u.id, unban_reason: 'Revisão administrativa' })
    if (error) { toast('Erro ao desbanir', 'error'); return }
    toast(`${u.username || u.display_name} desbanido! ✅`, 'success')
    loadData()
  }

  const handleDelete = async (u) => {
    if (!confirm(`Deletar permanentemente a conta de @${u.username || u.display_name}? Esta ação NÃO pode ser desfeita.`)) return
    const { error } = await supabase.rpc('admin_delete_account', { target_id: u.id, delete_reason: 'Exclusão administrativa' })
    if (error) { toast('Erro ao deletar: ' + error.message, 'error'); return }
    toast('Conta deletada permanentemente', 'success')
    loadData()
  }

  const handleAddStaff = async () => {
    if (!newStaffEmail.trim()) return
    // Busca user por email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', (await supabase.from('auth.users').select('id').eq('email', newStaffEmail).single())?.data?.id)
      .single()

    // Via função alternativa — busca pelo email direto
    const { data: authUser } = await supabase.rpc('admin_get_users', { search_term: newStaffEmail, page_num: 1, page_size: 1 })
    const targetUser = authUser?.[0]
    if (!targetUser) { toast('Usuário não encontrado', 'error'); return }

    const { error } = await supabase.from('admin_staff').insert({ user_id: targetUser.id, role: 'staff', added_by: user.id })
    if (error) { toast('Erro ao adicionar: ' + error.message, 'error'); return }
    toast('Funcionário adicionado! ✅', 'success')
    setNewStaffEmail(''); setShowAddStaff(false); loadData()
  }

  const handleRemoveStaff = async (staffId) => {
    if (!confirm('Remover este funcionário?')) return
    await supabase.from('admin_staff').delete().eq('id', staffId)
    toast('Funcionário removido', 'success')
    loadData()
  }

  if (loading) return <div className="loader" style={{ marginTop: 80 }} />

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      {/* Header */}
      <header style={{ background: '#1B3A1F', color: 'white', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/dashboard" style={{ color: '#66BB6A', fontWeight: 700, textDecoration: 'none', fontSize: 13 }}>← App</Link>
          <span style={{ fontFamily: 'var(--font-title)', fontSize: 16 }}>🛡️ Admin Panel</span>
          {isAdmin && <span style={{ background: '#F5C800', color: '#1B3A1F', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99 }}>ADMIN</span>}
        </div>
        <span style={{ fontSize: 12, color: '#a5d6a7' }}>{user?.email}</span>
      </header>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12, padding: '20px 24px 0', maxWidth: 1200, margin: '0 auto' }}>
          {[
            { label: 'Usuários', value: stats.total_users, icon: '👥', color: '#3A8C3F' },
            { label: 'Banidos', value: stats.banned_users, icon: '🚫', color: '#e53935' },
            { label: 'Violações', value: stats.total_violations, icon: '⚠️', color: '#F5A623' },
            { label: 'Álbuns', value: stats.total_albums, icon: '📷', color: '#667EEA' },
            { label: 'Novos (7d)', value: stats.new_users_7d, icon: '🆕', color: '#00ACC1' },
            { label: 'Violações (7d)', value: stats.violations_7d, icon: '🔥', color: '#FF6B9D' },
          ].map(s => (
            <div key={s.label} style={{ background: 'white', borderRadius: 12, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${s.color}` }}>
              <div style={{ fontSize: 22 }}>{s.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1.2 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 24px 0' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[['users','👥 Usuários'], ['violations','⚠️ Violações'], ['staff','🔑 Equipe']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: '8px 18px', borderRadius: 50, border: 'none', background: tab === key ? '#1B3A1F' : 'white', color: tab === key ? 'white' : '#555', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab: Usuários ── */}
        {tab === 'users' && (
          <div>
            {/* Search */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1) } }}
                placeholder="Buscar por @usuário, nome ou email..."
                style={{ flex: 1, padding: '10px 16px', border: '2px solid #e0e0e0', borderRadius: 50, fontSize: 13, outline: 'none' }}
              />
              <button onClick={() => { setSearch(searchInput); setPage(1) }}
                style={{ padding: '10px 20px', background: '#3A8C3F', color: 'white', border: 'none', borderRadius: 50, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                Buscar
              </button>
              {search && <button onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
                style={{ padding: '10px 16px', background: '#eee', border: 'none', borderRadius: 50, cursor: 'pointer', fontSize: 13 }}>
                Limpar
              </button>}
            </div>

            {/* Users Table */}
            <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                      {['Usuário', 'Email', 'Idade', 'Violações', 'Status', 'Cadastro', 'Ações'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', fontWeight: 700, color: '#555', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr key={u.id} style={{ borderTop: '1px solid #f0f0f0', background: u.is_banned ? '#fff5f5' : i % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>{u.avatar_emoji || '🍍'}</span>
                            <div>
                              <div style={{ fontWeight: 700, color: '#222' }}>{u.display_name || '—'}</div>
                              <div style={{ color: '#888', fontSize: 11 }}>@{u.username || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#555', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</td>
                        <td style={{ padding: '12px 16px', color: '#555' }}>
                          {u.birth_date ? `${new Date().getFullYear() - new Date(u.birth_date).getFullYear()} anos` : '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: u.violation_count > 0 ? '#fff3cd' : '#e8f5e9', color: u.violation_count > 0 ? '#856404' : '#2e7d32', padding: '2px 8px', borderRadius: 99, fontWeight: 700, fontSize: 12 }}>
                            {u.violation_count}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {u.is_banned ? (
                            <span style={{ background: '#fdecea', color: '#c62828', padding: '3px 10px', borderRadius: 99, fontWeight: 700, fontSize: 11 }}>🚫 Banido</span>
                          ) : (
                            <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '3px 10px', borderRadius: 99, fontWeight: 700, fontSize: 11 }}>✅ Ativo</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#888', fontSize: 11, whiteSpace: 'nowrap' }}>
                          {new Date(u.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {!u.is_banned ? (
                              <button onClick={() => { setSelectedUser(u); setShowBanModal(true) }}
                                style={{ padding: '5px 10px', background: '#fdecea', color: '#c62828', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>
                                🚫 Banir
                              </button>
                            ) : (
                              <button onClick={() => handleUnban(u)}
                                style={{ padding: '5px 10px', background: '#e8f5e9', color: '#2e7d32', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>
                                ✅ Desbanir
                              </button>
                            )}
                            {isAdmin && (
                              <button onClick={() => handleDelete(u)}
                                style={{ padding: '5px 10px', background: '#f5f5f5', color: '#c62828', border: '1px solid #e0e0e0', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 11 }}>
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {users.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                  Nenhum usuário encontrado
                </div>
              )}
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              {page > 1 && <button onClick={() => setPage(p => p - 1)} style={{ padding: '8px 16px', background: 'white', border: '2px solid #e0e0e0', borderRadius: 50, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>← Anterior</button>}
              <span style={{ padding: '8px 16px', background: 'white', borderRadius: 50, fontSize: 13, color: '#555' }}>Página {page}</span>
              {users.length === 50 && <button onClick={() => setPage(p => p + 1)} style={{ padding: '8px 16px', background: 'white', border: '2px solid #e0e0e0', borderRadius: 50, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Próxima →</button>}
            </div>
          </div>
        )}

        {/* ── Tab: Violações ── */}
        {tab === 'violations' && (
          <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    {['Usuário ID', 'Tipo', 'Categorias', 'Conteúdo', 'Data'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', fontWeight: 700, color: '#555', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {violations.map((v, i) => (
                    <tr key={v.id} style={{ borderTop: '1px solid #f0f0f0', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 11, color: '#888' }}>{v.user_id?.slice(0, 8)}...</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: v.type === 'image' ? '#e3f2fd' : '#fff8e7', color: v.type === 'image' ? '#1565c0' : '#856404', padding: '2px 8px', borderRadius: 99, fontWeight: 700, fontSize: 11 }}>
                          {v.type === 'image' ? '🖼️ Imagem' : '💬 Texto'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: '#fdecea', color: '#c62828', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                          {v.categories}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#555' }}>
                        {v.content || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#888', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {new Date(v.created_at).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {violations.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>Nenhuma violação registrada</div>
            )}
          </div>
        )}

        {/* ── Tab: Equipe ── */}
        {tab === 'staff' && (
          <div>
            {isAdmin && (
              <div style={{ marginBottom: 16 }}>
                {!showAddStaff ? (
                  <button onClick={() => setShowAddStaff(true)}
                    style={{ padding: '10px 20px', background: '#3A8C3F', color: 'white', border: 'none', borderRadius: 50, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                    + Adicionar funcionário
                  </button>
                ) : (
                  <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input value={newStaffEmail} onChange={e => setNewStaffEmail(e.target.value)}
                      placeholder="Email ou @usuário do funcionário"
                      style={{ flex: 1, minWidth: 200, padding: '10px 16px', border: '2px solid #e0e0e0', borderRadius: 50, fontSize: 13, outline: 'none' }} />
                    <button onClick={handleAddStaff}
                      style={{ padding: '10px 20px', background: '#3A8C3F', color: 'white', border: 'none', borderRadius: 50, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                      Adicionar
                    </button>
                    <button onClick={() => setShowAddStaff(false)}
                      style={{ padding: '10px 20px', background: '#eee', border: 'none', borderRadius: 50, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {staff.map(s => (
                <div key={s.id} style={{ background: 'white', borderRadius: 14, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 32 }}>{s.profiles?.avatar_emoji || '👤'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{s.profiles?.display_name || 'Usuário'}</div>
                    <div style={{ color: '#888', fontSize: 12 }}>@{s.profiles?.username || '—'}</div>
                  </div>
                  <span style={{ background: s.role === 'admin' ? '#fff3cd' : '#e8f5e9', color: s.role === 'admin' ? '#856404' : '#2e7d32', padding: '4px 12px', borderRadius: 99, fontWeight: 800, fontSize: 12 }}>
                    {s.role === 'admin' ? '👑 ADMIN' : '🔑 STAFF'}
                  </span>
                  {isAdmin && s.role !== 'admin' && (
                    <button onClick={() => handleRemoveStaff(s.id)}
                      style={{ padding: '6px 14px', background: '#fdecea', color: '#c62828', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                      Remover
                    </button>
                  )}
                </div>
              ))}
              {staff.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#888', background: 'white', borderRadius: 16 }}>
                  Nenhum funcionário cadastrado ainda
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de banimento */}
      {showBanModal && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontFamily: 'var(--font-title)', color: '#c62828', marginBottom: 8 }}>🚫 Banir usuário</h2>
            <p style={{ color: '#555', fontSize: 14, marginBottom: 20 }}>
              Banindo: <strong>{selectedUser.display_name}</strong> (@{selectedUser.username || '—'})
            </p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: 12, marginBottom: 6 }}>Motivo do banimento <span style={{ color: 'var(--red)' }}>*</span></label>
              <textarea value={banReason} onChange={e => setBanReason(e.target.value)}
                placeholder="Descreva o motivo do banimento..."
                rows={3} style={{ width: '100%', padding: '10px 14px', border: '2px solid #e0e0e0', borderRadius: 10, fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowBanModal(false); setBanReason(''); setSelectedUser(null) }}
                style={{ flex: 1, padding: '12px', background: '#f5f5f5', border: 'none', borderRadius: 50, fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleBan} disabled={!banReason.trim()}
                style={{ flex: 1, padding: '12px', background: banReason.trim() ? '#c62828' : '#e0e0e0', color: 'white', border: 'none', borderRadius: 50, fontWeight: 700, cursor: banReason.trim() ? 'pointer' : 'not-allowed', transition: 'background 0.2s' }}>
                🚫 Confirmar banimento
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 700px) {
          table { font-size: 12px; }
          td, th { padding: 8px 10px !important; }
        }
      `}</style>
    </div>
  )
}
