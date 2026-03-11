import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'

const FEATURES = [
  { icon: '📸', title: 'Fotos & memórias',  desc: 'Adicione fotos, redimensione e personalize cada momento',     color: '#3A8C3F', bg: '#E8F5E9' },
  { icon: '✏️', title: 'Desenho livre',      desc: 'Caneta, marca-texto, pincel — desenhe direto na página',      color: '#667EEA', bg: '#EEF2FF' },
  { icon: '🌸', title: 'Stickers fofos',    desc: 'Centenas de adesivos para deixar tudo mais cute',              color: '#FF6B9D', bg: '#FFF0F7' },
  { icon: '💌', title: 'Cartinhas',          desc: 'Mande mensagens especiais para amigos pelo @username',        color: '#F5A623', bg: '#FFF8E7' },
  { icon: '🤝', title: 'Colaboração',        desc: 'Edite junto com seus amigos em tempo real',                   color: '#00ACC1', bg: '#E0F7FA' },
  { icon: '🎨', title: 'Estilos de papel',   desc: '22 fundos — sólidos, gradientes e padrões decorativos',      color: '#9C27B0', bg: '#F3E5F5' },
]

const PREVIEWS = [
  { emoji: '🌸', text: 'Nossa viagem', bg: '#FCE4EC', rotate: -3 },
  { emoji: '⭐', text: 'Melhores fotos', bg: '#FFF8E7', rotate: 1.5 },
  { emoji: '💖', text: 'Para sempre', bg: '#F3E5F5', rotate: -1.5 },
]

