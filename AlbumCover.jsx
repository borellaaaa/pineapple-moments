import { useState, useRef, useCallback, useEffect } from 'react'
import { uploadPhoto, updatePage } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import { v4 as uuidv4 } from 'uuid'

const STICKERS = ['🌸','⭐','🦋','🍓','🌈','💖','🌙','🍦','🎀','✨','🌺','🍭','🐱','🐰','🌻','🍉','🍒','🎵','🎨','🌷','🦄','🍋','💫','🌊','🍄','🧸','🍰','🌼','🍩','🌟','💝','🎈','🐝','🍀','🎪','🦊','💛','🌿','🎀','🐣']

const FONTS = [
  { name: 'Pacifico', label: 'Fofa' },
  { name: 'Caveat', label: 'Manuscrita' },
  { name: 'Dancing Script', label: 'Script' },
  { name: 'Quicksand', label: 'Moderna' },
  { name: 'Nunito', label: 'Normal' }
]

// Papéis / fundos de página
const PAGE_STYLES = [
  // Cores sólidas
  { id: 'white',    label: 'Branco',       bg: '#FFFFFF',   type: 'solid' },
  { id: 'cream',    label: 'Creme',        bg: '#FFF8E7',   type: 'solid' },
  { id: 'mint',     label: 'Menta',        bg: '#E8F5E9',   type: 'solid' },
  { id: 'sky',      label: 'Céu',          bg: '#E3F2FD',   type: 'solid' },
  { id: 'blush',    label: 'Rosa',         bg: '#FCE4EC',   type: 'solid' },
  { id: 'lavender', label: 'Lavanda',      bg: '#F3E5F5',   type: 'solid' },
  { id: 'peach',    label: 'Pêssego',      bg: '#FFF3E0',   type: 'solid' },
  { id: 'lilac',    label: 'Lilás',        bg: '#EDE7F6',   type: 'solid' },
  { id: 'sage',     label: 'Sálvia',       bg: '#F1F8E9',   type: 'solid' },
  { id: 'sand',     label: 'Areia',        bg: '#FAFAFA',   type: 'solid' },
  // Gradientes
  { id: 'grad_sunset',  label: 'Pôr do sol',  bg: 'linear-gradient(135deg,#FFD89B,#FF6B9D)', type: 'gradient' },
  { id: 'grad_ocean',   label: 'Oceano',       bg: 'linear-gradient(135deg,#4facfe,#00f2fe)', type: 'gradient' },
  { id: 'grad_forest',  label: 'Floresta',     bg: 'linear-gradient(135deg,#C8E6C9,#43E97B)', type: 'gradient' },
  { id: 'grad_candy',   label: 'Candy',        bg: 'linear-gradient(135deg,#F093FB,#F5576C)', type: 'gradient' },
  { id: 'grad_gold',    label: 'Dourado',      bg: 'linear-gradient(135deg,#f6d365,#fda085)', type: 'gradient' },
  { id: 'grad_aurora',  label: 'Aurora',       bg: 'linear-gradient(135deg,#a18cd1,#fbc2eb)', type: 'gradient' },
  // Padrões (CSS)
  { id: 'dots',     label: 'Bolinhas',     bg: '#FFF8E7',   type: 'pattern', pattern: 'radial-gradient(circle,#F5C800 1.5px,transparent 1.5px)', patternSize: '20px 20px' },
  { id: 'lines',    label: 'Linhas',       bg: '#EAF5EA',   type: 'pattern', pattern: 'repeating-linear-gradient(0deg,transparent,transparent 23px,#b2dfdb 23px,#b2dfdb 25px)', patternSize: 'auto' },
  { id: 'grid',     label: 'Grade',        bg: '#F3E5F5',   type: 'pattern', pattern: 'linear-gradient(rgba(150,80,200,0.12) 1px,transparent 1px),linear-gradient(90deg,rgba(150,80,200,0.12) 1px,transparent 1px)', patternSize: '24px 24px' },
  { id: 'diagonal',label: 'Diagonal',     bg: '#FCE4EC',   type: 'pattern', pattern: 'repeating-linear-gradient(45deg,transparent,transparent 12px,rgba(255,105,135,0.15) 12px,rgba(255,105,135,0.15) 14px)', patternSize: 'auto' },
  { id: 'hearts',   label: 'Coraçõezinhos', bg: '#FFF0F5', type: 'pattern', pattern: 'radial-gradient(circle,#FFB6C1 2px,transparent 2px)', patternSize: '18px 18px' },
  { id: 'stars',    label: 'Estrelinhas',  bg: '#1a1a2e',  type: 'pattern', pattern: 'radial-gradient(circle,#ffe066 1.5px,transparent 1.5px),radial-gradient(circle,#fff 1px,transparent 1px)', patternSize: '30px 30px, 15px 15px' },
]

