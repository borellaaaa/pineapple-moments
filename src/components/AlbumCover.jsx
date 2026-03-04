import styles from './AlbumCover.module.css'

const PATTERNS = [
  'none',
  'dots',
  'stripes',
  'hearts',
  'stars',
]

export default function AlbumCover({ album, small = false }) {
  const size = small ? styles.small : styles.full

  return (
    <div
      className={`${styles.cover} ${size}`}
      style={{
        background: `linear-gradient(135deg, ${album.cover_color || '#FFD93D'}, ${album.cover_accent || '#FF6B9D'})`,
      }}
    >
      <div className={styles.inner}>
        <div className={styles.spine} style={{ background: album.cover_accent || '#FF6B9D' }} />
        <div className={styles.front}>
          <div className={styles.decoration}>
            <span className={styles.topLeft}>🌸</span>
            <span className={styles.topRight}>⭐</span>
            <span className={styles.bottomLeft}>🦋</span>
            <span className={styles.bottomRight}>💖</span>
          </div>
          <div className={styles.centerBox}>
            <span className={styles.pineapple}>🍍</span>
            {!small && (
              <p className={styles.coverTitle} style={{ fontFamily: 'var(--font-title)' }}>
                {album.name}
              </p>
            )}
          </div>
          <div className={styles.lines}>
            <div className={styles.line} style={{ background: 'rgba(255,255,255,0.3)' }} />
            <div className={styles.line} style={{ background: 'rgba(255,255,255,0.2)', width: '70%' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