export default function Landing() {
  const heroRef = useRef(null)

  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const onMove = (e) => {
      const rect = el.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 18
      const y = ((e.clientY - rect.top)  / rect.height - 0.5) * 12
      el.style.setProperty('--px', `${x}px`)
      el.style.setProperty('--py', `${y}px`)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#FAFDF6', fontFamily: 'Nunito, sans-serif', overflowX: 'hidden' }}>

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 clamp(16px,5vw,48px)', height: 60,
        background: 'rgba(250,253,246,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1.5px solid rgba(58,140,63,0.1)',
      }}>
        <span style={{ fontFamily: 'Pacifico, cursive', fontSize: 19, color: '#2E7D32' }}>🍍 Pineapple</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link to="/auth" style={{ fontSize: 13, fontWeight: 700, color: '#555', textDecoration: 'none', padding: '8px 12px' }}>Entrar</Link>
          <Link to="/auth" style={{
            fontSize: 13, fontWeight: 800, color: 'white', textDecoration: 'none',
            background: 'linear-gradient(135deg,#3A8C3F,#66BB6A)',
            padding: '9px 18px', borderRadius: 50,
            boxShadow: '0 4px 14px rgba(58,140,63,0.35)',
          }}>Começar grátis ✨</Link>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} style={{
        position: 'relative', overflow: 'hidden',
        padding: 'clamp(48px,8vw,100px) clamp(16px,5vw,48px) clamp(60px,10vw,120px)',
        textAlign: 'center',
        '--px': '0px', '--py': '0px',
      }}>
        {/* blobs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60vw', height: '60vw', maxWidth: 500, maxHeight: 500, borderRadius: '60% 40% 70% 30%', background: 'radial-gradient(circle,rgba(162,216,162,0.45),transparent 70%)', transform: 'translate(var(--px),var(--py))', transition: 'transform 0.8s ease' }}/>
          <div style={{ position: 'absolute', top: '10%', right: '-15%', width: '50vw', height: '50vw', maxWidth: 420, maxHeight: 420, borderRadius: '40% 60% 30% 70%', background: 'radial-gradient(circle,rgba(255,200,120,0.35),transparent 70%)', transform: 'translate(calc(var(--px)*-0.6),calc(var(--py)*0.4))', transition: 'transform 0.8s ease' }}/>
          <div style={{ position: 'absolute', bottom: 0, left: '30%', width: '40vw', height: '40vw', maxWidth: 360, maxHeight: 360, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,160,190,0.3),transparent 70%)', transform: 'translate(calc(var(--px)*0.4),calc(var(--py)*-0.6))', transition: 'transform 0.8s ease' }}/>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'white', border: '2px solid rgba(58,140,63,0.2)', borderRadius: 50, padding: '6px 16px', marginBottom: 28, fontSize: 12, fontWeight: 800, color: '#2E7D32', boxShadow: '0 2px 12px rgba(58,140,63,0.12)', animation: 'fadeInUp 0.5s ease', position: 'relative', zIndex: 2 }}>
          <span style={{ fontSize: 16 }}>🎀</span> Álbuns colaborativos e fofos
        </div>

        <h1 style={{ fontFamily: 'Pacifico, cursive', fontSize: 'clamp(34px,9vw,80px)', lineHeight: 1.15, color: '#1B3A1F', marginBottom: 20, animation: 'fadeInUp 0.5s ease 0.1s both', position: 'relative', zIndex: 2 }}>
          Guarde seus<br/>
          <span style={{ background: 'linear-gradient(135deg,#2E7D32 0%,#66BB6A 50%,#F5C800 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>momentos fofos</span><br/>
          <span style={{ fontSize: '0.65em' }}>para sempre 💛</span>
        </h1>

        <p style={{ fontSize: 'clamp(14px,2.5vw,18px)', color: '#556B58', lineHeight: 1.7, maxWidth: 500, margin: '0 auto 40px', fontFamily: 'Quicksand, sans-serif', fontWeight: 500, animation: 'fadeInUp 0.5s ease 0.2s both', position: 'relative', zIndex: 2 }}>
          Crie álbuns lindos com fotos, desenhos e stickers.<br/>
          Compartilhe e edite junto com quem você ama 💕
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 60, animation: 'fadeInUp 0.5s ease 0.3s both', position: 'relative', zIndex: 2 }}>
          <Link to="/auth" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#2E7D32,#43A047)', color: 'white', textDecoration: 'none', fontSize: 'clamp(14px,3vw,17px)', fontWeight: 800, padding: 'clamp(12px,2vw,16px) clamp(24px,4vw,40px)', borderRadius: 50, boxShadow: '0 6px 20px rgba(46,125,50,0.4)' }}
            onMouseOver={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 10px 28px rgba(46,125,50,0.45)' }}
            onMouseOut={e  => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 6px 20px rgba(46,125,50,0.4)' }}>
            🍍 Criar meu álbum
          </Link>
          <Link to="/auth" style={{ display: 'inline-flex', alignItems: 'center', background: 'white', color: '#2E7D32', textDecoration: 'none', fontSize: 'clamp(13px,2.5vw,15px)', fontWeight: 700, padding: 'clamp(12px,2vw,16px) clamp(20px,3vw,32px)', borderRadius: 50, border: '2px solid rgba(58,140,63,0.25)', boxShadow: '0 3px 12px rgba(0,0,0,0.06)' }}>
            Já tenho conta →
          </Link>
        </div>

        {/* Preview cards */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 'clamp(8px,2vw,20px)', position: 'relative', zIndex: 2, animation: 'fadeInUp 0.6s ease 0.4s both' }}>
          {PREVIEWS.map((p, i) => (
            <div key={i} style={{ background: p.bg, borderRadius: 16, padding: 'clamp(12px,2vw,20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', transform: `rotate(${p.rotate}deg) translateY(${i===1?'-12px':'0'})`, transition: 'transform 0.3s ease', width: 'clamp(90px,18vw,145px)', border: '2px solid rgba(255,255,255,0.8)', cursor: 'default' }}
              onMouseOver={e => e.currentTarget.style.transform=`rotate(0deg) translateY(-8px) scale(1.05)`}
              onMouseOut={e  => e.currentTarget.style.transform=`rotate(${p.rotate}deg) translateY(${i===1?'-12px':'0'})`}>
              <div style={{ fontSize: 'clamp(22px,5vw,38px)', marginBottom: 8, textAlign: 'center' }}>{p.emoji}</div>
              <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 8, height: 6, marginBottom: 5 }}/>
              <div style={{ background: 'rgba(255,255,255,0.5)', borderRadius: 8, height: 4, width: '70%' }}/>
              <p style={{ fontSize: 'clamp(8px,1.4vw,11px)', fontWeight: 800, color: '#333', marginTop: 10, textAlign: 'center', fontFamily: 'Quicksand' }}>{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: 'clamp(40px,6vw,80px) clamp(16px,5vw,48px)', background: 'white' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(28px,4vw,52px)' }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#3A8C3F', marginBottom: 10 }}>TUDO QUE VOCÊ PRECISA</p>
            <h2 style={{ fontFamily: 'Pacifico, cursive', fontSize: 'clamp(22px,5vw,38px)', color: '#1B3A1F', lineHeight: 1.25 }}>
              Cheio de recursos fofos 🌸
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: 'clamp(10px,2vw,18px)' }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ background: f.bg, borderRadius: 20, padding: 'clamp(16px,2.5vw,26px)', border: `2px solid ${f.color}22`, transition: 'transform 0.2s, box-shadow 0.2s', animation: `fadeInUp 0.5s ease ${i*0.07}s both`, cursor: 'default' }}
                onMouseOver={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow=`0 12px 32px ${f.color}22` }}
                onMouseOut={e  => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' }}>
                <div style={{ fontSize: 'clamp(26px,4vw,34px)', marginBottom: 10 }}>{f.icon}</div>
                <h3 style={{ fontSize: 'clamp(13px,2vw,15px)', fontWeight: 800, color: '#1B3A1F', marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontSize: 'clamp(11px,1.5vw,13px)', color: '#666', lineHeight: 1.6, fontFamily: 'Quicksand', fontWeight: 500 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section style={{ padding: 'clamp(48px,7vw,88px) clamp(16px,5vw,48px)', textAlign: 'center', background: 'linear-gradient(160deg,#E8F5E9,#FFF8E7 50%,#FCE4EC)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '120%', height: '120%', background: 'radial-gradient(ellipse,rgba(255,255,255,0.6),transparent 65%)', pointerEvents: 'none' }}/>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 'clamp(40px,8vw,60px)', marginBottom: 14 }}>🍍</div>
          <h2 style={{ fontFamily: 'Pacifico, cursive', fontSize: 'clamp(24px,5vw,42px)', color: '#1B3A1F', marginBottom: 14, lineHeight: 1.2 }}>Comece agora, é grátis!</h2>
          <p style={{ fontSize: 'clamp(13px,2vw,16px)', color: '#556B58', marginBottom: 32, fontFamily: 'Quicksand', fontWeight: 500 }}>Crie seu primeiro álbum em segundos 💕</p>
          <Link to="/auth" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#2E7D32,#43A047)', color: 'white', textDecoration: 'none', fontSize: 'clamp(15px,2.5vw,18px)', fontWeight: 800, padding: 'clamp(14px,2vw,18px) clamp(28px,5vw,52px)', borderRadius: 50, boxShadow: '0 8px 24px rgba(46,125,50,0.4)' }}
            onMouseOver={e => { e.currentTarget.style.transform='translateY(-2px) scale(1.03)'; e.currentTarget.style.boxShadow='0 14px 36px rgba(46,125,50,0.45)' }}
            onMouseOut={e  => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 8px 24px rgba(46,125,50,0.4)' }}>
            Criar meu álbum 🌸
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: 'clamp(14px,2vw,22px)', background: 'white', borderTop: '2px solid rgba(58,140,63,0.08)', fontSize: 12, color: '#aaa', fontFamily: 'Quicksand' }}>
        Feito com 💛 por quem ama memórias • Pineapple Moments
      </footer>

      <style>{`
        @keyframes fadeInUp {
          from { opacity:0; transform:translateY(24px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </div>
  )
}
