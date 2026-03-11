.page {
  min-height: 100vh;
  background: linear-gradient(135deg, #EAF5EA 0%, #F7FAF0 50%, #FFFDE7 100%);
  overflow: hidden;
  position: relative;
}

.floatSticker {
  position: fixed;
  animation: float 4s ease-in-out infinite;
  opacity: 0.3;
  pointer-events: none;
  z-index: 0;
  user-select: none;
}

@keyframes float {
  0%,100% { transform: translateY(0) rotate(-5deg); }
  50% { transform: translateY(-15px) rotate(5deg); }
}

.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  position: relative;
  z-index: 10;
}

.logo {
  font-family: var(--font-title);
  font-size: 22px;
  color: var(--green);
}

.hero {
  max-width: 700px;
  margin: 0 auto;
  padding: 60px 24px 40px;
  text-align: center;
  position: relative;
  z-index: 10;
}

.badge {
  display: inline-block;
  background: linear-gradient(135deg, var(--yellow), #8BC34A);
  color: var(--dark);
  font-weight: 700;
  font-size: 13px;
  padding: 6px 18px;
  border-radius: 50px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(245,200,0,0.35);
}

.title {
  font-family: var(--font-title);
  font-size: clamp(42px, 8vw, 72px);
  line-height: 1.15;
  color: var(--dark);
  margin-bottom: 20px;
}

.highlight {
  color: var(--green);
  position: relative;
}
.highlight::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0; right: 0;
  height: 6px;
  background: var(--yellow);
  border-radius: 3px;
  opacity: 0.7;
}

.subtitle {
  font-size: 18px;
  color: rgba(27,58,31,0.65);
  line-height: 1.6;
  margin-bottom: 36px;
  font-family: var(--font-cute);
}

.ctas {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 60px;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.featureCard {
  background: white;
  border-radius: var(--radius);
  padding: 28px 20px;
  box-shadow: var(--shadow);
  animation: fadeIn 0.6s ease forwards;
  opacity: 0;
  transition: transform 0.2s;
  border-top: 4px solid var(--yellow);
}
.featureCard:hover { transform: translateY(-4px); }
.featureCard:nth-child(2) { border-top-color: var(--green); }
.featureCard:nth-child(3) { border-top-color: #8BC34A; }

.featureIcon { font-size: 36px; display: block; margin-bottom: 12px; }

.featureCard h3 { font-weight: 800; font-size: 15px; margin-bottom: 6px; color: var(--dark); }
.featureCard p { font-size: 13px; color: rgba(27,58,31,0.6); line-height: 1.5; font-family: var(--font-cute); }

.footer { text-align: center; padding: 24px; color: rgba(27,58,31,0.4); font-size: 13px; position: relative; z-index: 10; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
