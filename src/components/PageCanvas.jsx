import { useState, useRef, useCallback, useEffect } from 'react'
import { uploadPhoto } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import { v4 as uuidv4 } from 'uuid'
import styles from './PageCanvas.module.css'

const STICKERS = ['🌸','⭐','🦋','🍓','🌈','💖','🌙','🍦','🎀','✨','🌺','🍭',
  '🐱','🐰','🌻','🍉','🍒','🎵','🎨','🌷','🦄','🍋','🎪','💫','🌊','🍄',
  '🎠','🧸','🍰','🌼','🦩','🎡','🍩','🌟','💝','🎈','🐝','🌿','🍀','🦋']

const FONTS = [
  { name: 'Pacifico', label: 'Fofa' },
  { name: 'Caveat', label: 'Manuscrita' },
  { name: 'Dancing Script', label: 'Script' },
  { name: 'Quicksand', label: 'Moderna' },
  { name: 'Nunito', label: 'Simples' },
]

const BG_COLORS = [
  '#FFFFFF', '#F7FAF0', '#FFF8CC', '#E8F5E9', '#E3F2FD',
  '#FCE4EC', '#F3E5F5', '#FFF3E0', '#E0F2F1', '#FAFAFA',
]

export default function PageCanvas({ page, isOwner, onSave, onDeletePage, userId }) {
  const toast = useToast()
  const [elements, setElements] = useState(page.elements || [])
  const [selected, setSelected] = useState(null)
  const [bgColor, setBgColor] = useState(page.bgColor || '#FFFFFF')
  const [tool, setTool] = useState('select')
  const [dragging, setDragging] = useState(null)
  const canvasRef = useRef(null)
  const fileRef = useRef(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const isDirty = useRef(false)

  useEffect(() => {
    if (!isDirty.current) return
    const timer = setTimeout(() => {
      onSave(elements)
      isDirty.current = false
    }, 1500)
    return () => clearTimeout(timer)
  }, [elements])

  const mark = () => { isDirty.current = true }

  const updateEl = (id, updates) => {
    setElements(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
    mark()
  }

  const addElement = (el) => {
    setElements(prev => [...prev, el])
    setSelected(el.id)
    mark()
  }

  const deleteSelected = () => {
    if (!selected) return
    setElements(prev => prev.filter(e => e.id !== selected))
    setSelected(null)
    mark()
  }

  // Mouse drag
  const startDrag = (e, id) => {
    if (!isOwner) return
    e.stopPropagation()
    const el = elements.find(el => el.id === id)
    if (!el) return
    const rect = canvasRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    dragOffset.current = { x: clientX - rect.left - el.x, y: clientY - rect.top - el.y }
    setDragging(id)
    setSelected(id)
  }

  const onMove = useCallback((e) => {
    if (!dragging || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const x = Math.max(0, Math.min(clientX - rect.left - dragOffset.current.x, rect.width - 20))
    const y = Math.max(0, Math.min(clientY - rect.top - dragOffset.current.y, rect.height - 20))
    updateEl(dragging, { x, y })
  }, [dragging])

  const onEnd = useCallback(() => setDragging(null), [])

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
    addElement({
      id: uuidv4(), type: 'text',
      x: 60, y: 60,
      text: 'Escreva aqui 💕',
      font: 'Caveat', fontSize: 28, color: '#1B3A1F', width: 200,
    })
    setTool('select')
  }

  const addSticker = (emoji) => {
    addElement({
      id: uuidv4(), type: 'sticker',
      x: 80 + Math.random() * 180,
      y: 80 + Math.random() * 180,
      emoji, fontSize: 48,
    })
    setTool('select')
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast('Foto muito grande (máx 5MB)', 'error'); return }
    toast('Enviando foto... 📸')
    const { url, error } = await uploadPhoto(file, userId)
    if (error || !url) { toast('Erro ao enviar foto 😢', 'error'); return }
    addElement({
      id: uuidv4(), type: 'photo',
      x: 40, y: 40, url,
      width: 180, height: 180, borderRadius: 8, rotation: 0,
    })
    toast('Foto adicionada! 📷', 'success')
    e.target.value = ''
  }

  const selEl = elements.find(e => e.id === selected)

  return (
    <div className={styles.wrap}>
      {isOwner && (
        <div className={styles.toolbar}>
          <div className={styles.toolGroup}>
            <button className={`${styles.tool} ${tool==='select'?styles.active:''}`} onClick={()=>setTool('select')} title="Selecionar">☝️</button>
            <button className={styles.tool} onClick={addText} title="Texto">T</button>
            <button className={`${styles.tool} ${tool==='sticker'?styles.active:''}`} onClick={()=>setTool(tool==='sticker'?'select':'sticker')} title="Adesivos">🌸</button>
            <button className={styles.tool} onClick={()=>fileRef.current?.click()} title="Foto">📷</button>
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhotoUpload} />
          </div>

          <div className={styles.bgColors}>
            {BG_COLORS.map(c => (
              <button key={c} className={`${styles.bgBtn} ${bgColor===c?styles.bgActive:''}`}
                style={{ background: c }} onClick={() => { setBgColor(c); mark() }} />
            ))}
          </div>

          <div className={styles.toolGroup}>
            {selected && <button className={`${styles.tool} ${styles.danger}`} onClick={deleteSelected} title="Deletar">🗑️</button>}
            {onDeletePage && <button className={`${styles.tool} ${styles.danger}`} onClick={onDeletePage} title="Deletar página">📄🗑️</button>}
            <button className={`${styles.tool} ${styles.save}`} onClick={()=>{onSave(elements);toast('Salvo! ✅','success')}} title="Salvar">💾</button>
          </div>
        </div>
      )}

      {/* Sticker panel */}
      {tool === 'sticker' && isOwner && (
        <div className={styles.stickerPanel}>
          <div className={styles.stickerGrid}>
            {STICKERS.map(s => (
              <button key={s} className={styles.stickerBtn} onClick={()=>addSticker(s)}>{s}</button>
            ))}
          </div>
        </div>
      )}

      {/* Properties panel */}
      {selected && selEl && isOwner && (
        <div className={styles.propsPanel}>
          {selEl.type === 'text' && (
            <>
              <div className={styles.propGroup}>
                <label>Texto</label>
                <textarea className={styles.propTextarea} value={selEl.text} onChange={e=>updateEl(selected,{text:e.target.value})} />
              </div>
              <div className={styles.propGroup}>
                <label>Fonte</label>
                <div className={styles.fontRow}>
                  {FONTS.map(f => (
                    <button key={f.name} className={`${styles.fontBtn} ${selEl.font===f.name?styles.fontActive:''}`}
                      style={{fontFamily:f.name}} onClick={()=>updateEl(selected,{font:f.name})}>{f.label}</button>
                  ))}
                </div>
              </div>
              <div className={styles.propGroup}>
                <label>Tamanho: {selEl.fontSize}px</label>
                <input type="range" min={12} max={80} value={selEl.fontSize} onChange={e=>updateEl(selected,{fontSize:+e.target.value})} className={styles.slider} />
              </div>
              <div className={styles.propGroup}>
                <label>Cor</label>
                <input type="color" value={selEl.color} onChange={e=>updateEl(selected,{color:e.target.value})} className={styles.colorPicker} />
              </div>
            </>
          )}
          {selEl.type === 'photo' && (
            <>
              <div className={styles.propGroup}>
                <label>Largura: {selEl.width}px</label>
                <input type="range" min={60} max={400} value={selEl.width} onChange={e=>updateEl(selected,{width:+e.target.value})} className={styles.slider} />
              </div>
              <div className={styles.propGroup}>
                <label>Altura: {selEl.height}px</label>
                <input type="range" min={60} max={400} value={selEl.height} onChange={e=>updateEl(selected,{height:+e.target.value})} className={styles.slider} />
              </div>
              <div className={styles.propGroup}>
                <label>Borda: {selEl.borderRadius}px</label>
                <input type="range" min={0} max={120} value={selEl.borderRadius} onChange={e=>updateEl(selected,{borderRadius:+e.target.value})} className={styles.slider} />
              </div>
              <div className={styles.propGroup}>
                <label>Rotação: {selEl.rotation||0}°</label>
                <input type="range" min={-45} max={45} value={selEl.rotation||0} onChange={e=>updateEl(selected,{rotation:+e.target.value})} className={styles.slider} />
              </div>
            </>
          )}
          {selEl.type === 'sticker' && (
            <div className={styles.propGroup}>
              <label>Tamanho: {selEl.fontSize}px</label>
              <input type="range" min={24} max={120} value={selEl.fontSize} onChange={e=>updateEl(selected,{fontSize:+e.target.value})} className={styles.slider} />
            </div>
          )}
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={styles.canvas}
        style={{ background: bgColor }}
        onClick={()=>setSelected(null)}
      >
        {elements.map(el => (
          <div
            key={el.id}
            className={`${styles.element} ${selected===el.id?styles.selected:''} ${isOwner?styles.draggable:''}`}
            style={{ left: el.x, top: el.y, position: 'absolute' }}
            onMouseDown={e=>startDrag(e,el.id)}
            onTouchStart={e=>startDrag(e,el.id)}
            onClick={e=>{e.stopPropagation();setSelected(el.id)}}
          >
            {el.type === 'text' && (
              <div style={{
                fontFamily: el.font||'Caveat', fontSize: el.fontSize||28,
                color: el.color||'#1B3A1F', width: el.width||200,
                wordBreak:'break-word', whiteSpace:'pre-wrap', lineHeight:1.4,
                cursor: isOwner?'move':'default', userSelect:'none',
              }}>{el.text}</div>
            )}
            {el.type === 'sticker' && (
              <div style={{fontSize:el.fontSize||48, lineHeight:1, userSelect:'none', cursor:isOwner?'move':'default'}}>{el.emoji}</div>
            )}
            {el.type === 'photo' && (
              <img src={el.url} alt="" style={{
                width:el.width, height:el.height, borderRadius:el.borderRadius||8,
                objectFit:'cover', transform:`rotate(${el.rotation||0}deg)`,
                display:'block', userSelect:'none', pointerEvents:'none',
              }} draggable={false} />
            )}
          </div>
        ))}
        {elements.length === 0 && isOwner && (
          <div className={styles.emptyHint}>
            <span>📝</span>
            <p>Use as ferramentas acima para adicionar fotos, textos e adesivos!</p>
          </div>
        )}
      </div>
    </div>
  )
}
