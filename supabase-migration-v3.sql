-- ═══════════════════════════════════════════════════════════════════════════
-- Pineapple Moments — Migration Completa v3
-- Execute no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Adicionar campos novos na tabela profiles ──────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date     DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_onboarded   BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned      BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_at      TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_reason     TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role           TEXT DEFAULT 'user' CHECK (role IN ('user','staff','admin'));

-- ── 2. Tabela de funcionários (staff) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_staff (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role        TEXT DEFAULT 'staff' CHECK (role IN ('staff','admin')),
  added_by    UUID REFERENCES auth.users(id),
  permissions JSONB DEFAULT '{"ban_users":true,"view_users":true,"delete_content":true,"restore_content":false}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_staff ENABLE ROW LEVEL SECURITY;

-- ── 3. Tabela de ações administrativas (audit log) ───────────────────────────
CREATE TABLE IF NOT EXISTS admin_actions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,  -- 'ban','unban','delete_account','delete_content','restore_content','add_staff','remove_staff'
  reason       TEXT,
  details      JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- ── 4. Atualizar tabela moderation_violations ────────────────────────────────
ALTER TABLE moderation_violations ADD COLUMN IF NOT EXISTS reviewed       BOOLEAN DEFAULT FALSE;
ALTER TABLE moderation_violations ADD COLUMN IF NOT EXISTS reviewed_by    UUID REFERENCES auth.users(id);
ALTER TABLE moderation_violations ADD COLUMN IF NOT EXISTS reviewed_at    TIMESTAMPTZ;
ALTER TABLE moderation_violations ADD COLUMN IF NOT EXISTS content_removed BOOLEAN DEFAULT FALSE;

-- ── 5. Tabela de retenção / agendamento de exclusão ──────────────────────────
CREATE TABLE IF NOT EXISTS deletion_schedule (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  requested_at    TIMESTAMPTZ DEFAULT NOW(),
  scheduled_for   TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  reason          TEXT DEFAULT 'user_request',
  executed        BOOLEAN DEFAULT FALSE,
  executed_at     TIMESTAMPTZ
);

ALTER TABLE deletion_schedule ENABLE ROW LEVEL SECURITY;

-- ── 6. Políticas RLS ──────────────────────────────────────────────────────────

-- admin_staff: apenas admins podem ver/gerenciar
CREATE POLICY "Admin pode ver staff" ON admin_staff FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM admin_staff WHERE role = 'admin')
    OR auth.uid() = user_id
  );

CREATE POLICY "Admin pode gerenciar staff" ON admin_staff FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM admin_staff WHERE role = 'admin'));

-- admin_actions: staff e admin podem ver
CREATE POLICY "Staff pode ver ações" ON admin_actions FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM admin_staff));

CREATE POLICY "Staff pode registrar ações" ON admin_actions FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM admin_staff));

-- deletion_schedule: usuário vê o próprio
CREATE POLICY "Usuário vê seu agendamento" ON deletion_schedule FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Usuário agenda exclusão" ON deletion_schedule FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff gerencia exclusões" ON deletion_schedule FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM admin_staff));

