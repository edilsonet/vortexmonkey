# VORTEX — docs/00: VISÃO GERAL DO ECOSSISTEMA (v2)

> **Versão 2 — 12/09/2026.** Reformulado conforme o CLAUDE.md v2 (Angular moderno + Nx; Núcleo separado da Rconta; 14 aplicativos). Em divergência de valores, prevalece o `docs/07-delimitacao.md`; em divergência de arquitetura, prevalece o `CLAUDE.md v2`.
> Este documento é a porta de entrada da pasta. Leia antes de qualquer parte.

---

## 1. O QUE É O VORTEX

O VORTEX é um ecossistema integrado de **conformidade, governança, RH, estoque, comércio e serviços** para a aviação civil brasileira. Ele substitui fluxos documentais físicos por processos digitais seguros e auditáveis, ancorados na **Resolução ANAC nº 458/2017** (registros eletrônicos imutáveis), na **Lei nº 14.063/2020** (assinaturas eletrônicas) e na **Resolução ANAC nº 520/2019** (protocolo eletrônico `AAAA-NNNNNN`).

Segmentos regulados cobertos: RBAC 01, 21, 23, 25, 26, 27, 29, 33, 35, 39, 45, 43/145/120, 61/63/65, 67, 91/119/121/135, 137, 141/142/145-010/121-006/121-007/121-008/121-011/135-001/135-003/137-207, 153, 183.

## 2. PRINCÍPIO ARQUITETURAL CENTRAL (IMUTÁVEL)

> **O NÚCLEO é o DONO DA VERDADE — e é um aplicativo/serviço próprio, separado da Rconta. TODOS os apps, sem exceção (Rconta, ERPs, RLoja, Recrutamento, Travel, Fretamento, App ANAC, Certificações, Publicações e futuros), são CONSUMIDORES: inserem no núcleo via API e consomem dele. Nenhum app cria cadastro próprio de pessoa, produto, vaga ou currículo.**

- O **Núcleo** (`nucleo.vortex.com`) concentra o **Cadastro Central** (Pessoas, Profissionais, Empresas, Estoque, Catálogo, Documentos), o **Ledger** e o **Banco de Dados Central**.
- O mesmo dado pode ser criado/editado por **qualquer app autorizado** (ex.: currículo pela Rconta OU pelo Recrutamento; endereço pela Rconta, RLoja OU Recrutamento). O que muda é apenas o **app de origem** registrado no evento do ledger; o cadastro vive **uma única vez** no núcleo.
- O histórico de tudo é o **Ledger** — linha do tempo com conteúdo completo (quem/papel, início, fim, o quê, app de origem), cifrado em repouso, com acesso governado (seção 5-A do contrato). Os apps exibem **filtros projetados do ledger** — nunca histórico duplicado.
- **Registro é um só:** eventos primários nascem no ledger; totais e mapas (caderneta Parte I, controle de manutenção) são **projeções agregadas recomputáveis**.
- O Núcleo possui **console de gestão** restrito aos administradores da plataforma: vê estados e métricas, **nunca conteúdo** (zero-trust — "administrar sem ver").

## 3. OS 14 APLICATIVOS

