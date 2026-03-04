-- Execute este SQL no Supabase SQL Editor

-- Tabela de álbuns
CREATE TABLE albums (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_color TEXT DEFAULT '#FFD93D',
  cover_accent TEXT DEFAULT '#FF6B9D',
  share_token TEXT UNIQUE NOT NULL,
  share_mode TEXT DEFAULT 'view' CHECK (share_mode IN ('view', 'edit')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de páginas
CREATE TABLE pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE NOT NULL,
  page_number INT NOT NULL,
  elements JSONB DEFAULT '[]',
  bg_color TEXT DEFAULT '#FFFFFF',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Políticas de álbuns
CREATE POLICY "Owners podem ver seus álbuns"
  ON albums FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Qualquer um pode ver álbum por token"
  ON albums FOR SELECT
  USING (share_token IS NOT NULL);

CREATE POLICY "Owners podem criar álbuns"
  ON albums FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners podem editar seus álbuns"
  ON albums FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners podem deletar seus álbuns"
  ON albums FOR DELETE
  USING (auth.uid() = owner_id);

-- Políticas de páginas
CREATE POLICY "Qualquer um pode ver páginas"
  ON pages FOR SELECT
  USING (true);

CREATE POLICY "Owners podem criar páginas"
  ON pages FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM albums WHERE id = album_id AND owner_id = auth.uid())
  );

CREATE POLICY "Owners e editores podem editar páginas"
  ON pages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM albums 
      WHERE id = album_id 
      AND (owner_id = auth.uid() OR share_mode = 'edit')
    )
  );

CREATE POLICY "Owners podem deletar páginas"
  ON pages FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM albums WHERE id = album_id AND owner_id = auth.uid())
  );

-- Storage bucket para fotos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('album-photos', 'album-photos', true);

CREATE POLICY "Qualquer um pode ver fotos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'album-photos');

CREATE POLICY "Usuários logados podem enviar fotos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'album-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Usuários podem deletar suas fotos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'album-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
