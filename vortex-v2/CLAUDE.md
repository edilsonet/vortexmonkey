# CLAUDE.md — VORTEX v2 (CONTRATO GLOBAL E PLANO DE CRIAÇÃO)

> Leia este arquivo primeiro, sempre. Ele define identidade, princípios imutáveis, arquitetura, regras de engenharia e o plano de construção completo do ecossistema VORTEX.
> **Versão 2 — 10/09/2026.** Substitui a v1 (React 19 + Turborepo). Mudanças de stack: frontend **Angular moderno** (signals, standalone components, `inject()`, `@if`/`@for`), monorepo **Nx**, UI **Angular Material**. Mudanças de negócio: **Recrutamento sem comissão** (embutido na assinatura do ERP ou assinatura só de vagas), **Contabilidade de dupla entrada especificada**, **lacunas do docs/06 injetadas** neste contrato.
> Arquivos de apoio: `docs/00-visao-geral.md` a `docs/10-navegacao-por-app.md` e `docs/prompts/parte-1.md` a `parte-10.md` (v2 — 10 partes; ver seção 14).
> Valor oficial: `docs/07-delimitacao.md` prevalece sobre qualquer outro em caso de divergência.

---

## 1. IDENTIDADE

O VORTEX é um ecossistema integrado de **conformidade, governança, RH, estoque e comércio** para a aviação civil brasileira, cobrindo os segmentos regulados pela ANAC (RBAC 01, 21, 23, 25, 26, 27, 29, 33, 35, 39, 45, 43/145/120, 61/63/65, 67, 91/119/121/135, 137, 141/142/145-010/121-006/121-007/121-008/121-011/135-001/135-003/137-207, 153, 183).

- Registros eletrônicos imutáveis: **Resolução ANAC nº 458/2017**.
- Assinatura eletrônica: **Lei nº 14.063/2020**.
- Protocolo eletrônico: **Resolução ANAC nº 520/2019** (formato `AAAA-NNNNNN`).

Referências conceituais de esqueleto de ERP/CRM (apenas ideia, sem código): `docs/08-odoo-esqueleto.md` e `docs/09-mapa-adaptacao-vortex.md`.

---

## 2. STACK (IMUTÁVEL)

### 2.1 Backend
- **NestJS + TypeScript estrito**, monorepo **Nx** (mesmo workspace do frontend).
- Banco: **PostgreSQL 16** com Row-Level Security (RLS). **Nunca MongoDB.**
- Acesso a dados: **TypeORM** para o dia a dia + **SQL nativo obrigatório** para policies RLS, triggers, funções PL/pgSQL e migrações. **Sem Prisma** (não expressa RLS — decisão registrada 10/09/2026). **Sem CQRS** (`@nestjs/cqrs`): o ledger append-only já é o event log; duas fontes de verdade violam a regra 1. **Sem TimescaleDB** até o volume de auditoria justificar (reavaliar com métricas reais).
- Cache/sessão/rate-limit: **Redis**. Fila/eventos: **RabbitMQ**. Arquivos: **MinIO** (presigned URLs).
- Tempo real: **WebSockets** (`@nestjs/websockets` + RxJS no frontend) para chat, alertas e confirmações do ledger na Central de Comunicação.
- Um único backend `api.vortex.com`.

### 2.2 Frontend
- **Angular 19+ (moderno):** componentes **standalone**, **signals** como padrão de estado e reatividade, injeção de dependência com **`inject()`** (nunca construtor em código novo), controle de fluxo **`@if`/`@for`/`@switch`** (nunca `*ngIf`/`*ngFor` em código novo), `input()`/`output()` function-based, `ChangeDetectionStrategy.OnPush` em todos os componentes.
- UI: **Angular Material** (tabelas, forms, dialogs, acessibilidade) + Design System próprio `@vortex/ui` (tokens, temas e o ValidationBadge — ver seção 9).
- Estado: **signals** para estado de componente; **NgRx ComponentStore** apenas para estado complexo compartilhado dentro de uma feature-lib. Sem NgRx global (Store/Effects) nesta fase.
- **SPA única** (ver seção 7 — Shell e caminho de migração).
- Multi-tenant lógico por RLS: tenant é **contexto**, nunca dono do dado.

### 2.3 Contratos compartilhados
- **`libs/shared-dto`**: única fonte de tipos, DTOs, enums controlados e regras de validação (class-validator) importada tanto pelo Angular quanto pelo NestJS. O frontend nunca declara tipo de API duplicado.

---

## 3. PRINCÍPIOS ARQUITETURAIS (IMUTÁVEIS)

