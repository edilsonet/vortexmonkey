CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS ledger;
CREATE SCHEMA IF NOT EXISTS protocol;
CREATE SCHEMA IF NOT EXISTS documents;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS subscriptions;
CREATE SCHEMA IF NOT EXISTS oauth;
CREATE SCHEMA IF NOT EXISTS signatures;
CREATE SCHEMA IF NOT EXISTS compliance;
CREATE SCHEMA IF NOT EXISTS notifications;

GRANT USAGE ON SCHEMA identity, ledger, protocol, documents, catalog, subscriptions, oauth, signatures, compliance, notifications TO vortex_app;
ALTER ROLE vortex_app SET search_path = public, identity, ledger, protocol, documents, catalog, subscriptions, oauth, signatures, compliance, notifications;
