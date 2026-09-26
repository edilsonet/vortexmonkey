# VORTEX — PARTE 8/8: RLOJA (MARKETPLACE), INTEGRAÇÕES E CONSOLIDAÇÃO

> Instrução ao agente de código: você é um engenheiro de software sênior especialista em marketplaces B2B, e-commerce, integrações com sistemas externos (ANAC, SEI, pagamentos), motor de regras declarativo (BRE) e consolidação de arquitetura. Construa a RLoja, o módulo de integrações, o Motor de Regras Declarativo (BRE) e a consolidação final do ecossistema VORTEX conforme a especificação abaixo, com rigor absoluto, TypeScript estrito, testes e documentação. Execute este prompt por completo, sem resumir, sem pular seções, sem simplificar.

## 1. OBJETIVO DA PARTE 8

Entregar as capacidades finais:
1. **RLoja (Marketplace B2B)** — com o conceito de anúncio como VISÃO do estoque.
2. **Integrações externas** — ANAC (RAB, SEI, S141, SIGRA), pagamentos (Asaas), e-mail (Resend), erros (Sentry).
3. **Motor de Regras Declarativo (BRE)** — centraliza as regras de negócio de todo o ecossistema.
4. **Consolidação** — visão final, decisões, e integração das 8 partes.

## 2. RLOJA (MARKETPLACE B2B)

### 2.1 Conceito central (do arquivo original)
> **O anúncio na RLoja é uma VISÃO do estoque, NÃO um registro separado.**

- O anúncio é uma projeção controlada de um item já cadastrado no Estoque Central.
- Distinção estrita entre **estoque empresarial** (da empresa/tenant) e **estoque particular** (da pessoa física).
- O **Admin Dono** controla a publicação por tenant.
- Origem do anúncio: empresa vs particular (filtro de busca).

### 2.2 Estoque pessoal vs empresarial
| Tipo de Estoque | Dono | Origem |
|-----------------|------|--------|
| Estoque Particular | Pessoa física | A rConta da pessoa |
| Estoque Empresarial | Empresa | A empresa/tenant |

### 2.3 Acesso por papel
| Papel | Acesso ao estoque empresarial |
|-------|-------------------------------|
| Representante Legal | Acesso total (inclui anunciar na RLoja) |
| Procurador | Acesso limitado ao escopo da procuração |
| Funcionário | Acesso conforme cargo |

### 2.4 Categorias de produto (do Catálogo Central)
Aeronaves, Motores, Hélices, Rádios, Instrumentos, Acessórios, Peças, Consumíveis.