1. **Núcleo dono da verdade — separado da Rconta (decisão 12/09/2026):** o **NÚCLEO** é um aplicativo/serviço próprio (subdomínio dedicado) que concentra Pessoas, Profissionais, Empresas, Estoque, Catálogo, Documentos, **Ledger** e Protocolo. **TODOS os apps — Rconta, ERPs, RLoja, Recrutamento, Travel, Fretamento, App ANAC e futuros — são consumidores, sem exceção:** inserem no núcleo via API e consomem dele; nenhum mantém cadastro próprio de pessoa, produto, vaga ou currículo. O mesmo dado pode ser criado/editado por qualquer app autorizado (ex.: currículo pela Rconta OU pelo Recrutamento; endereço pela Rconta, RLoja OU Recrutamento) — o que muda é apenas o campo **app de origem** no evento do ledger; o cadastro vive uma única vez no núcleo. O núcleo pode se ligar por meio de API a gov.br, Google, Microsoft e outros provedores.
2. **Ledger imutável (append-only) — linha do tempo com conteúdo:** todo evento relevante vira bloco com hash SHA-256 encadeado + assinatura Ed25519, e o payload contém **o conteúdo completo do que aconteceu**: quem fez (e com qual papel — administrador, usuário, empresa, vendedor ou comprador), quando iniciou, quando terminou, o que aconteceu e de qual aplicativo veio. **O ledger É a linha do tempo** — não existe timeline separada nem histórico duplicado; o que qualquer app exibe é um **filtro projetado do ledger** (por entidade, pessoa, empresa, aeronave, peça ou OS). UPDATE/DELETE bloqueados por trigger. **Payload cifrado em repouso e acesso descriptografado governado** (ver seção 5-A).
3. **Validação em níveis que nunca bloqueia fluxo:** N0 pendente (⚪) → N1 sistema (🟡) → N2 fonte oficial (🟢 gov/Receita/Correios/SACI/RAB) → N3 empresa/administrador (🔵 autêntico). Dado pendente é exibido sem selo; o fluxo nunca para por aprovação.
4. **Vínculo misto com dupla confirmação:** pessoa↔empresa só fica ATIVO quando os dois lados aprovam.
5. **Monetização:** RLoja por **comissão de 3% do vendedor** (comprador isento). **Recrutamento SEM comissão** (ver seção 4.3). **8 produtos por assinatura (v2):** Rconta VIP, Assinatura de Vagas (Recrutamento sem ERP), ERP Manutenção, ERP Operadores, ERP Cursos e Treinamentos, **ERP Agrícola**, ERP Aeródromos, **Publicações** (app próprio, v4). **Certificações** (v4) é produto avulso na RLoja, não assinatura. **Catálogo não é vendido** (serviço do Núcleo, só inserção/busca).
6. **Cursos só pelo ERP de Cursos e Treinamentos (141/142/145-010):** é o único que cria e vende cursos na RLoja; os demais ERPs têm treinamento interno apenas para funcionários.
7. **Estoque e custódia:** estoque pessoal no módulo Profissional; estoque empresarial (1 por empresa) no módulo Empresarial; catálogo único no **Núcleo** (serviço do Cadastro Central). Contratou ERP → custódia migra para o ERP. Suspendeu/cancelou → estoque volta à Rconta como **um único estoque** com marcação de origem por item. Regularizou → o sistema **pergunta** se restaura os estoques nas posições originais; itens vendidos não voltam.
8. **Banners:** Rconta grátis exibe anúncios; Rconta VIP ou compra de qualquer ERP remove os anúncios **apenas na Rconta do comprador**.
9. **Dois livros, dois propósitos (nunca confundir):** o **ledger regulatório** (conformidade, Res. 458/2017) registra eventos de domínio; a **Contabilidade** (dupla entrada, seção 6) escritura o financeiro. Um evento financeiro pode gerar bloco no ledger E lançamento contábil — mas um não substitui o outro.
10. **Registro é um só; o resto é projeção:** os **eventos primários** (lançamento de voo, serviço de manutenção, liberação APRS) nascem uma única vez no ledger. Totais e mapas — como a Parte I da caderneta (horas/ciclos/pousos do mês, TSN/CSN/LDG acumulados) e a disponibilidade do controle de manutenção — são **projeções agregadas calculadas** a partir dos eventos primários, sempre recomputáveis e conferíveis contra o ledger. Diário de bordo, CIV do piloto e controle de manutenção exibem **espelhos do mesmo registro** — nenhum app duplica. A liberação APRS alimenta automaticamente o controle de manutenção (nova disponibilidade de horas/ciclos/pousos/tempo-calendário, com data — há tarefas que vencem por calendário).
11. **Plataforma multi-tenant; RLoja multi-vendor:** a plataforma (Rconta, ERPs, Catálogo, Recrutamento) é multi-tenant (RLS por linha); a RLoja é **marketplace multi-vendor** — vender não exige tenant nem assinatura: `catalog.listings` aceita `seller_person_id` (pessoa física com Rconta grátis, estoque pessoal) OU `seller_company_id`; a comissão de 3% do vendedor é a única receita da RLoja; a RLoja só projeta visões do estoque, nunca é dona do dado.

---

## 4. MODELO EM CAMADAS (ERP + CRM completo)

### 4.1 Camada administrativa geral (vale para qualquer empresa/tenant)
RH · Financeiro · **Contabilidade (dupla entrada — seção 6)** · Compras · Comercial/CRM · Estoque/Administrativo · Documentos/Contratos.
- **RH:** colaboradores (vínculo aprovado da Rconta), contratos, cargos, escalas, férias/ausências, ponto, despesas, treinamentos internos.
- **Financeiro:** contas a pagar/receber, faturas, cobranças, fluxo de caixa, conciliação.
- **Compras:** pedidos, cotações, fornecedores (empresas do núcleo), recebimento, faturamento.
- **Comercial/CRM:** pipeline de oportunidades do negócio (estágios, equipes, motivos de perda).
- **Documentos/Contratos:** contratos, renovações, alertas de vencimento.

### 4.2 Camada de domínio (particularidades por ERP)
- **ERP Manutenção (43/145):** Biblioteca Técnica · Suprimentos (Ferramentaria, Estoque técnico, Compras, Importações) · Setor de Registros · Manutenção/Oficina (**fluxo em 12 etapas — máquina de estados, seed `rbac-43-145`**).
- **ERP Operadores (91/121/135/137):** 2 departamentos — **Operações** e **Manutenção** (+ Aeroagrícola 137 quando aplicável).
- **ERP Cursos e Treinamentos (141/142/145-010):** departamento **Cursos e Treinamentos**.
- **ERP Aeródromos (153):** pista/RWYCC · SESCINC · fauna/SIGRA · SGSO · infraestrutura.

### 4.3 RECRUTAMENTO — NOVO MODELO (sem comissão)
- **Nenhuma cobrança por evento.** Não existe comissão de contratação, garantia paga nem cobrança do candidato. **Pessoas nunca pagam.**
- **Porta de entrada 1 — empresa com qualquer ERP:** o uso do Recrutamento vem **embutido na assinatura do ERP** (permissão `recrutamento:incluso`). Custo zero adicional.
- **Porta de entrada 2 — empresa sem ERP:** compra a **Assinatura de Vagas** (produto próprio, sem ERP).
- **Origem das vagas:** a vaga pode nascer **no RH do ERP** ou **direto no Recrutamento**. Ambos os caminhos apenas **espelham os dados do núcleo**.
- **Recrutamento completo (decisão 12/09/2026):** permite tudo que o módulo Profissional da Rconta faz (currículo, cursos, treinamentos, documentos, experiências) **+ o setor de RH completo** (cargo, função, salário, requisitos, objetivo e demais dados para anunciar uma vaga) — tanto no ERP quanto no Recrutamento.
- **Declarações automáticas de experiência (decisão 12/09/2026):** geradas pelo sistema a pedido do funcionário ou quando a empresa encerra o vínculo — é direito do trabalhador ter a declaração de que exerceu o cargo/função pelo período X. Documento estruturado, assinado e ancorado no ledger, gerado do histórico de vínculo do núcleo.
- O evento de contratação finalizada continua criando o **vínculo automático Rconta ↔ RH do ERP** — mas **não dispara cobrança alguma**.
- Vagas externas (públicas) e internas (só funcionários com vínculo ativo) mantidas.

### 4.4 CRM por ERP
Cada ERP tem seu pipeline comercial do domínio: Operadores vendem fretamento/charters (e o app **Fretamento** conduz a venda/reserva); Manutenção vende serviços de manutenção; Cursos vendem matrículas; Aeródromos vendem contratos/espaços.

