-- Execute este SQL no Supabase SQL Editor para adicionar o emoji na capa
ALTER TABLE albums ADD COLUMN IF NOT EXISTS cover_emoji TEXT DEFAULT '🍍';