### 2.5 Entidades
```sql
-- SCHEMA: catalog (RLoja)
CREATE TABLE catalog.listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    inventory_item_id UUID NOT NULL REFERENCES ops.parts_inventory(id), -- VISÃO do estoque
    origin VARCHAR(50) NOT NULL, -- EMPRESA, PARTICULAR
    seller_company_id UUID REFERENCES identity.companies(id),
    seller_person_id UUID REFERENCES identity.users(id),
    category VARCHAR(50) NOT NULL, -- AERONAVE, MOTOR, HELICE, RADIO, INSTRUMENTO, ACESSORIO, PECA, CONSUMIVEL
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    status VARCHAR(50) NOT NULL DEFAULT 'RASCUNHO'
      CHECK (status IN ('RASCUNHO','PUBLICADO','PAUSADO','VENDIDO','CANCELADO')),
    published_by UUID REFERENCES identity.users(id),
    published_at TIMESTAMPTZ,
    admin_approved BOOLEAN NOT NULL DEFAULT FALSE, -- controle do Admin Dono
    ledger_block_id UUID REFERENCES ledger.ledger_blocks(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE catalog.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
    listing_id UUID NOT NULL REFERENCES catalog.listings(id),
    buyer_company_id UUID REFERENCES identity.companies(id),
    buyer_person_id UUID REFERENCES identity.users(id),
    amount NUMERIC(15,2) NOT NULL,
    commission_percent NUMERIC(5,2) NOT NULL DEFAULT 3.00, -- 3% do vendedor
    commission_amount NUMERIC(15,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE'
      CHECK (status IN ('PENDENTE','PAGO','CONCLUIDO','CANCELADO')),
    payment_reference VARCHAR(100),
    ledger_block_id UUID REFERENCES ledger.ledger_blocks(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.6 Regras de negócio da RLoja
1. Anúncio é VISÃO do estoque — não pode existir anúncio sem item de estoque.
2. Estoque empresarial só pode ser anunciado pelo Representante Legal (ou procurador no escopo).
3. Admin Dono controla a publicação por tenant (aprovação).
4. Comissão de **3% da venda, cobrada do vendedor**; comprador isento.
5. Peça com etiqueta vermelha ou em quarentena não pode ser anunciada.
6. Toda publicação/venda gera bloco no ledger.

## 3. INTEGRAÇÕES EXTERNAS

### 3.1 Links oficiais ANAC (referência)
| Recurso | Link |
|---------|------|
| RAB (Registro Aeronáutico Brasileiro) | https://aeronaves.anac.gov.br/aeronaves/cons_rab_resposta2.asp |
| Consulta de matrícula (exemplo PP-EPT) | https://aeronaves.anac.gov.br/aeronaves/cons_rab_resposta2.asp?tipo_pesquisa=marcas&textMarca=PP-EPT |
| Sistema Eletrônico de Informações (SEI) | https://sei.anac.gov.br |
| Portal ANAC | https://www.gov.br/anac |
| S141 (centros de instrução) | https://s141.anac.gov.br |

### 3.2 Validação RAB (regra de negócio do cadastro de aeronave)
- No cadastro de aeronave, o sistema confronta a matrícula com a base pública do RAB.
- Valida se o operador/proprietário cadastrado coincide com o titular no RAB.
- Situação: matrícula NÃO no nome da pessoa/empresa → botão "Cadastrar" bloqueado.
- Situação: matrícula com um dos proprietários ou operadores = nome e CPF da rConta → botão "Cadastrar" liberado.
- Fonte: RAB via scraping (sem API oficial).

### 3.3 Integrações de infraestrutura
- **Asaas** (pagamentos): PIX, boleto, cartão; cobrança recorrente; webhook idempotente.
- **Resend** (e-mail transacional): templates, bounce.
- **Sentry** (erros): monitoramento.
- **GitGuardian** (segredos): prevenção de vazamento.

### 3.4 Regras de integração
1. Secrets NUNCA em claro (env/secret manager).
2. Webhooks idempotentes (não duplicam).
3. Toda integração externa registra no ledger.
4. Falha de integração não derruba o fluxo principal (circuit breaker).

## 4. MOTOR DE REGRAS DECLARATIVO (BRE)

### 4.1 Conceito
- Centraliza TODAS as regras de negócio do ecossistema (regras-bre.ts).
- Consome os seeds por RBAC (docs/05-seeds-rbac.md) como fonte canônica.
- Nenhuma regra hardcoded — sempre lida dos seeds/configuração.

### 4.2 Regras críticas a registrar no BRE
1. Credenciamento expirado (3 anos) → bloqueio automático + alerta 60 dias.
2. Licença/CMA/credenciamento vencido → bloqueio do profissional.
3. Exame toxicológico vencido (90 dias) → bloqueio da função ARSO.
4. Item MEL vencido → bloqueio do voo.
5. DA aplicável pendente → prevalece sobre a MEL.
6. Despacho bloqueado se faltar combustível regulamentar.
7. Ferramenta com calibração vencida → bloqueio de uso na OS.
8. Peça com etiqueta vermelha → bloqueio de instalação.
9. OS não aprovada para retorno sem assinatura de profissional habilitado.
10. Grande reparo/alteracao → SEGVOO 001 antes do retorno.
11. Fluxo comercial da oficina em 12 etapas (máquina de estados).
12. Matrícula de aeronave deve bater com o RAB.
13. Anúncio da RLoja é visão do estoque (sem item de estoque, sem anúncio).
14. Matrícula no dobro do período letivo → cancelamento (S141).
15. Tempo-resposta SESCINC ≤ 3 minutos.

### 4.3 Estrutura
```typescript
// rules/regras-bre.ts
export const BUSINESS_RULES = [
  { code: 'ACCREDITATION_EXPIRED', severity: 'BLOCKING', ... },
  { code: 'LICENSE_EXPIRED', severity: 'BLOCKING', ... },
  { code: 'TOXICOLOGICAL_EXPIRED', severity: 'BLOCKING', ... },
  { code: 'MEL_ITEM_EXPIRED', severity: 'BLOCKING', ... },
  { code: 'DA_PENDING', severity: 'BLOCKING', ... },
  { code: 'FUEL_INSUFFICIENT', severity: 'BLOCKING', ... },
  { code: 'TOOL_CALIBRATION_EXPIRED', severity: 'BLOCKING', ... },
  { code: 'PART_RED_TAG', severity: 'BLOCKING', ... },
  { code: 'CRS_WITHOUT_SIGNATURE', severity: 'BLOCKING', ... },
  { code: 'SEGVOO_REQUIRED', severity: 'BLOCKING', ... },
  { code: 'AIRCRAFT_RAB_MISMATCH', severity: 'BLOCKING', ... },
  { code: 'LISTING_WITHOUT_INVENTORY', severity: 'BLOCKING', ... },
  { code: 'ENROLLMENT_DOUBLE_PERIOD', severity: 'BLOCKING', ... },
  { code: 'SESCINC_RESPONSE_OVER_LIMIT', severity: 'CRITICAL', ... }
];
```

## 5. CONSOLIDAÇÃO FINAL

### 5.1 Visão geral do ecossistema
- 8 aplicativos, 1 backend, 1 banco (PostgreSQL 16 com RLS), 1 ledger imutável.
- Núcleos: Identity, RH Core, Catálogo Central, Estoque Central, Ledger, Ops/ERP.
- MDM de Pessoas e Ativos como FONTE ÚNICA; apps como espelho reativo via event bus.

### 5.2 Modelo de negócio
| Fonte | Regra |
|-------|-------|
| Marketplace (RLoja) | 3% da venda, cobrado do vendedor; comprador isento |
| Recrutamento | 3% do primeiro salário, cobrado do contratante, garantia 90 dias; candidato nunca paga |
| Assinatura | STARTER / PRO / ENTERPRISE |

### 5.3 Decisões finais (consolidação)
| Decisão | Escolha |
|---------|---------|
| Estrutura | Um sistema só: núcleos no backend + frontends por subdomínio |
| Backend | Único em núcleos (domain services) |
| Frontend | Separado por subdomínio (SPA leve) |
| Banco | PostgreSQL único, esquemas por domínio |
| Histórico | Ledger central append-only com hash SHA-256 |
| Escala | Infraestrutura elástica (autoscaling, CDN, load balancer) |

### 5.4 Performance e escala
- SPA, logos SVG como texto, fetch/AJAX, lazy loading, paginação.
- Cache em dupla camada (Redis + CDN).
- Load balancer, autoscaling, bancos por região, UUID.

## 6. TESTES OBRIGATÓRIOS DA PARTE 8

1. Teste da RLoja: anúncio sem item de estoque é rejeitado.
2. Teste de comissão: 3% da venda cobrado do vendedor; comprador isento.
3. Teste de aprovação: Admin Dono controla a publicação.
4. Teste de validação RAB: matrícula divergente bloqueia o cadastro.
5. Teste de BRE: cada regra bloqueia a ação correspondente.
6. Teste de integração: webhook idempotente não duplica.
7. Teste de circuit breaker: falha de integração não derruba o fluxo.
8. Teste de ancoragem: publicação, venda e integração geram blocos no ledger.
9. Teste de performance: busca na RLoja em < 200ms.

## 7. CRITÉRIOS DE ACEITE DA PARTE 8

- [ ] RLoja com anúncio como visão do estoque (empresarial vs particular).
- [ ] Controle do Admin Dono sobre a publicação.
- [ ] Comissão de 3% (loja vendedor + recrutamento contratante com garantia 90 dias).
- [ ] Integrações ANAC (RAB, SEI, S141, SIGRA) e pagamentos (Asaas).
- [ ] Validação RAB no cadastro de aeronave.
- [ ] Motor de Regras Declarativo (BRE) centralizado.
- [ ] Consolidação final das 8 partes.
- [ ] Testes de aceite passando; lacunas listadas.

---

## ✅ ESTRUTURA COMPLETA DA PASTA DO AGENTE
```
vortex/
├── CLAUDE.md                    # Contrato global (agente lê primeiro)
├── docs/
│   ├── 00-visao-geral.md        # Visão, 8 apps, arquitetura, stack
│   ├── 01-matriz-regulatoria.md # Matriz detalhada + complementar
│   ├── 02-parametros-prazos.md  # Parâmetros, prazos e jobs
│   ├── 03-formularios-anac.md   # Catálogo de 22 formulários
│   ├── 04-enums-controlados.md  # Dicionário de enums
│   ├── 05-seeds-rbac.md         # Os 8 seeds por RBAC
│   ├── 06-lacunas.md            # Relatório de lacunas
│   ├── 07-delimitacao.md        # Delimitação paramétrica
│   └── prompts/
│       ├── parte-1.md           # Fundação + Shell + MDM
│       ├── parte-2.md           # Ledger + Protocolo + Auditoria
│       ├── parte-3.md           # Assinatura + Documentos
│       ├── parte-4.md           # Billing + PPSP + Alertas
│       ├── parte-5.md           # ERP 43+145
│       ├── parte-6.md           # ERP 91/121/135/137
│       ├── parte-7.md           # ERP 141/142 + 153
│       └── parte-8.md           # RLoja + Integrações + Consolidação
```

## COMO USAR COM O AGENTE

1. Crie a pasta `vortex/` no projeto e copie cada arquivo `.md` para o local correspondente.
2. Coloque o `CLAUDE.md` na raiz (o agente lê primeiro, sempre).
3. Peça ao agente: *"Leia o CLAUDE.md e os docs, e construa a Fase 1 (Parte 1) — fundação, shell e núcleo de identidade."*
4. O agente lê o contrato global + os seeds + a delimitação, e executa com os valores oficiais corretos.
5. Uma fase por vez, testando cada uma antes de avançar.
6. Em qualquer divergência de valor, o **Valor Oficial (docs/07-delimitacao.md) prevalece**.