### 4.5 ESTOQUE BIDIRECIONAL RLoja ↔ ERP (decisão 12/09/2026)
- **Estoque criado na RLoja** (empresa sem assinatura, perfil privado): cadastro do produto vai ao **núcleo**; ao contratar um ERP, as lojas ativas/inativas da RLoja **viram estoque no ERP** automaticamente (evento de custódia no ledger).
- **Estoque criado no ERP:** pode virar loja na RLoja (perfil privado ou público) — o anúncio é sempre visão do estoque.
- **Vender na RLoja não exige assinatura** (multi-vendor); a comissão de 3% do vendedor é a única receita da RLoja.
- O cadastro do produto **nunca** fica no ERP nem na RLoja — fica no núcleo (Catálogo + Estoque).

---

## 5. CENTRAL DE COMUNICAÇÃO (barra superior da Shell — em todos os apps)

- **Chat:** conversas entre usuários da mesma empresa/tenant + conversas do processo seletivo — **em tempo real via WebSockets**.
- **Alertas:** badges do Hub Preditivo (INFO/WARNING/CRITICAL/BLOCKING) — atualização push.
- **E-mails:** caixa de e-mails transacionais.
- **Comunicados Oficiais:** avisos da plataforma e da empresa.
- **Tema:** claro → escuro → personalizado (alterna a cada clique).
- Toda conversa/comunicado relevante gera bloco no Ledger; a Central apenas **exibe** (filtro), sem duplicar.

---

## 5-A. LEDGER: CRIPTOGRAFIA DO CONTEÚDO E ACESSO AUDITADO (Res. ANAC 458/2017)

> **Modelo zero-trust: administrar sem ver.** O payload do bloco é **cifrado em repouso**. O hash e a assinatura ficam sempre em claro (verificáveis sem descriptografar); o **conteúdo** só é revelado sob regra de acesso. **Ninguém acessa conteúdo por padrão — nem os administradores da plataforma.** Toda abertura de acesso é, ela mesma, um evento no ledger.

### 5-A.1 Quem acessa o conteúdo descriptografado
1. **O dono do dado** (usuário): seus próprios filtros — cadastro pessoal, profissional, documentos, currículo, empregos, configurações — e os ERPs a que tem acesso (como assinante dono, procurador ou funcionário do assinante). O acesso existe **enquanto existe o vínculo**; cessado o vínculo/assinatura, cessado o acesso.
2. **Empresa/assinante:** o filtro completo de tudo que aconteceu na sua assinatura e no cadastro das suas empresas (ex.: clicando na empresa vinculada como responsável legal, o dono vê o histórico desde a compra da assinatura). Assinatura encerrada → o histórico **congela** (nada novo é gerado) mas **permanece legível pelo dono e retido** para auditoria (retenção mínima de 5 anos).
3. **Administradores da plataforma (VORTEX): NÃO têm acesso ao conteúdo por padrão.** A função do administrador é administrar o sistema, não espionar clientes — nem usuários, nem empresas. Acesso a conteúdo de tenant exige **protocolo** (ver 5-A.2).
4. **ANAC (auditoria/fiscalização):** exclusivamente pelo **App ANAC** (ver 5-A.3), sobre o filtro solicitado.
5. **Justiça (investigação com segredo de justiça):** ver 5-A.4.

### 5-A.2 Acesso administrativo por protocolo (suporte)
1. O administrador só descriptografa conteúdo de um tenant quando existe **solicitação do próprio dono** registrada em **protocolo** (ex.: correção de cadastro que só o suporte pode executar, como alteração de nome por decisão judicial) — e informa o **número do protocolo** na concessão. Sem protocolo, sem acesso.
2. Toda descriptografia administrativa gera meta-eventos no ledger central: **quem** descriptografou, **qual escopo** (empresa/usuário/produto/serviço), **quando começou, quando terminou** e **qual protocolo** justificou.
3. Os **administradores proprietários** (dono do VORTEX) revisam o relatório de todas as descriptografias administrativas: "por que você acessou? por que não foi pelo protocolo do sistema?". Acesso sem justificativa de protocolo é falta grave.
4. Concessão **temporária**: expira automaticamente; o filtro volta ao estado cifrado.
5. O dono do dado é **notificado** de todo acesso administrativo ao seu conteúdo.

### 5-A.3 Auditoria ANAC — consentida primeiro, compulsória depois
1. O auditor ANAC solicita, pelo **App ANAC**, acesso a um **filtro específico** do ledger (pessoa, empresa, aeronave, peça, OS ou acidente).
2. O **proprietário do dado é notificado** e decide:
   - **Autorizar** → acesso liberado ao auditor solicitante (somente leitura).
   - **Recusar** → a ANAC **não acessa**; pode, pelo App ANAC, **suspender a certificação** da empresa ou da aeronave pela negativa de acesso; e pode então emitir **solicitação compulsória** aos administradores da plataforma, que passam a exibir os dois botões (autorizar / compulsório).
3. **Somente leitura:** o auditor NÃO edita, NÃO inclui eventos, NÃO cria versões. O objetivo da auditoria é apontar o que está errado e quem está errado; a **correção é feita pelo próprio auditado**, por inclusão de novos eventos com as provas da correção (append-only).
4. **Notificação:** toda auditoria — consentida ou compulsória — **notifica o auditado** de que seu conteúdo está sendo acessado, exceto segredo de justiça (5-A.4).
5. **Escopo e isolamento:** somente o **solicitante** vê o conteúdo descriptografado do filtro solicitado; qualquer outra pessoa (inclusive outros auditores) não vê.
6. **Ciclo de vida:** todo o ciclo gera meta-eventos — quem solicitou, quem aprovou, quem visualizou, quando começou, quando terminou. Encerrada a audiência, o acesso é **cessado automaticamente** e o filtro volta cifrado.

### 5-A.4 Segredo de justiça
1. Investigação judicial com **segredo de justiça** (mandado apresentado): acesso concedido apenas ao **administrador que autorizou** e aos **administradores proprietários** do VORTEX — os demais administradores **nem tomam conhecimento**.
2. Os meta-eventos desse acesso são marcados como **confidenciais** (visíveis apenas ao círculo acima); o auditado **não é notificado** enquanto durar o segredo.
3. Findo o segredo (por decisão judicial), os meta-eventos tornam-se visíveis conforme as regras gerais.

