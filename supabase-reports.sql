-- Sistema de Denúncias
CREATE TABLE IF NOT EXISTS reports (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type  TEXT NOT NULL CHECK (target_type IN ('album','page','letter','user')),
  target_id    TEXT NOT NULL,
  reason       TEXT NOT NULL,
  description  TEXT,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  reviewed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario cria denuncia" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Usuario ve proprias denuncias" ON reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Staff ve todas denuncias" ON reports FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_staff WHERE user_id = auth.uid()));
CREATE POLICY "Staff atualiza denuncias" ON reports FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admin_staff WHERE user_id = auth.uid()));

-- Função para criar denúncia
CREATE OR REPLACE FUNCTION create_report(
  p_target_type TEXT,
  p_target_id   TEXT,
  p_reason      TEXT,
  p_description TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE uid UUID := auth.uid();
BEGIN
  -- Evita denúncias duplicadas do mesmo usuário para o mesmo alvo
  IF EXISTS (
    SELECT 1 FROM reports
    WHERE reporter_id = uid AND target_id = p_target_id AND status = 'pending'
  ) THEN
    RETURN json_build_object('status', 'already_reported');
  END IF;

  INSERT INTO reports (reporter_id, target_type, target_id, reason, description)
  VALUES (uid, p_target_type, p_target_id, p_reason, p_description);

  RETURN json_build_object('status', 'reported');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para resolver denúncia (admin)
CREATE OR REPLACE FUNCTION admin_resolve_report(
  p_report_id UUID,
  p_status    TEXT,  -- 'resolved' ou 'dismissed'
  p_action    TEXT DEFAULT NULL  -- 'ban_user', 'delete_album', 'none'
) RETURNS JSON AS $$
DECLARE
  rep RECORD;
BEGIN
  IF NOT is_admin_or_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT * INTO rep FROM reports WHERE id = p_report_id;
  IF NOT FOUND THEN RETURN json_build_object('status', 'not_found'); END IF;

  UPDATE reports SET
    status      = p_status,
    reviewed_by = auth.uid(),
    reviewed_at = NOW()
  WHERE id = p_report_id;

  -- Registra ação admin
  INSERT INTO admin_actions (admin_id, action, reason, details)
  VALUES (auth.uid(), 'resolve_report', p_status,
    json_build_object('report_id', p_report_id, 'action', p_action, 'target_type', rep.target_type, 'target_id', rep.target_id));

  RETURN json_build_object('status', 'ok');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para listar denúncias (admin)
CREATE OR REPLACE FUNCTION admin_get_reports(p_status TEXT DEFAULT 'pending')
RETURNS TABLE (
  id UUID, reporter_id UUID, reporter_username TEXT,
  target_type TEXT, target_id TEXT, reason TEXT, description TEXT,
  status TEXT, created_at TIMESTAMPTZ, reviewed_at TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT is_admin_or_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN QUERY
  SELECT r.id, r.reporter_id,
    p.username AS reporter_username,
    r.target_type, r.target_id, r.reason, r.description,
    r.status, r.created_at, r.reviewed_at
  FROM reports r
  LEFT JOIN profiles p ON p.id = r.reporter_id
  WHERE (p_status = 'all' OR r.status = p_status)
  ORDER BY r.created_at DESC
  LIMIT 200;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_report(TEXT,TEXT,TEXT,TEXT)             TO authenticated;
GRANT EXECUTE ON FUNCTION admin_resolve_report(UUID,TEXT,TEXT)           TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_reports(TEXT)                        TO authenticated;

-- ── Tabela de relatórios arquivados (retenção 6 meses) ────────────────────────
CREATE TABLE IF NOT EXISTS archived_reports (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id     UUID REFERENCES reports(id) ON DELETE SET NULL,
  protocol      TEXT NOT NULL,
  target_type   TEXT NOT NULL,
  target_id     TEXT NOT NULL,
  album_name    TEXT,
  target_user_id    TEXT,
  target_username   TEXT,
  target_email      TEXT,
  target_display_name TEXT,
  reporter_username TEXT,
  reason        TEXT,
  description   TEXT,
  action_taken  TEXT,
  page_count    INT DEFAULT 0,
  admin_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '6 months')
);

ALTER TABLE archived_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff ve relatorios" ON archived_reports
  FOR SELECT USING (EXISTS (SELECT 1 FROM admin_staff WHERE user_id = auth.uid()));
CREATE POLICY "Staff cria relatorios" ON archived_reports
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM admin_staff WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_archived_reports_expires ON archived_reports(expires_at);

-- Função para arquivar relatório
CREATE OR REPLACE FUNCTION admin_archive_report(
  p_report_id       UUID,
  p_protocol        TEXT,
  p_target_type     TEXT,
  p_target_id       TEXT,
  p_album_name      TEXT DEFAULT NULL,
  p_target_user_id  TEXT DEFAULT NULL,
  p_target_username TEXT DEFAULT NULL,
  p_target_email    TEXT DEFAULT NULL,
  p_target_display_name TEXT DEFAULT NULL,
  p_reporter_username   TEXT DEFAULT NULL,
  p_reason          TEXT DEFAULT NULL,
  p_description     TEXT DEFAULT NULL,
  p_action_taken    TEXT DEFAULT NULL,
  p_page_count      INT  DEFAULT 0
) RETURNS UUID AS $$
DECLARE new_id UUID;
BEGIN
  IF NOT is_admin_or_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  INSERT INTO archived_reports (
    report_id, protocol, target_type, target_id, album_name,
    target_user_id, target_username, target_email, target_display_name,
    reporter_username, reason, description, action_taken, page_count, admin_id
  ) VALUES (
    p_report_id, p_protocol, p_target_type, p_target_id, p_album_name,
    p_target_user_id, p_target_username, p_target_email, p_target_display_name,
    p_reporter_username, p_reason, p_description, p_action_taken, p_page_count, auth.uid()
  ) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para limpar relatórios expirados
CREATE OR REPLACE FUNCTION cleanup_archived_reports()
RETURNS JSON AS $$
DECLARE deleted_count INT;
BEGIN
  IF NOT is_admin_or_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  DELETE FROM archived_reports WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN json_build_object('deleted', deleted_count, 'cleaned_at', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_archive_report(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,INT) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_archived_reports() TO authenticated;
