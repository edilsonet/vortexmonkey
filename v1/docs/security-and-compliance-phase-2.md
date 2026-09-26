# Segurança e conformidade — Fase 2

## Controles implementados

| Controle | Implementação | Evidência |
|---|---|---|
| Imutabilidade do ledger | Triggers bloqueiam `UPDATE` e `DELETE` | `tools/test-phase2-immutability.sql` |
| Imutabilidade da timeline | Triggers bloqueiam `UPDATE` e `DELETE` | Teste SQL aprovado |
| Imutabilidade da auditoria | Triggers bloqueiam `UPDATE` e `DELETE` | Teste SQL aprovado |
| Integridade | SHA-256 encadeado e Ed25519 | `GET /api/v1/ledger/verify` |
| Concorrência | Advisory lock e `ledger.chain_heads` por tenant | 32 criações concorrentes sem colisão ou bifurcação |
| Não repúdio | Assinatura de cada hash e da raiz Merkle | Exportação JSON |
| Multi-tenancy | RLS forçado e contexto por tenant/empresa | `pnpm db:rls-test` |
| Dados pessoais | Proibição de `PUBLIC` e hipótese obrigatória | Testes unitários e E2E 422 |
| Segredos | Arquivos Docker secrets e redação de auditoria | Nenhum segredo no repositório |
| Idempotência | Redis por 24 horas | Retry devolveu o mesmo protocolo |
| Auditoria | Sucesso e falha autenticados, bloco próprio | 42 eventos lidos no aceite |

## RLS

As tabelas `protocol.protocols`, `protocol.timeline_events`, `protocol.protocol_views`, `ledger.audit_events`, `ledger.verification_runs` e `ledger.chain_heads` usam `ENABLE ROW LEVEL SECURITY` e `FORCE ROW LEVEL SECURITY`.

O protocolo restrito exige correspondência com `app.current_company_id`. A timeline aplica o nível de acesso de cada evento e exige acesso ao protocolo. A vista separa `company_id`, empresa solicitante, de `owner_company_id`, empresa proprietária.

## Pesquisa pública

`protocol.public_search()` é uma função `SECURITY DEFINER` de superfície mínima. Ela retorna somente número, assunto, tipo de entidade e data. O predicado exige `access_level = 'PUBLIC'` e `contains_personal_data = false`. O teste de aceite confirmou ausência de vazamento do protocolo restrito criado no mesmo cenário.

## Auditoria e privacidade

A auditoria registra metadados suficientes para reconstrução operacional sem persistir credenciais. Campos sensíveis conhecidos são redigidos antes do ledger e da tabela. A resposta completa não é armazenada; somente seu hash SHA-256 é preservado.

Consultas públicas anônimas permanecem nos logs HTTP, mas não recebem bloco em um ledger de tenant. Atribuir um tenant ou usuário fictício criaria evidência falsa. Esta delimitação é intencional.

## Referências locais

A implementação segue a matriz e os prompts canônicos anexados. A **IS 43.9-004A** local sustenta os requisitos de rastreabilidade, segurança, impressão identificada, contingência e disponibilidade à fiscalização. Os PDFs oficiais das Resoluções 458/2017 e 520/2019 não estavam no conjunto anexado e exigem validação documental futura.
