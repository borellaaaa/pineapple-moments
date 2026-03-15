import { Link } from 'react-router-dom'

const LAST_UPDATED = '14 de março de 2026'
const CONTACT_EMAIL = 'privacidade@pineapplemoments.app'
const APP_NAME = 'Pineapple Moments'
const COMPANY = 'Pineapple Moments'

export default function Privacy() {
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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#E8F5E9', border: '2px solid rgba(58,140,63,0.2)', borderRadius: 50, padding: '6px 16px', marginBottom: 20, fontSize: 12, fontWeight: 800, color: '#2E7D32' }}>
            🔒 Sua privacidade importa
          </div>
          <h1 style={{ fontFamily: 'Pacifico, cursive', fontSize: 'clamp(28px,6vw,42px)', color: '#1B3A1F', marginBottom: 12 }}>
            Política de Privacidade
          </h1>
          <p style={{ color: '#666', fontSize: 14, fontFamily: 'Quicksand' }}>
            Última atualização: <strong>{LAST_UPDATED}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>

          {/* Intro */}
          <Section emoji="📋" title="Visão Geral">
            <p>O <strong>{APP_NAME}</strong> é um serviço de criação de álbuns digitais colaborativos. Esta Política de Privacidade descreve como coletamos, usamos, protegemos e tratamos suas informações pessoais, em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>, o <strong>Regulamento Geral de Proteção de Dados da União Europeia (GDPR)</strong> e demais legislações aplicáveis.</p>
            <p>Ao usar o {APP_NAME}, você concorda com os termos desta política. Se não concordar, por favor não utilize o serviço.</p>
          </Section>

          {/* Dados coletados */}
          <Section emoji="📦" title="Dados que Coletamos">
            <Subtitle>Dados fornecidos por você</Subtitle>
            <ul>
              <li><strong>Dados de cadastro:</strong> nome, endereço de e-mail e foto de perfil (fornecidos via login com Google)</li>
              <li><strong>Nome de usuário (@username):</strong> escolhido por você no perfil</li>
              <li><strong>Conteúdo criado:</strong> álbuns, páginas, textos, fotos e desenhos que você adiciona à plataforma</li>
              <li><strong>Cartinhas:</strong> mensagens e fotos enviadas a outros usuários</li>
              <li><strong>Bio e avatar:</strong> informações opcionais do perfil</li>
            </ul>

            <Subtitle>Dados coletados automaticamente</Subtitle>
            <ul>
              <li><strong>Dados de uso:</strong> páginas visitadas, funcionalidades utilizadas e tempo de sessão</li>
              <li><strong>Dados técnicos:</strong> endereço IP, tipo de dispositivo, navegador e sistema operacional</li>
              <li><strong>Cookies de sessão:</strong> necessários para manter você autenticado</li>
            </ul>

            <Subtitle>Dados de moderação</Subtitle>
            <ul>
              <li>Registros de violações de conteúdo detectadas automaticamente pelo nosso sistema de moderação</li>
              <li>Esses dados são mantidos para fins de segurança e nunca são compartilhados publicamente</li>
            </ul>
          </Section>

          {/* Base legal */}
          <Section emoji="⚖️" title="Base Legal para Tratamento (LGPD/GDPR)">
            <p>Tratamos seus dados com base nas seguintes hipóteses legais:</p>
            <ul>
              <li><strong>Execução de contrato (Art. 7º, V — LGPD):</strong> para fornecer o serviço de álbuns digitais</li>
              <li><strong>Legítimo interesse (Art. 7º, IX — LGPD):</strong> para segurança, prevenção de fraudes e melhoria do serviço</li>
              <li><strong>Consentimento (Art. 7º, I — LGPD):</strong> para comunicações de marketing, quando aplicável</li>
              <li><strong>Cumprimento de obrigação legal (Art. 7º, II — LGPD):</strong> quando exigido por lei ou autoridade competente</li>
            </ul>
          </Section>

          {/* Como usamos */}
          <Section emoji="🎯" title="Como Usamos seus Dados">
            <ul>
              <li>Criar e gerenciar sua conta</li>
              <li>Fornecer e melhorar os serviços da plataforma</li>
              <li>Permitir colaboração entre usuários em álbuns compartilhados</li>
              <li>Enviar e receber cartinhas entre usuários</li>
              <li>Moderar conteúdo para garantir a segurança da plataforma</li>
              <li>Prevenir fraudes, abusos e violações dos Termos de Serviço</li>
              <li>Cumprir obrigações legais e regulatórias</li>
              <li>Enviar comunicações sobre o serviço (sem fins publicitários de terceiros)</li>
            </ul>
          </Section>

          {/* Moderação e segurança */}
          <Section emoji="🛡️" title="Sistema de Moderação e Segurança">
            <p>O {APP_NAME} utiliza um sistema automatizado de moderação de conteúdo para proteger nossos usuários. Este sistema:</p>
            <ul>
              <li>Analisa textos e imagens enviados à plataforma em busca de conteúdo ofensivo, violento, sexual ou ilegal</li>
              <li>Utiliza serviços de terceiros especializados em moderação de conteúdo (Hugging Face e Sightengine)</li>
              <li>Bloqueia automaticamente conteúdo que viole nossas diretrizes</li>
              <li>Registra violações para fins de segurança e pode resultar em suspensão da conta</li>
            </ul>
            <p><strong>Conteúdos estritamente proibidos:</strong> nudez, violência, discurso de ódio, assédio, conteúdo sexual envolvendo menores, ameaças e atividades ilegais. Violações graves resultam em banimento imediato e permanente.</p>
            <p>Em casos de conteúdo que envolva atividade criminosa, especialmente envolvendo menores, nos reservamos o direito de reportar às autoridades competentes conforme exigido pela legislação brasileira (ECA — Lei nº 8.069/1990) e internacional.</p>
          </Section>

          {/* Compartilhamento */}
          <Section emoji="🤝" title="Compartilhamento de Dados">
            <p>Não vendemos, alugamos nem comercializamos seus dados pessoais. Compartilhamos informações apenas nas seguintes situações:</p>
            <ul>
              <li><strong>Provedores de serviço:</strong> Supabase (banco de dados e autenticação), Vercel (hospedagem), Google (autenticação OAuth), Hugging Face e Sightengine (moderação de conteúdo)</li>
              <li><strong>Outros usuários:</strong> conteúdo de álbuns compartilhados e cartinhas, conforme você configurar</li>
              <li><strong>Obrigação legal:</strong> quando exigido por lei, decisão judicial ou autoridade competente</li>
              <li><strong>Proteção de direitos:</strong> para investigar ou prevenir atividades ilegais ou violações dos nossos termos</li>
            </ul>
            <p>Todos os nossos provedores de serviço são obrigados contratualmente a proteger seus dados e não utilizá-los para outros fins.</p>
          </Section>

          {/* Armazenamento */}
          <Section emoji="💾" title="Armazenamento e Segurança dos Dados">
            <ul>
              <li>Seus dados são armazenados em servidores seguros localizados no Brasil (São Paulo) via Supabase</li>
              <li>Utilizamos criptografia em trânsito (TLS/HTTPS) e em repouso</li>
              <li>O acesso aos dados é restrito a pessoal autorizado com necessidade legítima</li>
              <li>Realizamos backups regulares para prevenir perda de dados</li>
              <li>Senhas nunca são armazenadas em texto puro — utilizamos autenticação OAuth do Google</li>
            </ul>
          </Section>

          {/* Retenção */}
          <Section emoji="📅" title="Retenção de Dados">
            <ul>
              <li><strong>Conta ativa:</strong> mantemos seus dados enquanto sua conta estiver ativa</li>
              <li><strong>Após exclusão da conta:</strong> dados pessoais são removidos em até 30 dias, exceto quando obrigados por lei a mantê-los</li>
              <li><strong>Registros de moderação:</strong> mantidos por até 2 anos para fins de segurança</li>
              <li><strong>Logs técnicos:</strong> mantidos por até 90 dias</li>
              <li><strong>Conteúdo de álbuns:</strong> excluído imediatamente ao deletar o álbum ou a conta</li>
            </ul>
          </Section>

          {/* Direitos do titular */}
          <Section emoji="✋" title="Seus Direitos (LGPD/GDPR)">
            <p>Como titular dos dados, você tem os seguintes direitos garantidos pela LGPD e GDPR:</p>
            <ul>
              <li><strong>Acesso:</strong> solicitar uma cópia dos seus dados pessoais</li>
              <li><strong>Correção:</strong> corrigir dados incompletos, inexatos ou desatualizados</li>
              <li><strong>Exclusão:</strong> solicitar a exclusão dos seus dados ("direito ao esquecimento")</li>
              <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado e legível por máquina</li>
              <li><strong>Oposição:</strong> opor-se ao tratamento de dados em determinadas circunstâncias</li>
              <li><strong>Revogação do consentimento:</strong> retirar seu consentimento a qualquer momento</li>
              <li><strong>Informação:</strong> saber com quais entidades compartilhamos seus dados</li>
            </ul>
            <p>Para exercer qualquer um desses direitos, entre em contato pelo e-mail: <strong>{CONTACT_EMAIL}</strong></p>
            <p>Respondemos a todas as solicitações em até <strong>15 dias úteis</strong>, conforme previsto na LGPD.</p>
          </Section>

          {/* Menores */}
          <Section emoji="👶" title="Proteção de Menores">
            <p>O {APP_NAME} não é destinado a crianças menores de 13 anos. Não coletamos intencionalmente dados de crianças sem o consentimento verificável dos pais ou responsáveis legais.</p>
            <p>Para usuários entre 13 e 18 anos, recomendamos o uso supervisionado por um responsável legal.</p>
            <p>Se tomarmos conhecimento de que coletamos dados de uma criança menor de 13 anos sem o devido consentimento, excluiremos imediatamente essas informações. Para reportar esse tipo de situação: <strong>{CONTACT_EMAIL}</strong></p>
          </Section>

          {/* Cookies */}
          <Section emoji="🍪" title="Cookies e Tecnologias Similares">
            <p>Utilizamos apenas cookies estritamente necessários para o funcionamento do serviço:</p>
            <ul>
              <li><strong>Cookie de sessão:</strong> mantém você autenticado durante o uso</li>
              <li><strong>Cookie de preferências:</strong> salva configurações básicas de uso</li>
            </ul>
            <p>Não utilizamos cookies de rastreamento, publicidade ou analytics de terceiros.</p>
          </Section>

          {/* Transferência internacional */}
          <Section emoji="🌍" title="Transferência Internacional de Dados">
            <p>Alguns de nossos provedores de serviço podem processar dados fora do Brasil. Garantimos que essas transferências ocorrem apenas para países com nível adequado de proteção de dados ou mediante cláusulas contratuais padrão aprovadas pela ANPD e/ou Comissão Europeia.</p>
          </Section>

          {/* DPO */}
          <Section emoji="👤" title="Encarregado de Proteção de Dados (DPO)">
            <p>Em conformidade com a LGPD, designamos um Encarregado de Proteção de Dados (DPO) responsável por:</p>
            <ul>
              <li>Receber e atender solicitações dos titulares de dados</li>
              <li>Garantir o cumprimento desta política</li>
              <li>Comunicar-se com a Autoridade Nacional de Proteção de Dados (ANPD)</li>
            </ul>
            <p>Contato do DPO: <strong>{CONTACT_EMAIL}</strong></p>
          </Section>

          {/* Incidentes */}
          <Section emoji="🚨" title="Incidentes de Segurança">
            <p>Em caso de incidente de segurança que possa afetar seus dados, nos comprometemos a:</p>
            <ul>
              <li>Notificar a ANPD em até <strong>72 horas</strong> após a ciência do incidente, conforme a LGPD</li>
              <li>Comunicar os titulares afetados de forma clara e em prazo razoável</li>
              <li>Adotar medidas corretivas imediatas para conter e remediar o incidente</li>
            </ul>
          </Section>

          {/* Alterações */}
          <Section emoji="🔄" title="Alterações nesta Política">
            <p>Podemos atualizar esta política periodicamente. Quando fizer alterações significativas, notificaremos você por e-mail ou por aviso em destaque no aplicativo com pelo menos <strong>30 dias de antecedência</strong>.</p>
            <p>O uso continuado do serviço após a entrada em vigor das alterações constitui aceitação da nova política.</p>
          </Section>

          {/* Contato */}
          <Section emoji="📬" title="Contato e Reclamações">
            <p>Para dúvidas, solicitações ou reclamações relacionadas à privacidade:</p>
            <ul>
              <li><strong>E-mail:</strong> {CONTACT_EMAIL}</li>
              <li><strong>Prazo de resposta:</strong> até 15 dias úteis</li>
            </ul>
            <p>Você também tem o direito de apresentar reclamação à <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong> em <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" style={{ color: '#2E7D32' }}>www.gov.br/anpd</a>.</p>
          </Section>

        </div>

        {/* Footer links */}
        <div style={{ marginTop: 60, paddingTop: 32, borderTop: '2px solid rgba(58,140,63,0.1)', display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/" style={{ color: '#2E7D32', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>← Voltar ao início</Link>
          <Link to="/terms" style={{ color: '#2E7D32', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Termos de Serviço →</Link>
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '20px', background: 'white', borderTop: '2px solid rgba(58,140,63,0.08)', fontSize: 12, color: '#aaa', fontFamily: 'Quicksand' }}>
        © 2026 {COMPANY} • Feito com 💛 no Brasil
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
