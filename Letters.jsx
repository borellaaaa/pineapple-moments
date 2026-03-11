.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #EAF5EA, #F7FAF0, #FFFDE7);
  padding: 24px;
  position: relative;
}

.backLink {
  position: absolute;
  top: 24px;
  left: 24px;
  color: var(--green);
  font-weight: 700;
  text-decoration: none;
  font-family: var(--font-cute);
}
.backLink:hover { text-decoration: underline; }

.card {
  background: white;
  border-radius: 28px;
  padding: 48px 40px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(58,140,63,0.15);
  text-align: center;
  animation: pop 0.4s ease;
}

@keyframes pop {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.logo {
  font-size: 60px;
  margin-bottom: 8px;
  display: block;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%,100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.title {
  font-family: var(--font-title);
  color: var(--green);
  font-size: 26px;
  margin-bottom: 8px;
}

.subtitle {
  color: rgba(27,58,31,0.6);
  font-family: var(--font-cute);
  font-size: 15px;
  margin-bottom: 36px;
  line-height: 1.5;
}

.googleBtn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 14px 24px;
  background: white;
  border: 2.5px solid rgba(27,58,31,0.15);
  border-radius: 50px;
  font-family: var(--font-body);
  font-weight: 700;
  font-size: 16px;
  color: var(--dark);
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(27,58,31,0.08);
}
.googleBtn:hover {
  border-color: var(--green);
  background: #F0FFF0;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(27,58,31,0.12);
}
.googleBtn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(58,140,63,0.2);
  border-top-color: var(--green);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.terms {
  margin-top: 20px;
  font-size: 12px;
  color: rgba(27,58,31,0.4);
  font-family: var(--font-cute);
}
