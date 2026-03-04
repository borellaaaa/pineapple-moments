import { Link } from 'react-router-dom'
import styles from './Landing.module.css'

const stickers = ['🌸','⭐','🦋','🍓','🌈','💖','🌙','🍦','🎀','✨','🌺','🍭']

export default function Landing() {
  return (
    <div className={styles.page}>
      {/* Floating stickers */}
      {stickers.map((s, i) => (
        <span key={i} className={styles.floatSticker} style={{
          left: `${(i * 8.5) % 95}%`,
          top: `${(i * 13 + 5) % 85}%`,
          animationDelay: `${i * 0.4}s`,
          fontSize: `${1.2 + (i % 3) * 0.4}rem`
        }}>{s}</span>
      ))}

      <nav className={styles.nav}>
        <div className={styles.logo}>🍍 Pineapple Moments</div>
        <Link to="/auth" className="btn btn-primary">Entrar ✨</Link>
      </nav>

      <main className={styles.hero}>
        <div className={styles.badge}>🎀 Novo! Álbuns colaborativos</div>
        <h1 className={styles.title}>
          Seus momentos<br/>
          <span className={styles.highlight}>mais fofos</span><br/>
          em um álbum
        </h1>
        <p className={styles.subtitle}>
          Crie álbuns lindos, personalize cada página, adicione fotos, 
          adesivos e textos — e compartilhe com quem você ama 💕
        </p>
        <div className={styles.ctas}>
          <Link to="/auth" className="btn btn-primary" style={{fontSize:'18px',padding:'16px 36px'}}>
            Criar meu álbum 🍍
          </Link>
          <Link to="/auth" className="btn btn-ghost">
            Já tenho conta →
          </Link>
        </div>

        <div className={styles.features}>
          {[
            { icon:'🎨', title:'Totalmente personalizável', desc:'Escolha cores, fontes e layout de cada página' },
            { icon:'📸', title:'Fotos & Memórias', desc:'Adicione fotos, textos com fontes fofas e adesivos' },
            { icon:'💌', title:'Compartilhe com amor', desc:'Envie para amigos editarem junto ou só visualizarem' },
          ].map((f, i) => (
            <div key={i} className={styles.featureCard} style={{animationDelay:`${i*0.15}s`}}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className={styles.footer}>
        <p>Feito com 💖 • Pineapple Moments</p>
      </footer>
    </div>
  )
}
