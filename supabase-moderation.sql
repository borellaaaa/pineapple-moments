-- ─────────────────────────────────────────────────────────────────────────────
-- Sistema de Moderação de Conteúdo — Pineapple Moments
-- Execute este SQL no Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Tabela de violações registradas
CREATE TABLE IF NOT EXISTS moderation_violations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('text', 'image')),
  content     TEXT,                        -- trecho do texto ou '[imagem]'
  categories  TEXT NOT NULL,               -- ex: "sexual, violence"
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de usuários banidos
CREATE TABLE IF NOT EXISTS moderation_bans (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  reason      TEXT,
  banned_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_violations_user  ON moderation_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_violations_time  ON moderation_violations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bans_user        ON moderation_bans(user_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE moderation_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_bans       ENABLE ROW LEVEL SECURITY;

-- Apenas service role pode ler violations (dashboard admin)
-- O INSERT é feito via client autenticado apenas para o próprio user_id
CREATE POLICY "Usuário pode registrar sua própria violação"
  ON moderation_violations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuário pode checar se está banido
CREATE POLICY "Usuário pode ver seu próprio ban"
  ON moderation_bans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuário pode ser banido pelo sistema"
  ON moderation_bans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário pode ver suas violações"
  ON moderation_violations FOR SELECT
  USING (auth.uid() = user_id);

-- ─── Como desbanir manualmente (rodar como admin no SQL Editor) ───────────────
-- DELETE FROM moderation_bans WHERE user_id = 'uuid-do-usuario';
-- DELETE FROM moderation_violations WHERE user_id = 'uuid-do-usuario';
