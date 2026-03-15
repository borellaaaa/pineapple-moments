-- ═══════════════════════════════════════════════════════════════════════════
-- Sistema de Retenção de Dados — Pineapple Moments
-- Execute no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Tabela de agendamento de exclusão ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS deletion_schedule (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  requested_at  TIMESTAMPTZ DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  reason        TEXT DEFAULT 'user_request',
  executed      BOOLEAN DEFAULT FALSE,
  executed_at   TIMESTAMPTZ
);

ALTER TABLE deletion_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario ve proprio agendamento" ON deletion_schedule
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuario agenda propria exclusao" ON deletion_schedule
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuario cancela propria exclusao" ON deletion_schedule
  FOR DELETE USING (auth.uid() = user_id);

-- ── 2. Tabela de logs técnicos (retenção 90 dias) ────────────────────────────
CREATE TABLE IF NOT EXISTS technical_logs (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- 'login','logout','upload','delete_album','ban','unban'
  details    JSONB,
  ip_hash    TEXT,           -- hash do IP (não armazenamos IP direto — LGPD)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE technical_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admin/staff vê logs técnicos
CREATE POLICY "Staff ve logs" ON technical_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_staff WHERE user_id = auth.uid())
  );

CREATE POLICY "Sistema insere logs" ON technical_logs
  FOR INSERT WITH CHECK (true);

-- Índice para cleanup automático
CREATE INDEX IF NOT EXISTS idx_technical_logs_created ON technical_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_deletion_schedule_for  ON deletion_schedule(scheduled_for) WHERE executed = FALSE;

-- ── 3. Função: agendar exclusão de conta (usuário solicita) ──────────────────
CREATE OR REPLACE FUNCTION schedule_account_deletion(reason_text TEXT DEFAULT 'user_request')
RETURNS JSON AS $$
DECLARE
  uid UUID := auth.uid();
  scheduled TIMESTAMPTZ := NOW() + INTERVAL '30 days';
BEGIN
  -- Verifica se já tem agendamento
  IF EXISTS (SELECT 1 FROM deletion_schedule WHERE user_id = uid AND executed = FALSE) THEN
    RETURN json_build_object('status', 'already_scheduled',
      'scheduled_for', (SELECT scheduled_for FROM deletion_schedule WHERE user_id = uid));
  END IF;

  INSERT INTO deletion_schedule (user_id, scheduled_for, reason)
  VALUES (uid, scheduled, reason_text);

  -- Log técnico
  INSERT INTO technical_logs (user_id, event_type, details)
  VALUES (uid, 'deletion_scheduled', json_build_object('scheduled_for', scheduled, 'reason', reason_text));

  RETURN json_build_object('status', 'scheduled', 'scheduled_for', scheduled);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. Função: cancelar agendamento de exclusão ──────────────────────────────
CREATE OR REPLACE FUNCTION cancel_account_deletion()
RETURNS JSON AS $$
DECLARE uid UUID := auth.uid();
BEGIN
  DELETE FROM deletion_schedule WHERE user_id = uid AND executed = FALSE;

  INSERT INTO technical_logs (user_id, event_type, details)
  VALUES (uid, 'deletion_cancelled', json_build_object('cancelled_at', NOW()));

  RETURN json_build_object('status', 'cancelled');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 5. Função: executar exclusões agendadas (rodar diariamente via cron) ──────
CREATE OR REPLACE FUNCTION process_scheduled_deletions()
RETURNS JSON AS $$
DECLARE
  rec RECORD;
  deleted_count INT := 0;
  album_ids UUID[];
