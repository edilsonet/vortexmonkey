# Segurança e conformidade da Parte 1

**Autor:** Manus AI

## Modelo de confiança

A Shell e os remotes não decidem regras de negócio. A API valida identidade, vínculo, papel, escopo, atributos e contexto. O PostgreSQL repete o isolamento por RLS. Essa defesa em profundidade evita que uma falha de frontend ou de um guard resulte automaticamente em leitura cruzada.

| Controle | Implementação |
|---|---|
| Autenticação | JWT assinado, issuer e audience validados; access token de 15 minutos |
| Sessão prolongada | Refresh token opaco de 30 dias, hash em banco, rotação e revogação |
| Senhas locais | scrypt, salt aleatório, comparação em tempo constante, bloqueio progressivo |
| Autorização | RBAC + scopes por membership de tenant; empresa validada no vínculo ativo |
| Isolamento de dados | RLS habilitado e forçado em `identity` e `ledger` |
| Repetição de escrita | `Idempotency-Key`, lock Redis e resposta preservada por 24 horas |
| Abuso | Rate limit Redis: auth 10/min, leitura 300/min, escrita 60/min e upload 20/min |
| SQL injection | Queries parametrizadas e DTOs com `class-validator` |
| Segredos | Volume Docker gerado no primeiro uso e arquivos com modo `0600` |
| HTTP | Helmet, CORS explícito, headers Nginx e redaction de autorização/cookies no Pino |
| Integridade | Ledger append-only, hash encadeado, Ed25519 e endpoint de verificação |
| Supply chain | Lockfile, scripts de instalação permitidos por lista e `pnpm audit` no CI |

## RLS e contexto

`DatabaseService.withContext` inicia uma transação e define o contexto por `set_config(..., true)`. O terceiro argumento torna o valor local à transação. O pool não reutiliza contexto de um request anterior.

As funções `current_tenant_ids()` e `current_company_ids()` calculam acesso a partir de memberships e vínculos ativos. O papel da aplicação tem somente os grants necessários. As tabelas de credenciais e refresh tokens não são acessíveis diretamente por esse papel. Funções `SECURITY DEFINER` expõem login e rotação com superfície limitada.

O teste de aceite cria dois usuários no mesmo tenant. Um possui vínculo com a empresa e enxerga uma linha. O outro não possui vínculo e enxerga zero linhas. O guard JWT testa separadamente que selecionar uma empresa sem vínculo retorna HTTP 403.

## Integridade do ledger

O hash usa a sequência canônica `previous_hash | entity_type | entity_id | action_type | payload_estável`. O payload é serializado com ordenação determinística de chaves. Cada hash é assinado com Ed25519. O endpoint de verificação percorre toda a cadeia do tenant, recalcula hashes, verifica o encadeamento e valida assinaturas.

Triggers bloqueiam `UPDATE` e `DELETE`. Constraint triggers diferidos impedem que uma transação finalize com referência MDM para bloco inexistente. O teste SQL comprova que uma tentativa de alteração recebe SQLSTATE `55000`.

## Outbox

O estado MDM, o bloco de ledger e a outbox são gravados na mesma transação. O publisher reivindica eventos com `FOR UPDATE SKIP LOCKED`, publica mensagem persistente no RabbitMQ e registra `published_at`. Uma repetição com a mesma chave idempotente não cria nova linha, bloco ou evento.

## Riscos residuais e limites

O Compose é um ambiente local e de integração. TLS 1.3, WAF, rotação externa de chaves, backup PITR, alta disponibilidade e hardening do host pertencem à fase de infraestrutura. O endpoint `/metrics` deve ser restrito à rede de observabilidade em produção.

OIDC federado, ICP-Brasil, prova de Merkle exportável, antivirus de upload, presigned URLs de documentos e política completa de retenção ainda não foram implementados. Os schemas foram reservados para manter a direção arquitetural.

O audit de produção não apresenta vulnerabilidades altas no gate configurado. Vulnerabilidades moderadas transitivas ainda são reportadas pelo gerenciador e devem continuar monitoradas.

## Referências

[1]: canonical/prompts/parte-1.md "Requisitos de segurança, observabilidade e RLS da Parte 1"
[2]: canonical/07-delimitacao.md "Delimitação e valores oficiais prevalecentes"
[3]: canonical/02-parametros-prazos.md "Parâmetros e prazos regulatórios"
