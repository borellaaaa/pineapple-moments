import { Link } from 'react-router-dom'

const LAST_UPDATED = '14 de março de 2026'
const CONTACT_EMAIL = 'contato@pineapplemoments.app'
const APP_NAME = 'Pineapple Moments'

export default function Terms() {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFDF6', fontFamily: 'Nunito, sans-serif' }}>
      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 clamp(16px,5vw,48px)', height: 60, background: 'rgba(250,253,246,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1.5px solid rgba(58,140,63,0.1)' }}>
        <Link to="/" style={{ fontFamily: 'Pacifico, cursive', fontSize: 18, color: '#2E7D32', textDecoration: 'none' }}>🍍 Pineapple Moments</Link>
        <Link to="/auth" style={{ fontSize: 13, fontWeight: 700, color: 'white', textDecoration: 'none', background: 'linear-gradient(135deg,#3A8C3F,#66BB6A)', padding: '8px 18px', borderRadius: 50 }}>Entrar</Link>
      </nav>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: 'clamp(32px,5vw,64px) clamp(16px,5vw,32px) 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FFF8E7', border: '2px solid rgba(245,198,0,0.3)', borderRadius: 50, padding: '6px 16px', marginBottom: 20, fontSize: 12, fontWeight: 800, color: '#B8860B' }}>
            📄 Uso justo e responsável
          </div>
          <h1 style={{ fontFamily: 'Pacifico, cursive', fontSize: 'clamp(28px,6vw,42px)', color: '#1B3A1F', marginBottom: 12 }}>
            Termos de Serviço
          </h1>
          <p style={{ color: '#666', fontSize: 14, fontFamily: 'Quicksand' }}>
            Última atualização: <strong>{LAST_UPDATED}</strong>
          </p>
          <div style={{ background: '#FFF8E7', border: '2px solid rgba(245,198,0,0.4)', borderRadius: 12, padding: '14px 18px', marginTop: 20, fontSize: 14, color: '#7a6000', fontFamily: 'Quicksand', lineHeight: 1.6 }}>
            ⚠️ <strong>Leia com atenção.</strong> Ao criar uma conta ou usar o {APP_NAME}, você declara ter lido, compreendido e concordado com estes Termos de Serviço e com nossa <Link to="/privacy" style={{ color: '#2E7D32', fontWeight: 700 }}>Política de Privacidade</Link>.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>

          {/* Aceitação */}
          <Section emoji="✅" title="1. Aceitação dos Termos">
            <p>Estes Termos de Serviço ("Termos") constituem um contrato legal entre você ("Usuário") e o <strong>{APP_NAME}</strong> ("Plataforma", "nós"). Ao acessar ou usar a plataforma, você concorda em cumprir estes Termos.</p>
            <p>Se você usar o serviço em nome de uma organização, você representa que tem autoridade para vincular essa organização a estes Termos.</p>
          </Section>

          {/* Descrição */}
          <Section emoji="🍍" title="2. Descrição do Serviço">
            <p>O {APP_NAME} é uma plataforma de criação de álbuns digitais colaborativos que permite:</p>
            <ul>
              <li>Criar e personalizar álbuns de fotos e memórias</li>
              <li>Adicionar fotos, textos, desenhos e adesivos às páginas</li>
              <li>Compartilhar álbuns para visualização ou edição colaborativa</li>
              <li>Enviar e receber cartinhas digitais entre usuários</li>
              <li>Personalizar perfil com nome de usuário e avatar</li>
            </ul>
            <p>O serviço é fornecido gratuitamente e podemos introduzir recursos pagos no futuro, com aviso prévio.</p>
          </Section>

          {/* Elegibilidade */}
          <Section emoji="👤" title="3. Elegibilidade e Cadastro">
            <ul>
              <li>Você deve ter pelo menos <strong>13 anos</strong> para usar o serviço</li>
              <li>Usuários entre 13 e 18 anos devem ter consentimento dos pais ou responsáveis</li>
              <li>Você é responsável por manter a segurança da sua conta</li>
              <li>Você deve fornecer informações verdadeiras no cadastro</li>
              <li>É proibido criar contas falsas ou se passar por outras pessoas</li>
              <li>Cada pessoa pode ter apenas uma conta ativa</li>
            </ul>
          </Section>

          {/* Conduta */}
          <Section emoji="📌" title="4. Regras de Conduta e Conteúdo Proibido">
            <p>Ao usar o {APP_NAME}, você concorda em <strong>NÃO</strong>:</p>

            <Subtitle>Conteúdo absolutamente proibido (sujeito a banimento imediato):</Subtitle>
            <ul>
              <li>Publicar, enviar ou compartilhar qualquer conteúdo sexual envolvendo menores de 18 anos (CSAM) — crime previsto no ECA (Art. 241-A) e legislação internacional</li>
              <li>Fazer ameaças de morte, violência física ou sexual contra qualquer pessoa</li>
              <li>Publicar conteúdo que promova ou instigue atos terroristas ou de violência em massa</li>
              <li>Criar conteúdo que incite ódio com base em raça, etnia, religião, gênero, orientação sexual ou deficiência</li>
            </ul>

            <Subtitle>Conteúdo proibido (sujeito a remoção e suspensão):</Subtitle>
            <ul>
              <li>Conteúdo sexualmente explícito ou pornográfico</li>
              <li>Assédio, bullying, intimidação ou perseguição de outros usuários</li>
              <li>Discurso de ódio, racismo, homofobia, transfobia ou qualquer forma de discriminação</li>
              <li>Conteúdo que promova automutilação ou suicídio</li>
              <li>Spam, golpes ou conteúdo enganoso</li>
              <li>Violação de direitos autorais ou propriedade intelectual de terceiros</li>
              <li>Conteúdo que viole a privacidade de outras pessoas (fotos íntimas sem consentimento, doxxing)</li>
              <li>Conteúdo que promova atividades ilegais (tráfico, drogas, armas)</li>
              <li>Uso automatizado ou bots sem autorização prévia</li>
            </ul>

            <Subtitle>Uso permitido:</Subtitle>
            <ul>
              <li>Fotos pessoais e de família (com consentimento dos fotografados)</li>
              <li>Conteúdo criativo, artístico e pessoal</li>
              <li>Álbuns temáticos, de viagens, eventos e memórias</li>
              <li>Comunicação amigável e respeitosa entre usuários</li>
            </ul>
          </Section>

          {/* Moderação */}
          <Section emoji="🛡️" title="5. Moderação Automática e Humana">
            <p>O {APP_NAME} utiliza sistemas automatizados de moderação que analisam textos e imagens em busca de violações. Ao usar o serviço, você autoriza expressamente essa análise.</p>
            <ul>
              <li>Conteúdo ofensivo é bloqueado automaticamente antes de ser publicado</li>
              <li>Violações acumuladas resultam em suspensão automática da conta</li>
              <li>Violações graves (especialmente envolvendo menores) resultam em banimento imediato e permanente</li>
              <li>Nos reservamos o direito de reportar conteúdo ilegal às autoridades competentes, incluindo a <strong>Polícia Civil, Polícia Federal, Ministério Público</strong> e organizações de proteção à criança, conforme exigido pela legislação brasileira</li>
            </ul>
            <p>Se acreditar que sua conta foi suspensa por engano, entre em contato: <strong>{CONTACT_EMAIL}</strong></p>
          </Section>

          {/* Propriedade intelectual */}
          <Section emoji="©️" title="6. Propriedade Intelectual">
            <Subtitle>Seu conteúdo:</Subtitle>
            <p>Você mantém todos os direitos sobre o conteúdo que cria e publica no {APP_NAME}. Ao publicar conteúdo, você nos concede uma licença limitada, não exclusiva, gratuita e mundial para hospedar, armazenar e exibir esse conteúdo <strong>exclusivamente para o funcionamento do serviço</strong>.</p>
            <p>Essa licença termina quando você exclui o conteúdo ou encerra sua conta.</p>

            <Subtitle>Nossa plataforma:</Subtitle>
            <p>O código, design, marca e funcionalidades do {APP_NAME} são protegidos por direitos autorais. É proibido copiar, modificar, distribuir ou criar obras derivadas sem autorização expressa.</p>

            <Subtitle>Responsabilidade por conteúdo:</Subtitle>
            <p>Você é o único responsável pelo conteúdo que publica. Ao publicar conteúdo de terceiros, você declara ter as autorizações necessárias.</p>
          </Section>

          {/* Privacidade */}
          <Section emoji="🔒" title="7. Privacidade e Proteção de Dados">
            <p>O tratamento dos seus dados pessoais é regido pela nossa <Link to="/privacy" style={{ color: '#2E7D32', fontWeight: 700 }}>Política de Privacidade</Link>, que faz parte integrante destes Termos.</p>
            <p>Cumprimos integralmente a <strong>LGPD (Lei nº 13.709/2018)</strong> e o <strong>GDPR</strong>, garantindo seus direitos como titular de dados pessoais.</p>
          </Section>

          {/* Disponibilidade */}
          <Section emoji="⚙️" title="8. Disponibilidade do Serviço">
            <ul>
              <li>Fornecemos o serviço "como está" e "conforme disponível"</li>
              <li>Não garantimos disponibilidade ininterrupta — podem ocorrer manutenções programadas</li>
              <li>Nos reservamos o direito de modificar, suspender ou descontinuar recursos com aviso prévio de 30 dias</li>
              <li>Em caso de descontinuação completa do serviço, você terá <strong>60 dias</strong> para exportar seus dados</li>
            </ul>
          </Section>

          {/* Limitação de responsabilidade */}
          <Section emoji="⚠️" title="9. Limitação de Responsabilidade">
            <p>Na máxima extensão permitida por lei, o {APP_NAME} não se responsabiliza por:</p>
            <ul>
              <li>Danos indiretos, incidentais ou consequenciais decorrentes do uso do serviço</li>
              <li>Perda de dados causada por falhas técnicas fora do nosso controle</li>
              <li>Conteúdo publicado por outros usuários</li>
              <li>Danos causados por uso não autorizado da sua conta</li>
            </ul>
            <p>Nossa responsabilidade total, em qualquer circunstância, está limitada ao valor pago pelo serviço nos últimos 12 meses (ou R$ 0,00 para usuários do plano gratuito).</p>
          </Section>

          {/* Rescisão */}
          <Section emoji="🚪" title="10. Encerramento de Conta">
            <Subtitle>Por sua iniciativa:</Subtitle>
            <p>Você pode encerrar sua conta a qualquer momento através das configurações de perfil. Seus dados serão excluídos conforme nossa Política de Privacidade.</p>

            <Subtitle>Por nossa iniciativa:</Subtitle>
            <p>Podemos suspender ou encerrar sua conta, com ou sem aviso prévio, em caso de:</p>
            <ul>
              <li>Violação destes Termos</li>
              <li>Atividade fraudulenta ou ilegal</li>
              <li>Comportamento que prejudique outros usuários ou a plataforma</li>
            </ul>
            <p>Em caso de banimento por violações graves, não há possibilidade de recurso ou reativação da conta.</p>
          </Section>

          {/* Lei aplicável */}
          <Section emoji="⚖️" title="11. Lei Aplicável e Resolução de Disputas">
            <p>Estes Termos são regidos pelas leis da <strong>República Federativa do Brasil</strong>, especialmente:</p>
            <ul>
              <li>Código Civil Brasileiro (Lei nº 10.406/2002)</li>
              <li>Marco Civil da Internet (Lei nº 12.965/2014)</li>
              <li>Lei Geral de Proteção de Dados — LGPD (Lei nº 13.709/2018)</li>
              <li>Código de Defesa do Consumidor (Lei nº 8.078/1990)</li>
              <li>Estatuto da Criança e do Adolescente — ECA (Lei nº 8.069/1990)</li>
            </ul>
            <p>Disputas serão resolvidas preferencialmente por meio de mediação. Caso não seja possível, fica eleito o foro da comarca de <strong>São Paulo/SP</strong> para dirimir quaisquer questões.</p>
            <p>Para usuários da União Europeia, também se aplicam as proteções do GDPR e legislações locais.</p>
          </Section>

          {/* Alterações */}
          <Section emoji="🔄" title="12. Alterações nos Termos">
            <p>Podemos atualizar estes Termos periodicamente. Alterações significativas serão comunicadas com pelo menos <strong>30 dias de antecedência</strong> por e-mail ou aviso na plataforma.</p>
            <p>O uso continuado após a entrada em vigor das alterações constitui aceitação dos novos Termos.</p>
          </Section>

          {/* Contato */}
          <Section emoji="📬" title="13. Contato">
            <p>Para dúvidas, sugestões ou questões relacionadas a estes Termos:</p>
            <ul>
              <li><strong>E-mail geral:</strong> {CONTACT_EMAIL}</li>
              <li><strong>E-mail de privacidade:</strong> privacidade@pineapplemoments.app</li>
              <li><strong>Prazo de resposta:</strong> até 5 dias úteis</li>
            </ul>
            <p>Para reportar conteúdo ilegal ou urgente, incluindo conteúdo envolvendo menores, use o e-mail: <strong>seguranca@pineapplemoments.app</strong> com o assunto "URGENTE".</p>
          </Section>

        </div>

        {/* Footer links */}
        <div style={{ marginTop: 60, paddingTop: 32, borderTop: '2px solid rgba(58,140,63,0.1)', display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/" style={{ color: '#2E7D32', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>← Voltar ao início</Link>
          <Link to="/privacy" style={{ color: '#2E7D32', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Política de Privacidade →</Link>
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '20px', background: 'white', borderTop: '2px solid rgba(58,140,63,0.08)', fontSize: 12, color: '#aaa', fontFamily: 'Quicksand' }}>
        © 2026 Pineapple Moments • Feito com 💛 no Brasil
      </footer>
    </div>
  )
}

function Section({ emoji, title, children }) {
  return (
    <section>
      <h2 style={{ fontFamily: 'Pacifico, cursive', fontSize: 'clamp(16px,3vw,22px)', color: '#1B3A1F', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 24 }}>{emoji}</span> {title}
      </h2>
      <div style={{ color: '#444', lineHeight: 1.8, fontSize: 15, fontFamily: 'Quicksand', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </section>
  )
}

function Subtitle({ children }) {
  return <p style={{ fontWeight: 800, color: '#2E7D32', marginTop: 8, marginBottom: 4, fontSize: 14 }}>{children}</p>
}
