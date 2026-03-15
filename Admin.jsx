import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { supabase } from '../lib/supabase'

export default function Admin() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [tab, setTab] = useState('users')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [staff, setStaff] = useState([])
  const [violations, setViolations] = useState([])
  const [reports, setReports] = useState([])
  const [retention, setRetention] = useState(null)
  const [deletionSchedule, setDeletionSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [banReason, setBanReason] = useState('')
  const [showBanModal, setShowBanModal] = useState(false)
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [newStaffUsername, setNewStaffUsername] = useState('')
  const [reportFilter, setReportFilter] = useState('pending')
  const [logs, setLogs] = useState([])
  const [logFilter, setLogFilter] = useState('all')
  const [logSearch, setLogSearch] = useState('')

  useEffect(() => {
    if (!user) return
    supabase.rpc('is_admin_or_staff').then(({ data, error }) => {
      if (error || !data) { navigate('/dashboard'); return }
      supabase.from('admin_staff').select('role').eq('user_id', user.id).maybeSingle()
        .then(({ data: sd }) => {
          setIsAdmin(sd?.role === 'admin')
          loadData()
        })
    })
  }, [user])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, usersRes, staffRes, violationsRes, reportsRes, retentionRes, logsRes, scheduleRes] = await Promise.all([
        supabase.rpc('admin_get_stats'),
        supabase.rpc('admin_get_users', { search_term: search || null, page_num: page, page_size: 50 }),
        supabase.from('admin_staff').select('*, profiles(display_name, username, avatar_emoji)'),
        supabase.from('moderation_violations').select('*, profiles(username, display_name)').order('created_at', { ascending: false }).limit(100),
        supabase.rpc('admin_get_reports', { p_status: 'all' }),
        supabase.rpc('admin_get_retention_stats').catch(() => ({ data: null })),
        supabase.rpc('admin_get_technical_logs', { p_user_id: null, p_event: null, p_limit: 200 }).catch(() => ({ data: [] })),
        supabase.rpc('admin_get_deletion_schedule').catch(() => ({ data: [] })),
      ])
      setStats(statsRes.data)
      setUsers(usersRes.data || [])
      setStaff(staffRes.data || [])
      setViolations(violationsRes.data || [])
      setReports(reportsRes.data || [])
      setRetention(retentionRes.data)
      setLogs(logsRes.data || [])
      setDeletionSchedule(scheduleRes.data || [])
    } catch(e) { console.error(e) }
    setLoading(false)
  }, [search, page])

  useEffect(() => { if (!loading || users.length > 0) loadData() }, [tab, page, search])

  const handleBan = async () => {
    if (!selectedUser || !banReason.trim()) return
    const { error } = await supabase.rpc('admin_ban_user', { target_id: selectedUser.id, ban_reason_text: banReason })
    if (error) { toast('Erro: ' + error.message, 'error'); return }
    toast(`${selectedUser.username || selectedUser.display_name} banido! 🚫`, 'success')
    setShowBanModal(false); setBanReason(''); setSelectedUser(null); loadData()
  }

  const handleUnban = async (u) => {
    const { error } = await supabase.rpc('admin_unban_user', { target_id: u.id, unban_reason: 'Revisão administrativa' })
    if (error) { toast('Erro ao desbanir: ' + error.message, 'error'); return }
    toast(`${u.username || u.display_name} desbanido! ✅`, 'success'); loadData()
  }

  const handleDelete = async (u) => {
    if (!confirm(`Deletar permanentemente @${u.username || u.display_name}? IRREVERSÍVEL.`)) return
    const { error } = await supabase.rpc('admin_delete_account', { target_id: u.id, delete_reason: 'Exclusão administrativa' })
    if (error) { toast('Erro: ' + error.message, 'error'); return }
    toast('Conta deletada! 🗑️', 'success'); loadData()
  }

  const handleResolveReport = async (reportId, action, targetId, targetType) => {
    // Executa ação se necessário
    if (action === 'ban_user' && targetId) {
      const reason = prompt('Motivo do banimento:')
      if (!reason) return
      await supabase.rpc('admin_ban_user', { target_id: targetId, ban_reason_text: reason })
    }
    if (action === 'delete_album' && targetId) {
      if (!confirm('Deletar este álbum?')) return
      await supabase.from('albums').delete().eq('id', targetId)
    }
    await supabase.rpc('admin_resolve_report', { p_report_id: reportId, p_status: 'resolved', p_action: action })
    toast('Denúncia resolvida ✅', 'success'); loadData()
  }

  const handleDismissReport = async (reportId) => {
    await supabase.rpc('admin_resolve_report', { p_report_id: reportId, p_status: 'dismissed', p_action: 'none' })
    toast('Denúncia arquivada', 'success'); loadData()
  }

  const handleAddStaff = async () => {
    if (!newStaffUsername.trim()) return
    const { data: profileData } = await supabase.from('profiles').select('id').eq('username', newStaffUsername.toLowerCase()).maybeSingle()
    if (!profileData) { toast('Usuário não encontrado', 'error'); return }
    const { error } = await supabase.from('admin_staff').insert({ user_id: profileData.id, role: 'staff', added_by: user.id })
    if (error) { toast('Erro: ' + error.message, 'error'); return }
    toast('Funcionário adicionado! ✅', 'success'); setNewStaffUsername(''); setShowAddStaff(false); loadData()
  }

  const filteredReports = reports.filter(r => reportFilter === 'all' ? true : r.status === reportFilter)

  const cardStyle = (color) => ({
    background: 'white', borderRadius: 12, padding: '14px 16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${color}`
  })

  const btnStyle = (bg, color, border) => ({
    padding: '7px 14px', background: bg, color, border: border || 'none',
    borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap'
  })

  if (loading) return <div className="loader" style={{ marginTop: 80 }} />

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      {/* Header */}
      <header style={{ background: '#1B3A1F', color: 'white', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/dashboard" style={{ color: '#66BB6A', fontWeight: 700, textDecoration: 'none', fontSize: 13 }}>← App</Link>
          <span style={{ fontFamily: 'var(--font-title)', fontSize: 15 }}>🛡️ Admin Panel</span>
          {isAdmin && <span style={{ background: '#F5C800', color: '#1B3A1F', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99 }}>ADMIN</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={loadData} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>🔄 Atualizar</button>
          <span style={{ fontSize: 11, color: '#a5d6a7' }}>{user?.email}</span>
        </div>
      </header>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10, padding: '16px 20px 0', maxWidth: 1200, margin: '0 auto' }}>
          {[
            { label: 'Usuários', value: stats.total_users, icon: '👥', color: '#3A8C3F' },
            { label: 'Banidos', value: stats.banned_users, icon: '🚫', color: '#e53935' },
            { label: 'Violações', value: stats.total_violations, icon: '⚠️', color: '#F5A623' },
            { label: 'Denúncias', value: reports.filter(r => r.status === 'pending').length, icon: '🚩', color: '#FF6B9D' },
            { label: 'Álbuns', value: stats.total_albums, icon: '📷', color: '#667EEA' },
            { label: 'Novos 7d', value: stats.new_users_7d, icon: '🆕', color: '#00ACC1' },
          ].map(s => (
            <div key={s.label} style={cardStyle(s.color)}>
              <div style={{ fontSize: 20 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value ?? 0}</div>
              <div style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 20px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            ['users', '👥 Usuários'],
            ['reports', `🚩 Denúncias ${reports.filter(r=>r.status==='pending').length > 0 ? `(${reports.filter(r=>r.status==='pending').length})` : ''}`],
            ['violations', '⚠️ Violações'],
            ['retention', '📅 Retenção'],
            ['logs', '📋 Logs'],
            ['staff', '🔑 Equipe'],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: '8px 16px', borderRadius: 50, border: 'none', background: tab === key ? '#1B3A1F' : 'white', color: tab === key ? 'white' : '#555', fontWeight: 700, fontSize: 12, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── USUÁRIOS ── */}
        {tab === 'users' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1) } }}
                placeholder="Buscar por @usuário, nome ou email..."
                style={{ flex: 1, padding: '9px 14px', border: '2px solid #e0e0e0', borderRadius: 50, fontSize: 13, outline: 'none' }} />
              <button onClick={() => { setSearch(searchInput); setPage(1) }}
                style={{ ...btnStyle('#3A8C3F', 'white'), borderRadius: 50, padding: '9px 18px' }}>Buscar</button>
              {search && <button onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
                style={{ ...btnStyle('#eee', '#555'), borderRadius: 50, padding: '9px 14px' }}>✕</button>}
            </div>

            <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5' }}>
                      {['Usuário', 'Email', 'Idade', 'Violações', 'Status', 'Cadastro', 'Ações'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#555', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr key={u.id} style={{ borderTop: '1px solid #f0f0f0', background: u.is_banned ? '#fff5f5' : i%2===0?'white':'#fafafa' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 18 }}>{u.avatar_emoji || '🍍'}</span>
                            <div>
                              <div style={{ fontWeight: 700 }}>{u.display_name || '—'}</div>
                              <div style={{ color: '#888', fontSize: 11 }}>@{u.username || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#555', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</td>
                        <td style={{ padding: '10px 14px', color: '#555' }}>
                          {u.birth_date ? `${new Date().getFullYear() - new Date(u.birth_date).getFullYear()}a` : '—'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ background: u.violation_count > 0 ? '#fff3cd' : '#e8f5e9', color: u.violation_count > 0 ? '#856404' : '#2e7d32', padding: '2px 8px', borderRadius: 99, fontWeight: 700, fontSize: 11 }}>
                            {u.violation_count}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {u.is_banned
                            ? <div>
                                <span style={{ background: '#fdecea', color: '#c62828', padding: '2px 8px', borderRadius: 99, fontWeight: 700, fontSize: 10 }}>🚫 Banido</span>
                                {u.banned_at && <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{new Date(u.banned_at).toLocaleDateString('pt-BR')}</div>}
                                {u.ban_reason && <div style={{ fontSize: 10, color: '#aaa', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.ban_reason}</div>}
                              </div>
                            : <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: 99, fontWeight: 700, fontSize: 10 }}>✅ Ativo</span>
                          }
                        </td>
                        <td style={{ padding: '10px 14px', color: '#888', fontSize: 11, whiteSpace: 'nowrap' }}>
                          {new Date(u.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {!u.is_banned
                              ? <button onClick={() => { setSelectedUser(u); setShowBanModal(true) }} style={btnStyle('#fdecea', '#c62828')}>🚫 Banir</button>
                              : <button onClick={() => handleUnban(u)} style={btnStyle('#e8f5e9', '#2e7d32')}>✅ Desbanir</button>
                            }
                            {isAdmin && <button onClick={() => handleDelete(u)} style={btnStyle('#f5f5f5', '#c62828', '1px solid #e0e0e0')}>🗑️</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {users.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: '#888' }}>Nenhum usuário encontrado</div>}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
              {page > 1 && <button onClick={() => setPage(p=>p-1)} style={btnStyle('white','#555','2px solid #e0e0e0')}>← Anterior</button>}
              <span style={{ padding: '8px 14px', background: 'white', borderRadius: 50, fontSize: 12, color: '#555' }}>Pág. {page}</span>
              {users.length === 50 && <button onClick={() => setPage(p=>p+1)} style={btnStyle('white','#555','2px solid #e0e0e0')}>Próxima →</button>}
            </div>
          </div>
        )}

        {/* ── DENÚNCIAS ── */}
        {tab === 'reports' && (
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {[['pending','⏳ Pendentes'],['resolved','✅ Resolvidas'],['dismissed','📁 Arquivadas'],['all','Todas']].map(([k,l]) => (
                <button key={k} onClick={() => setReportFilter(k)}
                  style={{ ...btnStyle(reportFilter===k?'#1B3A1F':'white', reportFilter===k?'white':'#555'), borderRadius: 50 }}>
                  {l}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredReports.length === 0 && (
                <div style={{ background: 'white', borderRadius: 14, padding: 32, textAlign: 'center', color: '#888' }}>
                  {reportFilter === 'pending' ? '✅ Nenhuma denúncia pendente!' : 'Nenhuma denúncia nesta categoria'}
                </div>
              )}
              {filteredReports.map(r => (
                <div key={r.id} style={{ background: 'white', borderRadius: 14, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${r.status==='pending'?'#F5A623':r.status==='resolved'?'#3A8C3F':'#ccc'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                          {r.target_type === 'album' ? '📷 Álbum' : r.target_type === 'user' ? '👤 Usuário' : r.target_type === 'letter' ? '💌 Cartinha' : '📄 Página'}
                        </span>
                        <span style={{ background: r.status==='pending'?'#fff3cd':r.status==='resolved'?'#e8f5e9':'#f5f5f5', color: r.status==='pending'?'#856404':r.status==='resolved'?'#2e7d32':'#888', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                          {r.status==='pending'?'⏳ Pendente':r.status==='resolved'?'✅ Resolvida':'📁 Arquivada'}
                        </span>
                        <span style={{ fontSize: 11, color: '#888' }}>por @{r.reporter_username || 'anônimo'}</span>
                        <span style={{ fontSize: 11, color: '#aaa' }}>{new Date(r.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Motivo: {r.reason}</div>
                      {r.description && <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>{r.description}</div>}
                      <div style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace' }}>ID: {r.target_id}</div>
                    </div>

                    {r.status === 'pending' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
                        {r.target_type === 'album' && (
                          <button onClick={() => handleResolveReport(r.id, 'delete_album', r.target_id, r.target_type)}
                            style={btnStyle('#fdecea', '#c62828')}>🗑️ Deletar álbum</button>
                        )}
                        {r.target_type === 'user' && (
                          <button onClick={() => handleResolveReport(r.id, 'ban_user', r.target_id, r.target_type)}
                            style={btnStyle('#fdecea', '#c62828')}>🚫 Banir usuário</button>
                        )}
                        <button onClick={() => handleResolveReport(r.id, 'none', null, r.target_type)}
                          style={btnStyle('#e8f5e9', '#2e7d32')}>✅ Resolver sem ação</button>
                        <button onClick={() => handleDismissReport(r.id)}
                          style={btnStyle('#f5f5f5', '#888')}>📁 Arquivar</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── VIOLAÇÕES ── */}
        {tab === 'violations' && (
          <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    {['Usuário', 'Tipo', 'Categorias', 'Conteúdo', 'Data', 'Ação'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#555', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {violations.map((v, i) => (
                    <tr key={v.id} style={{ borderTop: '1px solid #f0f0f0', background: i%2===0?'white':'#fafafa' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontWeight: 700 }}>@{v.profiles?.username || '—'}</span>
                        <div style={{ fontSize: 10, color: '#aaa', fontFamily: 'monospace' }}>{v.user_id?.slice(0,8)}...</div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: v.type==='image'?'#e3f2fd':'#fff8e7', color: v.type==='image'?'#1565c0':'#856404', padding: '2px 6px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>
                          {v.type==='image'?'🖼️ Img':'💬 Txt'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: '#fdecea', color: '#c62828', padding: '2px 6px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>{v.categories}</span>
                      </td>
                      <td style={{ padding: '10px 14px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#555' }}>
                        {v.content || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#888', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {new Date(v.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button onClick={() => { setSelectedUser({ id: v.user_id, username: v.profiles?.username, display_name: v.profiles?.display_name }); setShowBanModal(true) }}
                          style={btnStyle('#fdecea','#c62828')}>🚫 Banir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {violations.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: '#888' }}>Nenhuma violação registrada</div>}
          </div>
        )}

        {/* ── RETENÇÃO ── */}
        {tab === 'retention' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {retention && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>
                {[
                  { label: 'Exclusões pendentes', value: retention.pending_deletions, icon: '⏳', color: '#F5A623' },
                  { label: 'Exclusões concluídas', value: retention.completed_deletions, icon: '✅', color: '#3A8C3F' },
                  { label: 'Total de logs', value: retention.logs_total, icon: '📋', color: '#667EEA' },
                  { label: 'Violações +2 anos', value: retention.violations_older_2y, icon: '🗑️', color: '#e53935' },
                ].map(s => (
                  <div key={s.label} style={cardStyle(s.color)}>
                    <div style={{ fontSize: 20 }}>{s.icon}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value ?? 0}</div>
                    <div style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {retention && (
              <div style={{ background: 'white', borderRadius: 14, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <h3 style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>📊 Status das Políticas</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Próxima exclusão', value: retention.next_deletion ? new Date(retention.next_deletion).toLocaleDateString('pt-BR') : 'Nenhuma', ok: true },
                    { label: 'Log mais antigo', value: retention.oldest_log ? new Date(retention.oldest_log).toLocaleDateString('pt-BR') : '—', ok: true },
                    { label: 'Violação mais antiga', value: retention.oldest_violation ? new Date(retention.oldest_violation).toLocaleDateString('pt-BR') : '—', ok: true },
                    { label: 'Violações a limpar', value: `${retention.violations_older_2y || 0} registros`, ok: (retention.violations_older_2y || 0) === 0 },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f9f9f9', borderRadius: 8, fontSize: 13 }}>
                      <span style={{ color: '#555' }}>{item.label}</span>
                      <span style={{ fontWeight: 700, color: item.ok ? '#2e7d32' : '#e53935' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isAdmin && (
              <div style={{ background: 'white', borderRadius: 14, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <h3 style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>🧹 Limpeza Manual</h3>
                <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>Execute periodicamente — o Supabase free não tem cron automático.</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={async () => {
                    const { data, error } = await supabase.rpc('process_scheduled_deletions')
                    if (error) { toast('Erro: ' + error.message, 'error'); return }
                    toast(`✅ ${data?.deleted || 0} conta(s) deletada(s)`, 'success'); loadData()
                  }} style={btnStyle('#fdecea','#c62828','2px solid #ffcdd2')}>⏳ Processar exclusões agendadas</button>
                  <button onClick={async () => {
                    const { data, error } = await supabase.rpc('cleanup_technical_logs')
                    if (error) { toast('Erro: ' + error.message, 'error'); return }
                    toast(`✅ ${data?.deleted_logs || 0} log(s) removido(s)`, 'success'); loadData()
                  }} style={btnStyle('#e3f2fd','#1565c0','2px solid #bbdefb')}>📋 Limpar logs +90 dias</button>
                  <button onClick={async () => {
                    const { data, error } = await supabase.rpc('cleanup_old_moderation_data')
                    if (error) { toast('Erro: ' + error.message, 'error'); return }
                    toast(`✅ ${data?.deleted_violations || 0} violação(ões) removida(s)`, 'success'); loadData()
                  }} style={btnStyle('#fff8e1','#856404','2px solid #ffe082')}>⚠️ Limpar violações +2 anos</button>
                </div>
              </div>
            )}

            <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0f0f0', fontWeight: 800, fontSize: 14 }}>
                📅 Exclusões Agendadas ({deletionSchedule.filter(d=>!d.executed).length} pendentes)
              </div>
              {deletionSchedule.length === 0
                ? <div style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: 13 }}>Nenhum agendamento</div>
                : <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead><tr style={{ background: '#f5f5f5' }}>
                        {['Usuário','Email','Solicitado','Agendado para','Motivo','Status'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#555', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {deletionSchedule.map((d,i) => (
                          <tr key={d.id} style={{ borderTop: '1px solid #f0f0f0', background: i%2===0?'white':'#fafafa' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 600 }}>@{d.username||'—'}</td>
                            <td style={{ padding: '8px 12px', color: '#555' }}>{d.email}</td>
                            <td style={{ padding: '8px 12px', color: '#888', whiteSpace: 'nowrap' }}>{new Date(d.requested_at).toLocaleDateString('pt-BR')}</td>
                            <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                              <span style={{ color: d.executed?'#888':new Date(d.scheduled_for)<=new Date()?'#c62828':'#2e7d32', fontWeight: 700 }}>
                                {new Date(d.scheduled_for).toLocaleDateString('pt-BR')}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', color: '#555' }}>{d.reason}</td>
                            <td style={{ padding: '8px 12px' }}>
                              {d.executed
                                ? <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>✅ Executado</span>
                                : <span style={{ background: '#fff8e1', color: '#856404', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>⏳ Pendente</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              }
            </div>
          </div>
        )}

        {/* ── EQUIPE ── */}
        {tab === 'staff' && (
          <div>
            {isAdmin && (
              <div style={{ marginBottom: 12 }}>
                {!showAddStaff
                  ? <button onClick={() => setShowAddStaff(true)} style={{ ...btnStyle('#3A8C3F','white'), borderRadius: 50, padding: '10px 18px' }}>+ Adicionar funcionário</button>
                  : <div style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <input value={newStaffUsername} onChange={e => setNewStaffUsername(e.target.value)}
                        placeholder="@usuário do funcionário"
                        style={{ flex: 1, minWidth: 180, padding: '9px 14px', border: '2px solid #e0e0e0', borderRadius: 50, fontSize: 13, outline: 'none' }} />
                      <button onClick={handleAddStaff} style={{ ...btnStyle('#3A8C3F','white'), borderRadius: 50, padding: '9px 16px' }}>Adicionar</button>
                      <button onClick={() => setShowAddStaff(false)} style={{ ...btnStyle('#eee','#555'), borderRadius: 50, padding: '9px 14px' }}>Cancelar</button>
                    </div>
                }
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {staff.map(s => (
                <div key={s.id} style={{ background: 'white', borderRadius: 12, padding: '14px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 28 }}>{s.profiles?.avatar_emoji || '👤'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{s.profiles?.display_name || 'Usuário'}</div>
                    <div style={{ color: '#888', fontSize: 12 }}>@{s.profiles?.username || '—'}</div>
                  </div>
                  <span style={{ background: s.role==='admin'?'#fff3cd':'#e8f5e9', color: s.role==='admin'?'#856404':'#2e7d32', padding: '4px 12px', borderRadius: 99, fontWeight: 800, fontSize: 12 }}>
                    {s.role==='admin'?'👑 ADMIN':'🔑 STAFF'}
                  </span>
                  {isAdmin && s.role !== 'admin' && (
                    <button onClick={async () => { if(!confirm('Remover?')) return; await supabase.from('admin_staff').delete().eq('id', s.id); loadData() }}
                      style={btnStyle('#fdecea','#c62828')}>Remover</button>
                  )}
                </div>
              ))}
              {staff.length === 0 && <div style={{ background: 'white', borderRadius: 14, padding: 32, textAlign: 'center', color: '#888' }}>Nenhum funcionário</div>}
            </div>
          </div>
        )}
      </div>

      {/* ── LOGS ── */}
      {tab === 'logs' && (
        <div>
          <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
            {/* Filtro por tipo */}
            <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
              {[['all','Todos'],['login','🔑 Login'],['logout','🚪 Logout'],['create_album','📷 Álbum criado'],['delete_album','🗑️ Álbum deletado'],['upload_photo','📸 Upload'],['send_letter','💌 Cartinha'],['deletion_scheduled','⏳ Exclusão ag.'],['account_deleted','❌ Conta deletada']].map(([k,l]) => (
                <button key={k} onClick={() => setLogFilter(k)}
                  style={{ padding:'6px 12px', borderRadius:50, border:'none', background:logFilter===k?'#1B3A1F':'white', color:logFilter===k?'white':'#555', fontWeight:700, fontSize:11, cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }}>
                  {l}
                </button>
              ))}
            </div>
            {/* Busca por usuário */}
            <input value={logSearch} onChange={e => setLogSearch(e.target.value)}
              placeholder="Filtrar por @usuário..."
              style={{ padding:'7px 12px', border:'2px solid #e0e0e0', borderRadius:50, fontSize:12, outline:'none', minWidth:160 }} />
          </div>

          <div style={{ background:'white', borderRadius:14, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid #f0f0f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontWeight:800, fontSize:13 }}>
                📋 Logs Técnicos
                <span style={{ marginLeft:8, background:'#f0f0f0', color:'#666', padding:'2px 8px', borderRadius:99, fontSize:11 }}>
                  {logs.filter(l => (logFilter==='all'||l.event_type===logFilter) && (!logSearch||l.username?.includes(logSearch.replace('@','')))).length} registros
                </span>
              </span>
              <span style={{ fontSize:11, color:'#aaa' }}>Retidos por 90 dias</span>
            </div>
            <div style={{ overflowX:'auto', maxHeight:600, overflowY:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead style={{ position:'sticky', top:0, background:'#f5f5f5', zIndex:1 }}>
                  <tr>
                    {['Data/Hora','Usuário','Evento','Detalhes'].map(h => (
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, color:'#555', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs
                    .filter(l => logFilter==='all' || l.event_type===logFilter)
                    .filter(l => !logSearch || (l.username||'').includes(logSearch.replace('@','')))
                    .map((l, i) => {
                      const eventColors = {
                        login:              { bg:'#e8f5e9', color:'#2e7d32' },
                        logout:             { bg:'#f5f5f5', color:'#555'    },
                        create_album:       { bg:'#e3f2fd', color:'#1565c0' },
                        delete_album:       { bg:'#fdecea', color:'#c62828' },
                        upload_photo:       { bg:'#f3e5f5', color:'#6a1b9a' },
                        send_letter:        { bg:'#fce4ec', color:'#880e4f' },
                        deletion_scheduled: { bg:'#fff3e0', color:'#e65100' },
                        account_deleted:    { bg:'#fdecea', color:'#b71c1c' },
                        ban:                { bg:'#fdecea', color:'#c62828' },
                        unban:              { bg:'#e8f5e9', color:'#2e7d32' },
                      }
                      const ec = eventColors[l.event_type] || { bg:'#f5f5f5', color:'#555' }
                      const eventLabels = {
                        login:              '🔑 Login',
                        logout:             '🚪 Logout',
                        create_album:       '📷 Álbum criado',
                        delete_album:       '🗑️ Álbum deletado',
                        upload_photo:       '📸 Upload foto',
                        send_letter:        '💌 Cartinha enviada',
                        deletion_scheduled: '⏳ Exclusão agendada',
                        deletion_cancelled: '↩️ Exclusão cancelada',
                        account_deleted:    '❌ Conta deletada',
                        ban:                '🚫 Banimento',
                        unban:              '✅ Desbanimento',
                      }
                      return (
                        <tr key={l.id} style={{ borderTop:'1px solid #f0f0f0', background:i%2===0?'white':'#fafafa' }}>
                          <td style={{ padding:'9px 14px', color:'#888', whiteSpace:'nowrap', fontSize:11 }}>
                            {new Date(l.created_at).toLocaleString('pt-BR')}
                          </td>
                          <td style={{ padding:'9px 14px' }}>
                            <span style={{ fontWeight:700 }}>@{l.username||'—'}</span>
                            <div style={{ fontSize:10, color:'#aaa', fontFamily:'monospace' }}>{l.user_id?.slice(0,8)}...</div>
                          </td>
                          <td style={{ padding:'9px 14px' }}>
                            <span style={{ background:ec.bg, color:ec.color, padding:'3px 8px', borderRadius:99, fontWeight:700, fontSize:11, whiteSpace:'nowrap' }}>
                              {eventLabels[l.event_type] || l.event_type}
                            </span>
                          </td>
                          <td style={{ padding:'9px 14px', color:'#555', maxWidth:280, fontSize:11 }}>
                            {l.details ? (
                              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                                {Object.entries(l.details).map(([k,v]) => (
                                  <span key={k} style={{ background:'#f5f5f5', padding:'1px 6px', borderRadius:4, fontFamily:'monospace', fontSize:10 }}>
                                    {k}: {String(v).slice(0,50)}
                                  </span>
                                ))}
                              </div>
                            ) : '—'}
                          </td>
                        </tr>
                      )
                    })
                  }
                </tbody>
              </table>
              {logs.filter(l => logFilter==='all'||l.event_type===logFilter).length === 0 && (
                <div style={{ textAlign:'center', padding:32, color:'#888', fontSize:13 }}>
                  {logs.length === 0 ? 'Nenhum log registrado ainda — ações futuras aparecerão aqui' : 'Nenhum log nesta categoria'}
                </div>
              )}
            </div>
          </div>

          <p style={{ fontSize:11, color:'#aaa', marginTop:8, textAlign:'center' }}>
            Logs são mantidos por 90 dias conforme a Política de Privacidade. Use "Limpar logs +90 dias" na aba Retenção.
          </p>
        </div>
      )}

      {/* Modal ban */}
      {showBanModal && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, maxWidth: 400, width: '100%' }}>
            <h2 style={{ fontFamily: 'var(--font-title)', color: '#c62828', marginBottom: 8 }}>🚫 Banir usuário</h2>
            <p style={{ color: '#555', fontSize: 14, marginBottom: 16 }}>
              Banindo: <strong>{selectedUser.display_name || selectedUser.username}</strong>
              {selectedUser.username && ` (@${selectedUser.username})`}
            </p>
            <label style={{ display: 'block', fontWeight: 700, fontSize: 12, marginBottom: 6 }}>Motivo *</label>
            <textarea value={banReason} onChange={e => setBanReason(e.target.value)}
              placeholder="Descreva o motivo do banimento..."
              rows={3} style={{ width: '100%', padding: '10px 14px', border: '2px solid #e0e0e0', borderRadius: 10, fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowBanModal(false); setBanReason(''); setSelectedUser(null) }}
                style={{ flex: 1, padding: 12, background: '#f5f5f5', border: 'none', borderRadius: 50, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleBan} disabled={!banReason.trim()}
                style={{ flex: 1, padding: 12, background: banReason.trim()?'#c62828':'#e0e0e0', color: 'white', border: 'none', borderRadius: 50, fontWeight: 700, cursor: banReason.trim()?'pointer':'not-allowed' }}>
                🚫 Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@media(max-width:700px){table{font-size:11px}td,th{padding:6px 8px!important}}`}</style>
    </div>
  )
}
