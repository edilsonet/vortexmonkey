# VORTEX — Fase 4

Billing (6 assinaturas + comissao 3%), PPSP RBAC 120, Hub de Alertas Preditivos.

## Feito

- Migracao `0010_billing_ppsp_alerts.sql`: products, subscriptions, invoices, commissions, ppsp_*, alerts + RLS
- Seis produtos vendaveis; Catalogo Central recusado
- Assinar gera ledger + protocolo + fatura PAID (Asaas ainda nao)
- Comissao 3% do vendedor, comprador isento; evento de contratacao no Recrutamento
- PPSP: programa com ARSO, membros, toxicologico 90 dias, sorteio deterministico >=25%/ano
- Hub: INFO/WARNING/CRITICAL/BLOCKING; badge na Shell; ack
- Anuncios da Rconta somem se VIP ou qualquer ERP ativo (so na conta do comprador)
- UI: Assinaturas (todos), PPSP, Alertas no sino

## Nao feito

- Gateway Asaas / cobranca recorrente real
- Integracao Gov.br / laboratorio toxicologico
- Chat, e-mail transacional, comunicados (Fase 8)
- ERPs 43/145, 91/135, 141/142, 153 (Fases 5-7)
- RLoja comissao em venda real (so politica + tabela)
