import { useState, useRef, useCallback, useEffect } from 'react'
import { uploadPhoto } from '../lib/supabase'
import { moderateText } from '../lib/moderation'
import { useToast } from '../hooks/useToast'
import { v4 as uuidv4 } from 'uuid'

// ─── Constants ────────────────────────────────────────
const STICKERS = ['🌸','⭐','🦋','🍓','🌈','💖','🌙','🍦','🎀','✨','🌺','🍭','🐱','🐰','🌻','🍉','🍒','🎵','🎨','🌷','🦄','🍋','💫','🌊','🍄','🧸','🍰','🌼','🍩','🌟','💝','🎈','🐝','🍀','🎪','🦊','💛','🌿','🐣']

const FONTS = [
  { name:'Pacifico',       label:'Fofa'      },
  { name:'Caveat',         label:'Manuscrita'},
  { name:'Dancing Script', label:'Script'    },
  { name:'Quicksand',      label:'Moderna'   },
  { name:'Nunito',         label:'Normal'    },
]

const PAGE_STYLES = [
  { id:'white',       label:'Branco',     bg:'#FFFFFF', type:'solid' },
  { id:'cream',       label:'Creme',      bg:'#FFF8E7', type:'solid' },
  { id:'mint',        label:'Menta',      bg:'#E8F5E9', type:'solid' },
  { id:'sky',         label:'Céu',        bg:'#E3F2FD', type:'solid' },
  { id:'blush',       label:'Rosa',       bg:'#FCE4EC', type:'solid' },
  { id:'lavender',    label:'Lavanda',    bg:'#F3E5F5', type:'solid' },
  { id:'peach',       label:'Pêssego',    bg:'#FFF3E0', type:'solid' },
  { id:'lilac',       label:'Lilás',      bg:'#EDE7F6', type:'solid' },
  { id:'sage',        label:'Sálvia',     bg:'#F1F8E9', type:'solid' },
  { id:'charcoal',    label:'Escuro',     bg:'#263238', type:'solid' },
  { id:'grad_sunset', label:'Pôr do sol', bg:'linear-gradient(135deg,#FFD89B,#FF6B9D)', type:'gradient' },
  { id:'grad_ocean',  label:'Oceano',     bg:'linear-gradient(135deg,#4facfe,#00f2fe)', type:'gradient' },
  { id:'grad_forest', label:'Floresta',   bg:'linear-gradient(135deg,#C8E6C9,#43E97B)', type:'gradient' },
  { id:'grad_candy',  label:'Candy',      bg:'linear-gradient(135deg,#F093FB,#F5576C)', type:'gradient' },
  { id:'grad_gold',   label:'Dourado',    bg:'linear-gradient(135deg,#f6d365,#fda085)', type:'gradient' },
  { id:'grad_aurora', label:'Aurora',     bg:'linear-gradient(135deg,#a18cd1,#fbc2eb)', type:'gradient' },
  { id:'dots',     label:'Bolinhas', bg:'#FFF8E7', type:'pattern', pattern:'radial-gradient(circle,#F5C800 1.5px,transparent 1.5px)',                                                                                       patternSize:'20px 20px' },
  { id:'lines',    label:'Linhas',   bg:'#EAF5EA', type:'pattern', pattern:'repeating-linear-gradient(0deg,transparent,transparent 23px,#b2dfdb 23px,#b2dfdb 25px)',                                                       patternSize:'auto' },
  { id:'grid',     label:'Grade',    bg:'#F3E5F5', type:'pattern', pattern:'linear-gradient(rgba(150,80,200,0.12) 1px,transparent 1px),linear-gradient(90deg,rgba(150,80,200,0.12) 1px,transparent 1px)',                   patternSize:'24px 24px' },
  { id:'diagonal', label:'Diagonal', bg:'#FCE4EC', type:'pattern', pattern:'repeating-linear-gradient(45deg,transparent,transparent 12px,rgba(255,105,135,0.15) 12px,rgba(255,105,135,0.15) 14px)',                        patternSize:'auto' },
  { id:'hearts',   label:'Corações', bg:'#FFF0F5', type:'pattern', pattern:'radial-gradient(circle,#FFB6C1 2px,transparent 2px)',                                                                                           patternSize:'18px 18px' },
]

const DRAW_TOOLS = [
  { id:'pen',         label:'Caneta',      icon:'✏️', lineWidth:2,  alpha:1.0,  cap:'round',  eraser:false },
  { id:'marker',      label:'Marcador',    icon:'🖊️', lineWidth:6,  alpha:1.0,  cap:'round',  eraser:false },
  { id:'highlighter', label:'Marca-texto', icon:'🖍️', lineWidth:20, alpha:0.32, cap:'square', eraser:false },
  { id:'brush',       label:'Pincel',      icon:'🖌️', lineWidth:12, alpha:0.65, cap:'round',  eraser:false },
  { id:'eraser',      label:'Borracha',    icon:'⬜', lineWidth:24, alpha:1.0,  cap:'round',  eraser:true  },
]

