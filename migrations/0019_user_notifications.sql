-- ============================================================
-- VORTEX v4 — Notificacoes ao usuario (aviso in-app)
--
-- Fecha a lacuna 21.3.x: o reuso de refresh token encerra a familia e rotula o
-- motivo (`REUSE_DETECTED`, migracao 0017), mas o usuario dono da sessao nao
-- era avisado. Agora o reuso gera DOIS avisos:
--
--   * in-app  -> `notifications.user_notifications` (esta migracao);
--   * e-mail   -> `communication.mail_messages` (caixa transacional, 0015).
--
-- A notificacao e DIRETA AO USUARIO (`user_id`), nao um comunicado de tenant:
-- so o proprio usuario a ve. O conteudo e ancorado no ledger (regra 1), como os
-- demais registros comunicados; o `read_at` e estado de consumo do usuario e NAO
-- gera bloco (mesmo desvio consciente da 0015).
-- ============================================================

CREATE TABLE notifications.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  company_id uuid REFERENCES identity.companies(id),
  user_id uuid NOT NULL REFERENCES identity.users(id),
  code varchar(80) NOT NULL,
  severity varchar(16) NOT NULL DEFAULT 'WARNING'
    CHECK (severity IN ('INFO','WARNING','CRITICAL','BLOCKING')),
  title varchar(255) NOT NULL,
  body text NOT NULL,
  related_entity_type varchar(100),
  related_entity_id uuid,
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  read_at timestamptz
);

CREATE INDEX idx_user_notifications_user
  ON notifications.user_notifications(user_id, created_at DESC);
CREATE INDEX idx_user_notifications_unread
  ON notifications.user_notifications(user_id) WHERE read_at IS NULL;

-- A notificacao e registro: a UNICA mutacao permitida e marcar como lida.
CREATE FUNCTION notifications.prevent_user_notification_mutation() RETURNS trigger AS $$
BEGIN
  IF NEW.id <> OLD.id
     OR NEW.tenant_id <> OLD.tenant_id
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.user_id <> OLD.user_id
     OR NEW.code <> OLD.code
     OR NEW.severity <> OLD.severity
     OR NEW.title <> OLD.title
     OR NEW.body <> OLD.body
     OR NEW.related_entity_type IS DISTINCT FROM OLD.related_entity_type
     OR NEW.related_entity_id IS DISTINCT FROM OLD.related_entity_id
     OR NEW.ledger_block_id IS DISTINCT FROM OLD.ledger_block_id
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Notificacao e registro imutavel: apenas read_at pode ser atualizado.'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION notifications.prevent_user_notification_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Notificacao e registro imutavel: DELETE proibido.'
    USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_notifications_no_update
  BEFORE UPDATE ON notifications.user_notifications
  FOR EACH ROW EXECUTE FUNCTION notifications.prevent_user_notification_mutation();
CREATE TRIGGER trg_user_notifications_no_delete
  BEFORE DELETE ON notifications.user_notifications
  FOR EACH ROW EXECUTE FUNCTION notifications.prevent_user_notification_delete();

-- Row-Level Security: so o destinatario ve, e dentro de um vinculo ativo.
ALTER TABLE notifications.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications.user_notifications FORCE ROW LEVEL SECURITY;

CREATE POLICY user_notifications_select ON notifications.user_notifications FOR SELECT USING (
  user_id = identity.current_user_id()
  AND tenant_id IN (SELECT identity.current_tenant_ids())
);
CREATE POLICY user_notifications_insert ON notifications.user_notifications FOR INSERT WITH CHECK (
  user_id = identity.current_user_id()
  AND tenant_id IN (SELECT identity.current_tenant_ids())
  AND (company_id IS NULL OR company_id IN (SELECT identity.current_company_ids()))
);
CREATE POLICY user_notifications_update ON notifications.user_notifications FOR UPDATE USING (
  user_id = identity.current_user_id()
) WITH CHECK (
  user_id = identity.current_user_id()
);

GRANT SELECT, INSERT, UPDATE ON notifications.user_notifications TO vortex_app;
