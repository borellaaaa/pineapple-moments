-- ============================================================
-- PINEAPPLE MOMENTS v2 — Migration SQL
-- Execute no Supabase SQL Editor APÓS o supabase-setup.sql
-- ============================================================

-- 1. Tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_emoji TEXT DEFAULT '🍍',
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfis são públicos" ON profiles FOR SELECT USING (true);
CREATE POLICY "Usuário cria seu perfil" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Usuário edita seu perfil" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Usuário deleta seu perfil" ON profiles FOR DELETE USING (auth.uid() = id);

-- 2. Tabela de álbuns salvos (álbuns compartilhados que o usuário salvou)
CREATE TABLE IF NOT EXISTS saved_albums (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, album_id)
);

ALTER TABLE saved_albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê seus salvos" ON saved_albums FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuário salva álbum" ON saved_albums FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário remove salvo" ON saved_albums FOR DELETE USING (auth.uid() = user_id);

-- 3. Tabela de cartinhas
CREATE TABLE IF NOT EXISTS letters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_username TEXT NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(message) <= 500),
  photo_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Remetente vê cartas enviadas" ON letters FOR SELECT USING (auth.uid() = sender_id);
CREATE POLICY "Destinatário vê cartas recebidas" ON letters FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "Usuário autenticado envia carta" ON letters FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Destinatário marca como lida" ON letters FOR UPDATE USING (auth.uid() = recipient_id);
CREATE POLICY "Usuário deleta suas cartas" ON letters FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- 4. Adicionar cover_emoji à tabela albums (caso não exista)
DO $$ BEGIN
  ALTER TABLE albums ADD COLUMN IF NOT EXISTS cover_emoji TEXT DEFAULT '🍍';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 5. Trigger para criar perfil automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 6. Função para verificar disponibilidade de username
CREATE OR REPLACE FUNCTION is_username_available(uname TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (SELECT 1 FROM profiles WHERE username = lower(uname));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Storage bucket para fotos de cartinhas (reutiliza album-photos)
-- Já criado no setup inicial, nada a fazer

-- 8. Índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_saved_albums_user ON saved_albums(user_id);
CREATE INDEX IF NOT EXISTS idx_letters_recipient ON letters(recipient_id);
CREATE INDEX IF NOT EXISTS idx_letters_sender ON letters(sender_id);

-- 9. Adicionar bg_color à tabela pages (caso não exista)
DO $$ BEGIN
  ALTER TABLE pages ADD COLUMN IF NOT EXISTS bg_color TEXT DEFAULT '#FFFFFF';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
