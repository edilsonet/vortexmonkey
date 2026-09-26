# VORTEX — Fase 8

RLoja (schema `market`), Central de Comunicacao, BRE e recuperacao de senha.

## Feito

- Migracao `0014_rloja_comm_bre_auth.sql`: listings/orders, threads/messages/emails/announcements, bre_rules, password_resets + RLS
- Anuncio e visao de `stock.items`; quarentena/vendido bloqueados; 3% vendedor / comprador 0
- Admin/Rep. Legal aprova rascunho e publica; compra marca item SOLD + ledger + protocolo
- Chat mesmo tenant; comunicados com titulo/corpo; caixa de e-mail transacional (fila local, sem Resend)
- BRE: 14 regras em `compliance.bre_rules`; evaluate fail-open em codigo desconhecido
- Login sem e-mail/senha pre-preenchidos; link Esqueci a senha → `/recuperar`
- UI RL: Dashboard, Vitrine, Pedidos, Comissoes; Chat/E-mails/Comunicados reais
- Login vazio: 422 `VALIDATION_ERROR` (sem autenticar)
- Smoke: listing rascunho, user 403 na publicacao, admin publica, pedido `2026-000020` comissao 3 / comprador 0; chat + comunicado; BRE 14 regras; forgot/reset + relogin

## Nao feito

- Asaas (PIX/boleto/cartao) e webhook
- Resend SMTP real; Sentry; scraping RAB
- Catalogo Central busca/insercao (CC ainda arvore)
- CRM/admin dos ERPs
- Motor BRE ligado a cada acao de dominio (hoje evaluate + seeds)