### 5-A.5 Implementação
- **Cifra:** payload cifrado com **AES-256-GCM**; **chave de dados por tenant** em envelope encryption — **os administradores NÃO detêm as chaves de dados dos tenants**; a única via de descriptografia é o **serviço de concessão de acesso**, que só libera a chave com concessão ativa (protocolo de suporte, auditoria autorizada/compulsória ou ordem judicial).
- **Acesso do dono:** descriptografia transparente para o próprio dado, mediada por permissão (RBAC/ABAC + vínculo ativo).
- **Concessões:** tabela `ledger.access_grants` (`granted_by`, `grant_type` (DONO / SUPORTE_PROTOCOLO / AUDITORIA_CONSENTIDA / AUDITORIA_COMPULSORIA / JUSTICA), `protocol_number`, `scope_filter`, `read_only` (sempre TRUE para terceiros), `confidential` (segredo de justiça), `expires_at`, `revoked_at`) + meta-eventos `ACCESS_REQUESTED / GRANTED / VIEWED / EXPIRED / REVOKED`.
- **Verificação sem descriptografar:** jobs de integridade (hash/assinatura) rodam sobre os dados cifrados — a integridade é pública; o conteúdo, não.
- **RLS + criptografia:** a RLS isola tenants entre si; a criptografia protege contra insiders da plataforma. **As duas camadas são necessárias** — uma não substitui a outra.

### 5-A.6 Continuidade e recuperação (backup do núcleo)
1. **A cadeia de hashes detecta violação; o backup restaura o conteúdo.** O job de verificação (6h) localiza exatamente onde a cadeia rompeu; o backup devolve o conteúdo original anterior à violação.
2. **Snapshot diário completo** do PostgreSQL (núcleo + todos os schemas) + **WAL archiving contínuo** (PITR — restauração a qualquer minuto, não só ao dia).
3. **Backup imutável offsite** (object lock/WORM, ex.: S3/MinIO com retention): o hacker que comprometer o servidor NÃO consegue apagar os backups.
4. **Backups cifrados com chave própria**, separada das chaves de tenant e da chave-mestra.
5. **MinIO:** versionamento de bucket + replicação offsite (arquivos e documentos).
6. **Restauração reconciliada:** restaurar backup NÃO pode apagar eventos já ocorridos (anti-fraude). Toda restauração é validada contra a cadeia de hashes do ledger (eventos posteriores ao ponto de restauração são revalidados) e gera meta-evento `SYSTEM_RESTORED`. O ledger é a régua; o backup é a cópia.
7. **Teste de restauração** trimestral em ambiente isolado, com relatório (backup não testado não é backup).
### 5-A.7 Ambiente e infraestrutura (fase piloto → produção)
1. **Princípio:** backup no mesmo VPS do banco não é backup — deve viver em outra máquina, outra conta e, idealmente, outro provedor.
2. **Fase piloto (desenvolvimento/primeiros clientes):** VPS principal (produção do sistema) + **segundo VPS básico (2–4 GB) em conta separada** (preferir provedor diferente do principal) como destino de backup, com repositório **append-only** (restic/rclone — o destino não aceita delete). Fluxo: snapshot diário + WAL contínuo (PITR) → cifrado (chave própria) → enviado ao segundo VPS.
3. **Fase produção (escala):** destino primário de backup = **object storage com Object Lock/WORM** (S3-compatível, ex.: Backblaze B2) + o segundo VPS como segunda cópia. Regra **3-2-1**: 3 cópias, 2 mídias, 1 fora do site.
4. **Chave de backup separada e fora do VPS principal** (secret manager externo ou cofre físico — aceitável e comum para sistema regulatório). Backup cifrado cuja chave morre com o servidor é backup inútil.
5. **Crescimento do VPS principal:** 4 GB/1 core serve ao piloto; com clientes reais, migrar para VPS maior ou cluster (Docker Compose → escalonamento) — decisão por métricas, não por especulação.
6. **GitHub versiona código apenas** (ver 5-A.6.8) — nunca substitui backup de banco/arquivos/chaves.

---

## 5-B. BLOCO DE ASSINATURA ELETRÔNICA (padrão VORTEX — referência SEI/ANAC)

> Todo documento assinado exibe, ao final, um **bloco de assinatura** no padrão dos documentos oficiais ANAC/SEI — QR code + manifesto textual. O documento inteiro permanece **texto estruturado**: QR em **SVG** (fallback base64 PNG), logomarcas em SVG/base64. PDF só sob demanda (efêmero).

### 5-B.1 Composição do bloco
1. **QR code (SVG)** → URL pública de autenticidade com os códigos de verificação.
2. **Manifesto textual** (gerado do ledger, nunca digitado à mão):
   - "Documento assinado eletronicamente por **[nome]**, **[papel/cargo]**, **[empresa]**, em **[data] às [hora]**, conforme horário oficial de Brasília, com fundamento no art. 4º do Decreto nº 10.543, de 13 de novembro de 2020."
   - "A autenticidade deste documento pode ser conferida em **https://[domínio]/ass/autenticidade**, informando o **código verificador [ID]** e o **código CRC [8 hex]**."
3. **Códigos:** verificador = ID da assinatura/documento; CRC = primeiros 8 hex do `sha256_hash` do documento (conferência rápida sem expor o hash completo).
4. **Múltiplos signatários:** um bloco por signatário (ordem cronológica de assinatura).

### 5-B.2 Página de autenticidade (`/ass/autenticidade`)
- **Pública** (nível PUBLIC): informa código verificador + CRC → confirma autenticidade, signatário(es), data/hora e integridade — **sem expor o conteúdo** do documento.
- Consulta gera meta-evento no ledger (quem verificou, quando — quando identificável).

### 5-B.3 Regras
1. Manifesto e QR são **dois renderizadores da mesma verdade** (dados do ledger) — divergência entre eles invalida a verificação.
2. O bloco é gerado no momento da assinatura e **selado junto com o documento** (não se regenera).
3. Assinaturas de nível SIMPLES, AVANCADA e QUALIFICADA_ICP usam o mesmo bloco, com o fundamento legal correspondente.

---

## 6. CONTABILIDADE DE DUPLA ENTRADA (camada financeira dos ERPs)

> Decisão 10/09/2026: especificada já no contrato (não adiada). Vive na **camada administrativa geral** de qualquer tenant; o ledger regulatório permanece distinto (princípio 9).

