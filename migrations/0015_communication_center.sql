-- ============================================================
-- VORTEX v4 — Central de Comunicacao (chat, alertas, e-mails, comunicados)
--
-- A Central e uma JANELA sobre o que ja e registrado: cada conversa relevante,
-- cada comunicado oficial e cada e-mail transacional ancora um bloco no ledger
-- (regra 1) e a Shell apenas EXIBE — nao existe historico paralelo. Os badges
-- (contadores) sao estado corrente derivado das tabelas abaixo, nunca copia.
--
-- Escopo do tenant/empresa segue a regra 3: toda tabela carrega `tenant_id` e
-- `company_id` (quando aplicavel) e o RLS exige vinculo ativo. Conversa de
-- plataforma/tenant tem `company_id` nulo (ex.: recrutamento); so quem
-- PARTICIPA ve a conversa.
--
-- DESVIO CONSCIENTE DA REGRA 1: marcar como lido (`last_read_at`, `read_at`,
-- `announcement_reads`) e estado operacional de consumo por usuario — a mesma
-- natureza de `published_at`/`attempts` do outbox — e por isso NAO gera bloco
-- no ledger. O que e comunicado (a mensagem, o comunicado, o e-mail) e ancorado;
-- a posicao de leitura nao.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS communication;
GRANT USAGE ON SCHEMA communication TO vortex_app;
ALTER ROLE vortex_app SET search_path = public, identity, ledger, protocol, documents, catalog,
  subscriptions, oauth, signatures, compliance, notifications, ops, communication;

-- ─────────────────────────────────────────────
-- Conversas (chat: empresa, recrutamento ou direta)
-- ─────────────────────────────────────────────
CREATE TABLE communication.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  company_id uuid REFERENCES identity.companies(id),
  topic varchar(20) NOT NULL CHECK (topic IN ('COMPANY','RECRUITMENT','DIRECT','TENANT')),
  title varchar(255) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ARCHIVED')),
  created_by uuid NOT NULL REFERENCES identity.users(id),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_conversations_tenant ON communication.conversations(tenant_id, company_id, status);

CREATE TABLE communication.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES communication.conversations(id),
  user_id uuid NOT NULL REFERENCES identity.users(id),
  joined_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  -- Marca d'agua de leitura: mensagens posteriores contam como nao lidas.
  last_read_at timestamptz,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE communication.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  company_id uuid REFERENCES identity.companies(id),
  conversation_id uuid NOT NULL REFERENCES communication.conversations(id),
  author_user_id uuid NOT NULL REFERENCES identity.users(id),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 8000),
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_messages_conversation ON communication.messages(conversation_id, created_at);
CREATE INDEX idx_messages_tenant ON communication.messages(tenant_id, company_id);

-- Registro eletronico imutavel (Resolucao 458/2017): correcao e nova mensagem,
-- nunca UPDATE. O historico e a propria sequencia de mensagens.
CREATE FUNCTION communication.prevent_message_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'VIOLACAO 458/2017: mensagens sao imutaveis; envie uma nova mensagem.'
    USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_messages_no_update BEFORE UPDATE ON communication.messages
  FOR EACH ROW EXECUTE FUNCTION communication.prevent_message_mutation();
CREATE TRIGGER trg_messages_no_delete BEFORE DELETE ON communication.messages
  FOR EACH ROW EXECUTE FUNCTION communication.prevent_message_mutation();

-- ─────────────────────────────────────────────
-- Comunicados Oficiais (plataforma/tenant/empresa)
-- ─────────────────────────────────────────────
CREATE TABLE communication.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  company_id uuid REFERENCES identity.companies(id),
  scope varchar(20) NOT NULL CHECK (scope IN ('PLATFORM','TENANT','COMPANY')),
  severity varchar(16) NOT NULL DEFAULT 'INFO'
    CHECK (severity IN ('INFO','WARNING','CRITICAL','BLOCKING')),
  title varchar(255) NOT NULL,
  body text NOT NULL,
  published_by uuid NOT NULL REFERENCES identity.users(id),
  published_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz,
  ledger_block_id uuid
);
CREATE INDEX idx_announcements_tenant ON communication.announcements(tenant_id, published_at DESC);

-- Comunicado publicado e registro: correcao e novo comunicado.
CREATE FUNCTION communication.prevent_announcement_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Comunicados oficiais sao imutaveis; publique um novo comunicado.'
    USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_announcements_no_update BEFORE UPDATE ON communication.announcements
  FOR EACH ROW EXECUTE FUNCTION communication.prevent_announcement_mutation();
CREATE TRIGGER trg_announcements_no_delete BEFORE DELETE ON communication.announcements
  FOR EACH ROW EXECUTE FUNCTION communication.prevent_announcement_mutation();