const DRAW_COLORS = ['#1B3A1F','#e53935','#F5C800','#3A8C3F','#FF6B9D','#667EEA','#FF6D00','#00ACC1','#9C27B0','#ffffff']

const HANDLES = [
  { id:'nw', cursor:'nw-resize', top:'0%',   left:'0%'   },
  { id:'n',  cursor:'n-resize',  top:'0%',   left:'50%'  },
  { id:'ne', cursor:'ne-resize', top:'0%',   left:'100%' },
  { id:'e',  cursor:'e-resize',  top:'50%',  left:'100%' },
  { id:'se', cursor:'se-resize', top:'100%', left:'100%' },
  { id:'s',  cursor:'s-resize',  top:'100%', left:'50%'  },
  { id:'sw', cursor:'sw-resize', top:'100%', left:'0%'   },
  { id:'w',  cursor:'w-resize',  top:'50%',  left:'0%'   },
]

const ALLOWED_TYPES = ['image/jpeg','image/png','image/webp','image/gif']
const MAX_SIZE = 5 * 1024 * 1024

// Dimensões lógicas do canvas (proporção A4: 1:√2)
const CANVAS_W = 595
const CANVAS_H = 842

// ─── Component ────────────────────────────────────────
export default function PageCanvas({ page, isOwner, onSave, onDeletePage, userId }) {
  const toast = useToast()

  // elementos
  const [elements,  setElements]  = useState(page.elements || [])
  const [selected,  setSelected]  = useState(null)
  const [pageStyle, setPageStyle] = useState(page.bg_color || 'white')
  const [panel,     setPanel]     = useState('none') // none|stickers|paper|props|draw

  // desenho
  const [drawTool,  setDrawTool]  = useState('pen')
  const [drawColor, setDrawColor] = useState('#1B3A1F')
  const [drawSize,  setDrawSize]  = useState(null)  // null = usa padrão da ferramenta
  const [isDrawing, setIsDrawing] = useState(false)

  const [uploading, setUploading] = useState(false)

  // refs
  const canvasRef  = useRef(null)   // container div
  const svgRef     = useRef(null)   // SVG overlay para desenho
  const fileRef    = useRef(null)
  const dragRef    = useRef(null)
  const elemRef    = useRef(elements)
  const dirty      = useRef(false)
  const drawPath   = useRef(null)   // path SVG atual sendo desenhado
  const drawPoints = useRef([])     // pontos do stroke atual
  const [svgPaths, setSvgPaths] = useState(page.svg_paths || [])
  const svgPathsRef = useRef(svgPaths)

  useEffect(() => { elemRef.current    = elements  }, [elements])
  useEffect(() => { svgPathsRef.current = svgPaths }, [svgPaths])

  // auto-save com moderação de textos
  useEffect(() => {
    if (!dirty.current) return
    const t = setTimeout(async () => {
      // Verifica todos os elementos de texto antes de salvar
      const textElements = elemRef.current.filter(e => e.type === 'text' && e.text?.trim().length > 2)
      for (const el of textElements) {
        const mod = await moderateText(el.text, userId)
        if (mod.blocked) {
          // Remove o elemento ofensivo e avisa
          setElements(prev => prev.filter(e => e.id !== el.id))
          toast(`Texto bloqueado: ${mod.label} detectado ⚠️`, 'error')
          dirty.current = false
          return
        }
      }
      onSave(elemRef.current, pageStyle, svgPathsRef.current)
      dirty.current = false
    }, 1800)
    return () => clearTimeout(t)
  }, [elements, pageStyle, svgPaths])

  const mark = () => { dirty.current = true }

  const upd = useCallback((id, patch) => {
    setElements(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))
    mark()
  }, [])

  const add = (el) => { setElements(p => [...p, el]); setSelected(el.id); mark() }
  const del = () => {
    if (!selected) return
    setElements(p => p.filter(e => e.id !== selected))
    setSelected(null); mark()
  }
  const clearDrawing = () => { setSvgPaths([]); mark() }

  // ── Pointer helpers ──────────────────────────────────
  const getXY = (e) => e.touches
    ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
    : { x: e.clientX, y: e.clientY }

  // ── Drag: move element ───────────────────────────────
  const startMove = (e, id) => {
    if (!isOwner || panel === 'draw') return
    e.stopPropagation()
    const el = elemRef.current.find(el => el.id === id)
    if (!el) return
    const rect = canvasRef.current.getBoundingClientRect()
    const { x, y } = getXY(e)
    // Offset no espaço lógico
    const scaleX = rect.width  / CANVAS_W
    const scaleY = rect.height / CANVAS_H
    dragRef.current = {
      type: 'move', id,
      ox: (x - rect.left) / scaleX - el.x,
      oy: (y - rect.top)  / scaleY - el.y,
    }
    setSelected(id)
    setPanel('none')
  }

  // ── Drag: resize element ─────────────────────────────
  const startResize = (e, id, handle) => {
    if (!isOwner) return
    e.stopPropagation()
    e.preventDefault()
    const el = elemRef.current.find(el => el.id === id)
    if (!el) return
    const rect = canvasRef.current.getBoundingClientRect()
    const { x, y } = getXY(e)

    // Canvas lógico A4: 595 x 842
    const scaleX = rect.width  / CANVAS_W
    const scaleY = rect.height / CANVAS_H

    // Mede altura real do container DOM e converte para espaço lógico
    let measuredH = el.height || 120
    const domEl = canvasRef.current.querySelector(`[data-elid="${id}"]`)
    if (domEl) measuredH = domEl.getBoundingClientRect().height / scaleY

    dragRef.current = {
      type: 'resize', id, handle,
      startX: (x - rect.left) / scaleX,
      startY: (y - rect.top)  / scaleY,
      origEl: { ...el, height: measuredH },
    }
  }

  // ── Pointer move handler ─────────────────────────────
  const onPointerMove = useCallback((e) => {
    if (!dragRef.current || !canvasRef.current) return
    if (e.cancelable) e.preventDefault()

    const rect = canvasRef.current.getBoundingClientRect()
    const { x, y } = e.touches
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY }

    // Converte coordenadas reais → espaço lógico do canvas
    const scaleX = rect.width  / CANVAS_W
    const scaleY = rect.height / CANVAS_H
    const cx = (x - rect.left) / scaleX
    const cy = (y - rect.top)  / scaleY

    // MOVE — limites em coordenadas lógicas
    if (dragRef.current.type === 'move') {
      const { id, ox, oy } = dragRef.current
      upd(id, {
        x: Math.max(0, Math.min(cx - ox, CANVAS_W - 10)),
        y: Math.max(0, Math.min(cy - oy, CANVAS_H - 10)),
      })
      return
    }

    // RESIZE — tudo em coordenadas lógicas
    if (dragRef.current.type === 'resize') {
      const { id, handle, startX, startY, origEl } = dragRef.current
      const dx = cx - startX
      const dy = cy - startY
      const MIN_W = 40, MIN_H = 20

      let ex = origEl.x, ey = origEl.y
      let ew = origEl.width  || 200
      let eh = origEl.height || 120

      if (handle.includes('e')) ew = Math.max(MIN_W, origEl.width + dx)
      if (handle.includes('s')) eh = Math.max(MIN_H, origEl.height + dy)
      if (handle.includes('w')) {
        const nw = Math.max(MIN_W, origEl.width - dx)
        ex = origEl.x + (origEl.width - nw); ew = nw
      }
      if (handle.includes('n')) {
        const nh = Math.max(MIN_H, origEl.height - dy)
        ey = origEl.y + (origEl.height - nh); eh = nh
      }

      // TEXTO → largura muda container, fontSize escala proporcional à largura
      if (origEl.type === 'text') {
        const scaleW = ew / (origEl.width || 200)
        const newSize = Math.max(10, Math.min(120, Math.round((origEl.fontSize || 28) * scaleW)))
        upd(id, { x: ex, y: ey, width: ew, height: eh, fontSize: newSize })
        return
      }

      // STICKER → escala fontSize
      if (origEl.type === 'sticker') {
        const scale = Math.max(ew / (origEl.width || 60), eh / (origEl.height || 60))
        upd(id, {
          x: ex, y: ey, width: ew, height: eh,
          fontSize: Math.max(18, Math.min(160, Math.round((origEl.fontSize || 52) * scale))),
        })
        return
      }

      // FOTO / outros → apenas muda dimensões
      upd(id, { x: ex, y: ey, width: ew, height: eh })
    }
  }, [upd])

  const onPointerUp = useCallback(() => { dragRef.current = null }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onPointerMove)
    window.addEventListener('mouseup',   onPointerUp)
    window.addEventListener('touchmove', onPointerMove, { passive: false })
    window.addEventListener('touchend',  onPointerUp)
    return () => {
      window.removeEventListener('mousemove', onPointerMove)
      window.removeEventListener('mouseup',   onPointerUp)
      window.removeEventListener('touchmove', onPointerMove)
      window.removeEventListener('touchend',  onPointerUp)
    }
  }, [onPointerMove, onPointerUp])

  // ── Rotate (fotos) ───────────────────────────────────
  const startRotate = (e, el) => {
    e.stopPropagation()
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = rect.width  / CANVAS_W
    const scaleY = rect.height / CANVAS_H
    // Centro em pixels reais na tela
    const cx = rect.left + el.x * scaleX + (el.width  || 200) * scaleX / 2
    const cy = rect.top  + el.y * scaleY + (el.height || 180) * scaleY / 2
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI
    const startRot   = el.rotation || 0
    const onRot = (ev) => {
      const a = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI
      upd(el.id, { rotation: Math.round(startRot + (a - startAngle)) })
    }
    const onRotEnd = () => {
      window.removeEventListener('mousemove', onRot)
      window.removeEventListener('mouseup',   onRotEnd)
    }
    window.addEventListener('mousemove', onRot)
    window.addEventListener('mouseup',   onRotEnd)
  }

  // ── Drawing ──────────────────────────────────────────
  const toolDef = DRAW_TOOLS.find(t => t.id === drawTool) || DRAW_TOOLS[0]
  // aplica tamanho customizado mantendo os demais atributos da ferramenta
  const tool = { ...toolDef, lineWidth: drawSize !== null ? drawSize : toolDef.lineWidth }

  const getCanvasXY = (e) => {
    const rect = svgRef.current.getBoundingClientRect()
    const src  = e.touches ? e.touches[0] : e
    return {
      x: ((src.clientX - rect.left) / rect.width  * CANVAS_W).toFixed(2),
      y: ((src.clientY - rect.top)  / rect.height * CANVAS_H).toFixed(2),
    }
  }

  const onDrawStart = (e) => {
    if (!isOwner || panel !== 'draw') return
    e.preventDefault()
    e.stopPropagation()
    const { x, y } = getCanvasXY(e)
    drawPoints.current = [`${x},${y}`]
    setIsDrawing(true)
  }

  const onDrawMove = (e) => {
    if (!isDrawing || panel !== 'draw') return
    e.preventDefault()
    const { x, y } = getCanvasXY(e)
    drawPoints.current.push(`${x},${y}`)
    // atualiza o path "live" via DOM diretamente para performance
    if (drawPath.current && drawPoints.current.length > 1) {
      drawPath.current.setAttribute('points', drawPoints.current.join(' '))
    }
  }

  const onDrawEnd = (e) => {
    if (!isDrawing) return
    setIsDrawing(false)
    if (drawPoints.current.length < 2) return

    const pts = [...drawPoints.current]
    drawPoints.current = []

    const newPath = {
      id:        uuidv4(),
      points:    pts.join(' '),
      color:     tool.eraser ? '__eraser__' : drawColor,
      lineWidth: tool.lineWidth,
      alpha:     tool.alpha,
      cap:       tool.cap,
      eraser:    tool.eraser,
    }
    setSvgPaths(prev => { mark(); return [...prev, newPath] })
  }

  // ── Add elements ─────────────────────────────────────
  const addText = () => add({
    id: uuidv4(), type: 'text',
    x: 60, y: 60,
    text: 'Escreva aqui 💕',
    font: 'Caveat', fontSize: 28, color: '#1B3A1F',
    width: 200, height: 80,
  })

  const addSticker = (emoji) => {
    add({ id: uuidv4(), type: 'sticker', x: 80 + Math.random()*160, y: 60 + Math.random()*160, emoji, fontSize: 52, width: 60, height: 60 })
    setPanel('none')
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) { toast('Use JPG, PNG, WEBP ou GIF.','error'); e.target.value=''; return }
    if (file.size > MAX_SIZE)               { toast('Máximo 5MB.','error');                e.target.value=''; return }
    setUploading(true); toast('Enviando foto... 📸')
    const { url, error } = await uploadPhoto(file, userId)
    setUploading(false)
    if (error?.message === 'BANNED') {
      toast('Sua conta foi bloqueada por violações. 🚫', 'error'); e.target.value=''; return
    }
    if (error?.message?.startsWith('MODERATION:')) {
      const label = error.message.replace('MODERATION:', '')
      toast(`Imagem bloqueada: ${label} detectado. ⚠️`, 'error'); e.target.value=''; return
    }
    if (error || !url) { toast('Erro ao enviar 😢','error'); e.target.value=''; return }
    add({ id: uuidv4(), type: 'photo', x: 40, y: 40, url, width: 220, height: 180, radius: 8, rotation: 0 })
    toast('Foto adicionada! 📷','success')
    e.target.value = ''
  }

  // ── Computed ─────────────────────────────────────────
  const selEl = elements.find(e => e.id === selected)
  const styleObj = PAGE_STYLES.find(p => p.id === pageStyle) || PAGE_STYLES[0]
  const canvasBg = styleObj.type === 'pattern'
    ? { background: styleObj.bg, backgroundImage: styleObj.pattern, backgroundSize: styleObj.patternSize }
    : { background: styleObj.bg }

  const isDrawMode = panel === 'draw'

  const toolBtn = (active, danger) => ({
    width: 38, height: 38, flexShrink: 0,
    border: `2px solid ${danger ? 'rgba(229,57,53,0.35)' : active ? 'var(--green)' : 'var(--dark-faint)'}`,
    borderRadius: 10,
    background: danger ? 'rgba(229,57,53,0.07)' : active ? 'var(--green-light)' : 'white',
    fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)',
    color: danger ? 'var(--red)' : 'var(--dark)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  })

  // ── Render ────────────────────────────────────────────
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, width:'100%' }}>

      {/* ── Toolbar ── */}
      {isOwner && (
        <div style={{ background:'white', borderRadius:18, padding:'8px 14px', display:'flex', alignItems:'center', gap:8, boxShadow:'var(--shadow-md)', flexWrap:'wrap', justifyContent:'center', width:'100%', maxWidth:595 }}>

          {/* Adicionar */}
          <div style={{ display:'flex', gap:5 }}>
            <button style={toolBtn(false)} onClick={addText} title="Texto">T</button>
            <button style={toolBtn(panel==='stickers')} onClick={() => setPanel(p => p==='stickers'?'none':'stickers')} title="Adesivos">🌸</button>
            <button style={toolBtn(false)} onClick={() => fileRef.current?.click()} disabled={uploading} title="Foto">
              {uploading ? <span className="loader loader-sm" style={{margin:0}}/> : '📷'}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{display:'none'}} onChange={handleUpload}/>
          </div>

          <div style={{width:1,height:28,background:'var(--dark-faint)',flexShrink:0}}/>

          {/* Papel */}
          <button style={toolBtn(panel==='paper')} onClick={() => setPanel(p => p==='paper'?'none':'paper')} title="Papel">🎨</button>

          {/* Desenho */}
          <button style={toolBtn(panel==='draw')} onClick={() => { setPanel(p => p==='draw'?'none':'draw'); setSelected(null) }} title="Desenhar">🖊️</button>

          <div style={{width:1,height:28,background:'var(--dark-faint)',flexShrink:0}}/>

          {/* Seleção */}
          <div style={{ display:'flex', gap:5 }}>
            {selected && !isDrawMode && (<>
              <button style={toolBtn(panel==='props')} onClick={() => setPanel(p => p==='props'?'none':'props')} title="Propriedades">⚙️</button>
              <button style={toolBtn(false,true)} onClick={del} title="Deletar">🗑️</button>
            </>)}
            {onDeletePage && <button style={toolBtn(false,true)} onClick={onDeletePage} title="Deletar página">📄❌</button>}
            <button style={toolBtn(false)} onClick={async () => {
              const textEls = elements.filter(e => e.type === 'text' && e.text?.trim().length > 2)
              for (const el of textEls) {
                const mod = await moderateText(el.text, userId)
                if (mod.blocked) {
                  setElements(prev => prev.filter(e => e.id !== el.id))
                  toast(`Texto bloqueado: ${mod.label} ⚠️`, 'error')
                  return
                }
              }
              onSave(elements, pageStyle, svgPaths)
              toast('Salvo! ✅','success')
            }} title="Salvar">💾</button>
          </div>
        </div>
      )}

      {/* ── Draw Toolbar ── */}
      {panel === 'draw' && isOwner && (
        <div style={{ background:'white', borderRadius:16, padding:'12px 16px', boxShadow:'var(--shadow)', width:'100%', maxWidth:595, animation:'slideDown 0.2s ease' }}>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
            {/* Ferramentas */}
            <div style={{ display:'flex', gap:5 }}>
              {DRAW_TOOLS.map(t => (
                <button key={t.id} onClick={() => { setDrawTool(t.id); setDrawSize(null) }} title={t.label}
                  style={{ ...toolBtn(drawTool===t.id), width:42, height:42, fontSize:18, flexDirection:'column', gap:2 }}>
                  <span>{t.icon}</span>
                  <span style={{fontSize:8,fontWeight:800,color:drawTool===t.id?'var(--green)':'var(--dark-muted)'}}>{t.label}</span>
                </button>
              ))}
            </div>

            <div style={{width:1,height:36,background:'var(--dark-faint)',flexShrink:0}}/>

            {/* Tamanho da ponta */}
            <div style={{ display:'flex', flexDirection:'column', gap:4, minWidth:110 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <label style={{ fontSize:10, fontWeight:800, color:'var(--dark-muted)' }}>Ponta</label>
                <span style={{ fontSize:11, fontWeight:800, color:'var(--green)' }}>{tool.lineWidth}px</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                {/* preview do traço */}
                <svg width={36} height={36} style={{ flexShrink:0, border:'1.5px solid var(--dark-faint)', borderRadius:8, background:'#fafafa' }}>
                  <line x1={4} y1={18} x2={32} y2={18}
                    stroke={toolDef.eraser ? '#ccc' : drawColor}
                    strokeWidth={Math.min(tool.lineWidth, 28)}
                    strokeLinecap={toolDef.cap}
                    opacity={toolDef.alpha}/>
                </svg>
                <input type="range"
                  min={toolDef.eraser ? 4 : 1}
                  max={toolDef.eraser ? 60 : 40}
                  step={1}
                  value={tool.lineWidth}
                  onChange={e => setDrawSize(+e.target.value)}
                  style={{ flex:1, accentColor:'var(--green)', cursor:'pointer' }}/>
              </div>
            </div>

            <div style={{width:1,height:36,background:'var(--dark-faint)',flexShrink:0}}/>

            {/* Cores — oculta para borracha */}
            {!toolDef.eraser && (
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                {DRAW_COLORS.map(c => (
                  <button key={c} onClick={() => setDrawColor(c)}
                    style={{ width:24, height:24, borderRadius:'50%', background:c, border:`3px solid ${drawColor===c?'#6B4DE6':'rgba(27,58,31,0.15)'}`, cursor:'pointer', transform:drawColor===c?'scale(1.25)':'scale(1)', transition:'transform 0.1s', boxShadow:c==='#ffffff'?'inset 0 0 0 1px rgba(0,0,0,0.15)':'' }}/>
                ))}
                <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)}
                  style={{ width:24, height:24, borderRadius:'50%', border:'2px solid var(--dark-faint)', cursor:'pointer', padding:0, overflow:'hidden' }} title="Cor personalizada"/>
              </div>
            )}

            <div style={{width:1,height:36,background:'var(--dark-faint)',flexShrink:0}}/>

            <button className="btn btn-sm btn-danger" onClick={clearDrawing} title="Apagar tudo">🗑️ Limpar</button>
          </div>
          <p style={{ fontSize:11, color:'var(--dark-muted)', marginTop:8, fontFamily:'var(--font-cute)' }}>
            💡 Clique e arraste para desenhar • <strong>{toolDef.label}</strong> — ponta: <strong>{tool.lineWidth}px</strong>
          </p>
        </div>
      )}

      {/* ── Sticker Panel ── */}
      {panel === 'stickers' && isOwner && (
        <div style={{ background:'white', borderRadius:16, padding:14, boxShadow:'var(--shadow)', width:'100%', maxWidth:595, animation:'slideDown 0.2s ease' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(38px,1fr))', gap:4 }}>
            {STICKERS.map(s => (
              <button key={s} onClick={() => addSticker(s)}
                style={{ fontSize:24, background:'none', border:'2px solid transparent', borderRadius:8, cursor:'pointer', padding:4, lineHeight:1, transition:'all 0.12s' }}
                onMouseOver={e => { e.currentTarget.style.background='var(--green-light)'; e.currentTarget.style.transform='scale(1.2)' }}
                onMouseOut={e  => { e.currentTarget.style.background='none';                e.currentTarget.style.transform='' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Paper Panel ── */}
      {panel === 'paper' && isOwner && (
        <div style={{ background:'white', borderRadius:16, padding:16, boxShadow:'var(--shadow)', width:'100%', maxWidth:595, animation:'slideDown 0.2s ease' }}>
          <p className="section-label" style={{ marginBottom:12 }}>Estilo do Papel 📄</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(70px,1fr))', gap:8 }}>
            {PAGE_STYLES.map(s => {
              const sel = pageStyle === s.id
              const preview = s.type==='pattern' ? { background:s.bg, backgroundImage:s.pattern, backgroundSize:s.patternSize } : { background:s.bg }
              return (
                <button key={s.id} onClick={() => { setPageStyle(s.id); mark() }}
                  style={{ border:`2.5px solid ${sel?'var(--green)':'transparent'}`, borderRadius:10, padding:0, cursor:'pointer', overflow:'hidden', boxShadow:sel?'0 0 0 3px rgba(58,140,63,0.2)':'var(--shadow)', transition:'all 0.15s', outline:'none' }}>
                  <div style={{ ...preview, height:40, width:'100%' }}/>
                  <div style={{ padding:'4px', background:'white', fontSize:9, fontWeight:700, color:sel?'var(--green)':'var(--dark-muted)', textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
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
        <div style={{ background:'white', borderRadius:16, padding:'14px 18px', boxShadow:'var(--shadow)', width:'100%', maxWidth:595, display:'flex', gap:18, flexWrap:'wrap', alignItems:'flex-start', animation:'slideDown 0.2s ease' }}>
          {selEl.type === 'text' && (<>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--dark-muted)', display:'block', marginBottom:5 }}>Texto</label>
              <textarea value={selEl.text} onChange={e => upd(selected,{text:e.target.value})}
                style={{ border:'2px solid var(--dark-faint)', borderRadius:8, padding:'7px 10px', fontSize:13, fontFamily:'var(--font-body)', width:170, height:60, resize:'none', outline:'none', color:'var(--dark)' }}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--dark-muted)', display:'block', marginBottom:5 }}>Fonte</label>
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                {FONTS.map(f => (
                  <button key={f.name} onClick={() => upd(selected,{font:f.name})}
                    style={{ padding:'5px 10px', border:`2px solid ${selEl.font===f.name?'var(--green)':'var(--dark-faint)'}`, borderRadius:8, background:selEl.font===f.name?'var(--green-light)':'white', cursor:'pointer', fontFamily:f.name, fontSize:12, color:'var(--dark)' }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--dark-muted)', display:'block', marginBottom:5 }}>Tamanho: {selEl.fontSize}px</label>
              <input type="range" min={10} max={120} value={selEl.fontSize} onChange={e => upd(selected,{fontSize:+e.target.value})} style={{ width:110, accentColor:'var(--green)' }}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--dark-muted)', display:'block', marginBottom:5 }}>Cor</label>
              <input type="color" value={selEl.color} onChange={e => upd(selected,{color:e.target.value})} style={{ width:38, height:38, borderRadius:8, border:'2px solid var(--dark-faint)', cursor:'pointer', padding:2 }}/>
            </div>
          </>)}
          {selEl.type === 'photo' && (
            <div style={{ display:'flex', gap:18, flexWrap:'wrap' }}>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--dark-muted)', display:'block', marginBottom:5 }}>Borda: {selEl.radius||0}px</label>
                <input type="range" min={0} max={100} value={selEl.radius||0} onChange={e => upd(selected,{radius:+e.target.value})} style={{ width:120, accentColor:'var(--green)' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--dark-muted)', display:'block', marginBottom:5 }}>Rotação: {selEl.rotation||0}°</label>
                <input type="range" min={-45} max={45} value={selEl.rotation||0} onChange={e => upd(selected,{rotation:+e.target.value})} style={{ width:120, accentColor:'var(--green)' }}/>
              </div>
            </div>
          )}
          {selEl.type === 'sticker' && (
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--dark-muted)', display:'block', marginBottom:5 }}>Tamanho: {selEl.fontSize}px</label>
              <input type="range" min={20} max={140} value={selEl.fontSize} onChange={e => upd(selected,{fontSize:+e.target.value})} style={{ width:140, accentColor:'var(--green)' }}/>
            </div>
          )}
        </div>
      )}

      {/* ── Canvas ── */}
      <div
        ref={canvasRef}
        style={{ width:'min(595px,100%)', aspectRatio:`${CANVAS_W}/${CANVAS_H}`, borderRadius:12, ...canvasBg, position:'relative', overflow:'hidden', boxShadow:'0 10px 48px rgba(27,58,31,0.16)', touchAction:'none', flexShrink:0, cursor: isDrawMode ? 'crosshair' : 'default' }}
        onClick={() => { if (!isDrawMode) { setSelected(null); setPanel('none') } }}
      >
        {/* Elementos */}
        {elements.map(el => {
          const isSel = selected === el.id
          const w = el.width  || (el.type==='sticker' ? 60  : 200)
          const h = el.height || (el.type==='photo'   ? 180 : el.type==='sticker' ? 60 : 80)

          return (
            <div key={el.id} data-elid={el.id}
              style={{ position:'absolute', left:el.x, top:el.y, width:w, height:h, cursor: isDrawMode ? 'crosshair' : (isOwner?'grab':'default'), userSelect:'none', zIndex:isSel?20:1, overflow: el.type==='text' ? 'visible' : 'hidden' }}
              onMouseDown={e => startMove(e, el.id)}
              onTouchStart={e => startMove(e, el.id)}
              onClick={e => { e.stopPropagation(); if (isOwner && !isDrawMode) setSelected(el.id) }}>

              {el.type === 'text' && (
                <div style={{ fontFamily:el.font||'Caveat', fontSize:el.fontSize||28, color:el.color||'#1B3A1F', width:w, wordBreak:'break-word', whiteSpace:'pre-wrap', lineHeight:1.45, minHeight:30 }}>
                  {el.text}
                </div>
              )}
              {el.type === 'sticker' && (
                <div style={{ fontSize:el.fontSize||52, lineHeight:1, width:w, height:h, display:'flex', alignItems:'center', justifyContent:'center' }}>{el.emoji}</div>
              )}
              {el.type === 'photo' && (
                <img src={el.url} alt="" draggable={false}
                  style={{ width:w, height:h, borderRadius:el.radius||8, objectFit:'cover', transform:`rotate(${el.rotation||0}deg)`, display:'block', pointerEvents:'none' }}/>
              )}

              {/* Handles */}
              {isSel && isOwner && !isDrawMode && (<>
                <div style={{ position:'absolute', inset:-4, border:'2px solid #6B4DE6', borderRadius:4, pointerEvents:'none', zIndex:10 }}/>
                {HANDLES.map(h => (
                  <div key={h.id}
                    onMouseDown={e => startResize(e, el.id, h.id)}
                    onTouchStart={e => startResize(e, el.id, h.id)}
                    style={{ position:'absolute', top:h.top, left:h.left, transform:'translate(-50%,-50%)', width:12, height:12, background:'white', border:'2px solid #6B4DE6', borderRadius:2, cursor:h.cursor, zIndex:30 }}/>
                ))}
                {el.type === 'photo' && (
                  <div onMouseDown={e => startRotate(e, el)}
                    style={{ position:'absolute', left:'50%', bottom:-30, transform:'translateX(-50%)', width:22, height:22, background:'white', border:'2px solid #6B4DE6', borderRadius:'50%', cursor:'grab', zIndex:30, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, userSelect:'none' }}>↻</div>
                )}
              </>)}
            </div>
          )
        })}

        {/* ── SVG Overlay para desenho ── */}
        {/* isolation:isolate + destination-out = borracha apaga pixels reais sem cobrir o fundo */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents: isDrawMode ? 'all' : 'none', zIndex:50, isolation:'isolate' }}
          onMouseDown={onDrawStart}
          onMouseMove={onDrawMove}
          onMouseUp={onDrawEnd}
          onTouchStart={onDrawStart}
          onTouchMove={onDrawMove}
          onTouchEnd={onDrawEnd}
        >
          {/* Traços normais */}
          <g>
            {svgPaths.filter(p => !p.eraser).map(p => (
              <polyline
                key={p.id}
                points={p.points}
                fill="none"
                stroke={p.color}
                strokeWidth={p.lineWidth}
                strokeLinecap={p.cap}
                strokeLinejoin="round"
                opacity={p.alpha}
              />
            ))}
          </g>
          {/* Borrachas — destination-out apaga os pixels do SVG sem afetar o fundo */}
          <g style={{ mixBlendMode:'destination-out' }}>
            {svgPaths.filter(p => p.eraser).map(p => (
              <polyline
                key={p.id}
                points={p.points}
                fill="none"
                stroke="rgba(0,0,0,1)"
                strokeWidth={p.lineWidth}
                strokeLinecap={p.cap}
                strokeLinejoin="round"
                opacity={1}
              />
            ))}
          </g>
          {/* Path ao vivo durante o desenho */}
          {isDrawing && (
            <polyline
              ref={drawPath}
              points=""
              fill="none"
              stroke={tool.eraser ? 'rgba(0,0,0,1)' : drawColor}
              strokeWidth={tool.lineWidth}
              strokeLinecap={tool.cap}
              strokeLinejoin="round"
              opacity={tool.eraser ? 1 : tool.alpha}
              style={tool.eraser ? { mixBlendMode:'destination-out' } : {}}
            />
          )}
        </svg>

        {/* Placeholder */}
        {elements.length === 0 && svgPaths.length === 0 && isOwner && (
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', color:'rgba(27,58,31,0.2)', pointerEvents:'none' }}>
            <div style={{ fontSize:40 }}>📝</div>
            <p style={{ fontFamily:'var(--font-cute)', fontSize:13, marginTop:10, lineHeight:1.5 }}>Use as ferramentas acima<br/>para criar sua página!</p>
          </div>
        )}
      </div>
    </div>
  )
}
