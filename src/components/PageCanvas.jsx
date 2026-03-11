import { useState, useRef, useCallback, useEffect } from 'react'
import { uploadPhoto } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import { v4 as uuidv4 } from 'uuid'

const STICKERS = ['🌸','⭐','🦋','🍓','🌈','💖','🌙','🍦','🎀','✨','🌺','🍭','🐱','🐰','🌻','🍉','🍒','🎵','🎨','🌷','🦄','🍋','💫','🌊','🍄','🧸','🍰','🌼','🍩','🌟','💝','🎈','🐝','🍀','🎪','🦊','🌈','🎀','💛','🌿']
const FONTS = [
  { name: 'Pacifico', label: 'Fofa' },
  { name: 'Caveat', label: 'Manuscrita' },
  { name: 'Dancing Script', label: 'Script' },
  { name: 'Quicksand', label: 'Moderna' },
  { name: 'Nunito', label: 'Normal' }
]
const BG_COLORS = ['#FFFFFF','#F7FAF0','#FFFDE7','#E8F5E9','#E3F2FD','#FCE4EC','#F3E5F5','#FFF8E1','#E0F2F1','#FAFAFA','#FFF3E0','#E8EAF6']

// Content moderation: validate image before upload
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024

export default function PageCanvas({ page, isOwner, onSave, onDeletePage, userId }) {
  const toast = useToast()
  const [elements, setElements] = useState(page.elements || [])
  const [selected, setSelected] = useState(null)
  const [bgColor, setBgColor] = useState(page.bgColor || '#FFFFFF')
  const [panel, setPanel] = useState('none')
  const [uploading, setUploading] = useState(false)
  const canvasRef = useRef(null)
  const fileRef = useRef(null)
  const dragRef = useRef(null)
  const dirty = useRef(false)

  // Auto-save with debounce
  useEffect(() => {
    if (!dirty.current) return
    const t = setTimeout(() => { onSave(elements); dirty.current = false }, 1800)
    return () => clearTimeout(t)
  }, [elements])

  const mark = () => { dirty.current = true }
  const upd = (id, u) => { setElements(p => p.map(e => e.id === id ? { ...e, ...u } : e)); mark() }
  const add = (el) => { setElements(p => [...p, el]); setSelected(el.id); mark() }
  const del = () => {
    if (!selected) return
    setElements(p => p.filter(e => e.id !== selected))
    setSelected(null); mark()
  }

  // Touch/mouse drag
  const getXY = (e) => {
    if (e.touches) return { x: e.touches[0].clientX, y: e.touches[0].clientY }
    return { x: e.clientX, y: e.clientY }
  }

  const startDrag = (e, id) => {
    if (!isOwner) return
    e.stopPropagation()
    const el = elements.find(el => el.id === id)
    if (!el) return
    const rect = canvasRef.current.getBoundingClientRect()
    const { x, y } = getXY(e)
    dragRef.current = { id, ox: x - rect.left - el.x, oy: y - rect.top - el.y }
    setSelected(id)
    setPanel('none')
  }

  const onMove = useCallback((e) => {
    if (!dragRef.current || !canvasRef.current) return
    if (e.cancelable) e.preventDefault()
    const rect = canvasRef.current.getBoundingClientRect()
    const { x, y } = getXY(e)
    const nx = Math.max(0, Math.min(x - rect.left - dragRef.current.ox, rect.width - 10))
    const ny = Math.max(0, Math.min(y - rect.top - dragRef.current.oy, rect.height - 10))
    upd(dragRef.current.id, { x: nx, y: ny })
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

  const addText = () => {
    add({ id: uuidv4(), type: 'text', x: 60, y: 60, text: 'Escreva aqui 💕', font: 'Caveat', fontSize: 28, color: '#1B3A1F', width: 200 })
  }

  const addSticker = (emoji) => {
    add({ id: uuidv4(), type: 'sticker', x: 80 + Math.random() * 160, y: 60 + Math.random() * 160, emoji, fontSize: 52 })
    setPanel('none')
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Security: validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast('⚠️ Tipo de arquivo não permitido. Use JPG, PNG, WEBP ou GIF.', 'error')
      e.target.value = ''; return
    }
    // Security: validate size
    if (file.size > MAX_SIZE) {
      toast('⚠️ Imagem muito grande! Máximo 5MB.', 'error')
      e.target.value = ''; return
    }

    setUploading(true)
    toast('Enviando foto... 📸')
    const { url, error } = await uploadPhoto(file, userId)
    setUploading(false)

    if (error || !url) {
      toast('Erro ao enviar imagem 😢', 'error')
      e.target.value = ''; return
    }

    add({ id: uuidv4(), type: 'photo', x: 40, y: 40, url, width: 180, height: 180, radius: 8, rotation: 0 })
    toast('Foto adicionada! 📷', 'success')
    e.target.value = ''
  }

  const selEl = elements.find(e => e.id === selected)

  const toolBtn = (active, danger) => ({
    width: 40, height: 40, border: `2px solid ${danger ? 'rgba(229,57,53,0.35)' : active ? 'var(--green)' : 'var(--dark-faint)'}`,
    borderRadius: 10, background: danger ? 'rgba(229,57,53,0.07)' : active ? 'var(--green-light)' : 'white',
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    transition: 'all 0.15s', color: danger ? 'var(--red)' : 'var(--dark)'
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>

      {/* Toolbar */}
      {isOwner && (
        <div style={{ background: 'white', borderRadius: 18, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: 'var(--shadow-md)', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 720 }}>
          {/* Add tools */}
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <button style={toolBtn(false)} onClick={addText} title="Adicionar texto">T</button>
            <button style={toolBtn(panel === 'stickers')} onClick={() => setPanel(panel === 'stickers' ? 'none' : 'stickers')} title="Adesivos">🌸</button>
            <button style={toolBtn(false)} onClick={() => fileRef.current?.click()} title="Foto" disabled={uploading}>
              {uploading ? <span className="loader loader-sm" style={{ margin: 0 }} /> : '📷'}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={handleUpload} />
          </div>

          {/* BG colors */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', flex: 1 }}>
            {BG_COLORS.map(c => (
              <button key={c} onClick={() => { setBgColor(c); mark() }}
                style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: `2.5px solid ${bgColor === c ? 'var(--green)' : 'rgba(27,58,31,0.15)'}`, cursor: 'pointer', transform: bgColor === c ? 'scale(1.22)' : 'scale(1)', transition: 'transform 0.12s', flexShrink: 0, boxShadow: bgColor === c ? '0 2px 8px rgba(58,140,63,0.3)' : 'none' }} />
            ))}
          </div>

          {/* Selection tools */}
          <div style={{ display: 'flex', gap: 5 }}>
            {selected && (
              <>
                <button style={toolBtn(panel === 'props')} onClick={() => setPanel(panel === 'props' ? 'none' : 'props')} title="Propriedades">⚙️</button>
                <button style={toolBtn(false, true)} onClick={del} title="Deletar elemento">🗑️</button>
              </>
            )}
            {onDeletePage && <button style={toolBtn(false, true)} onClick={onDeletePage} title="Deletar página">📄❌</button>}
            <button style={toolBtn(false)} onClick={() => { onSave(elements); toast('Salvo! ✅', 'success') }} title="Salvar agora">💾</button>
          </div>
        </div>
      )}

      {/* Sticker Panel */}
      {panel === 'stickers' && isOwner && (
        <div style={{ background: 'white', borderRadius: 16, padding: 14, boxShadow: 'var(--shadow)', width: '100%', maxWidth: 720, animation: 'slideDown 0.2s ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(38px,1fr))', gap: 4 }}>
            {STICKERS.map(s => (
              <button key={s} onClick={() => addSticker(s)}
                style={{ fontSize: 24, background: 'none', border: '2px solid transparent', borderRadius: 8, cursor: 'pointer', padding: 4, lineHeight: 1, transition: 'all 0.12s' }}
                onMouseOver={e => { e.currentTarget.style.background = 'var(--green-light)'; e.currentTarget.style.transform = 'scale(1.22)' }}
                onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.transform = 'scale(1)' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Props Panel */}
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
            <>
              {[['Largura', selEl.width, 'width', 60, 400], ['Altura', selEl.height, 'height', 60, 400], ['Borda', selEl.radius, 'radius', 0, 120], ['Rotação', selEl.rotation || 0, 'rotation', -45, 45]].map(([lbl, val, key, min, max]) => (
                <div key={key}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--dark-muted)', display: 'block', marginBottom: 5 }}>{lbl}: {val}{key === 'rotation' ? '°' : 'px'}</label>
                  <input type="range" min={min} max={max} value={val} onChange={e => upd(selected, { [key]: +e.target.value })} style={{ width: 95, accentColor: 'var(--green)' }} />
                </div>
              ))}
            </>
          )}
          {selEl.type === 'sticker' && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--dark-muted)', display: 'block', marginBottom: 5 }}>Tamanho: {selEl.fontSize}px</label>
              <input type="range" min={24} max={120} value={selEl.fontSize} onChange={e => upd(selected, { fontSize: +e.target.value })} style={{ width: 110, accentColor: 'var(--green)' }} />
            </div>
          )}
        </div>
      )}

      {/* Canvas */}
      <div ref={canvasRef}
        style={{ width: 'min(720px,100%)', aspectRatio: '7/5', borderRadius: 20, background: bgColor, position: 'relative', overflow: 'hidden', boxShadow: '0 10px 48px rgba(27,58,31,0.16)', touchAction: 'none', flexShrink: 0, border: '2px solid rgba(255,255,255,0.8)' }}
        onClick={() => { setSelected(null); setPanel('none') }}>
        {elements.map(el => (
          <div key={el.id}
            style={{ position: 'absolute', left: el.x, top: el.y, cursor: isOwner ? 'grab' : 'default', userSelect: 'none', transition: dragRef.current?.id === el.id ? 'none' : 'none' }}
            onMouseDown={e => startDrag(e, el.id)}
            onTouchStart={e => startDrag(e, el.id)}
            onClick={e => { e.stopPropagation(); if (isOwner) setSelected(el.id) }}>
            {selected === el.id && (
              <div style={{ position: 'absolute', inset: -5, border: '2px dashed var(--green)', borderRadius: 8, pointerEvents: 'none', zIndex: 10, animation: 'none' }} />
            )}
            {el.type === 'text' && (
              <div style={{ fontFamily: el.font || 'Caveat', fontSize: el.fontSize || 28, color: el.color || '#1B3A1F', width: el.width || 200, wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
                {el.text}
              </div>
            )}
            {el.type === 'sticker' && (
              <div style={{ fontSize: el.fontSize || 52, lineHeight: 1 }}>{el.emoji}</div>
            )}
            {el.type === 'photo' && (
              <img src={el.url} alt="" draggable={false}
                style={{ width: el.width, height: el.height, borderRadius: el.radius || 8, objectFit: 'cover', transform: `rotate(${el.rotation || 0}deg)`, display: 'block', pointerEvents: 'none' }} />
            )}
          </div>
        ))}
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
