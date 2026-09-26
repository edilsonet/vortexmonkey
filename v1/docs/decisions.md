# Decisões arquiteturais da Parte 1

**Autor:** Manus AI

## ADR-001 — Monólito modular no backend

**Decisão.** As capacidades backend residem em uma API NestJS única, separadas por módulos. A instrução do projeto que exige monólito modular prevalece sobre a árvore ilustrativa de serviços da Parte 1.

**Consequência.** Estado MDM, ledger e outbox compartilham a mesma transação PostgreSQL. O custo e a latência permanecem adequados a uma VPS. A extração futura exige evidência de escala ou isolamento operacional, não preferência abstrata por microserviços.

## ADR-002 — Tenant como contexto

**Decisão.** Usuários e empresas são entidades globais. `tenant_users`, `tenant_companies` e `relationships` determinam o contexto de acesso. Não existe banco, schema ou cópia da pessoa por cliente.

**Consequência.** O MDM preserva identidade única. RLS precisa combinar tenant e vínculo ativo. Tokens carregam memberships e scopes específicos de cada tenant.

## ADR-003 — Shell host e remotes federados

**Decisão.** A Shell controla navegação, tema, seleção de aplicativo e fallback. Cada aplicativo expõe `./App` como remote Module Federation e importa o Design System versionado.

**Consequência.** Uma falha de remote é isolada por error boundary. Os menus mudam pelo subdomínio. Contratos compartilhados evitam acoplamento direto entre aplicativos.

## ADR-004 — Ledger na mesma transação

**Decisão.** A escrita do estado é validada primeiro. A referência ao bloco é verificada por constraint trigger diferido no commit. Em seguida, o bloco e a outbox são anexados na mesma transação.

**Consequência.** Uma violação de unicidade não deixa evento falso no ledger. Uma falha de assinatura ou outbox reverte o estado. A tabela particionada não precisa de uma FK incompatível com sua chave primária composta.

## ADR-005 — Parâmetros regulatórios versionados

**Decisão.** Números oficiais não ficam embutidos nos serviços. A validade de 1.095 dias e o alerta de 60 dias são seeds versionados em `compliance.regulatory_parameters`.

**Consequência.** Alterar uma regra futura exige nova versão e vigência. A Parte 1 ainda não contém o motor declarativo completo, mas não exige recompilação para os parâmetros já externalizados.

## ADR-006 — Segredos locais em volume

**Decisão.** O Compose gera segredos no primeiro uso. A aplicação lê arquivos montados. Não existe `.env` com credenciais no repositório.

**Consequência.** O ambiente local é reproduzível e não expõe senhas fixas. Produção deverá substituir o gerador local por secret manager e política de rotação.

## Referências

[1]: canonical/prompts/parte-1.md "Arquitetura e regras imutáveis da Parte 1"
[2]: canonical/07-delimitacao.md "Delimitação e precedência das fontes"
[3]: canonical/02-parametros-prazos.md "Parâmetros regulatórios oficiais"