const getPageBg = (styleId) => {
  const s = PAGE_STYLES.find(p => p.id === styleId) || PAGE_STYLES[0]
  return s
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024

// Resize handle positions
const HANDLES = ['nw','n','ne','e','se','s','sw','w']
const HANDLE_CURSORS = { nw:'nw-resize', n:'n-resize', ne:'ne-resize', e:'e-resize', se:'se-resize', s:'s-resize', sw:'sw-resize', w:'w-resize' }

export default function PageCanvas({ page, isOwner, onSave, onDeletePage, userId }) {
  const toast = useToast()
  const [elements, setElements] = useState(page.elements || [])
  const [selected, setSelected] = useState(null)
  const [pageStyle, setPageStyle] = useState(page.bg_color || 'white')
  const [panel, setPanel] = useState('none')
  const [uploading, setUploading] = useState(false)
  const canvasRef = useRef(null)
  const fileRef = useRef(null)
  const dragRef = useRef(null)    // { type: 'move'|'resize', id, handle?, ox, oy, origEl }
  const dirty = useRef(false)

  // Auto-save elements + bgColor
  useEffect(() => {
    if (!dirty.current) return
    const t = setTimeout(() => {
      onSave(elements, pageStyle)
      dirty.current = false
    }, 1800)
    return () => clearTimeout(t)
  }, [elements, pageStyle])

  const mark = () => { dirty.current = true }
  const upd = (id, u) => { setElements(p => p.map(e => e.id === id ? { ...e, ...u } : e)); mark() }
  const add = (el) => { setElements(p => [...p, el]); setSelected(el.id); mark() }
  const del = () => {
    if (!selected) return
    setElements(p => p.filter(e => e.id !== selected))
    setSelected(null); mark()
  }

  // ── Drag / Resize ──────────────────────────────────────
  const getXY = (e) => {
    if (e.touches) return { x: e.touches[0].clientX, y: e.touches[0].clientY }
    return { x: e.clientX, y: e.clientY }
  }

  const startMove = (e, id) => {
    if (!isOwner) return
    e.stopPropagation()
    const el = elements.find(el => el.id === id)
    if (!el) return
    const rect = canvasRef.current.getBoundingClientRect()
    const { x, y } = getXY(e)
    dragRef.current = {
      type: 'move', id,
      ox: x - rect.left - el.x,
      oy: y - rect.top - el.y
    }
    setSelected(id)
    setPanel('none')
  }

  const startResize = (e, id, handle) => {
    if (!isOwner) return
    e.stopPropagation()
    e.preventDefault()
    const el = elements.find(el => el.id === id)
    if (!el) return
    const rect = canvasRef.current.getBoundingClientRect()
    const { x, y } = getXY(e)
    dragRef.current = {
      type: 'resize', id, handle,
      startX: x - rect.left,
      startY: y - rect.top,
      origEl: { ...el }
    }
  }

  const onMove = useCallback((e) => {
    if (!dragRef.current || !canvasRef.current) return
    if (e.cancelable) e.preventDefault()
    const rect = canvasRef.current.getBoundingClientRect()
    const { x, y } = getXY(e)
    const cx = x - rect.left
    const cy = y - rect.top

    if (dragRef.current.type === 'move') {
      const { id, ox, oy } = dragRef.current
      const nx = Math.max(0, Math.min(cx - ox, rect.width - 10))
      const ny = Math.max(0, Math.min(cy - oy, rect.height - 10))
      upd(id, { x: nx, y: ny })

    } else if (dragRef.current.type === 'resize') {
      const { id, handle, startX, startY, origEl } = dragRef.current
      const dx = cx - startX
      const dy = cy - startY
      const minW = 40, minH = 30

      let { x: ex, y: ey, width: ew, height: eh, fontSize: ef } = origEl
      ew = ew || 200; eh = eh || 100

      // Adjust based on handle
      if (handle.includes('e')) ew = Math.max(minW, origEl.width + dx)
      if (handle.includes('s')) eh = Math.max(minH, (origEl.height || origEl.width) + dy)
      if (handle.includes('w')) {
        const newW = Math.max(minW, origEl.width - dx)
        ex = origEl.x + (origEl.width - newW)
        ew = newW
      }
      if (handle.includes('n')) {
        const newH = Math.max(minH, (origEl.height || origEl.width) - dy)
        ey = origEl.y + ((origEl.height || origEl.width) - newH)
        eh = newH
      }

      // For stickers/text: resize font instead of box
      if (origEl.type === 'sticker') {
        const scale = Math.max(ew / (origEl.width || 60), eh / (origEl.height || 60))
        upd(id, { x: ex, y: ey, width: ew, height: eh, fontSize: Math.max(20, Math.min(140, (origEl.fontSize || 52) * scale)) })
      } else {
        upd(id, { x: ex, y: ey, width: ew, height: eh })
      }
    }
  }, [elements])

  const onEnd = useCallback(() => { dragRef.current = null }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [onMove, onEnd])

  // ── Add elements ───────────────────────────────────────
  const addText = () => {
    add({ id: uuidv4(), type: 'text', x: 60, y: 60, text: 'Escreva aqui 💕', font: 'Caveat', fontSize: 28, color: '#1B3A1F', width: 200, height: 80 })
  }
  const addSticker = (emoji) => {
    add({ id: uuidv4(), type: 'sticker', x: 80 + Math.random() * 160, y: 60 + Math.random() * 160, emoji, fontSize: 52, width: 60, height: 60 })
    setPanel('none')
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) { toast('⚠️ Use JPG, PNG, WEBP ou GIF.', 'error'); e.target.value = ''; return }
    if (file.size > MAX_SIZE) { toast('⚠️ Máximo 5MB.', 'error'); e.target.value = ''; return }
    setUploading(true)
    toast('Enviando foto... 📸')
    const { url, error } = await uploadPhoto(file, userId)
    setUploading(false)
    if (error || !url) { toast('Erro ao enviar 😢', 'error'); e.target.value = ''; return }
    add({ id: uuidv4(), type: 'photo', x: 40, y: 40, url, width: 200, height: 180, radius: 8, rotation: 0 })
    toast('Foto adicionada! 📷', 'success')
    e.target.value = ''
  }

  const handlePageStyle = (styleId) => {
    setPageStyle(styleId)
    mark()
  }

  const selEl = elements.find(e => e.id === selected)
  const currentStyle = getPageBg(pageStyle)

  const toolBtn = (active, danger) => ({
    width: 38, height: 38,
    border: `2px solid ${danger ? 'rgba(229,57,53,0.35)' : active ? 'var(--green)' : 'var(--dark-faint)'}`,
    borderRadius: 10,
    background: danger ? 'rgba(229,57,53,0.07)' : active ? 'var(--green-light)' : 'white',
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    transition: 'all 0.15s', color: danger ? 'var(--red)' : 'var(--dark)',
    fontFamily: 'var(--font-body)'
  })

  // Build canvas background style
  const canvasBgStyle = (() => {
    if (currentStyle.type === 'solid') return { background: currentStyle.bg }
    if (currentStyle.type === 'gradient') return { background: currentStyle.bg }
    if (currentStyle.type === 'pattern') return {
      background: currentStyle.bg,
      backgroundImage: currentStyle.pattern,
      backgroundSize: currentStyle.patternSize
    }
    return { background: '#FFFFFF' }
  })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>

      {/* ── Toolbar ── */}
      {isOwner && (
        <div style={{ background: 'white', borderRadius: 18, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: 'var(--shadow-md)', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 720 }}>
          {/* Add tools */}
          <div style={{ display: 'flex', gap: 5 }}>
            <button style={toolBtn(false)} onClick={addText} title="Texto">T</button>
            <button style={toolBtn(panel === 'stickers')} onClick={() => setPanel(panel === 'stickers' ? 'none' : 'stickers')} title="Adesivos">🌸</button>
            <button style={toolBtn(false)} onClick={() => fileRef.current?.click()} title="Foto" disabled={uploading}>
              {uploading ? <span className="loader loader-sm" style={{ margin: 0 }} /> : '📷'}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={handleUpload} />
          </div>

          <div style={{ width: 1, height: 28, background: 'var(--dark-faint)', flexShrink: 0 }} />

          {/* Paper style picker */}
          <button style={toolBtn(panel === 'paper')} onClick={() => setPanel(panel === 'paper' ? 'none' : 'paper')} title="Estilo do papel">
            🎨
          </button>

          {/* Selection tools */}
          <div style={{ display: 'flex', gap: 5 }}>
            {selected && (
              <>
                <button style={toolBtn(panel === 'props')} onClick={() => setPanel(panel === 'props' ? 'none' : 'props')} title="Propriedades">⚙️</button>
                <button style={toolBtn(false, true)} onClick={del} title="Deletar">🗑️</button>
              </>
            )}
            {onDeletePage && <button style={toolBtn(false, true)} onClick={onDeletePage} title="Deletar página">📄❌</button>}
            <button style={toolBtn(false)} onClick={() => { onSave(elements, pageStyle); toast('Salvo! ✅', 'success') }} title="Salvar">💾</button>
          </div>
        </div>
      )}

      {/* ── Sticker Panel ── */}
      {panel === 'stickers' && isOwner && (
        <div style={{ background: 'white', borderRadius: 16, padding: 14, boxShadow: 'var(--shadow)', width: '100%', maxWidth: 720, animation: 'slideDown 0.2s ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(38px,1fr))', gap: 4 }}>
            {STICKERS.map(s => (
              <button key={s} onClick={() => addSticker(s)}
                style={{ fontSize: 24, background: 'none', border: '2px solid transparent', borderRadius: 8, cursor: 'pointer', padding: 4, lineHeight: 1, transition: 'all 0.12s' }}
                onMouseOver={e => { e.currentTarget.style.background = 'var(--green-light)'; e.currentTarget.style.transform = 'scale(1.22)' }}
                onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.transform = '' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Paper Style Panel ── */}
      {panel === 'paper' && isOwner && (
        <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: 'var(--shadow)', width: '100%', maxWidth: 720, animation: 'slideDown 0.2s ease' }}>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--dark-muted)', marginBottom: 12 }}>Estilo do Papel 📄</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(72px,1fr))', gap: 8 }}>
            {PAGE_STYLES.map(s => {
              const isSelected = pageStyle === s.id
              const previewStyle = s.type === 'solid'
                ? { background: s.bg }
                : s.type === 'gradient'
                  ? { background: s.bg }
                  : { background: s.bg, backgroundImage: s.pattern, backgroundSize: s.patternSize }
              return (
                <button key={s.id} onClick={() => handlePageStyle(s.id)}
                  style={{ border: `2.5px solid ${isSelected ? 'var(--green)' : 'transparent'}`, borderRadius: 10, padding: 0, cursor: 'pointer', overflow: 'hidden', boxShadow: isSelected ? '0 0 0 3px rgba(58,140,63,0.2)' : 'var(--shadow)', transition: 'all 0.15s', outline: 'none' }}>
                  <div style={{ ...previewStyle, height: 44, width: '100%' }} />
                  <div style={{ padding: '4px 6px', background: 'white', fontSize: 10, fontWeight: 700, color: isSelected ? 'var(--green)' : 'var(--dark-muted)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.label}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Props Panel ── */}
      {panel === 'props' && selEl && isOwner && (
        <div style={{ background: 'white', borderRadius: 16, padding: '14px 18px', boxShadow: 'var(--shadow)', width: '100%', maxWidth: 720, display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start', animation: 'slideDown 0.2s ease' }}>
          {selEl.type === 'text' && (
            <>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--dark-muted)', display: 'block', marginBottom: 5 }}>Texto</label>
                <textarea value={selEl.text} onChange={e => upd(selected, { text: e.target.value })}
                  style={{ border: '2px solid var(--dark-faint)', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: 'var(--font-body)', width: 170, height: 60, resize: 'none', outline: 'none', color: 'var(--dark)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--dark-muted)', display: 'block', marginBottom: 5 }}>Fonte</label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {FONTS.map(f => (
                    <button key={f.name} onClick={() => upd(selected, { font: f.name })}
                      style={{ padding: '5px 10px', border: `2px solid ${selEl.font === f.name ? 'var(--green)' : 'var(--dark-faint)'}`, borderRadius: 8, background: selEl.font === f.name ? 'var(--green-light)' : 'white', cursor: 'pointer', fontFamily: f.name, fontSize: 12, color: 'var(--dark)', transition: 'all 0.12s' }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--dark-muted)', display: 'block', marginBottom: 5 }}>Tamanho: {selEl.fontSize}px</label>
                <input type="range" min={12} max={80} value={selEl.fontSize} onChange={e => upd(selected, { fontSize: +e.target.value })} style={{ width: 110, accentColor: 'var(--green)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--dark-muted)', display: 'block', marginBottom: 5 }}>Cor</label>
                <input type="color" value={selEl.color} onChange={e => upd(selected, { color: e.target.value })} style={{ width: 38, height: 38, borderRadius: 8, border: '2px solid var(--dark-faint)', cursor: 'pointer', padding: 2 }} />
              </div>
            </>
          )}
          {selEl.type === 'photo' && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--dark-muted)', display: 'block', marginBottom: 5 }}>Borda arredondada: {selEl.radius || 0}px</label>
              <input type="range" min={0} max={100} value={selEl.radius || 0} onChange={e => upd(selected, { radius: +e.target.value })} style={{ width: 140, accentColor: 'var(--green)' }} />
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--dark-muted)', display: 'block', marginBottom: 5, marginTop: 10 }}>Rotação: {selEl.rotation || 0}°</label>
              <input type="range" min={-45} max={45} value={selEl.rotation || 0} onChange={e => upd(selected, { rotation: +e.target.value })} style={{ width: 140, accentColor: 'var(--green)' }} />
            </div>
          )}
          {selEl.type === 'sticker' && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--dark-muted)', display: 'block', marginBottom: 5 }}>Tamanho: {selEl.fontSize}px</label>
              <input type="range" min={20} max={140} value={selEl.fontSize} onChange={e => upd(selected, { fontSize: +e.target.value })} style={{ width: 140, accentColor: 'var(--green)' }} />
            </div>
          )}
        </div>
      )}

      {/* ── Canvas ── */}
      <div
        ref={canvasRef}
        style={{
          width: 'min(720px,100%)',
          aspectRatio: '7/5',
          borderRadius: 20,
          ...canvasBgStyle,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 48px rgba(27,58,31,0.16)',
          touchAction: 'none',
          flexShrink: 0
        }}
        onClick={() => { setSelected(null); setPanel('none') }}
      >
        {elements.map(el => {
          const isSelected = selected === el.id
          const w = el.width || (el.type === 'sticker' ? 60 : 200)
          const h = el.height || (el.type === 'photo' ? 180 : el.type === 'sticker' ? 60 : 80)

          return (
            <div key={el.id}
              style={{ position: 'absolute', left: el.x, top: el.y, width: w, height: el.type === 'text' ? 'auto' : h, cursor: isOwner ? (dragRef.current?.id === el.id ? 'grabbing' : 'grab') : 'default', userSelect: 'none', zIndex: isSelected ? 20 : 1 }}
              onMouseDown={e => startMove(e, el.id)}
              onTouchStart={e => startMove(e, el.id)}
              onClick={e => { e.stopPropagation(); if (isOwner) { setSelected(el.id) } }}>

              {/* Element content */}
              {el.type === 'text' && (
                <div style={{ fontFamily: el.font || 'Caveat', fontSize: el.fontSize || 28, color: el.color || '#1B3A1F', width: w, wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: 1.45, minHeight: 30 }}>
                  {el.text}
                </div>
              )}
              {el.type === 'sticker' && (
                <div style={{ fontSize: el.fontSize || 52, lineHeight: 1, width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{el.emoji}</div>
              )}
              {el.type === 'photo' && (
                <img src={el.url} alt="" draggable={false}
                  style={{ width: w, height: h, borderRadius: el.radius || 8, objectFit: 'cover', transform: `rotate(${el.rotation || 0}deg)`, display: 'block', pointerEvents: 'none' }} />
              )}

              {/* Selection + resize handles */}
              {isSelected && isOwner && (
                <>
                  {/* Selection border */}
                  <div style={{ position: 'absolute', inset: -4, border: '2px solid #6B4DE6', borderRadius: 4, pointerEvents: 'none', zIndex: 10 }} />

                  {/* Resize handles — 8 pontos como na imagem */}
                  {HANDLES.map(handle => {
                    const hStyle = getHandleStyle(handle)
                    return (
                      <div
                        key={handle}
                        onMouseDown={e => startResize(e, el.id, handle)}
                        onTouchStart={e => startResize(e, el.id, handle)}
                        style={{
                          position: 'absolute',
                          ...hStyle,
                          width: 10,
                          height: 10,
                          background: 'white',
                          border: '2px solid #6B4DE6',
                          borderRadius: 2,
                          cursor: HANDLE_CURSORS[handle],
                          zIndex: 30,
                          transform: 'translate(-50%,-50%)'
                        }}
                      />
                    )
                  })}

                  {/* Rotate handle (bottom center, below element) */}
                  <div
                    style={{ position: 'absolute', left: '50%', bottom: -28, transform: 'translateX(-50%)', width: 22, height: 22, background: 'white', border: '2px solid #6B4DE6', borderRadius: '50%', cursor: 'grab', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
                    title="Rotacionar"
                    onMouseDown={e => {
                      if (el.type !== 'photo') return
                      e.stopPropagation()
                      const rect = canvasRef.current.getBoundingClientRect()
                      const cx = el.x + w / 2
                      const cy = el.y + h / 2
                      const startAngle = Math.atan2(e.clientY - rect.top - cy, e.clientX - rect.left - cx) * 180 / Math.PI
                      const startRot = el.rotation || 0
                      const onRot = (ev) => {
                        const a = Math.atan2(ev.clientY - rect.top - cy, ev.clientX - rect.left - cx) * 180 / Math.PI
                        upd(el.id, { rotation: Math.round(startRot + (a - startAngle)) })
                      }
                      const onRotEnd = () => { window.removeEventListener('mousemove', onRot); window.removeEventListener('mouseup', onRotEnd) }
                      window.addEventListener('mousemove', onRot)
                      window.addEventListener('mouseup', onRotEnd)
                    }}
                  >↻</div>
                </>
              )}
            </div>
          )
        })}

        {elements.length === 0 && isOwner && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', color: 'rgba(27,58,31,0.2)', pointerEvents: 'none' }}>
            <div style={{ fontSize: 40 }}>📝</div>
            <p style={{ fontFamily: 'var(--font-cute)', fontSize: 13, marginTop: 10, lineHeight: 1.5 }}>Use as ferramentas acima<br />para criar sua página!</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Calcula posição do handle na borda do elemento
function getHandleStyle(handle) {
  const pos = {}
  if (handle.includes('n')) pos.top = '0%'
  if (handle.includes('s')) pos.top = '100%'
  if (!handle.includes('n') && !handle.includes('s')) pos.top = '50%'
  if (handle.includes('w')) pos.left = '0%'
  if (handle.includes('e')) pos.left = '100%'
  if (!handle.includes('w') && !handle.includes('e')) pos.left = '50%'
  return pos
}