BEGIN
  FOR rec IN
    SELECT user_id FROM deletion_schedule
    WHERE scheduled_for <= NOW() AND executed = FALSE
  LOOP
    BEGIN
      -- Salva log antes de deletar
      INSERT INTO technical_logs (user_id, event_type, details)
      VALUES (rec.user_id, 'account_deleted', json_build_object(
        'deleted_at', NOW(), 'reason', 'scheduled_deletion_30d'
      ));

      -- Deleta conteúdo imediatamente
      DELETE FROM letters       WHERE sender_id    = rec.user_id OR recipient_id = rec.user_id;
      DELETE FROM saved_albums  WHERE user_id       = rec.user_id;

      SELECT ARRAY(SELECT id FROM albums WHERE owner_id = rec.user_id) INTO album_ids;
      IF array_length(album_ids, 1) > 0 THEN
        DELETE FROM pages  WHERE album_id = ANY(album_ids);
        DELETE FROM albums WHERE owner_id = rec.user_id;
      END IF;

      -- Mantém moderação por 2 anos (não deleta agora)
      -- moderation_violations e moderation_bans são mantidos

      -- Deleta perfil
      DELETE FROM profiles WHERE id = rec.user_id;

      -- Marca como executado
      UPDATE deletion_schedule SET executed = TRUE, executed_at = NOW()
      WHERE user_id = rec.user_id;

      deleted_count := deleted_count + 1;

    EXCEPTION WHEN OTHERS THEN
      -- Continua mesmo se um falhar
      RAISE WARNING 'Erro ao deletar user %: %', rec.user_id, SQLERRM;
    END;
  END LOOP;

  RETURN json_build_object('deleted', deleted_count, 'processed_at', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 6. Função: limpar logs técnicos com mais de 90 dias ──────────────────────
CREATE OR REPLACE FUNCTION cleanup_technical_logs()
RETURNS JSON AS $$
DECLARE deleted_count INT;
BEGIN
  DELETE FROM technical_logs WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN json_build_object('deleted_logs', deleted_count, 'cleaned_at', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 7. Função: limpar registros de moderação com mais de 2 anos ──────────────
CREATE OR REPLACE FUNCTION cleanup_old_moderation_data()
RETURNS JSON AS $$
DECLARE deleted_count INT;
BEGIN
  -- Mantém 2 anos conforme política de privacidade
  DELETE FROM moderation_violations WHERE created_at < NOW() - INTERVAL '2 years';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN json_build_object('deleted_violations', deleted_count, 'cleaned_at', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 8. Função: relatório de retenção para o admin ────────────────────────────
CREATE OR REPLACE FUNCTION admin_get_retention_stats()
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  IF NOT is_admin_or_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT json_build_object(
    'pending_deletions',      (SELECT COUNT(*) FROM deletion_schedule WHERE executed = FALSE),
    'completed_deletions',    (SELECT COUNT(*) FROM deletion_schedule WHERE executed = TRUE),
    'next_deletion',          (SELECT MIN(scheduled_for) FROM deletion_schedule WHERE executed = FALSE),
    'logs_total',             (SELECT COUNT(*) FROM technical_logs),
    'logs_last_90d',          (SELECT COUNT(*) FROM technical_logs WHERE created_at > NOW() - INTERVAL '90 days'),
    'violations_total',       (SELECT COUNT(*) FROM moderation_violations),
    'violations_older_2y',    (SELECT COUNT(*) FROM moderation_violations WHERE created_at < NOW() - INTERVAL '2 years'),
    'oldest_log',             (SELECT MIN(created_at) FROM technical_logs),
    'oldest_violation',       (SELECT MIN(created_at) FROM moderation_violations)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 9. Função: listar agendamentos pendentes (admin) ─────────────────────────
CREATE OR REPLACE FUNCTION admin_get_deletion_schedule()
RETURNS TABLE (
  id UUID, user_id UUID, username TEXT, email TEXT,
  requested_at TIMESTAMPTZ, scheduled_for TIMESTAMPTZ,
  reason TEXT, executed BOOLEAN, executed_at TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT is_admin_or_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  RETURN QUERY
  SELECT
    ds.id, ds.user_id,
    p.username, u.email::TEXT,
    ds.requested_at, ds.scheduled_for,
    ds.reason, ds.executed, ds.executed_at
  FROM deletion_schedule ds
  LEFT JOIN profiles p ON p.id = ds.user_id
  LEFT JOIN auth.users u ON u.id = ds.user_id
  ORDER BY ds.scheduled_for ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 10. Grants ────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION schedule_account_deletion(TEXT)  TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_account_deletion()         TO authenticated;
GRANT EXECUTE ON FUNCTION process_scheduled_deletions()     TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_technical_logs()          TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_moderation_data()     TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_retention_stats()       TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_deletion_schedule()     TO authenticated;