| # | Aplicativo | Subdomínio | Modelo | Escopo |
|---|-----------|------------|--------|--------|
| 1 | **Núcleo** | nucleo.vortex.com | Serviço central (não vendido) | Cadastro Central + Ledger + Banco Central; console de gestão (admins; zero-trust) |
| 2 | **Rconta** | rconta.vortex.com | Grátis (banners) / VIP | App do usuário: 7 módulos + 2 menus — consome o núcleo |
| 3 | **Recrutamento** | recruta.vortex.com | Embutido no ERP / Assinatura de Vagas | Vagas (2 origens) + currículos; permite tudo que o Profissional da Rconta faz + RH completo; declarações automáticas de experiência; **sem comissão** |
| 4 | **RLoja** | market.vortex.com | Comissão 3% do vendedor | Marketplace B2B multi-vendor; anúncio = visão do estoque; vender não exige assinatura |
| 5 | **ERP Operadores** | ops.vortex.com | Assinatura | 91/119/121/135: frota, despacho, diário técnico, MEL/DA, manuais |
| 6 | **App ANAC** | anac.vortex.com | Uso oficial (não vendido) | Auditor do ledger e de pessoas/empresas: acesso consentido → recusa → suspensão de certificação → compulsória; somente-leitura; ciclo auditado |
| 7 | **ERP Manutenção** | mro.vortex.com | Assinatura | Oficina 43/145 (12 etapas), biblioteca técnica, suprimentos, registros, qualidade |
| 8 | **ERP Agrícola** | agri.vortex.com | Assinatura | 137: CDAG, dispersores, DGPS, SGSO aeroagrícola |
| 9 | **ERP Cursos e Treinamentos** | training.vortex.com | Assinatura | 141/142/145-010 + 121-006/007/008/011/135-001/003/137-207; **único que cria e vende cursos** na RLoja |
| 10 | **ERP Aeródromos** | airport.vortex.com | Assinatura | 153: pousos/decolagens, pista/RWYCC, SESCINC, fauna/SIGRA, SGSO, infraestrutura |
| 11 | **Travel** | travel.vortex.com | Comissão de agência | Busca e venda de passagens de linhas regulares 121 |
| 12 | **Fretamento** | charter.vortex.com | Comissão/contrato | Reserva e venda de fretamento 135 (passageiros, carga, aeromédico) e 137 (agrícola) |
| 13 | **Certificações** | certificacoes.vortex.com | Produto (na RLoja) | Condução da empresa à certificação/cumprimento (91 Ap.K, 121, 135, 137, 145, 141, 142, 153): trilha de conformidade com checklist por requisito, evidências, protocolos SEI e fases |
| 14 | **Publicações** | publicacoes.vortex.com | Assinatura anual | Assinaturas anuais de pacotes de manuais digitalizados (fabricantes e Veryon — sujeito a acordo de licenciamento), com **recortes consumidos pelas tarefas de manutenção** dos ERPs (Manutenção/Agrícola); sem assinatura, sem recorte — a tarefa nunca é bloqueada |

**Rconta — 7 módulos + 2 menus:** Pessoal · Profissional · Empresarial · Protocolo · Assinaturas · Personalização · Segurança + Dashboard · Configurações. (A Rconta é a experiência do usuário sobre o núcleo; os mesmos dados são acessíveis pelos demais apps autorizados.)

## 4. SEGMENTOS NORMATIVOS COBERTOS

| Regulamento | Escopo |
|-------------|--------|
| RBAC 01 | Definições, regras de redação e unidades |
| RBAC 21 | Certificação de produtos e peças (STC/CST) |
| RBAC 23/25/26/27/29/33/35 | Certificação de projeto/fabricação de aeronaves (normas de projeto por categoria) |
| RBAC 39 | Diretrizes de Aeronavegabilidade (DA/FCDA) |
| RBAC 43 / 145 | Manutenção e Organizações de Manutenção (OM) |
| RBAC 45 | Manutenção de aeronaves (registro e controle) |
| RBAC 61 / 63 / 65 | Licenças e habilitações de pessoal (pilotagem, mecânicos, comissários, MMA, DOV) |
| RBAC 67 | Certificados Médicos Aeronáuticos (CMA) |
| RBAC 91 / 119 / 121 / 135 | Operadores aéreos (regular e não regular) |
| RBAC 120 | Prevenção ao uso de substâncias psicoativas (PPSP) |
| RBAC 137 | Operações aeroagrícolas (CDAG) |
| RBAC 141 / 142 / 145-010 | Instrução (CIAC), treinamento (CTAC) e cursos (+ ISs 121-006/007/008/011, 135-001/003, 137-207) |
| RBAC 153 | Infraestrutura aeroportuária e SESCINC |
| RBAC 183 | Credenciamento de pessoas físicas e jurídicas |

## 5. ESTRUTURA DA RCONTA (7 MÓDULOS + 2 MENUS)

| Estrutura | Conteúdo |
|-----------|----------|
| **Módulo Pessoal** | Dados pessoais (endereços, e-mails, telefones), documentos pessoais (CPF, RG, Título, Passaporte, outros), redes sociais pessoais |
| **Módulo Profissional** | Dados profissionais, documentos profissionais (CANAC, licenças CHT, CREA, habilitações, CNH), currículo (cursos, treinamentos, experiências, CMA, CIV), **estoque pessoal** |
| **Módulo Empresarial** | Responsáveis legais, procuradores, empresas vinculadas (com documento digital assinado); **1 estoque por empresa** |
| **Módulo Protocolo** | Protocolo eletrônico AAAA-NNNNNN |
| **Módulo Assinaturas** | Assinaturas compradas na RLoja, com detalhes e cancelamento |
| **Módulo Personalização** | Tamanho do texto, fonte, cor de fundo; tema claro → escuro → personalizado |
| **Módulo Segurança** | Senha, dispositivos, 2FA |
| **Menu Dashboard** | Widgets de cada módulo |
| **Menu Configurações** | Idioma, horário UTC, demais preferências |

