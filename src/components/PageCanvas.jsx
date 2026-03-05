import { useState, useRef, useCallback, useEffect } from 'react'
import { uploadPhoto } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import { v4 as uuidv4 } from 'uuid'

const STICKERS = ['🌸','⭐','🦋','🍓','🌈','💖','🌙','🍦','🎀','✨','🌺','🍭','🐱','🐰','🌻','🍉','🍒','🎵','🎨','🌷','🦄','🍋','💫','🌊','🍄','🧸','🍰','🌼','🍩','🌟','💝','🎈','🐝','🍀','🎪','🦊']
const FONTS = [{ name:'Pacifico', label:'Fofa' }, { name:'Caveat', label:'Manuscrita' }, { name:'Dancing Script', label:'Script' }, { name:'Quicksand', label:'Moderna' }, { name:'Nunito', label:'Normal' }]
const BG_COLORS = ['#FFFFFF','#F7FAF0','#FFFDE7','#E8F5E9','#E3F2FD','#FCE4EC','#F3E5F5','#FFF8E1','#E0F2F1','#FAFAFA']

export default function PageCanvas({ page, isOwner, onSave, onDeletePage, userId }) {
  const toast = useToast()
  const [elements, setElements] = useState(page.elements || [])
  const [selected, setSelected] = useState(null)
  const [bgColor, setBgColor] = useState(page.bgColor || '#FFFFFF')
  const [panel, setPanel] = useState('none') // none | stickers | props
  const canvasRef = useRef(null)
  const fileRef = useRef(null)
  const dragRef = useRef(null)
  const dirty = useRef(false)

  // Auto-save
  useEffect(() => {
    if (!dirty.current) return
    const t = setTimeout(() => { onSave(elements); dirty.current = false }, 1500)
    return () => clearTimeout(t)
  }, [elements])

  const mark = () => { dirty.current = true }
  const upd = (id, u) => { setElements(p => p.map(e => e.id===id ? {...e,...u} : e)); mark() }
  const add = (el) => { setElements(p => [...p, el]); setSelected(el.id); mark() }
  const del = () => { if (!selected) return; setElements(p => p.filter(e => e.id!==selected)); setSelected(null); mark() }

  // Drag
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
    add({ id:uuidv4(), type:'text', x:60, y:60, text:'Escreva aqui 💕', font:'Caveat', fontSize:28, color:'#1B3A1F', width:200 })
  }

  const addSticker = (emoji) => {
    add({ id:uuidv4(), type:'sticker', x:80+Math.random()*160, y:60+Math.random()*160, emoji, fontSize:52 })
    setPanel('none')
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5*1024*1024) { toast('Foto muito grande! Máx 5MB', 'error'); return }
    toast('Enviando foto... 📸')
    const { url, error } = await uploadPhoto(file, userId)
    if (error || !url) { toast('Erro ao enviar 😢', 'error'); return }
    add({ id:uuidv4(), type:'photo', x:40, y:40, url, width:180, height:180, radius:8, rotation:0 })
    toast('Foto adicionada! 📷', 'success')
    e.target.value = ''
  }

  const selEl = elements.find(e => e.id === selected)

  const btnStyle = (active) => ({
    width:40, height:40, border:`2px solid ${active?'var(--green)':'rgba(27,58,31,0.12)'}`,
    borderRadius:10, background: active?'var(--green-light)':'white',
    fontSize:15, fontWeight:700, fontFamily:'var(--font-body)',
    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0
  })

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, width:'100%' }}>

      {/* Toolbar */}
      {isOwner && (
        <div style={{ background:'white', borderRadius:16, padding:'8px 12px', display:'flex', alignItems:'center', gap:8, boxShadow:'var(--shadow)', flexWrap:'wrap', justifyContent:'center', width:'100%', maxWidth:720 }}>
          <div style={{ display:'flex', gap:5 }}>
            <button style={btnStyle(false)} onClick={addText} title="Texto">T</button>
            <button style={btnStyle(panel==='stickers')} onClick={() => setPanel(panel==='stickers'?'none':'stickers')} title="Adesivos">🌸</button>
            <button style={btnStyle(false)} onClick={() => fileRef.current?.click()} title="Foto">📷</button>
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleUpload} />
          </div>

          <div style={{ display:'flex', gap:4, flexWrap:'wrap', justifyContent:'center' }}>
            {BG_COLORS.map(c => (
              <button key={c} onClick={() => { setBgColor(c); mark() }}
                style={{ width:20, height:20, borderRadius:'50%', background:c, border:`2px solid ${bgColor===c?'var(--green)':'rgba(27,58,31,0.15)'}`, cursor:'pointer', transform: bgColor===c?'scale(1.2)':'scale(1)', transition:'transform 0.1s', flexShrink:0 }} />
            ))}
          </div>

          <div style={{ display:'flex', gap:5 }}>
            {selected && (
              <>
                <button style={btnStyle(panel==='props')} onClick={() => setPanel(panel==='props'?'none':'props')} title="Editar">⚙️</button>
                <button style={{...btnStyle(false), borderColor:'#e53935'}} onClick={del} title="Deletar">🗑️</button>
              </>
            )}
            {onDeletePage && <button style={{...btnStyle(false), borderColor:'#e53935'}} onClick={onDeletePage} title="Deletar página">📄🗑️</button>}
            <button style={{...btnStyle(false), borderColor:'var(--green)'}} onClick={() => { onSave(elements); toast('Salvo! ✅','success') }} title="Salvar">💾</button>
          </div>
        </div>
      )}

      {/* Sticker panel */}
      {panel === 'stickers' && isOwner && (
        <div style={{ background:'white', borderRadius:14, padding:12, boxShadow:'var(--shadow)', width:'100%', maxWidth:720 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(36px,1fr))', gap:4 }}>
            {STICKERS.map(s => (
              <button key={s} onClick={() => addSticker(s)}
                style={{ fontSize:22, background:'none', border:'2px solid transparent', borderRadius:8, cursor:'pointer', padding:3, lineHeight:1, transition:'all 0.1s' }}
                onMouseOver={e => { e.currentTarget.style.background='var(--green-light)'; e.currentTarget.style.transform='scale(1.2)' }}
                onMouseOut={e => { e.currentTarget.style.background='none'; e.currentTarget.style.transform='scale(1)' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Props panel */}
      {panel === 'props' && selEl && isOwner && (
        <div style={{ background:'white', borderRadius:14, padding:'12px 16px', boxShadow:'var(--shadow)', width:'100%', maxWidth:720, display:'flex', gap:16, flexWrap:'wrap', alignItems:'flex-start' }}>
          {selEl.type === 'text' && (
            <>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'rgba(27,58,31,0.5)', display:'block', marginBottom:4 }}>Texto</label>
                <textarea value={selEl.text} onChange={e=>upd(selected,{text:e.target.value})}
                  style={{ border:'2px solid rgba(27,58,31,0.15)', borderRadius:8, padding:'6px 8px', fontSize:13, fontFamily:'var(--font-body)', width:160, height:52, resize:'none', outline:'none', color:'var(--dark)' }} />
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'rgba(27,58,31,0.5)', display:'block', marginBottom:4 }}>Fonte</label>
                <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                  {FONTS.map(f => (
                    <button key={f.name} onClick={() => upd(selected,{font:f.name})}
                      style={{ padding:'4px 8px', border:`2px solid ${selEl.font===f.name?'var(--green)':'rgba(27,58,31,0.15)'}`, borderRadius:6, background: selEl.font===f.name?'var(--green-light)':'white', cursor:'pointer', fontFamily:f.name, fontSize:12, color:'var(--dark)' }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'rgba(27,58,31,0.5)', display:'block', marginBottom:4 }}>Tamanho: {selEl.fontSize}px</label>
                <input type="range" min={12} max={80} value={selEl.fontSize} onChange={e=>upd(selected,{fontSize:+e.target.value})} style={{ width:100 }} />
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'rgba(27,58,31,0.5)', display:'block', marginBottom:4 }}>Cor</label>
                <input type="color" value={selEl.color} onChange={e=>upd(selected,{color:e.target.value})} style={{ width:36, height:36, borderRadius:8, border:'none', cursor:'pointer', padding:2 }} />
              </div>
            </>
          )}
          {selEl.type === 'photo' && (
            <>
              {[['Largura',selEl.width,'width',60,400],['Altura',selEl.height,'height',60,400],['Borda',selEl.radius,'radius',0,120],['Rotação',selEl.rotation||0,'rotation',-45,45]].map(([lbl,val,key,min,max]) => (
                <div key={key}>
                  <label style={{ fontSize:11, fontWeight:700, color:'rgba(27,58,31,0.5)', display:'block', marginBottom:4 }}>{lbl}: {val}{key==='rotation'?'°':'px'}</label>
                  <input type="range" min={min} max={max} value={val} onChange={e=>upd(selected,{[key]:+e.target.value})} style={{ width:90 }} />
                </div>
              ))}
            </>
          )}
          {selEl.type === 'sticker' && (
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'rgba(27,58,31,0.5)', display:'block', marginBottom:4 }}>Tamanho: {selEl.fontSize}px</label>
              <input type="range" min={24} max={120} value={selEl.fontSize} onChange={e=>upd(selected,{fontSize:+e.target.value})} style={{ width:100 }} />
            </div>
          )}
        </div>
      )}

      {/* Canvas */}
      <div ref={canvasRef} style={{ width:'min(720px,100%)', aspectRatio:'7/5', borderRadius:16, background:bgColor, position:'relative', overflow:'hidden', boxShadow:'0 8px 40px rgba(27,58,31,0.15)', touchAction:'none', flexShrink:0 }}
        onClick={() => { setSelected(null); setPanel('none') }}>
        {elements.map(el => (
          <div key={el.id} style={{ position:'absolute', left:el.x, top:el.y, cursor:isOwner?'move':'default', userSelect:'none' }}
            onMouseDown={e => startDrag(e, el.id)}
            onTouchStart={e => startDrag(e, el.id)}
            onClick={e => { e.stopPropagation(); setSelected(el.id) }}>
            {selected === el.id && (
              <div style={{ position:'absolute', inset:-4, border:'2px dashed var(--green)', borderRadius:6, pointerEvents:'none', zIndex:10 }} />
            )}
            {el.type === 'text' && (
              <div style={{ fontFamily:el.font||'Caveat', fontSize:el.fontSize||28, color:el.color||'#1B3A1F', width:el.width||200, wordBreak:'break-word', whiteSpace:'pre-wrap', lineHeight:1.4 }}>
                {el.text}
              </div>
            )}
            {el.type === 'sticker' && (
              <div style={{ fontSize:el.fontSize||52, lineHeight:1 }}>{el.emoji}</div>
            )}
            {el.type === 'photo' && (
              <img src={el.url} alt="" draggable={false} style={{ width:el.width, height:el.height, borderRadius:el.radius||8, objectFit:'cover', transform:`rotate(${el.rotation||0}deg)`, display:'block', pointerEvents:'none' }} />
            )}
          </div>
        ))}
        {elements.length === 0 && isOwner && (
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', color:'rgba(27,58,31,0.25)', pointerEvents:'none' }}>
            <div style={{ fontSize:36 }}>📝</div>
            <p style={{ fontFamily:'var(--font-cute)', fontSize:13, marginTop:8 }}>Use as ferramentas acima para criar sua página!</p>
          </div>
        )}
      </div>
    </div>
  )
}
