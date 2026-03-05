export default function AlbumCover({ album, size = 160 }) {
  const emoji = album.cover_emoji || '🍍'
  const c1 = album.cover_color || '#F5C800'
  const c2 = album.cover_accent || '#3A8C3F'

  return (
    <div style={{ width: size, height: size * 0.75, borderRadius: 12, background: `linear-gradient(135deg,${c1},${c2})`, position:'relative', overflow:'hidden', flexShrink:0 }}>
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:10, background:'rgba(0,0,0,0.15)' }} />
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', paddingLeft:10 }}>
        <span style={{ fontSize: size * 0.22, lineHeight:1, filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}>{emoji}</span>
        {size > 100 && album.name && (
          <p style={{ color:'white', fontFamily:'var(--font-title)', fontSize: size * 0.07, textAlign:'center', textShadow:'0 1px 4px rgba(0,0,0,0.2)', marginTop:6, padding:'0 8px', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
            {album.name}
          </p>
        )}
      </div>
      <span style={{ position:'absolute', top:6, right:8, fontSize: size * 0.12, opacity:0.6 }}>✨</span>
      <span style={{ position:'absolute', bottom:6, left:14, fontSize: size * 0.1, opacity:0.5 }}>🌸</span>
    </div>
  )
}
