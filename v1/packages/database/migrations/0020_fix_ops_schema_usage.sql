-- ============================================================
-- VORTEX — Fix: USAGE no schema ops para vortex_app
-- As migrações 0016/0017/0018 concederam privilégios em tabelas e
-- sequências de ops, mas não o USAGE no schema — toda referência de
-- vortex_app ao schema falhava com "permission denied for schema ops".
-- A concessão é idempotente; esta migração cobre bancos que já
-- aplicaram 0016-0019 sem a permissão.
-- ============================================================
GRANT USAGE ON SCHEMA ops TO vortex_app;