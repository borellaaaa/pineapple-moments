# 🍍 Pineapple Moments

Álbum de fotos colaborativo, fofo e personalizável!

## Como colocar no ar (sem instalar nada!)

### PARTE 1 — Supabase (banco de dados grátis)

1. Acesse **https://supabase.com** e clique em "Start for free"
2. Crie uma conta com seu e-mail (ou com o Google)
3. Clique em **"New Project"**
4. Dê um nome ao projeto: `pineapple-moments`
5. Crie uma senha forte para o banco (guarde ela!)
6. Escolha a região mais próxima (South America - São Paulo)
7. Clique em **"Create new project"** e espere ~2 minutos

#### Configurar o banco:
8. No menu lateral esquerdo, clique em **"SQL Editor"**
9. Clique em **"New query"**
10. Abra o arquivo `supabase-setup.sql` deste projeto
11. Copie TODO o conteúdo e cole no editor do Supabase
12. Clique em **"Run"** (ícone de play verde)
13. Deve aparecer "Success" em verde ✅

#### Pegar as chaves:
14. No menu lateral, vá em **"Settings"** → **"API"**
15. Copie o **"Project URL"** (parece com: `https://xxx.supabase.co`)
16. Copie o **"anon public"** key (string bem longa)
17. Guarde esses dois valores — vamos precisar deles!

---

### PARTE 2 — GitHub (guardar o código)

1. Acesse **https://github.com** e crie uma conta gratuita
2. Clique no botão **"+"** no canto superior direito → **"New repository"**
3. Nome do repositório: `pineapple-moments`
4. Deixe como **Public**
5. Clique em **"Create repository"**
6. Na próxima tela, copie o link do repositório (ex: `https://github.com/seunome/pineapple-moments.git`)

#### Subir o código pelo VS Code:
7. Abra o VS Code
8. Vá em **"File" → "Open Folder"** e abra a pasta `pineapple-moments` deste projeto
9. Pressione **Ctrl+`** para abrir o terminal
10. Crie o arquivo `.env` (copiando o `.env.example`):
   - No terminal, digite: `copy .env.example .env` (Windows) ou `cp .env.example .env` (Mac)
   - Abra o arquivo `.env` e substitua os valores pelas chaves do Supabase que você copiou
11. No terminal do VS Code, execute esses comandos um por um:
```
git init
git add .
git commit -m "Pineapple Moments inicial 🍍"
git branch -M main
git remote add origin https://github.com/SEUNOME/pineapple-moments.git
git push -u origin main
```
12. Quando pedir login, entre com sua conta do GitHub

---

### PARTE 3 — Vercel (colocar no ar grátis!)

1. Acesse **https://vercel.com** e clique em **"Sign Up"**
2. Escolha **"Continue with GitHub"** e autorize
3. Clique em **"Add New..."** → **"Project"**
4. Na lista de repositórios, encontre **"pineapple-moments"** e clique em **"Import"**
5. Na seção **"Environment Variables"**, adicione:
   - Nome: `VITE_SUPABASE_URL` → Valor: sua URL do Supabase
   - Nome: `VITE_SUPABASE_ANON_KEY` → Valor: sua chave anon do Supabase
6. Clique em **"Deploy"**
7. Espere ~2 minutos...
8. 🎉 Seu site está no ar! A Vercel dará um link como: `https://pineapple-moments-xxx.vercel.app`

---

### Como atualizar o site depois de fazer mudanças:

No terminal do VS Code:
```
git add .
git commit -m "Minha atualização"
git push
```
A Vercel detecta automaticamente e atualiza o site! ✨

---

## Funcionalidades

- ✅ Login / Cadastro com e-mail
- ✅ Criar álbuns com capa personalizada (cores, nome, descrição)
- ✅ Álbuns ilimitados
- ✅ Páginas personalizáveis com editor visual
- ✅ Adicionar fotos (upload)
- ✅ Adicionar textos com fontes fofas
- ✅ Adicionar adesivos/emojis
- ✅ Arrastar e reposicionar elementos
- ✅ Compartilhar para edição colaborativa
- ✅ Compartilhar para somente visualização
- ✅ Salvo automaticamente