CREATE TABLE communication.announcement_reads (
  announcement_id uuid NOT NULL REFERENCES communication.announcements(id),
  user_id uuid NOT NULL REFERENCES identity.users(id),
  read_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (announcement_id, user_id)
);

-- ─────────────────────────────────────────────
-- Caixa de e-mails transacionais
-- ─────────────────────────────────────────────
CREATE TABLE communication.mail_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES identity.tenants(id),
  company_id uuid REFERENCES identity.companies(id),
  direction varchar(3) NOT NULL CHECK (direction IN ('IN','OUT')),
  from_address varchar(320) NOT NULL,
  to_address varchar(320) NOT NULL,
  subject varchar(255) NOT NULL,
  body text NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'QUEUED'
    CHECK (status IN ('QUEUED','SENT','RECEIVED','FAILED')),
  related_entity_type varchar(100),
  related_entity_id uuid,
  read_at timestamptz,
  ledger_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_mail_tenant ON communication.mail_messages(tenant_id, created_at DESC);
CREATE INDEX idx_mail_unread ON communication.mail_messages(tenant_id, company_id)
  WHERE direction = 'IN' AND read_at IS NULL;

-- O e-mail e registro; a UNICA mutacao permitida e marcar como lido.
CREATE FUNCTION communication.prevent_mail_mutation() RETURNS trigger AS $$
BEGIN
  IF NEW.id <> OLD.id
     OR NEW.tenant_id <> OLD.tenant_id
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.direction <> OLD.direction
     OR NEW.from_address <> OLD.from_address
     OR NEW.to_address <> OLD.to_address
     OR NEW.subject <> OLD.subject
     OR NEW.body <> OLD.body
     OR NEW.status <> OLD.status
     OR NEW.related_entity_type IS DISTINCT FROM OLD.related_entity_type
     OR NEW.related_entity_id IS DISTINCT FROM OLD.related_entity_id
     OR NEW.ledger_block_id IS DISTINCT FROM OLD.ledger_block_id
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'E-mail e registro imutavel: apenas read_at pode ser atualizado.'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION communication.prevent_mail_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'E-mail e registro imutavel: DELETE proibido.' USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mail_no_update BEFORE UPDATE ON communication.mail_messages
  FOR EACH ROW EXECUTE FUNCTION communication.prevent_mail_mutation();
CREATE TRIGGER trg_mail_no_delete BEFORE DELETE ON communication.mail_messages
  FOR EACH ROW EXECUTE FUNCTION communication.prevent_mail_delete();

-- ─────────────────────────────────────────────
-- Row-Level Security: tenant e contexto; sem vinculo ativo nada e visivel
-- ─────────────────────────────────────────────
ALTER TABLE communication.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication.conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE communication.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication.conversation_participants FORCE ROW LEVEL SECURITY;
ALTER TABLE communication.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication.messages FORCE ROW LEVEL SECURITY;
ALTER TABLE communication.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication.announcements FORCE ROW LEVEL SECURITY;
ALTER TABLE communication.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication.announcement_reads FORCE ROW LEVEL SECURITY;
ALTER TABLE communication.mail_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication.mail_messages FORCE ROW LEVEL SECURITY;

-- Conversas: visiveis a quem participa ou a quem as criou (o participante do
-- criador e inserido na mesma transacao).
CREATE POLICY conversations_visible ON communication.conversations FOR SELECT USING (
  tenant_id IN (SELECT identity.current_tenant_ids())
  AND (company_id IS NULL OR company_id IN (SELECT identity.current_company_ids()))
  AND (
    created_by = identity.current_user_id()
    OR EXISTS (
      SELECT 1 FROM communication.conversation_participants p
       WHERE p.conversation_id = communication.conversations.id
         AND p.user_id = identity.current_user_id()
    )
  )
);
CREATE POLICY conversations_insert ON communication.conversations FOR INSERT WITH CHECK (
  tenant_id IN (SELECT identity.current_tenant_ids())
  AND (company_id IS NULL OR company_id IN (SELECT identity.current_company_ids()))
  AND created_by = identity.current_user_id()
);
CREATE POLICY conversations_update ON communication.conversations FOR UPDATE USING (
  tenant_id IN (SELECT identity.current_tenant_ids())
  AND created_by = identity.current_user_id()
) WITH CHECK (
  tenant_id IN (SELECT identity.current_tenant_ids())
  AND created_by = identity.current_user_id()
);

