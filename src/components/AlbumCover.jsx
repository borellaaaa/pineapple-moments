export default function AlbumCover({ album, size }) {
  const c1 = album.cover_color || '#F5C800'
  const c2 = album.cover_accent || '#3A8C3F'
  const emoji = album.cover_emoji || '🍍'

  const isNum = typeof size === 'number'
  const styles = isNum
    ? { width: size, height: size, minHeight: size }
    : { width: '100%', paddingBottom: '100%', position: 'relative' }

  return (
    <div style={{
      ...styles,
      background: `linear-gradient(145deg, ${c1}, ${c2})`,
      borderRadius: isNum ? 'var(--radius-sm)' : 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0, position: 'relative'
    }}>
      {!isNum && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: Math.max(28, 40), filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.18))', display: 'inline-block', animation: 'none' }}>{emoji}</span>
      </div>}
      {isNum && <span style={{ fontSize: Math.max(24, size * 0.36), filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.18))' }}>{emoji}</span>}
    </div>
  )
}
