import { Link } from 'react-router-dom'

const floaters = ['🌸','⭐','🦋','🍓','🌈','💖','🌙','🍦','🎀','✨','🌺','🍭']

export default function Landing() {
  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#eaf5ea,#f7faf0,#fffde7)', position:'relative', overflow:'hidden' }}>
      {floaters.map((s,i) => (
        <span key={i} style={{
          position:'fixed', fontSize:`${1.2+(i%3)*0.4}rem`, opacity:0.25,
          left:`${(i*8.5)%95}%`, top:`${(i*13+5)%85}%`,
          animation:`float ${3+i%2}s ease-in-out infinite`,
          animationDelay:`${i*0.3}s`, pointerEvents:'none', zIndex:0,
          display:'inline-block'
        }}>{s}</span>
      ))}

      <style>{`@keyframes float{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-12px) rotate(3deg)}}`}</style>

      <nav style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 32px', position:'relative', zIndex:10 }}>
        <span style={{ fontFamily:'var(--font-title)', fontSize:20, color:'var(--green)' }}>🍍 Pineapple Moments</span>
        <Link to="/auth" className="btn btn-primary">Entrar ✨</Link>
      </nav>

      <main style={{ maxWidth:680, margin:'0 auto', padding:'48px 24px 60px', textAlign:'center', position:'relative', zIndex:10 }}>
        <div style={{ display:'inline-block', background:'linear-gradient(135deg,var(--yellow),#8bc34a)', color:'var(--dark)', fontWeight:700, fontSize:13, padding:'6px 18px', borderRadius:50, marginBottom:24, boxShadow:'0 4px 12px rgba(245,200,0,0.3)' }}>
          🎀 Álbuns colaborativos e fofos
        </div>

        <h1 style={{ fontFamily:'var(--font-title)', fontSize:'clamp(38px,8vw,68px)', lineHeight:1.15, color:'var(--dark)', marginBottom:16 }}>
          Seus momentos<br/>
          <span style={{ color:'var(--green)', position:'relative' }}>mais fofos</span><br/>
          em um álbum
        </h1>

        <p style={{ fontSize:17, color:'rgba(27,58,31,0.65)', lineHeight:1.6, marginBottom:36, fontFamily:'var(--font-cute)' }}>
          Crie álbuns lindos, personalize cada página, adicione fotos,
          adesivos e textos — e compartilhe com quem você ama 💕
        </p>

        <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap', marginBottom:56 }}>
          <Link to="/auth" className="btn btn-primary" style={{ fontSize:17, padding:'14px 32px' }}>Criar meu álbum 🍍</Link>
          <Link to="/auth" className="btn btn-ghost">Já tenho conta →</Link>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:18 }}>
          {[
            { icon:'🎨', title:'Personalizável', desc:'Cores, fontes e layouts à sua escolha' },
            { icon:'📸', title:'Fotos & Memórias', desc:'Fotos, textos fofos e adesivos' },
            { icon:'💌', title:'Compartilhe', desc:'Envie para amigos editarem ou visualizarem' },
          ].map((f,i) => (
            <div key={i} style={{ background:'white', borderRadius:'var(--radius)', padding:'24px 18px', boxShadow:'var(--shadow)', borderTop:`4px solid ${i===0?'var(--yellow)':i===1?'var(--green)':'#8bc34a'}`, animation:'fadeIn 0.5s ease forwards', animationDelay:`${i*0.1}s`, opacity:0 }}>
              <div style={{ fontSize:32, marginBottom:10 }}>{f.icon}</div>
              <h3 style={{ fontWeight:800, fontSize:14, marginBottom:6 }}>{f.title}</h3>
              <p style={{ fontSize:12, color:'rgba(27,58,31,0.6)', lineHeight:1.5, fontFamily:'var(--font-cute)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer style={{ textAlign:'center', padding:20, color:'rgba(27,58,31,0.4)', fontSize:12, position:'relative', zIndex:10 }}>
        Feito com 💛 • Pineapple Moments
      </footer>
    </div>
  )
}