### 6.1 Entidades (schema `accounting`)
```sql
CREATE TABLE accounting.chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    company_id UUID NOT NULL,
    code VARCHAR(20) NOT NULL,            -- ex.: 1.1.1.01.001
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('ATIVO','PASSIVO','PATRIMONIO_LIQUIDO','RECEITA','DESPESA')),
    parent_id UUID REFERENCES accounting.chart_of_accounts(id),
    is_posting BOOLEAN NOT NULL DEFAULT TRUE,  -- só conta folha recebe lançamento
    ledger_block_id UUID,
    UNIQUE (tenant_id, code)
);

CREATE TABLE accounting.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    company_id UUID NOT NULL,
    entry_date DATE NOT NULL,
    description VARCHAR(500) NOT NULL,
    source_module VARCHAR(50) NOT NULL,   -- FINANCEIRO, COMPRAS, RLOJA, FOLHA, MANUAL
    source_entity_id UUID,                -- fatura, pedido, venda etc.
    status VARCHAR(20) NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO','CONTABILIZADO','ESTORNADO')),
    -- consistência de dupla entrada no nível do lançamento:
    balanced BOOLEAN GENERATED ALWAYS AS (NOT EXISTS (
        SELECT 1 FROM accounting.journal_lines l
        WHERE l.entry_id = accounting.journal_entries.id
        HAVING SUM(l.debit_amount) <> SUM(l.credit_amount)
    )) STORED,
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE accounting.journal_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES accounting.journal_entries(id),
    account_id UUID NOT NULL REFERENCES accounting.chart_of_accounts(id),
    debit_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
    credit_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
    CHECK (NOT (debit_amount > 0 AND credit_amount > 0))  -- linha é débito OU crédito
);
```

### 6.2 Regras contábeis
1. **Partidas dobradas:** todo `journal_entries` exige Σ débitos = Σ créditos; lançamento desbalanceado é rejeitado no serviço (a constraint `balanced` é a última linha de defesa).
2. **Lançamento imutável:** `CONTABILIZADO` não aceita edição; erro → lançamento **estorno** (novo par débito/crédito), nunca UPDATE.
3. **Origem rastreável:** todo lançamento automático referencia `source_module` + `source_entity_id` (fatura da RLoja, pedido de compra, folha) e gera bloco no ledger.
4. **Plano de contas padrão** brasileiro (normas públicas — CPC/ITG, conhecimento comum) semeado por seed; tenant pode estender, nunca quebrar a estrutura.
5. **Relatórios:** diário, razão, balancete, DRE simplificada, fechamento mensal.
6. **Frontend:** telas de lançamento com validação em tempo real do balanceamento (signal computado `Σdébito − Σcrédito` exibido ao digitar).

---

## 7. SHELL — SPA ÚNICA COM CAMINHO DE MIGRAÇÃO (Opção A → B → C)

### 7.1 Decisão (10/09/2026)
**SPA única Angular** no workspace Nx, com **8 feature-libs** (uma por aplicativo) carregadas por **lazy loading de rotas**. Os subdomínios (`rconta.vortex.com`, `mro.vortex.com`, …) apontam para o mesmo bundle; o host resolve a rota inicial pelo subdomínio.

### 7.2 Como o esqueleto já nasce preparado para o desmembramento
1. **Uma feature-lib por app** (`feature-rconta`, `feature-mro`, …) — nunca um app importando código de outro app.
2. **Module boundaries do Nx** (regra ESLint `@nx/enforce-module-boundaries`): `feature-*` não se importam entre si; só podem importar `libs/shared-dto`, `libs/ui` e `libs/core` (auth, permissões, ledger-view, comunicação).
3. **Rotas raiz por app** isoladas (`app.routes.ts` do shell apenas referencia `loadChildren` da feature-lib).
4. **Sem estado global acoplado:** comunicação entre apps só via `libs/core` (serviços de sessão/permissões) — nunca via import direto.
5. **Design System em lib própria** (`@vortex/ui`) — versão única para todos.

### 7.3 Caminho de migração planejado
| Fase | Arquitetura | Quando |
|------|-------------|--------|
| **A (agora)** | SPA única, lazy loading por feature-lib | Construção inicial |
| **B** | Apps Angular separados por subdomínio (sem federation) | Se um app precisar de ciclo de release próprio |
| **C** | **Native Federation** (host + remotes) | White-label / escala de times — o destino, não o começo |

A conversão A→C é mecânica quando as regras de 7.2 são respeitadas: a feature-lib vira remote, o shell vira host, as rotas viram manifest de federation. **Nenhuma tela é reescrita.**

---

## 8. AS 10 REGRAS IMUTÁVEIS DE ENGENHARIA

1. Toda escrita: valida permissão (RBAC/ABAC) → executa ação de domínio → registra no ledger → gera protocolo (se aplicável) → publica evento no bus.
2. Ledger é append-only; UPDATE/DELETE bloqueados por trigger no banco.
3. Tenant é contexto; tabelas operacionais têm `user_id`, `company_id`, `tenant_id`.
4. Frontend nunca valida regra regulatória soberanamente — sempre no backend. (No Angular: guards e hides são UX; a verdade é a API.)
5. Padrão de resposta global: `{ success, data, error }` com `code` de erro.
6. Rotas de escrita exigem `Idempotency-Key` (Redis, 24h).
7. Um banco; schemas por domínio; RLS por linha. Nunca banco/schema por cliente.
8. Código sempre com migrações SQL + testes de integração. CI com **Nx affected** (só testa/builda o que mudou).
9. Secrets só em env/secret manager; nunca commitar `.env` (GitGuardian).
10. Toda entrega lista o que fez e o que NÃO fez (nunca silenciar lacunas).

Erros padrão: `AUTH_REQUIRED`(401) · `TOKEN_EXPIRED`(401) · `PERMISSION_DENIED`(403) · `NOT_FOUND`(404) · `VALIDATION_ERROR`(422) · `RATE_LIMITED`(429) · `IDEMPOTENCY_CONFLICT`(409) · `LEDGER_VERIFICATION_FAILED`(500).

---

## 9. DESIGN SYSTEM (`libs/ui` — sobre Angular Material)

- **Base:** Angular Material (tabelas, formulários, dialogs, datepicker, acessibilidade nativa).
- **Tokens:** cores (primária azul aviação `#0B3D91`), tipografia, espaçamento 4px, raios, sombras — CSS variables + objetos TS (single source of truth).
- **Componentes próprios sobre o Material:** `ValidationBadge` (selos ⚪ N0 / 🟡 N1 / 🟢 N2 / 🔵 N3), `LedgerTimeline` (linha do tempo imutável de uma entidade), `SeletorDeTema` (claro → escuro → personalizado), `Banners` (condicionado à assinatura).
- **Temas:** claro, escuro e personalizado (tamanho do texto, fonte, cor de fundo — módulo Personalização da Rconta). White-label (logo/cores) para Enterprise.
- **Padrão de componente:** standalone + signals + OnPush; formulários reativos tipados (`FormBuilder` não tipado é proibido em código novo).

