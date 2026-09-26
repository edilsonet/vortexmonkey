-- ============================================================
-- VORTEX v4 — Correcao de recursao de RLS em conversation_participants
--
-- A policy de SELECT de `conversations` consultava `conversation_participants`
-- (para saber se o usuario participa) e a policy de `conversation_participants`
-- consultava `conversations`: o PostgreSQL detecta o ciclo entre as duas e
-- recusa a consulta ("infinite recursion detected in policy for relation
-- conversations").
--
-- Correcao: a checagem de participacao passa a ser feita por
-- `communication.is_participant()`, uma funcao SECURITY DEFINER (dona das
-- tabelas, no mesmo padrao de `identity.current_tenant_ids()`) que le
-- `conversation_participants` sem disparar o RLS. Assim o ciclo se rompe: as
-- policies de `conversations` e `messages` deixam de referenciar a tabela de
-- participantes diretamente, e as policies dos participantes continuam
-- referenciando `conversations` num unico sentido.
-- ============================================================

CREATE FUNCTION communication.is_participant(p_conversation_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = communication, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM communication.conversation_participants p
     WHERE p.conversation_id = p_conversation_id
       AND p.user_id = p_user_id
  )
$$;

REVOKE ALL ON FUNCTION communication.is_participant(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION communication.is_participant(uuid, uuid) TO vortex_app;

DROP POLICY conversations_visible ON communication.conversations;
CREATE POLICY conversations_visible ON communication.conversations FOR SELECT USING (
  tenant_id IN (SELECT identity.current_tenant_ids())
  AND (company_id IS NULL OR company_id IN (SELECT identity.current_company_ids()))
  AND (
    created_by = identity.current_user_id()
    OR communication.is_participant(id, identity.current_user_id())
  )
);

DROP POLICY messages_select ON communication.messages;
CREATE POLICY messages_select ON communication.messages FOR SELECT USING (
  tenant_id IN (SELECT identity.current_tenant_ids())
  AND (company_id IS NULL OR company_id IN (SELECT identity.current_company_ids()))
  AND communication.is_participant(conversation_id, identity.current_user_id())
);

DROP POLICY messages_insert ON communication.messages;
CREATE POLICY messages_insert ON communication.messages FOR INSERT WITH CHECK (
  tenant_id IN (SELECT identity.current_tenant_ids())
  AND (company_id IS NULL OR company_id IN (SELECT identity.current_company_ids()))
  AND author_user_id = identity.current_user_id()
  AND communication.is_participant(conversation_id, identity.current_user_id())
);
