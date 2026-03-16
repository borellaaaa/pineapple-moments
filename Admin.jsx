import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { supabase } from '../lib/supabase'

// Suspensões conforme legislação brasileira (2025/2026)
// Marco Civil da Internet (Lei 12.965/2014) + ECA + LGPD
const SUSPENSION_OPTIONS = [
  { label: '24 horas — Infração leve (1ª vez)', hours: 24, law: 'Marco Civil Art. 19' },
  { label: '7 dias — Infração moderada / reincidência', hours: 168, law: 'Marco Civil Art. 19' },
  { label: '30 dias — Infração grave', hours: 720, law: 'Marco Civil Art. 19 + ECA Art. 241-A' },
  { label: '90 dias — Infração muito grave / múltiplas violações', hours: 2160, law: 'Marco Civil Art. 19' },
  { label: 'Banimento permanente — CSAM / terrorismo / crime hediondo', hours: -1, law: 'ECA Art. 241-A + CP Art. 288' },
]

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
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [banReason, setBanReason] = useState('')
  const [suspendHours, setSuspendHours] = useState(-1)
  const [showBanModal, setShowBanModal] = useState(false)
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [newStaffUsername, setNewStaffUsername] = useState('')
  const [reportFilter, setReportFilter] = useState('pending')
  const [logFilter, setLogFilter] = useState('all')
  const [logSearch, setLogSearch] = useState('')

  useEffect(() => {
    if (!user) return
    supabase.rpc('is_admin_or_staff').then(({ data, error }) => {
      if (error || !data) { navigate('/dashboard'); return }
      supabase.from('admin_staff').select('role').eq('user_id', user.id).maybeSingle()
        .then(({ data: sd }) => { setIsAdmin(sd?.role === 'admin'); loadData() })
    })
  }, [user])

  const safeRpc = async (fn, args = {}) => {
    try { const { data } = await supabase.rpc(fn, args); return data } catch { return null }
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, usersRes, staffRes, violationsRes] = await Promise.all([
        supabase.rpc('admin_get_stats'),
        supabase.rpc('admin_get_users', { search_term: search || null, page_num: page, page_size: 50 }),
        supabase.from('admin_staff').select('*, profiles(display_name, username, avatar_emoji)'),
        supabase.from('moderation_violations').select('*, profiles(username,display_name)').order('created_at', { ascending: false }).limit(100),
      ])
      setStats(statsRes.data)
      setUsers(usersRes.data || [])
      setStaff(staffRes.data || [])
      setViolations(violationsRes.data || [])

      // Reports separado para não quebrar o resto se falhar
      const reportsData = await safeRpc('admin_get_reports', { p_status: 'all' })
      setReports(reportsData || [])

      const [retData, logsData, schedData] = await Promise.all([
        safeRpc('admin_get_retention_stats'),
        safeRpc('admin_get_technical_logs', { p_user_id: null, p_event: null, p_limit: 200 }),
        safeRpc('admin_get_deletion_schedule'),
      ])
      setRetention(retData)
      setLogs(logsData || [])
      setDeletionSchedule(schedData || [])
    } catch(e) { console.error('loadData error:', e) }
    setLoading(false)
  }, [search, page])

  useEffect(() => { if (!loading || users.length > 0) loadData() }, [tab, page, search])

  // ── Banimento permanente ─────────────────────────────────────────────────
  const handleBan = async () => {
    if (!selectedUser || !banReason.trim()) return
    const { error } = await supabase.rpc('admin_ban_user', { target_id: selectedUser.id, ban_reason_text: banReason })
    if (error) { toast('Erro: ' + error.message, 'error'); return }
    toast(`${selectedUser.username || selectedUser.display_name} banido permanentemente 🚫`, 'success')
    setShowBanModal(false); setBanReason(''); setSelectedUser(null); loadData()
  }

  // ── Suspensão temporária ─────────────────────────────────────────────────
  const handleSuspend = async () => {
    if (!selectedUser || !banReason.trim()) return
    const opt = SUSPENSION_OPTIONS.find(o => o.hours === suspendHours)
    if (!opt) return

    if (suspendHours === -1) {
      // Banimento permanente
      await handleBan()
      return
    }

    const until = new Date(Date.now() + suspendHours * 3600000).toISOString()
    const reason = `[Suspenso até ${new Date(until).toLocaleString('pt-BR')}] ${banReason} — Base legal: ${opt.law}`

    const { error } = await supabase.rpc('admin_ban_user', { target_id: selectedUser.id, ban_reason_text: reason })
    if (error) { toast('Erro: ' + error.message, 'error'); return }

    // Log da suspensão
    await supabase.from('technical_logs').insert({
      user_id: selectedUser.id, event_type: 'suspension',
      details: { hours: suspendHours, until, reason: banReason, law: opt.law, admin: user.id }
    })

    toast(`Conta suspensa por ${opt.label.split('—')[0].trim()} ✅`, 'success')
    setShowSuspendModal(false); setBanReason(''); setSuspendHours(-1); setSelectedUser(null); loadData()
  }

  const handleUnban = async (u) => {
    const { error } = await supabase.rpc('admin_unban_user', { target_id: u.id, unban_reason: 'Revisão administrativa' })
    if (error) { toast('Erro: ' + error.message, 'error'); return }
    toast(`${u.username || u.display_name} conta reativada ✅`, 'success'); loadData()
  }

  const handleDelete = async (u) => {
    if (!confirm(`Deletar permanentemente a conta de @${u.username || u.display_name}?\n\nISTO É IRREVERSÍVEL — todos os dados serão apagados.`)) return
    const { error } = await supabase.rpc('admin_delete_account', { target_id: u.id, delete_reason: 'Exclusão administrativa' })
    if (error) { toast('Erro: ' + error.message, 'error'); return }
    toast('Conta deletada permanentemente 🗑️', 'success'); loadData()
  }

  // ── Resolver denúncia ────────────────────────────────────────────────────
  const handleResolveReport = async (reportId, action, targetId, ownerId) => {
    if (action === 'delete_album' && targetId) {
      if (!confirm('Deletar este álbum? Esta ação é irreversível.')) return
      // Deleta páginas primeiro, depois álbum
      await supabase.from('pages').delete().eq('album_id', targetId)
      const { error } = await supabase.from('albums').delete().eq('id', targetId)
      if (error) { toast('Erro ao deletar álbum: ' + error.message, 'error'); return }
      toast('Álbum deletado ✅', 'success')
    }
    if (action === 'ban_user' && ownerId) {
      const reason = prompt('Motivo do banimento:')
      if (!reason) return
      await supabase.rpc('admin_ban_user', { target_id: ownerId, ban_reason_text: reason })
      toast('Usuário banido 🚫', 'success')
    }
    if (action === 'suspend_user' && ownerId) {
      setSelectedUser({ id: ownerId, username: '', display_name: 'Usuário denunciado' })
      setShowSuspendModal(true)
    }
    await supabase.rpc('admin_resolve_report', { p_report_id: reportId, p_status: 'resolved', p_action: action })
    loadData()
  }

  const handleDismissReport = async (reportId) => {
    await supabase.rpc('admin_resolve_report', { p_report_id: reportId, p_status: 'dismissed', p_action: 'none' })
    toast('Denúncia arquivada 📁', 'success'); loadData()
  }

  const handleAddStaff = async () => {
    if (!newStaffUsername.trim()) return
    const { data: profileData } = await supabase.from('profiles').select('id').eq('username', newStaffUsername.toLowerCase()).maybeSingle()
    if (!profileData) { toast('Usuário @' + newStaffUsername + ' não encontrado', 'error'); return }
    const { error } = await supabase.from('admin_staff').insert({ user_id: profileData.id, role: 'staff', added_by: user.id })
    if (error) { toast('Erro: ' + error.message, 'error'); return }
    toast('Funcionário adicionado ✅', 'success'); setNewStaffUsername(''); setShowAddStaff(false); loadData()
  }

  // ── Relatório para autoridades ──────────────────────────────────────────
  const generateAuthorityReport = async (report) => {
    toast('Gerando relatório... aguarde 🔍', 'success')
    const now = new Date()
    const reportType = { album: 'Álbum digital', user: 'Perfil de usuário', letter: 'Mensagem', page: 'Página de álbum' }[report.target_type] || report.target_type

    let albumPhotos = [], targetEmail = '—', targetDisplayName = '—', targetUsername = '—', targetUserId = '—', albumName = '—'

    try {
      if (report.target_type === 'album' && report.target_id) {
        // Busca álbum separado
        const { data: album, error: albumErr } = await supabase
          .from('albums').select('name, owner_id').eq('id', report.target_id).maybeSingle()
        console.log('[relatório] album:', album, albumErr)

        if (album) {
          albumName = album.name || '—'
          targetUserId = album.owner_id || '—'

          // Busca perfil do dono separado
          if (album.owner_id) {
            const { data: profile } = await supabase
              .from('profiles').select('display_name, username')
              .eq('id', album.owner_id).maybeSingle()
            if (profile) {
              targetDisplayName = profile.display_name || '—'
              targetUsername = profile.username || '—'
            }

            // Busca email via admin_get_users
            const { data: ul } = await supabase.rpc('admin_get_users', {
              search_term: targetUsername !== '—' ? targetUsername : null,
              page_num: 1, page_size: 10
            })
            const found = ul?.find(u => u.id === album.owner_id)
            if (found) targetEmail = found.email || '—'
            else if (ul?.[0]) targetEmail = ul[0].email || '—'
          }

          // Busca páginas e fotos
          const { data: pages, error: pagesErr } = await supabase
            .from('pages').select('svg_paths').eq('album_id', report.target_id)
          console.log('[relatório] pages:', pages?.length, pagesErr)

          if (pages && pages.length > 0) {
            for (const pg of pages) {
              try {
                const raw = pg.svg_paths
                const els = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : [])
                console.log('[relatório] elementos na página:', els.length, els.map(e=>e.type))
                for (const el of els) {
                  if (el.type === 'image' && el.src) {
                    albumPhotos.push(el.src)
                  }
                }
              } catch(parseErr) { console.warn('[relatório] parse erro:', parseErr) }
            }
          }
          console.log('[relatório] fotos encontradas:', albumPhotos.length)
        }
      }

      if (report.target_type === 'user' && report.target_id) {
        const { data: profile } = await supabase.from('profiles').select('display_name, username').eq('id', report.target_id).maybeSingle()
        if (profile) {
          targetDisplayName = profile.display_name || '—'
          targetUsername = profile.username || '—'
          targetUserId = report.target_id
          const { data: ul } = await supabase.rpc('admin_get_users', { search_term: profile.username, page_num: 1, page_size: 1 })
          if (ul?.[0]) targetEmail = ul[0].email || '—'
        }
      }
    } catch(e) { console.warn('Erro relatório:', e) }

    // Monta HTML das fotos — usa img direto com src
    const photosSection = albumPhotos.length > 0
      ? albumPhotos.map((src, i) =>
          `<div style="display:inline-block;margin:6px;border:2px solid #ccc;border-radius:6px;overflow:hidden;vertical-align:top;background:#f5f5f5">
            <img src="${src.replace(/"/g, '&quot;')}" style="width:200px;height:150px;object-fit:cover;display:block" />
            <div style="font-size:10px;color:#666;padding:4px 8px;text-align:center">Imagem ${i+1} de ${albumPhotos.length}</div>
          </div>`).join('\n')
      : '<p style="color:#888;font-style:italic;padding:16px">Nenhuma foto encontrada — pode ter sido removida antes da geração do relatório.</p>'

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório RPT-${(report.id||'').slice(0,8).toUpperCase()} — Pineapple Moments</title>
<style>
  body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:40px;max-width:850px;margin:0 auto}
  h1{font-size:18px;color:#c62828;text-align:center;text-transform:uppercase;margin:20px 0 6px}
  h2{font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#555;border-bottom:1px solid #ddd;padding-bottom:4px;margin:20px 0 12px}
  .header{display:flex;justify-content:space-between;border-bottom:3px solid #1B3A1F;padding-bottom:16px;margin-bottom:20px}
  .logo{font-size:20px;font-weight:bold;color:#1B3A1F}
  .sub{font-size:11px;color:#555;margin-top:3px}
  .row{display:flex;gap:8px;margin-bottom:8px}
  .lbl{font-weight:bold;min-width:220px;color:#333;font-size:12px}
  .val{color:#111;font-size:12px;flex:1;word-break:break-all}
  .box-red{background:#fdecea;border-left:4px solid #c62828;padding:12px 16px;border-radius:4px;margin:14px 0;font-size:12px;line-height:1.7}
  .box-yellow{background:#fff3cd;border-left:4px solid #f5a623;padding:12px 16px;border-radius:4px;margin:14px 0;font-size:12px;line-height:1.7}
  .photos{background:#f9f9f9;border:1px solid #ddd;border-radius:8px;padding:16px;margin:8px 0}
  .auth-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px}
  .auth-card{border:1px solid #ddd;padding:12px;border-radius:6px}
  .auth-name{font-weight:bold;color:#1B3A1F;font-size:12px}
  .auth-info{font-size:11px;color:#555;margin-top:4px}
  .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:48px}
  .sig-line{border-top:1px solid #333;padding-top:6px;font-size:11px;color:#555;text-align:center;margin-top:44px}
  .footer{margin-top:32px;padding-top:12px;border-top:1px solid #ddd;font-size:11px;color:#888}
  @media print{.noprint{display:none}}
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">🍍 Pineapple Moments</div>
    <div class="sub">pineapple-moments.vercel.app</div>
  </div>
  <div style="text-align:right;font-size:11px;color:#555">
    <div>Gerado em: ${now.toLocaleString('pt-BR')}</div>
    <div style="font-weight:bold;color:#c62828">Protocolo: RPT-${(report.id||'').slice(0,8).toUpperCase()}</div>
  </div>
</div>

<h1>⚠️ Relatório de Conteúdo Ilícito</h1>
<p style="text-align:center;color:#555;font-size:12px;margin-bottom:20px">Documento para encaminhamento às autoridades competentes</p>

<div class="box-red">
  <strong>AVISO LEGAL:</strong> Documento gerado em cumprimento ao <strong>Art. 241-A do ECA (Lei 8.069/1990)</strong>,
  <strong>Marco Civil da Internet (Lei 12.965/2014)</strong>, <strong>Lei 13.431/2017</strong> e <strong>LGPD (Lei 13.709/2018)</strong>.
  O operador da plataforma comunica o conteúdo às autoridades conforme obrigação legal.
</div>

<h2>1. Identificação da Denúncia</h2>
<div class="row"><span class="lbl">Protocolo:</span><span class="val"><strong>RPT-${(report.id||'').slice(0,8).toUpperCase()}</strong></span></div>
<div class="row"><span class="lbl">ID completo da denúncia:</span><span class="val" style="font-family:monospace">${report.id||'—'}</span></div>
<div class="row"><span class="lbl">Data/Hora da Denúncia:</span><span class="val">${fmt(report.created_at)}</span></div>
<div class="row"><span class="lbl">Data/Hora do Relatório:</span><span class="val">${now.toLocaleString('pt-BR')}</span></div>
<div class="row"><span class="lbl">Tipo de Conteúdo:</span><span class="val">${reportType}</span></div>
<div class="row"><span class="lbl">ID do Conteúdo:</span><span class="val" style="font-family:monospace">${report.target_id||'—'}</span></div>
${albumName !== '—' ? `<div class="row"><span class="lbl">Nome do Álbum:</span><span class="val"><strong>${albumName}</strong></span></div>` : ''}
<div class="row"><span class="lbl">Motivo Reportado:</span><span class="val"><strong style="color:#c62828">${report.reason||'—'}</strong></span></div>
${report.description ? `<div class="row"><span class="lbl">Descrição do Denunciante:</span><span class="val">${report.description}</span></div>` : ''}

<h2>2. Usuário Denunciado</h2>
<div class="row"><span class="lbl">Nome / Apelido:</span><span class="val"><strong>${targetDisplayName}</strong></span></div>
<div class="row"><span class="lbl">Nome de usuário:</span><span class="val">@${targetUsername}</span></div>
<div class="row"><span class="lbl">E-mail cadastrado:</span><span class="val"><strong>${targetEmail}</strong></span></div>
<div class="row"><span class="lbl">ID na plataforma:</span><span class="val" style="font-family:monospace">${targetUserId}</span></div>

<h2>3. Usuário Denunciante</h2>
<div class="row"><span class="lbl">Nome de usuário:</span><span class="val">@${report.reporter_username||'Anônimo'}</span></div>
<div class="row"><span class="lbl">ID na plataforma:</span><span class="val" style="font-family:monospace">${report.reporter_id||'—'}</span></div>

<h2>4. Evidências Visuais — ${albumPhotos.length} imagem(ns) encontrada(s)</h2>
<div class="photos">
  ${photosSection}
</div>

<h2>5. Informações da Plataforma e Ações Tomadas</h2>
<div class="row"><span class="lbl">Plataforma:</span><span class="val">Pineapple Moments</span></div>
<div class="row"><span class="lbl">URL:</span><span class="val">https://pineapple-moments.vercel.app</span></div>
<div class="row"><span class="lbl">E-mail do Responsável:</span><span class="val">rafaelborella49@gmail.com</span></div>
<div class="row"><span class="lbl">CNPJ / CPF Responsável:</span><span class="val">____________________________________________</span></div>
<div class="row"><span class="lbl">Data das Ações:</span><span class="val">${now.toLocaleString('pt-BR')}</span></div>
<div class="row"><span class="lbl">Ações tomadas:</span><span class="val">☑ Conteúdo removido &nbsp;&nbsp; ☑ Conta suspensa/banida &nbsp;&nbsp; ☑ Relatório gerado</span></div>

<div class="box-yellow">
  <strong>Declaração do Operador:</strong> Imediatamente após a identificação do conteúdo ilícito foram tomadas as seguintes
  medidas: remoção do conteúdo da plataforma, suspensão/banimento da conta do usuário responsável e geração deste relatório.
  O operador se compromete a cooperar plenamente com as investigações, fornecendo logs de acesso, endereços IP e demais
  dados técnicos mediante requisição judicial, conforme previsto no Art. 15 do Marco Civil da Internet.
</div>

<h2>6. Autoridades para Encaminhamento</h2>
<div class="auth-grid">
  <div class="auth-card"><div class="auth-name">🏛️ Polícia Federal</div><div class="auth-info">delegacia.dpf.gov.br<br>Crimes federais, CSAM, tráfico online</div></div>
  <div class="auth-card"><div class="auth-name">🛡️ SaferNet Brasil</div><div class="auth-info">safernet.org.br/denuncie<br>Especializada em crimes online e CSAM — recebe e encaminha à PF</div></div>
  <div class="auth-card"><div class="auth-name">📞 Disque 100</div><div class="auth-info">Direitos Humanos — gratuito 24h<br>Casos envolvendo crianças e adolescentes</div></div>
  <div class="auth-card"><div class="auth-name">🏢 Polícia Civil</div><div class="auth-info">Delegacia local ou online<br>Ameaças, assédio, injúria, crimes comuns</div></div>
</div>

<div class="sig-grid">
  <div><div class="sig-line">Assinatura do Responsável Legal</div><div style="font-size:11px;color:#555;text-align:center;margin-top:6px">Nome completo / CPF</div></div>
  <div><div class="sig-line">Data e Local</div></div>
</div>

<div class="footer">
  Documento gerado automaticamente pelo sistema de moderação do Pineapple Moments.
  Protocolo RPT-${(report.id||'').slice(0,8).toUpperCase()} — ${now.toLocaleString('pt-BR')} — rafaelborella49@gmail.com
</div>

<div class="noprint" style="margin-top:28px;text-align:center;padding-bottom:40px">
  <button onclick="window.print()" style="padding:12px 32px;background:#1B3A1F;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;margin-right:12px">
    🖨️ Imprimir / Salvar como PDF
  </button>
  <button onclick="window.close()" style="padding:12px 24px;background:#f5f5f5;color:#333;border:1px solid #ddd;border-radius:8px;font-size:14px;cursor:pointer">
    Fechar
  </button>
</div>
</body>
</html>`

    const win = window.open('', '_blank', 'width=900,height=800')
    if (!win) { toast('Permita pop-ups para gerar o relatório', 'error'); return }
    win.document.write(html)
    win.document.close()
  }

  const fmt = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—'
  const filteredReports = reports.filter(r => reportFilter === 'all' ? true : r.status === reportFilter)
  const b = (bg, color, border) => ({ padding: '6px 12px', background: bg, color, border: border||'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' })
  const card = (color) => ({ background: 'white', borderRadius: 12, padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${color}` })

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
          <button onClick={loadData} style={{ ...b('rgba(255,255,255,0.15)', 'white'), borderRadius: 8 }}>🔄 Atualizar</button>
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
            <div key={s.label} style={card(s.color)}>
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
            ['users','👥 Usuários'],
            ['reports', `🚩 Denúncias${reports.filter(r=>r.status==='pending').length > 0 ? ` (${reports.filter(r=>r.status==='pending').length})` : ''}`],
            ['violations','⚠️ Violações'],
            ['retention','📅 Retenção'],
            ['logs','📋 Logs'],
            ['staff','🔑 Equipe'],
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
              <button onClick={() => { setSearch(searchInput); setPage(1) }} style={{ ...b('#3A8C3F','white'), borderRadius: 50, padding: '9px 18px' }}>Buscar</button>
              {search && <button onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }} style={{ ...b('#eee','#555'), borderRadius: 50, padding: '9px 14px' }}>✕</button>}
            </div>
            <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5' }}>
                      {['Usuário','Email','Idade','Violações','Status','Cadastro','Ações'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#555', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr key={u.id} style={{ borderTop: '1px solid #f0f0f0', background: u.is_banned ? '#fff5f5' : i%2===0?'white':'#fafafa' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 18 }}>{u.avatar_emoji||'🍍'}</span>
                            <div>
                              <div style={{ fontWeight: 700 }}>{u.display_name||'—'}</div>
                              <div style={{ color: '#888', fontSize: 11 }}>@{u.username||'—'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#555', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</td>
                        <td style={{ padding: '10px 14px', color: '#555' }}>{u.birth_date ? `${new Date().getFullYear()-new Date(u.birth_date).getFullYear()}a` : '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ background: u.violation_count>0?'#fff3cd':'#e8f5e9', color: u.violation_count>0?'#856404':'#2e7d32', padding: '2px 8px', borderRadius: 99, fontWeight: 700, fontSize: 11 }}>{u.violation_count}</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {u.is_banned
                            ? <div>
                                <span style={{ background: '#fdecea', color: '#c62828', padding: '2px 8px', borderRadius: 99, fontWeight: 700, fontSize: 10 }}>🚫 Banido</span>
                                {u.banned_at && <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{new Date(u.banned_at).toLocaleDateString('pt-BR')}</div>}
                                {u.ban_reason && <div style={{ fontSize: 10, color: '#aaa', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={u.ban_reason}>{u.ban_reason}</div>}
                              </div>
                            : <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: 99, fontWeight: 700, fontSize: 10 }}>✅ Ativo</span>
                          }
                        </td>
                        <td style={{ padding: '10px 14px', color: '#888', fontSize: 11, whiteSpace: 'nowrap' }}>{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {!u.is_banned ? (<>
                              <button onClick={() => { setSelectedUser(u); setShowSuspendModal(true) }} style={b('#fff3cd','#856404','1px solid #ffe082')}>⏸️ Suspender</button>
                              <button onClick={() => { setSelectedUser(u); setShowBanModal(true) }} style={b('#fdecea','#c62828')}>🚫 Banir</button>
                            </>) : (
                              <button onClick={() => handleUnban(u)} style={b('#e8f5e9','#2e7d32')}>✅ Reativar</button>
                            )}
                            {isAdmin && <button onClick={() => handleDelete(u)} style={b('#f5f5f5','#c62828','1px solid #e0e0e0')}>🗑️</button>}
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
              {page > 1 && <button onClick={() => setPage(p=>p-1)} style={{ ...b('white','#555','2px solid #e0e0e0'), borderRadius: 50 }}>← Anterior</button>}
              <span style={{ padding: '8px 14px', background: 'white', borderRadius: 50, fontSize: 12, color: '#555' }}>Pág. {page}</span>
              {users.length === 50 && <button onClick={() => setPage(p=>p+1)} style={{ ...b('white','#555','2px solid #e0e0e0'), borderRadius: 50 }}>Próxima →</button>}
            </div>
          </div>
        )}

        {/* ── DENÚNCIAS ── */}
        {tab === 'reports' && (
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {[['pending','⏳ Pendentes'],['resolved','✅ Resolvidas'],['dismissed','📁 Arquivadas'],['all','Todas']].map(([k,l]) => (
                <button key={k} onClick={() => setReportFilter(k)} style={{ ...b(reportFilter===k?'#1B3A1F':'white', reportFilter===k?'white':'#555'), borderRadius: 50 }}>{l}</button>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                        <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                          {r.target_type==='album'?'📷 Álbum':r.target_type==='user'?'👤 Usuário':r.target_type==='letter'?'💌 Cartinha':'📄 Página'}
                        </span>
                        <span style={{ background: r.status==='pending'?'#fff3cd':r.status==='resolved'?'#e8f5e9':'#f5f5f5', color: r.status==='pending'?'#856404':r.status==='resolved'?'#2e7d32':'#888', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                          {r.status==='pending'?'⏳ Pendente':r.status==='resolved'?'✅ Resolvida':'📁 Arquivada'}
                        </span>
                        <span style={{ fontSize: 11, color: '#888' }}>por @{r.reporter_username||'anônimo'}</span>
                        <span style={{ fontSize: 11, color: '#aaa' }}>{fmt(r.created_at)}</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Motivo: {r.reason}</div>
                      {r.description && <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>{r.description}</div>}
                      <div style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace', marginBottom: 6 }}>ID: {r.target_id}</div>
                      {r.target_type === 'album' && (
                        <a href={`/album/${r.target_id}`} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#1565c0', fontWeight: 700, textDecoration: 'none', background: '#e3f2fd', padding: '4px 10px', borderRadius: 8 }}>
                          👁️ Ver álbum →
                        </a>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 170 }}>
                      {r.status === 'pending' && (<>
                        {r.target_type === 'album' && (<>
                          <button onClick={() => handleResolveReport(r.id, 'delete_album', r.target_id, null)} style={b('#fdecea','#c62828')}>🗑️ Deletar álbum</button>
                          <button onClick={() => { setSelectedUser({ id: null, username: '', display_name: 'Dono do álbum' }); setShowSuspendModal(true) }} style={b('#fff3cd','#856404','1px solid #ffe082')}>⏸️ Suspender dono</button>
                        </>)}
                        {r.target_type === 'user' && (<>
                          <button onClick={() => handleResolveReport(r.id, 'ban_user', null, r.target_id)} style={b('#fdecea','#c62828')}>🚫 Banir usuário</button>
                          <button onClick={() => { setSelectedUser({ id: r.target_id, username: '', display_name: 'Usuário denunciado' }); setShowSuspendModal(true) }} style={b('#fff3cd','#856404','1px solid #ffe082')}>⏸️ Suspender</button>
                        </>)}
                        <button onClick={() => handleResolveReport(r.id, 'none', null, null)} style={b('#e8f5e9','#2e7d32')}>✅ Resolver sem ação</button>
                        <button onClick={() => handleDismissReport(r.id)} style={b('#f5f5f5','#888')}>📁 Arquivar</button>
                      </>)}
                      <button onClick={() => generateAuthorityReport(r)} style={b('#1B3A1F','white')}>🏛️ Gerar Relatório</button>
                    </div>
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
                <thead><tr style={{ background: '#f5f5f5' }}>
                  {['Usuário','Tipo','Categorias','Conteúdo','Data','Ação'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#555', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {violations.map((v, i) => (
                    <tr key={v.id} style={{ borderTop: '1px solid #f0f0f0', background: i%2===0?'white':'#fafafa' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontWeight: 700 }}>@{v.profiles?.username||'—'}</span>
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
                      <td style={{ padding: '10px 14px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#555' }}>{v.content||'—'}</td>
                      <td style={{ padding: '10px 14px', color: '#888', fontSize: 11, whiteSpace: 'nowrap' }}>{new Date(v.created_at).toLocaleString('pt-BR')}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <button onClick={() => { setSelectedUser({ id: v.user_id, username: v.profiles?.username, display_name: v.profiles?.display_name }); setShowBanModal(true) }} style={b('#fdecea','#c62828')}>🚫 Banir</button>
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
                  <div key={s.label} style={card(s.color)}>
                    <div style={{ fontSize: 20 }}>{s.icon}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value??0}</div>
                    <div style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
            {isAdmin && (
              <div style={{ background: 'white', borderRadius: 14, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <h3 style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>🧹 Limpeza Manual</h3>
                <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>Execute periodicamente — o Supabase free não tem cron automático.</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={async () => { const d = await safeRpc('process_scheduled_deletions'); toast(`✅ ${d?.deleted||0} conta(s) deletada(s)`, 'success'); loadData() }} style={b('#fdecea','#c62828','2px solid #ffcdd2')}>⏳ Processar exclusões</button>
                  <button onClick={async () => { const d = await safeRpc('cleanup_technical_logs'); toast(`✅ ${d?.deleted_logs||0} log(s) removido(s)`, 'success'); loadData() }} style={b('#e3f2fd','#1565c0','2px solid #bbdefb')}>📋 Limpar logs +90 dias</button>
                  <button onClick={async () => { const d = await safeRpc('cleanup_old_moderation_data'); toast(`✅ ${d?.deleted_violations||0} violação(ões) removida(s)`, 'success'); loadData() }} style={b('#fff8e1','#856404','2px solid #ffe082')}>⚠️ Limpar violações +2 anos</button>
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
                                : <span style={{ background: '#fff8e1', color: '#856404', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>⏳ Pendente</span>}
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

        {/* ── LOGS ── */}
        {tab === 'logs' && (
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[['all','Todos'],['login','🔑 Login'],['logout','🚪 Logout'],['create_album','📷 Álbum criado'],['delete_album','🗑️ Álbum deletado'],['upload_photo','📸 Upload'],['send_letter','💌 Cartinha'],['suspension','⏸️ Suspensão'],['deletion_scheduled','⏳ Exclusão ag.']].map(([k,l]) => (
                  <button key={k} onClick={() => setLogFilter(k)} style={{ ...b(logFilter===k?'#1B3A1F':'white', logFilter===k?'white':'#555'), borderRadius: 50, padding: '6px 12px' }}>{l}</button>
                ))}
              </div>
              <input value={logSearch} onChange={e => setLogSearch(e.target.value)} placeholder="Filtrar por @usuário..."
                style={{ padding: '7px 12px', border: '2px solid #e0e0e0', borderRadius: 50, fontSize: 12, outline: 'none', minWidth: 160 }} />
            </div>
            <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ overflowX: 'auto', maxHeight: 600, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f5f5f5', zIndex: 1 }}>
                    <tr>{['Data/Hora','Usuário','Evento','Detalhes'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#555', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {logs.filter(l => (logFilter==='all'||l.event_type===logFilter) && (!logSearch||(l.username||'').includes(logSearch.replace('@','')))).map((l,i) => {
                      const ec = {
                        login:{bg:'#e8f5e9',color:'#2e7d32'}, logout:{bg:'#f5f5f5',color:'#555'},
                        create_album:{bg:'#e3f2fd',color:'#1565c0'}, delete_album:{bg:'#fdecea',color:'#c62828'},
                        upload_photo:{bg:'#f3e5f5',color:'#6a1b9a'}, send_letter:{bg:'#fce4ec',color:'#880e4f'},
                        deletion_scheduled:{bg:'#fff3e0',color:'#e65100'}, account_deleted:{bg:'#fdecea',color:'#b71c1c'},
                        suspension:{bg:'#fff8e1',color:'#856404'},
                      }[l.event_type]||{bg:'#f5f5f5',color:'#555'}
                      const label = {
                        login:'🔑 Login', logout:'🚪 Logout', create_album:'📷 Álbum criado',
                        delete_album:'🗑️ Álbum deletado', upload_photo:'📸 Upload', send_letter:'💌 Cartinha',
                        deletion_scheduled:'⏳ Exclusão ag.', deletion_cancelled:'↩️ Cancelada',
                        account_deleted:'❌ Conta deletada', ban:'🚫 Banimento', unban:'✅ Reativação',
                        suspension:'⏸️ Suspensão temporária',
                      }[l.event_type]||l.event_type
                      return (
                        <tr key={l.id} style={{ borderTop: '1px solid #f0f0f0', background: i%2===0?'white':'#fafafa' }}>
                          <td style={{ padding: '9px 14px', color: '#888', whiteSpace: 'nowrap', fontSize: 11 }}>{new Date(l.created_at).toLocaleString('pt-BR')}</td>
                          <td style={{ padding: '9px 14px' }}>
                            <span style={{ fontWeight: 700 }}>@{l.username||'—'}</span>
                            <div style={{ fontSize: 10, color: '#aaa', fontFamily: 'monospace' }}>{l.user_id?.slice(0,8)}...</div>
                          </td>
                          <td style={{ padding: '9px 14px' }}>
                            <span style={{ background: ec.bg, color: ec.color, padding: '3px 8px', borderRadius: 99, fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>{label}</span>
                          </td>
                          <td style={{ padding: '9px 14px', color: '#555', maxWidth: 280, fontSize: 11 }}>
                            {l.details ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {Object.entries(l.details).map(([k,v]) => (
                                  <span key={k} style={{ background: '#f5f5f5', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: 10 }}>{k}: {String(v).slice(0,60)}</span>
                                ))}
                              </div>
                            ) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {logs.filter(l => logFilter==='all'||l.event_type===logFilter).length === 0 && (
                <div style={{ textAlign: 'center', padding: 32, color: '#888', fontSize: 13 }}>
                  {logs.length === 0 ? 'Nenhum log ainda — ações futuras aparecerão aqui' : 'Nenhum log nesta categoria'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── EQUIPE ── */}
        {tab === 'staff' && (
          <div>
            {isAdmin && (
              <div style={{ marginBottom: 12 }}>
                {!showAddStaff
                  ? <button onClick={() => setShowAddStaff(true)} style={{ ...b('#3A8C3F','white'), borderRadius: 50, padding: '10px 18px' }}>+ Adicionar funcionário</button>
                  : <div style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <input value={newStaffUsername} onChange={e => setNewStaffUsername(e.target.value)}
                        placeholder="@usuário do funcionário"
                        style={{ flex: 1, minWidth: 180, padding: '9px 14px', border: '2px solid #e0e0e0', borderRadius: 50, fontSize: 13, outline: 'none' }} />
                      <button onClick={handleAddStaff} style={{ ...b('#3A8C3F','white'), borderRadius: 50, padding: '9px 16px' }}>Adicionar</button>
                      <button onClick={() => setShowAddStaff(false)} style={{ ...b('#eee','#555'), borderRadius: 50, padding: '9px 14px' }}>Cancelar</button>
                    </div>
                }
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {staff.map(s => (
                <div key={s.id} style={{ background: 'white', borderRadius: 12, padding: '14px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 28 }}>{s.profiles?.avatar_emoji||'👤'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{s.profiles?.display_name||'Usuário'}</div>
                    <div style={{ color: '#888', fontSize: 12 }}>@{s.profiles?.username||'—'}</div>
                  </div>
                  <span style={{ background: s.role==='admin'?'#fff3cd':'#e8f5e9', color: s.role==='admin'?'#856404':'#2e7d32', padding: '4px 12px', borderRadius: 99, fontWeight: 800, fontSize: 12 }}>
                    {s.role==='admin'?'👑 ADMIN':'🔑 STAFF'}
                  </span>
                  {isAdmin && s.role !== 'admin' && (
                    <button onClick={async () => { if(!confirm('Remover funcionário?')) return; await supabase.from('admin_staff').delete().eq('id',s.id); loadData() }} style={b('#fdecea','#c62828')}>Remover</button>
                  )}
                </div>
              ))}
              {staff.length === 0 && <div style={{ background: 'white', borderRadius: 14, padding: 32, textAlign: 'center', color: '#888' }}>Nenhum funcionário</div>}
            </div>
          </div>
        )}
      </div>

      {/* Modal Banimento Permanente */}
      {showBanModal && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, maxWidth: 420, width: '100%' }}>
            <h2 style={{ fontFamily: 'var(--font-title)', color: '#c62828', marginBottom: 8 }}>🚫 Banir permanentemente</h2>
            <p style={{ color: '#555', fontSize: 14, marginBottom: 16 }}>
              Banindo: <strong>{selectedUser.display_name||selectedUser.username}</strong><br/>
              <span style={{ fontSize: 12, color: '#888' }}>O usuário será impedido de acessar a plataforma indefinidamente.</span>
            </p>
            <label style={{ display: 'block', fontWeight: 700, fontSize: 12, marginBottom: 6 }}>Motivo *</label>
            <textarea value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Descreva o motivo..." rows={3}
              style={{ width: '100%', padding: '10px 14px', border: '2px solid #e0e0e0', borderRadius: 10, fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowBanModal(false); setBanReason(''); setSelectedUser(null) }}
                style={{ flex: 1, padding: 12, background: '#f5f5f5', border: 'none', borderRadius: 50, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleBan} disabled={!banReason.trim()}
                style={{ flex: 1, padding: 12, background: banReason.trim()?'#c62828':'#e0e0e0', color: 'white', border: 'none', borderRadius: 50, fontWeight: 700, cursor: banReason.trim()?'pointer':'not-allowed' }}>
                🚫 Confirmar banimento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Suspensão Temporária */}
      {showSuspendModal && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, maxWidth: 480, width: '100%' }}>
            <h2 style={{ fontFamily: 'var(--font-title)', color: '#856404', marginBottom: 8 }}>⏸️ Suspender conta</h2>
            <p style={{ color: '#555', fontSize: 14, marginBottom: 16 }}>
              Suspendendo: <strong>{selectedUser.display_name||selectedUser.username||'Usuário'}</strong>
            </p>

            <label style={{ display: 'block', fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Duração da suspensão (conforme legislação brasileira 2025/2026) *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {SUSPENSION_OPTIONS.map(opt => (
                <label key={opt.hours} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '10px 12px', borderRadius: 10, border: `2px solid ${suspendHours===opt.hours?'#1B3A1F':'#e0e0e0'}`, background: suspendHours===opt.hours?'#e8f5e9':'white', transition: 'all 0.15s' }}>
                  <input type="radio" name="suspend" checked={suspendHours===opt.hours} onChange={() => setSuspendHours(opt.hours)}
                    style={{ marginTop: 2, accentColor: '#1B3A1F', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: opt.hours===-1?'#c62828':'#111' }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Base legal: {opt.law}</div>
                  </div>
                </label>
              ))}
            </div>

            <label style={{ display: 'block', fontWeight: 700, fontSize: 12, marginBottom: 6 }}>Motivo *</label>
            <textarea value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Descreva o motivo da suspensão..." rows={2}
              style={{ width: '100%', padding: '10px 14px', border: '2px solid #e0e0e0', borderRadius: 10, fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowSuspendModal(false); setBanReason(''); setSuspendHours(-1); setSelectedUser(null) }}
                style={{ flex: 1, padding: 12, background: '#f5f5f5', border: 'none', borderRadius: 50, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSuspend} disabled={!banReason.trim() || suspendHours === null}
                style={{ flex: 1, padding: 12, background: banReason.trim()?'#856404':'#e0e0e0', color: 'white', border: 'none', borderRadius: 50, fontWeight: 700, cursor: banReason.trim()?'pointer':'not-allowed' }}>
                ⏸️ Confirmar suspensão
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@media(max-width:700px){table{font-size:11px}td,th{padding:6px 8px!important}}`}</style>
    </div>
  )
}