### 5.1 Módulo Empresarial — regras-chave
- Empresas onde a pessoa tem **responsabilidade legal**, **procuração** ou **vínculo de funcionário** — cada aprovação abre **documento digital assinado**.
- Ao clicar na empresa → cadastro completo (dados, funcionários, assinaturas, **estoque da empresa**) e o **filtro do ledger** de tudo que aconteceu naquela assinatura/cadastro desde a compra.
- Assinatura encerrada → histórico **congela** (nada novo) mas permanece legível e retido (mínimo 5 anos).

## 6. NÚCLEOS DE BACKEND

`Cadastro Central` (Pessoas, Profissionais, Empresas, Estoque, Catálogo, Documentos) · `Ledger` · `Protocolo` · `Assinaturas/Billing` · `RH Core` (nos ERPs) · `Recrutamento` · `RLoja` · `Comunicação` (WebSockets) · `Contabilidade` (dupla entrada) · `Certificações` · `Publicações` · `Ops/ERPs`.

### 6-A. Camada administrativa geral e Central de Comunicação
- **Camada administrativa geral** (qualquer empresa/tenant): RH · Financeiro · **Contabilidade (dupla entrada)** · Compras · Comercial/CRM · Estoque/Administrativo · Documentos/Contratos.
- **CRM por ERP:** cada ERP tem pipeline comercial próprio do domínio.
- **Central de Comunicação** (barra superior da Shell, em todos os apps): **Chat** (tempo real via WebSockets) · **Alertas** (Hub Preditivo) · **E-mails** transacionais · **Comunicados Oficiais** · **Tema** (claro/escuro/personalizado). Toda conversa/comunicado relevante gera bloco no ledger; a Central apenas exibe.

## 7. ARQUITETURA E STACK

- **Monorepo Nx** (frontend + backend no mesmo workspace); contratos compartilhados em `libs/shared-dto`.
- **Backend:** NestJS (TypeScript estrito); PostgreSQL 16 com RLS; TypeORM + SQL nativo (policies, triggers, PL/pgSQL) — **sem Prisma, sem CQRS, sem TimescaleDB** (decisões registradas no contrato).
- **Infra:** Redis (cache/sessão/rate-limit), RabbitMQ (eventos), MinIO (arquivos, presigned URLs), WebSockets (tempo real).
- **Frontend:** **Angular 19+ moderno** — standalone components, signals, `inject()`, `@if`/`@for`, OnPush; **Angular Material** + Design System próprio `@vortex/ui` (ValidationBadge N0–N3, LedgerTimeline, temas).
- **Shell:** **SPA única** com lazy loading por feature-lib (Opção A); subdomínios resolvem a rota inicial; caminho de migração planejado A → B → C (Native Federation) sem reescrever telas.
- **Multi-tenant:** lógico (RLS por linha); tenant é contexto, nunca dono do dado. **RLoja é multi-vendor** — vender não exige tenant nem assinatura.
- **Backend único:** `api.vortex.com` consumido por todos os apps.

## 8. VALIDAÇÃO EM NÍVEIS (SELO DE AUTÊNTICO)

> O sistema **NUNCA bloqueia** por falta de validação. Todo dado é exibido imediatamente; o selo indica o nível de confiança.

| Nível | Fonte | Selo |
|-------|-------|------|
| N0 — Sem validação | — | ⚪ Pendente |
| N1 — Automática | Sistema (dígito verificador, formato, APIs públicas) | 🟡 Sistema |
| N2 — Fonte oficial | Gov.br, Receita Federal, Correios, SACI, RAB | 🟢 Oficial |
| N3 — Empresa/Administrador | Admin, representante legal, procurador, funcionário com permissão | 🔵 Autêntico |

## 9. MODELO DE NEGÓCIO

| Produto/App | Modelo | Observação |
|-------------|--------|------------|
| **Rconta (grátis)** | Grátis com banners | VIP ou compra de ERP remove anúncios **apenas na Rconta do comprador** |
| **Rconta VIP** | Assinatura | — |
| **Recrutamento** | Embutido no ERP / Assinatura de Vagas | **Sem comissão**; pessoas nunca pagam |
| **ERP Manutenção / Operadores / Cursos / Agrícola / Aeródromos** | Assinatura | Uso do Recrutamento embutido em todas |
| **RLoja** | Comissão 3% do vendedor | Comprador isento; vender não exige assinatura; multi-vendor |
| **Travel** | Comissão de agência | Passagens 121 |
| **Fretamento** | Comissão/contrato | 135 (passageiros/carga/aeromédico) e 137 (agrícola) |
| **Certificações** | Produto (na RLoja) | Condução à certificação 91 Ap.K/121/135/137/145/141/142/153 |
| **Publicações** | Assinatura anual | Manuais digitalizados (licenciados); recortes consumidos pelas tarefas de manutenção dos ERPs |
| **Núcleo / Catálogo / App ANAC** | Não vendidos | Infraestrutura e uso oficial |

