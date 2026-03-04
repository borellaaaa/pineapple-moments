import styles from './AlbumCover.module.css'

export default function AlbumCover({ album, small = false }) {
  const size = small ? styles.small : styles.full
  const emoji = album.cover_emoji || '🍍'

  return (
    <div
      className={`${styles.cover} ${size}`}
      style={{
        background: `linear-gradient(135deg, ${album.cover_color || '#F5C800'}, ${album.cover_accent || '#3A8C3F'})`,
      }}
    >
      <div className={styles.inner}>
        <div className={styles.spine} style={{ background: album.cover_accent || '#3A8C3F' }} />
        <div className={styles.front}>
          <div className={styles.decoration}>
            <span className={styles.topLeft}>🌸</span>
            <span className={styles.topRight}>⭐</span>
            <span className={styles.bottomLeft}>🦋</span>
            <span className={styles.bottomRight}>💖</span>
          </div>
          <div className={styles.centerBox}>
            <span className={styles.pineapple}>{emoji}</span>
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
