# Status verificável — Fase 2

**Data de validação:** 5 de setembro de 2026  
**Estado:** concluída e executável

## Escopo entregue

| Requisito | Estado | Evidência |
|---|---|---|
| Ledger imutável | Concluído | Triggers de bloqueio e teste SQL |
| SHA-256 encadeado + Ed25519 | Concluído | Verificação `VALID`, 228 blocos no aceite final |
| Diff e reconstrução | Concluído | `GET /ledger/:entityId/diff` e teste unitário |
| Partições mensais automáticas | Concluído | 4 partições mensais futuras mais partição padrão |
| Detecção de alteração | Concluído | Teste retorna `TAMPERED` e primeiro bloco |
| Verificação diária | Concluído | Cron 02:00 UTC e registros persistidos |
| Prova Merkle exportável | Concluído | Prova de inclusão recalculada no E2E |
| Protocolo atômico | Concluído | 32 requisições concorrentes, 32 números únicos |
| Timeline imutável | Concluído | Dois eventos no E2E e bloqueio de mutação |
| Níveis de acesso | Concluído | `PUBLIC`, `RESTRICTED`, `PRIVATE` com RLS |
| Vista de processo | Concluído | Prazos de 5 e 10 dias confirmados |
| Pesquisa pública sem vazamento | Concluído | Público retornado; restrito ausente |
| Auditoria completa autenticada | Concluído | Sucessos e falha 422 com bloco do ledger |
| Frontend Rconta | Concluído | Criação, timeline, vista, busca, auditoria e Merkle |
| SDK API-first | Concluído | Métodos de protocolo, auditoria e ledger |
| CI | Concluído | Qualidade, cobertura, Docker, E2E, RLS e SQL |

## Evidências do aceite

O cenário ponta a ponta final criou os protocolos `2026-000035` e `2026-000036`, executou 32 criações simultâneas sem colisão, confirmou idempotência, validou dois eventos de timeline, verificou os prazos de vista, bloqueou a publicação de dado pessoal, confirmou a pesquisa pública e recalculou uma prova de inclusão Merkle sobre 229 blocos. A trilha consultada continha 86 eventos.

O gate local terminou com 15 testes da API aprovados. A cobertura de linhas dos arquivos críticos foi **95,07%**, acima do mínimo de 85%. O `pnpm audit --prod --audit-level high` não encontrou vulnerabilidade alta ou crítica; cinco achados moderados permanecem sob observação.

O PostgreSQL confirmou RLS, pesquisa pública filtrada e bloqueio de `UPDATE`/`DELETE` em ledger, timeline e auditoria. O cron inicial aumentou `ledger.verification_runs` de um para dois registros após a recriação da API.

## Achado corrigido durante o aceite

O primeiro teste concorrente expôs uma bifurcação causada pelo uso de `now()` como critério do último bloco. O PostgreSQL fixa `now()` no início da transação. A implementação foi corrigida com `ledger.chain_heads`, posição transacional e `clock_timestamp()`. O novo banco limpo passou no mesmo cenário concorrente com cadeia válida.

## Não feito e lacunas

| Lacuna | Classificação | Tratamento |
|---|---|---|
| PDFs oficiais das Resoluções ANAC 458/2017 e 520/2019 não estavam anexados | `LACUNA-MEDIA` | Validar texto oficial antes de produção regulada |
| Carimbo de tempo externo e cadeia ICP-Brasil | Planejado | Fase 3, documentos e assinaturas |
| Rotação versionada de chaves Ed25519 | Operacional | Definir cerimônia e vigência antes da produção |
| Auditoria de busca pública anônima no ledger de tenant | Delimitação | Mantida apenas em logs HTTP para não fabricar ator/tenant |
| Trava distribuída do cron em múltiplas réplicas | Não necessária na VPS atual | Adicionar liderança se houver escala horizontal |
| Os cinco achados moderados de dependências | Monitoramento | Reavaliar a cada atualização sem quebrar compatibilidade |

## Conclusão

A Fase 2 atende ao prompt executável, às regras globais do projeto e aos testes mínimos de aceite. A Fase 3 pode consumir o protocolo, o ledger e a auditoria como fundação para documentos estruturados, versionamento e assinaturas.