## 10. ESTOQUE E CUSTÓDIA (bidirecional RLoja ↔ ERP)

- **Estoque pessoal** (Profissional) e **estoque empresarial** (Empresarial, 1 por empresa) na Rconta; **catálogo único** no núcleo.
- **Contratou ERP** → custódia do estoque empresarial migra para o ERP (evento no ledger).
- **Estoque criado na RLoja** (empresa sem assinatura, perfil privado) → ao contratar ERP, as lojas ativas/inativas **viram estoque no ERP** automaticamente.
- **Estoque criado no ERP** → pode virar loja na RLoja (anúncio = visão do estoque).
- **Suspensão/cancelamento** → estoque volta à Rconta como **um único estoque** com marcação de origem por item; **regularização** → o sistema pergunta se restaura as posições originais; itens vendidos não voltam.
- O cadastro do produto **nunca** fica no ERP nem na RLoja — fica no núcleo.

## 11. LEDGER: CONTEÚDO, ACESSO E CONTINUIDADE (resumo — detalhes no contrato, seção 5-A/5-B)

- **O ledger É a linha do tempo:** payload com conteúdo completo (quem/papel, início, fim, o quê, app de origem), **cifrado em repouso** (AES-256-GCM por tenant); hash SHA-256 encadeado + Ed25519 sobre o payload em claro.
- **Zero-trust:** administradores NÃO veem conteúdo por padrão; acesso administrativo só com **protocolo** do próprio dono; proprietários do VORTEX revisam toda descriptografia.
- **Auditoria ANAC (App ANAC):** consentida → recusa → suspensão de certificação → compulsória; auditor **somente-leitura**; auditado notificado (exceto segredo de justiça); todo o ciclo gera meta-eventos.
- **Chaves de tenant** fora das mãos dos admins — única via de descriptografia é o serviço de concessão (`ledger.access_grants`).
- **Backup:** snapshot diário + WAL/PITR; backup imutável offsite (WORM) cifrado; restauração reconciliada com o ledger; teste trimestral.
- **Bloco de assinatura** padrão SEI/ANAC: QR SVG + manifesto textual gerado do ledger; página pública `/ass/autenticidade`; código verificador + CRC.

## 12. FASES DO PROJETO (mapeadas nas partes 1–10)

1. **Parte 1:** Fundação Nx, Shell SPA, Design System, Núcleo + Rconta (7+2), validação N0–N3, estoque/custódia, Recrutamento.
2. **Parte 2:** Ledger imutável (conteúdo cifrado, acesso auditado), Protocolo, Auditoria.
3. **Parte 3:** Assinatura digital (Lei 14.063/2020 + bloco SEI), Documentos estruturados, Arquivos (MinIO), LGPD.
4. **Parte 4:** Billing (assinaturas + comissões), PPSP (RBAC 120), Hub de Alertas.
5. **Parte 5:** ERP Manutenção (12 etapas) + Contabilidade (dupla entrada).
6. **Parte 6:** ERP Operadores (91/121/135) + ERP Agrícola (137).
7. **Parte 7:** ERP Cursos (141/142 + ISs) + ERP Aeródromos (153).
8. **Parte 8:** RLoja, integrações (ANAC/gov/Asaas/Resend/Sentry), BRE, Central de Comunicação, consolidação.
9. **Parte 9:** Travel, Fretamento, Certificações, Publicações.
10. **Parte 10:** App ANAC + Console do Núcleo.
11. **Docs 09–10:** refinamento das árvores de menu e navegação.

## 13. COMO O AGENTE DEVE USAR A PASTA

1. Ler o `CLAUDE.md v2` (contrato global) + este documento + os docs 01 a 07.
2. Executar as partes em ordem (1 a 10), uma fase por vez — cada parte decomposta em prompts menores antes de construir.
3. Em qualquer divergência de valor, o **Valor Oficial (docs/07-delimitacao.md) prevalece**; em arquitetura, o **CLAUDE.md v2**.
4. Nunca duplicar cadastros: tudo no núcleo; apps apenas inserem e consomem.