---

## 10. ESTRUTURA DO MONOREPO (Nx)

```
/apps
  vortex-web             # SPA única Angular (host + rotas por subdomínio)
  api-gateway            # gateway, rate limit, idempotência
  auth-service           # login, refresh, 2FA, sessões
  ledger-service         # ledger imutável (conteúdo cifrado — SHA-256 + Ed25519 + AES-256-GCM)
  protocol-service       # protocolo AAAA-NNNNNN
  document-service       # documentos, versões, hash, MinIO
  catalog-service        # Catálogo (serviço do Núcleo — fonte da verdade de produtos/peças)
  subscription-service   # billing, assinaturas, comissões
  identity-service       # NÚCLEO: pessoas, empresas, vínculos, contatos, endereços
  professional-service   # NÚCLEO: currículo, CIV, CMA, certificados, declarações
  stock-service          # NÚCLEO: estoques + custódia
  recruitment-service    # Recrutamento (vagas de 2 origens, candidaturas)
  rloja-service          # marketplace por comissão
  communication-service  # Central de Comunicação + WebSockets
  notification-service   # e-mail + in-app + alertas
  ops-mro                # ERP Manutenção 43/145
  ops-operators          # ERP Operadores 91/121/135
  ops-training           # ERP Cursos 141/142/145-010 + ISs
  ops-agri               # ERP Agrícola 137
  ops-airport            # ERP Aeródromos 153
  anac-app-service       # App ANAC (auditor; somente-leitura)
  travel-service         # Travel (passagens 121)
  charter-service        # Fretamento (135/137)
  certifications-service # Certificações (produto na RLoja — trilha de conformidade)
  publications-service   # Publicações (assinatura anual de manuais + recortes)
/libs
  shared-dto             # contratos TS únicos (front + back), enums, validações
  ui                     # Design System (Material + ValidationBadge + temas)
  core                   # auth, permissões, ledger-view, comunicação, interceptors
  feature-nucleo         # Console de gestão do Núcleo (admins; zero-trust)
  feature-rconta         # Rconta (7 módulos + 2 menus)
  feature-rloja          # RLoja
  feature-recrutamento   # Recrutamento
  feature-mro            # ERP Manutenção
  feature-ops            # ERP Operadores
  feature-training       # ERP Cursos
  feature-agri           # ERP Agrícola
  feature-airport        # ERP Aeródromos
  feature-anac           # App ANAC
  feature-travel         # Travel
  feature-charter        # Fretamento
  feature-certificacoes  # Certificações (produto na RLoja)
  feature-publicacoes    # Publicações (assinatura anual + recortes)
  util-*                 # helpers (datas regulatórias, moeda, unidades RBAC 01)
/tools, /migrations, /seeds
```

Schemas PostgreSQL: `identity` · `professional` · `stock` · `recruitment` · `market` · `communication` · `accounting` · `mro` · `ops` · `training` · `agri` · `airport` · `ledger` · `protocol` · `documents` · `signatures` · `catalog` · `subscriptions` · `oauth` · `compliance` · `notifications` · `travel` · `charter` · `anac` · `certifications` · `publications`.

---

## 11. APLICATIVOS E SUBDOMÍNIOS

| # | Aplicativo | Subdomínio | Modelo | Escopo |
|---|-----------|------------|--------|--------|
| 1 | **Núcleo** | nucleo.vortex.com | Serviço central (não vendido) | Fonte única de verdade: **Cadastro Central** (Pessoas, Profissionais, Empresas, Estoque, **Catálogo**, Documentos), **Ledger** e **Banco de Dados Central**. Todos os apps inserem e consomem via API. **Console de gestão** (interface restrita aos administradores da plataforma): tenants, concessões de acesso, revisão de descriptografias, integridade do ledger, catálogo — tudo auditado no ledger; o console vê estados e métricas, nunca conteúdo (zero-trust, seção 5-A) |
| 2 | **Rconta** | rconta.vortex.com | Grátis (banners) / VIP | App do usuário: 7 módulos + 2 menus — consome o núcleo |
| 3 | **Recrutamento** | recruta.vortex.com | Embutido no ERP / Assinatura de Vagas | Vagas de 2 origens + currículos; permite tudo que o Profissional da Rconta faz + RH completo (cargo, função, salário, requisitos, objetivo); **sem comissão** |
| 4 | **RLoja** | market.vortex.com | Comissão 3% | Marketplace B2B (agrega estoques); estoque criado aqui migra ao ERP quando contratado |
| 5 | **ERP Operadores** | ops.vortex.com | Assinatura | 91/119/121/135 (regulares e não regulares) + PPSP (RBAC 120) |
| 6 | **App ANAC** | anac.vortex.com | Uso oficial (não vendido) | Auditor do ledger e de pessoas/empresas: solicitação de acesso (consentida → recusa → suspensão de certificação → compulsória), somente-leitura, ciclo auditado (seção 5-A) |
| 7 | **ERP Manutenção** | mro.vortex.com | Assinatura | Oficina 43/145 (12 etapas) |
| 8 | **ERP Agrícola** | agri.vortex.com | Assinatura | 137: CDAG, dispersores, DGPS, SGSO aeroagrícola (desmembrado do ERP Operadores — decisão 12/09/2026) |
| 9 | **ERP Cursos e Treinamentos** | training.vortex.com | Assinatura | 141/142/145-010 **+ 121-006/121-007/121-008/121-011/135-001/135-003/137-207** (único que vende cursos) — **CONFIRMADO (18:05)** |
| 10 | **ERP Aeródromos** | airport.vortex.com | Assinatura | 153: pousos/decolagens, pista/RWYCC, SESCINC, fauna/SIGRA, SGSO, infraestrutura |
| 11 | **Travel** | travel.vortex.com | Comissão de agência | Busca e venda de passagens de linhas regulares 121 (modelo agência de viagem) |
| 12 | **Fretamento** | charter.vortex.com | Comissão/contrato | Reserva e venda de fretamento 135 (passageiros, carga, aeromédico) e 137 (agrícola) |
| 13 | **Certificações** | certificacoes.vortex.com | Produto na RLoja (avulso) | Produto online (anunciado na RLoja) que conduz a empresa à certificação/cumprimento para 91 Apêndice K, 121, 135, 137, 145, 141, 142 e 153 — trilha de conformidade: checklist por requisito (seeds), documentos exigidos, protocolos SEI, acompanhamento de fase |
| 14 | **Publicações** | publicacoes.vortex.com | Assinatura anual | Assinaturas anuais com acesso a pacotes de manuais digitalizados (fabricantes e Veryon — sujeito a acordo de licenciamento), atrelados às tarefas de manutenção dos ERPs: a tarefa consome o **recorte** do manual aplicável; sem a assinatura, sem acesso ao recorte (obtenção por fora) |