-- ── 7. Função: verificar se é admin/staff ────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin_or_staff(check_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE uid UUID := COALESCE(check_user_id, auth.uid());
BEGIN
  RETURN EXISTS (SELECT 1 FROM admin_staff WHERE user_id = uid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 8. Função: banir usuário (admin) ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_ban_user(target_id UUID, ban_reason_text TEXT DEFAULT 'Violação dos termos de serviço')
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin_or_staff() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE profiles SET
    is_banned  = TRUE,
    banned_at  = NOW(),
    ban_reason = ban_reason_text
  WHERE id = target_id;

  INSERT INTO moderation_bans (user_id, reason, banned_at)
  VALUES (target_id, ban_reason_text, NOW())
  ON CONFLICT (user_id) DO UPDATE SET reason = ban_reason_text, banned_at = NOW();

  INSERT INTO admin_actions (admin_id, target_user, action, reason)
  VALUES (auth.uid(), target_id, 'ban', ban_reason_text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 9. Função: desbanir usuário (admin) ──────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_unban_user(target_id UUID, unban_reason TEXT DEFAULT 'Revisão administrativa')
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin_or_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  UPDATE profiles SET is_banned = FALSE, banned_at = NULL, ban_reason = NULL WHERE id = target_id;
  DELETE FROM moderation_bans WHERE user_id = target_id;

  INSERT INTO admin_actions (admin_id, target_user, action, reason)
  VALUES (auth.uid(), target_id, 'unban', unban_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 10. Função: deletar conta (admin) ────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_delete_account(target_id UUID, delete_reason TEXT DEFAULT 'Decisão administrativa')
RETURNS VOID AS $$
DECLARE album_ids UUID[];
BEGIN
  IF NOT is_admin_or_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  INSERT INTO admin_actions (admin_id, target_user, action, reason)
  VALUES (auth.uid(), target_id, 'delete_account', delete_reason);

  DELETE FROM letters WHERE sender_id = target_id OR recipient_id = target_id;
  DELETE FROM saved_albums WHERE user_id = target_id;
  SELECT ARRAY(SELECT id FROM albums WHERE owner_id = target_id) INTO album_ids;
  IF array_length(album_ids, 1) > 0 THEN
    DELETE FROM pages WHERE album_id = ANY(album_ids);
    DELETE FROM albums WHERE owner_id = target_id;
  END IF;
  DELETE FROM moderation_violations WHERE user_id = target_id;
  DELETE FROM moderation_bans WHERE user_id = target_id;
  DELETE FROM profiles WHERE id = target_id;
  DELETE FROM auth.users WHERE id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 11. Função: listar todos os usuários (admin) ─────────────────────────────
CREATE OR REPLACE FUNCTION admin_get_users(
  search_term TEXT DEFAULT NULL,
  page_num INT DEFAULT 1,
  page_size INT DEFAULT 50
)
RETURNS TABLE (
  id UUID, username TEXT, display_name TEXT, email TEXT,
  avatar_emoji TEXT, birth_date DATE, role TEXT,
  is_banned BOOLEAN, banned_at TIMESTAMPTZ, ban_reason TEXT,
  is_onboarded BOOLEAN, accepted_terms BOOLEAN,
  created_at TIMESTAMPTZ, violation_count BIGINT
) AS $$
BEGIN
  IF NOT is_admin_or_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  RETURN QUERY
  SELECT
    p.id, p.username, p.display_name,
    u.email::TEXT,
    p.avatar_emoji, p.birth_date, p.role,
    p.is_banned, p.banned_at, p.ban_reason,
    p.is_onboarded, p.accepted_terms,
    p.created_at,
    COUNT(mv.id)::BIGINT AS violation_count
  FROM profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  LEFT JOIN moderation_violations mv ON mv.user_id = p.id
  WHERE (search_term IS NULL OR p.username ILIKE '%' || search_term || '%'
         OR p.display_name ILIKE '%' || search_term || '%'
         OR u.email ILIKE '%' || search_term || '%')
  GROUP BY p.id, p.username, p.display_name, u.email, p.avatar_emoji,
           p.birth_date, p.role, p.is_banned, p.banned_at, p.ban_reason,
           p.is_onboarded, p.accepted_terms, p.created_at
  ORDER BY p.created_at DESC
  LIMIT page_size OFFSET (page_num - 1) * page_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 12. Função: estatísticas admin ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_get_stats()
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  IF NOT is_admin_or_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT json_build_object(
    'total_users',      (SELECT COUNT(*) FROM profiles),
    'banned_users',     (SELECT COUNT(*) FROM profiles WHERE is_banned = TRUE),
    'total_violations', (SELECT COUNT(*) FROM moderation_violations),
    'total_albums',     (SELECT COUNT(*) FROM albums),
    'total_letters',    (SELECT COUNT(*) FROM letters),
    'new_users_7d',     (SELECT COUNT(*) FROM profiles WHERE created_at > NOW() - INTERVAL '7 days'),
    'violations_7d',    (SELECT COUNT(*) FROM moderation_violations WHERE created_at > NOW() - INTERVAL '7 days')
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 13. Adicionar VOCÊ como admin (substitua pelo seu user_id) ────────────────
-- IMPORTANTE: Vá em Authentication > Users no Supabase, copie seu user ID
-- e rode o comando abaixo substituindo 'SEU_USER_ID_AQUI':
--
-- INSERT INTO admin_staff (user_id, role) VALUES ('SEU_USER_ID_AQUI', 'admin')
-- ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- ── 14. Índices ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_banned    ON profiles(is_banned) WHERE is_banned = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_role      ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_admin_actions_time ON admin_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id);

-- ── 15. Grant permissões ──────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION admin_ban_user(UUID, TEXT)          TO authenticated;
GRANT EXECUTE ON FUNCTION admin_unban_user(UUID, TEXT)        TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_account(UUID, TEXT)    TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_users(TEXT, INT, INT)     TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_stats()                   TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_or_staff(UUID)             TO authenticated;
