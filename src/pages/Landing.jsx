import { Link } from 'react-router-dom'

const floaters = ['🌸','⭐','🦋','🍓','🌈','💖','🌙','🍦','🎀','✨','🌺','🍭','💛','🐱']

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #eaf5ea 0%, #f7faf0 50%, #fffde7 100%)', position: 'relative', overflow: 'hidden' }}>
      {floaters.map((s, i) => (
        <span key={i} style={{
          position: 'fixed', fontSize: `${1.1 + (i % 3) * 0.45}rem`, opacity: 0.22,
          left: `${(i * 7.3 + 3) % 94}%`, top: `${(i * 11 + 8) % 88}%`,
          animation: `float ${3.5 + i % 2}s ease-in-out infinite`,
          animationDelay: `${i * 0.28}s`, pointerEvents: 'none', zIndex: 0, display: 'inline-block'
        }}>{s}</span>
      ))}

      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 32px', position: 'relative', zIndex: 10 }}>
        <span style={{ fontFamily: 'var(--font-title)', fontSize: 20, color: 'var(--green)' }}>🍍 Pineapple Moments</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/auth" className="btn btn-ghost" style={{ fontSize: 13, padding: '8px 18px' }}>Entrar</Link>
          <Link to="/auth" className="btn btn-primary" style={{ fontSize: 13, padding: '8px 20px' }}>Começar grátis ✨</Link>
        </div>
      </nav>

      <main style={{ maxWidth: 740, margin: '0 auto', padding: '44px 24px 80px', textAlign: 'center', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'inline-block', background: 'linear-gradient(135deg,var(--yellow),#8bc34a)', color: 'var(--dark)', fontWeight: 800, fontSize: 12, padding: '6px 20px', borderRadius: 50, marginBottom: 28, boxShadow: '0 4px 16px rgba(245,200,0,0.35)', letterSpacing: 0.5 }}>
          🎀 Álbuns colaborativos e fofos
        </div>

        <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(36px,8vw,72px)', lineHeight: 1.12, color: 'var(--dark)', marginBottom: 18 }}>
          Seus momentos<br />
          <span style={{ color: 'var(--green)' }}>mais fofos</span><br />
          em um álbum ✨
        </h1>

        <p style={{ fontSize: 18, color: 'var(--dark-muted)', lineHeight: 1.65, marginBottom: 40, fontFamily: 'var(--font-cute)', maxWidth: 520, margin: '0 auto 40px' }}>
          Crie álbuns lindos, personalize cada página, adicione fotos,
          adesivos e textos — e compartilhe com quem você ama 💕
        </p>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 64 }}>
          <Link to="/auth" className="btn btn-primary" style={{ fontSize: 17, padding: '15px 36px' }}>Criar meu álbum 🍍</Link>
          <Link to="/auth" className="btn btn-ghost" style={{ fontSize: 15 }}>Já tenho conta →</Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 20, maxWidth: 700, margin: '0 auto' }}>
          {[
            { icon: '🎨', title: 'Personalizável', desc: 'Cores, fontes, stickers e layouts à sua escolha', color: 'var(--yellow)' },
            { icon: '📸', title: 'Fotos & Memórias', desc: 'Adicione fotos, textos e adesivos fofos', color: 'var(--green)' },
            { icon: '💌', title: 'Cartinhas', desc: 'Envie mensagens especiais com foto para amigos', color: 'var(--pink)' },
            { icon: '🤝', title: 'Colabore', desc: 'Edite junto com seus amigos em tempo real', color: '#667EEA' },
          ].map((f, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 'var(--radius)', padding: '26px 20px', boxShadow: 'var(--shadow)', borderTop: `4px solid ${f.color}`, animation: 'fadeIn 0.5s ease forwards', animationDelay: `${i * 0.1}s`, opacity: 0 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--dark-muted)', lineHeight: 1.55, fontFamily: 'var(--font-cute)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '20px 24px', color: 'var(--dark-muted)', fontSize: 12, position: 'relative', zIndex: 10, borderTop: '2px solid var(--dark-faint)' }}>
        Feito com 💛 • Pineapple Moments • Ambiente seguro e fofo para todos 🌸
      </footer>
    </div>
  )
}