**Rconta — 7 módulos + 2 menus:** Pessoal · Profissional · Empresarial · Protocolo · Assinaturas · Personalização · Segurança + Dashboard · Configurações. *(A Rconta é a experiência do usuário sobre o núcleo — os mesmos dados são acessíveis pelos demais apps autorizados.)*

---

## 12. LACUNAS INJETADAS NESTA VERSÃO (antes em aberto no docs/06)

1. **Fluxo da oficina em 12 etapas** → máquina de estados no seed `rbac-43-145` + `mro.wo_stage_history` (Cotação → Pré-Orçamento → Aprovação → Solicitação de Peça → Inspeção de Recebimento → Triagem de Complexidade → Abertura de OS → Execução → Fechamento APRS → Orçamento Final → Geração de Documentos → Pagamento, com etiquetas verde/amarela/vermelha).
2. **Validação RAB** → no cadastro de aeronave, matrícula confrontada com o RAB (nome/CPF/CNPJ do proprietário/operador); divergência bloqueia o cadastro (regra `AIRCRAFT_RAB_MISMATCH` do BRE).
3. **LGPD completa** → `POST /compliance/export` (portabilidade), `POST /compliance/erase` (esquecimento com ressalvas de retenção regulatória — prazos do docs/02 prevalecem sobre a exclusão) e **consentimento revogável** por finalidade.
4. **RLoja = visão do estoque** → `catalog.listings` referencia obrigatoriamente `inventory_item_id` + `inventory_origin`; sem item de estoque, sem anúncio.
5. **CIV Digital (IS 61-001G)** → schema `professional.flight_log_entries` completo (draft/signed/rectified/voided, endosso de instrutor, envio ANAC).
6. **SDEA, PCA Grupos A/B/C, Famma, credenciamentos 183** → seeds `rbac-183` com prazos oficiais (1.095 dias, alerta 60 dias, VTE, F-141-10/12).
7. **Comissão de recrutamento removida** → regra `RECRUITMENT_COMMISSION` eliminada do BRE e do billing (substituída pelo modelo da seção 4.3).
8. **Contabilidade de dupla entrada** → seção 6 deste contrato.

---

## 13. TERMINOLOGIA (PT-BR técnico ANAC)

OS · FORM 8130-3 · APRS/CRS · DA/FCDA · SEGVOO 001 · MIP/MGQ · CIV · CMA · MEL · RWYCC/RCR · SESCINC · SGSO · CDAG · ARSO · PPSP · DOV · CHT · FSTD · S141 · PCN/IRI · SIGRA · RAB.

---

## 14. PLANO DE CRIAÇÃO (UMA FASE POR VEZ — TESTAR ANTES DE AVANÇAR)

> **v2 — 10 partes (12/09/2026)**; **v3 — 13 partes** (uma por app); **v4 — 14 partes (12/09/2026, decisão do Dr. Edilson):** CertPub dividido em Certificações (Parte 13) e Publicações (Parte 14), e ordem de construção reordenada por lucro (seção 17). A tabela de fases abaixo descreve a v2 (histórica); a ordem vigente de construção é a v4.

| Fase | Arquivo-fonte | Escopo da entrega |
|------|---------------|-------------------|
| 0 | docs/00–10 | Ler contrato, visão, matrizes, delimitação, esqueleto de ERP e navegação |
| 1 | parte-1.md | Fundação: workspace Nx (frontend SPA + backend NestJS), `shared-dto`, `ui`, `core`, Núcleo (Cadastro Central), Rconta 7+2, validação N0–N3, dados cadastrais + módulo profissional (CIV, CMA, currículo, declarações), módulo empresarial com documentos assinados, estoque/custódia (bidirecional), Recrutamento (2 origens, sem comissão), RBAC/ABAC/RLS |
| 2 | parte-2.md | Ledger imutável **com conteúdo cifrado** (SHA-256 encadeado + Ed25519, AES-256-GCM, concessões, triggers anti-UPDATE/DELETE), Protocolo AAAA-NNNNNN, trilha de auditoria, restauração reconciliada |
| 3 | parte-3.md | Assinatura digital (Lei 14.063/2020 + **bloco SEI/ANAC**), documentos estruturados com hash, gerenciador de arquivos (MinIO/presigned), **compliance LGPD** (export/erase/consentimento) |
| 4 | parte-4.md | Billing (assinaturas: Rconta VIP, Assinatura de Vagas, 5 ERPs, Publicações + comissões RLoja/Travel/Fretamento), PPSP RBAC 120 (ARSO, toxicológico 90 dias, sorteio ≥25%/ano), Hub de Alertas Preditivos |
| 5 | parte-5.md | ERP Manutenção: camada administrativa + **Contabilidade (dupla entrada)**, Biblioteca Técnica (**recortes de Publicações**), Suprimentos, Setor de Registros, **Oficina em 12 etapas (máquina de estados)**, APRS/CRS, SEGVOO, Qualidade/SGSO, CRM do domínio, vagas p/ Recrutamento |
| 6 | parte-6.md | **ERP Operadores (91/121/135)**: departamentos Operações e Manutenção, CRM/fretamento, frota (**validação RAB**), despacho, diário técnico, MEL/DA, manuais, **controle de manutenção alimentado pelo APRS**, PPSP, vagas + **ERP Agrícola (137) — app próprio** (CDAG, dispersores, DGPS, SGSO aeroagrícola) |
| 7 | parte-7.md | ERP Cursos e Treinamentos (141/142 + **ISs 121-006/007/008/011/135-001/003/137-207**, turmas corporativas, FSTD, certificados ≤10 dias, S141) + ERP Aeródromos (153: **pousos/decolagens**, contratos, infraestrutura, RWYCC/RCR, SESCINC ≤3 min, fauna/SIGRA, manutenção 8 áreas, SGSO quadrimestral) |
| 8 | parte-8.md | RLoja (anúncio = visão do estoque, comissão 3%, **estoque bidirecional**), integrações ANAC/gov (RAB, SEI, S141, SIGRA)/Asaas/Resend/Sentry, Motor de Regras (BRE), Central de Comunicação com WebSockets, consolidação final |
| 9 | parte-9.md | **Travel** (passagens 121, comissão de agência) + **Fretamento** (135/137) + **Certificações e Publicações** (produto na RLoja + assinaturas anuais com recortes) — na v4 divididos em 2 apps: Certificações (Parte 13) e Publicações (Parte 14) |
| 10 | parte-10.md | **App ANAC** (auditoria do ledger: consentida → recusa → suspensão → compulsória; somente-leitura) + **Console do Núcleo** (gestão zero-trust, concessões, execução às cegas) |
| 11 | docs/09–10 | Refinamento fino das árvores de menu de cada app e validação de navegação |