-- Participantes: a lista de participantes e visivel a quem ve a conversa.
CREATE POLICY participants_select ON communication.conversation_participants FOR SELECT USING (
  conversation_id IN (SELECT id FROM communication.conversations)
);
CREATE POLICY participants_insert ON communication.conversation_participants FOR INSERT WITH CHECK (
  conversation_id IN (SELECT id FROM communication.conversations)
);
CREATE POLICY participants_update ON communication.conversation_participants FOR UPDATE USING (
  user_id = identity.current_user_id()
) WITH CHECK (
  user_id = identity.current_user_id()
);

-- Mensagens: so quem participa da conversa le e escreve; autoria e do usuario.
CREATE POLICY messages_select ON communication.messages FOR SELECT USING (
  tenant_id IN (SELECT identity.current_tenant_ids())
  AND (company_id IS NULL OR company_id IN (SELECT identity.current_company_ids()))
  AND EXISTS (
    SELECT 1 FROM communication.conversation_participants p
     WHERE p.conversation_id = communication.messages.conversation_id
       AND p.user_id = identity.current_user_id()
  )
);
CREATE POLICY messages_insert ON communication.messages FOR INSERT WITH CHECK (
  tenant_id IN (SELECT identity.current_tenant_ids())
  AND (company_id IS NULL OR company_id IN (SELECT identity.current_company_ids()))
  AND author_user_id = identity.current_user_id()
  AND EXISTS (
    SELECT 1 FROM communication.conversation_participants p
     WHERE p.conversation_id = communication.messages.conversation_id
       AND p.user_id = identity.current_user_id()
  )
);

-- Comunicados: leitura por escopo; publicacao exige papel de administracao.
CREATE POLICY announcements_select ON communication.announcements FOR SELECT USING (
  tenant_id IN (SELECT identity.current_tenant_ids())
  AND (company_id IS NULL OR company_id IN (SELECT identity.current_company_ids()))
  AND (expires_at IS NULL OR expires_at > clock_timestamp())
);
CREATE POLICY announcements_insert ON communication.announcements FOR INSERT WITH CHECK (
  tenant_id IN (SELECT identity.current_tenant_ids())
  AND (company_id IS NULL OR company_id IN (SELECT identity.current_company_ids()))
  AND published_by = identity.current_user_id()
  AND identity.can_administer(identity.current_user_id(), tenant_id)
);

CREATE POLICY announcement_reads_select ON communication.announcement_reads FOR SELECT USING (
  user_id = identity.current_user_id()
);
CREATE POLICY announcement_reads_insert ON communication.announcement_reads FOR INSERT WITH CHECK (
  user_id = identity.current_user_id()
  AND announcement_id IN (SELECT id FROM communication.announcements)
);

CREATE POLICY mail_select ON communication.mail_messages FOR SELECT USING (
  tenant_id IN (SELECT identity.current_tenant_ids())
  AND (company_id IS NULL OR company_id IN (SELECT identity.current_company_ids()))
);
CREATE POLICY mail_insert ON communication.mail_messages FOR INSERT WITH CHECK (
  tenant_id IN (SELECT identity.current_tenant_ids())
  AND (company_id IS NULL OR company_id IN (SELECT identity.current_company_ids()))
);
CREATE POLICY mail_update ON communication.mail_messages FOR UPDATE USING (
  tenant_id IN (SELECT identity.current_tenant_ids())
  AND (company_id IS NULL OR company_id IN (SELECT identity.current_company_ids()))
) WITH CHECK (
  tenant_id IN (SELECT identity.current_tenant_ids())
  AND (company_id IS NULL OR company_id IN (SELECT identity.current_company_ids()))
);

-- ─────────────────────────────────────────────
-- GRANTS (menor privilegio)
-- ─────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON communication.conversations TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON communication.conversation_participants TO vortex_app;
GRANT SELECT, INSERT ON communication.messages TO vortex_app;
GRANT SELECT, INSERT ON communication.announcements TO vortex_app;
GRANT SELECT, INSERT ON communication.announcement_reads TO vortex_app;
GRANT SELECT, INSERT, UPDATE ON communication.mail_messages TO vortex_app;

-- ─────────────────────────────────────────────
-- Ancoragem no ledger (validacao diferida na mesma transacao)
-- ─────────────────────────────────────────────
CREATE CONSTRAINT TRIGGER conversations_ledger_reference
AFTER INSERT OR UPDATE OF ledger_block_id ON communication.conversations
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();

CREATE CONSTRAINT TRIGGER messages_ledger_reference
AFTER INSERT OR UPDATE OF ledger_block_id ON communication.messages
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();

CREATE CONSTRAINT TRIGGER announcements_ledger_reference
AFTER INSERT OR UPDATE OF ledger_block_id ON communication.announcements
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();

CREATE CONSTRAINT TRIGGER mail_ledger_reference
AFTER INSERT OR UPDATE OF ledger_block_id ON communication.mail_messages
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.validate_deferred_reference();
