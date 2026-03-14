-- ─── Correção rápida — rode no Supabase SQL Editor ───────────────────────────
-- Adiciona colunas que podem estar faltando na tabela pages

ALTER TABLE pages ADD COLUMN IF NOT EXISTS svg_paths JSONB DEFAULT '[]'::jsonb;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS bg_color  TEXT  DEFAULT '#FFFFFF';

-- Confirma
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pages'
ORDER BY ordinal_position;