**Ordem interna padrão de cada ERP:** Dashboard → Comercial/CRM do domínio → Camada administrativa geral (RH, Financeiro, Contabilidade, Compras) → Setores de domínio → Qualidade/SGSO → Relatórios → Configuração. Ledger em tudo.

---

## 15. DEFINITION OF DONE (CADA FASE)

- [ ] Roda em Docker Compose; `/health` verde.
- [ ] Migrações SQL 100% aplicadas no PostgreSQL 16 (policies RLS e triggers em SQL nativo).
- [ ] RLS habilitado e comprovado por teste (usuário sem vínculo → 403).
- [ ] Padrão `{ success, data, error }` em 100% das rotas.
- [ ] Eventos relevantes ancorados no ledger (bloco com hash + assinatura).
- [ ] Frontend: componentes standalone com signals + `inject()` + `@if`/`@for` + OnPush; `nx affected` verde; module boundaries respeitados.
- [ ] Testes unitários e de integração verdes.
- [ ] Lacunas listadas no relatório da fase (nunca silenciar).

---

## 16. REGISTRO DE DECISÕES DA v2 (10/09/2026)

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Frontend | Angular moderno (signals, standalone, inject(), @if/@for) | Decisão do Dr. Edilson; coerência com NestJS (DI, decoradores, módulos) |
| Monorepo | Nx (front + back no mesmo workspace) | Libs compartilhadas de DTOs; build afetado otimizado; generators |
| UI | Angular Material + Design System próprio | Velocidade + identidade VORTEX (ValidationBadge, temas) |
| Shell | SPA única lazy (Opção A) com migração planejada B→C | Simplicidade operacional; desmembramento mecânico depois (seção 7) |
| ORM | TypeORM + SQL nativo para RLS/triggers; **sem Prisma** | Prisma não expressa RLS; SQL nativo é requisito regulatório |
| Eventos | Ledger append-only como event log; **sem CQRS** | Duas fontes de verdade violam a regra 1 |
| Time-series | **Sem TimescaleDB** por ora | Prematuro; reavaliar com volume real |
| Tempo real | WebSockets na Central de Comunicação | Chat/alertas ao vivo; baixo custo |
| Recrutamento | Sem comissão; embutido no ERP ou Assinatura de Vagas | Decisão de negócio do Dr. Edilson |
| Núcleo separado da Rconta | Núcleo vira serviço próprio (subdomínio); TODOS os apps — inclusive a Rconta — apenas inserem e consomem; origem do app registrada no ledger | Decisão do Dr. Edilson (12/09/2026) |
| Catálogo absorvido pelo Núcleo | **CONFIRMADO (12/09/2026)** — Catálogo Central deixa de ser app e vira serviço do núcleo (Cadastro Central) | Decisão do Dr. Edilson |
| Console do Núcleo | Interface própria de gestão, restrita aos administradores da plataforma; vê estados/métricas, nunca conteúdo; toda ação vira meta-evento | Decisão do Dr. Edilson (12/09/2026) |
| Estoque bidirecional | RLoja ↔ ERP: estoque criado na RLoja vira estoque do ERP ao contratar (e vice-versa); cadastro sempre no núcleo | Decisão do Dr. Edilson (12/09/2026) |
| Novos apps | App ANAC (auditor), Travel (passagens 121, comissão de agência), Fretamento (135 passageiros/carga/aeromédico + 137 agrícola) | Decisão do Dr. Edilson (12/09/2026) |
| Contabilidade | Dupla entrada especificada no contrato (seção 6) | Camada financeira real dos ERPs |
| Estado | Signals + NgRx ComponentStore (local) | Sem NgRx global nesta fase |
| Ledger com conteúdo | Payload cifrado (AES-256-GCM) + acesso auditado; App ANAC com autorização/compulsório | Decisão do Dr. Edilson (11/09/2026); Res. 458/2017 |
| Zero-trust admin | Administradores NÃO veem conteúdo por padrão; acesso só por protocolo de suporte, auditoria (consentida→recusa→suspensão→compulsória) ou justiça; auditoria é somente-leitura; segredo de justiça esconde meta-eventos | Decisão do Dr. Edilson (12/09/2026) — "administrar sem ver" |
| App ANAC | Aplicativo a especificar: canal de solicitação de auditoria, autorização/recusa, suspensão de certificação por negativa de acesso | Decisão do Dr. Edilson (12/09/2026) |
| Registro único | Eventos primários no ledger; totais (caderneta Parte I, controle de manutenção) = projeções | Decisão do Dr. Edilson (11/09/2026) |
| Multi-tenant / multi-vendor | Plataforma multi-tenant; RLoja multi-vendor (vender não exige tenant) | Decisão do Dr. Edilson (11/09/2026) |

---

## 17. REGISTRO DE DECISÕES DA v4 (12/09/2026)

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| **14 apps** | CertPub (v3) dividido em **Certificações** (certificacoes.vortex.com, produto avulso na RLoja, schema `certifications`, origin_app CERTIFICACOES) e **Publicações** (publicacoes.vortex.com, assinatura anual, schema `publications`, origin_app PUBLICACOES) | Certificação e publicação técnica são negócios diferentes: ciclos de venda, entidades e integrações distintas. Decisão do Dr. Edilson (12/09/2026) |
| **BRE** | `PUBLICATION_SALES_CERTPUB_ONLY` renomeada para `PUBLICATION_LICENSE_REQUIRED` | Reflete o pré-requisito de licenciamento da Publicações |
| **Ordem de construção por lucro** | 01 Núcleo · 02 Rconta · 03 Recrutamento · 04 RLoja · 05 ERP Operadores · 06 App ANAC · 07 ERP Manutenção · 08 ERP Agrícola · 09 ERP Cursos · 10 ERP Aeródromos · 11 Travel · 12 Fretamento · 13 Certificações · 14 Publicações | Prioridade de receita: Operadores/RLoja/Recrutamento primeiro. Decisão do Dr. Edilson (12/09/2026) |
| **Prompts v4** | 14 partes em `prompts-v4/` (uma por app), renumeradas na ordem acima; v3 preservada em `prompts-v3/` | Decomposição app → módulos → seções → pedaços para vibe coding com mínimo de erro |
