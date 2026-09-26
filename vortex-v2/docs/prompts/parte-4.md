# VORTEX — PARTE 4/10 (v2): BILLING, RBAC 120 (PPSP) E HUB DE ALERTAS PREDITIVOS

> **Versão 2 — 12/09/2026.** Reformulada: modelo de negócio v2 — **Recrutamento SEM comissão** (embutido no ERP ou Assinatura de Vagas; pessoas nunca pagam), novas fontes de receita (comissão de agência no Travel, comissão/contrato no Fretamento, Publicações como assinatura anual), e assinaturas atualizadas (ERP Agrícola entra; "Recrutamento" sai da lista de produtos).
> **Instrução ao agente de código:** você é um engenheiro de software sênior especialista em billing multi-tenant, assinaturas SaaS, marketplaces, programas de prevenção ao uso de substâncias psicoativas na aviação (RBAC 120) e sistemas de alertas preditivos. Construa o módulo de Billing/Subscriptions, o módulo PPSP (RBAC 120) e o Hub de Alertas Preditivos do ecossistema VORTEX conforme a especificação abaixo, com rigor absoluto, TypeScript estrito, testes e documentação. Execute este prompt por completo, sem resumir, sem pular seções, sem simplificar.

## 1. OBJETIVO DA PARTE 4

Entregar três capacidades:
1. **Billing e Subscriptions** — planos, tenants, medição de uso e cobrança recorrente (Asaas), incluindo o modelo de negócio v2 do ecossistema.
2. **RBAC 120 (PPSP)** — Programa de Prevenção ao Uso de Substâncias Psicoativas, com exames toxicológicos de janela longa.
3. **Hub de Alertas Preditivos** — alertas automáticos de vencimento, bloqueio e conformidade em todo o ecossistema.

> **Aderência à arquitetura central:** o Billing e os Alertas operam sobre dados do NÚCLEO e dos apps. Nenhum cadastro duplicado é criado aqui. O PPSP usa o Cadastro Central de Pessoas como fonte única. Toda cobrança/comissão é disparada por **eventos do ledger** — nunca por cadastro paralelo.

## 2. MODELO DE NEGÓCIO DO ECOSSISTEMA (v2)

### 2.1 Os produtos vendidos e os não vendidos

| Produto/App | Modelo | Observação |
|-------------|--------|------------|
| **Rconta (grátis)** | Grátis com anúncios (banners) | 7 módulos + 2 menus; banners removidos com Rconta VIP ou compra de um ERP |
| **Rconta VIP** | Assinatura | Remove anúncios apenas na Rconta de quem comprou |
| **Assinatura de Vagas** | Assinatura | Recrutamento para empresa **sem ERP** |
| **ERP Manutenção (43/145)** | Assinatura | Recrutamento incluso |
| **ERP Operadores (91/121/135)** | Assinatura | Recrutamento incluso |
| **ERP Cursos (141/142 + ISs)** | Assinatura | Recrutamento incluso; único que vende cursos na RLoja |
| **ERP Agrícola (137)** | Assinatura | Recrutamento incluso |
| **ERP Aeródromos (153)** | Assinatura | Recrutamento incluso |
| **Publicações** | Assinatura anual | Manuais digitalizados licenciados; recortes consumidos pelas tarefas de manutenção dos ERPs |
| **RLoja** | Comissão 3% do vendedor | Comprador isento; vender não exige assinatura (multi-vendor) |
| **Travel** | Comissão de agência | Passagens de linhas regulares 121 |
| **Fretamento** | Comissão/contrato | 135 (passageiros, carga, aeromédico) e 137 (agrícola) |
| **Núcleo / Catálogo / App ANAC** | Não vendidos | Infraestrutura e uso oficial |

> **v2 — RECRUTAMENTO NÃO É PRODUTO E NÃO TEM COMISSÃO:** o uso vem **embutido na assinatura de todo ERP** (permissão `recrutamento:incluso`); empresa sem ERP compra a **Assinatura de Vagas**; **pessoas nunca pagam**; nenhuma cobrança por evento de contratação.

### 2.2 Regras de comissão (acionadas por eventos do ledger)

| Fonte | Regra | Onde é acionado |
|-------|-------|-----------------|
| Marketplace (RLoja) | 3% da venda, cobrado do VENDEDOR; comprador isento | Quando uma venda é concluída na RLoja |
| Travel | Comissão de agência por passagem 121 (percentual por companhia, configurável) | Quando o e-ticket é emitido |
| Fretamento | Comissão/contrato por fretamento 135/137 (percentual ou taxa por operação) | Quando o contrato de fretamento é confirmado |
| ~~Recrutamento~~ | ~~3% do primeiro salário, garantia 90 dias~~ | **REMOVIDA (v2)** — sem comissão; sem cobrança por contratação |

> **Nota de arquitetura:** as comissões são acionadas por **eventos do ledger** (venda concluída, e-ticket emitido, contrato confirmado). Os apps não calculam nem cobram — apenas o evento dispara o billing.

### 2.3 Planos de assinatura
| Plano | Limites |
|-------|---------|
| **STARTER** | 1 empresa, 5 usuários, ledger+protocolo básico, 1GB |
| **PRO** | Múltiplos módulos, 50 usuários, assinatura digital, 10GB |
| **ENTERPRISE** | Ilimitado, auditoria certificada, API, white-label |

## 3. BILLING E SUBSCRIPTIONS

### 3.1 Entidades (schema subscriptions)
```sql
-- SCHEMA: subscriptions
CREATE TABLE subscriptions.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('ERP','RH','CRM','LOJA','OPERADORES','MANUTENCAO','INSTRUCAO','AGRICOLA','AERODROMO','CERTPUB','TRAVEL','FRETAMENTO')),
    owner_company_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscriptions.tenant_users (
    tenant_id UUID NOT NULL REFERENCES subscriptions.tenants(id),
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN','USER')),
    PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE subscriptions.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES subscriptions.tenants(id),
    product VARCHAR(50) NOT NULL CHECK (product IN
      ('RCONTA_VIP','ASSINATURA_VAGAS','ERP_MANUTENCAO','ERP_OPERADORES','ERP_CURSOS','ERP_AGRICOLA','ERP_AERODROMOS','PUBLICACOES')),
    plan VARCHAR(50) NOT NULL CHECK (plan IN ('STARTER','PRO','ENTERPRISE','ANUAL_PUBLICACOES')),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'
      CHECK (status IN ('ACTIVE','SUSPENDED','CANCELLED','EXPIRED')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    renews_at TIMESTAMPTZ,
    billing_cycle VARCHAR(10) NOT NULL DEFAULT 'MONTHLY' CHECK (billing_cycle IN ('MONTHLY','ANNUAL')),
    includes_recruitment BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE para todos os ERPs (v2)
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscriptions.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions.subscriptions(id),
    amount NUMERIC(15,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
      CHECK (status IN ('PENDING','PAID','OVERDUE','CANCELLED','REFUNDED')),
    due_date DATE NOT NULL,
    payment_reference VARCHAR(100),
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscriptions.commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(30) NOT NULL CHECK (source IN ('RLOJA','TRAVEL','CHARTER')),
    source_event_id UUID NOT NULL,          -- venda/e-ticket/contrato que disparou
    seller_user_id UUID,
    seller_company_id UUID,
    base_amount NUMERIC(15,2) NOT NULL,
    commission_percent NUMERIC(5,2) NOT NULL,
    commission_amount NUMERIC(15,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE'
      CHECK (status IN ('PENDENTE','COBRADA','CANCELADA')),
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.2 Regras de billing
1. Tenant vinculado à empresa (não confundir tenant com empresa).
2. Medição correta de uso via ledger (eventos do ledger por tenant/mês).
3. Cobrança recorrente (mensal/anual) via Asaas (PIX/boleto/cartão); webhook idempotente.
4. Fatura vencida após 7 dias de tolerância → **suspensão** do módulo pago e **migração de custódia do estoque de volta à Rconta** (evento no ledger).
5. Cancelamento/suspensão de ERP → estoque volta à Rconta (módulo Empresarial) como estoque único com marcação de origem; ao regularizar, o sistema pergunta se quer restaurar os estoques como estavam antes.
6. Rconta VIP remove anúncios **apenas na Rconta do comprador**.
7. **Comissões (v2):** RLoja 3% do vendedor; Travel comissão de agência; Fretamento comissão/contrato — todas acionadas por eventos do ledger e registradas em `subscriptions.commissions`.
8. **Recrutamento:** nenhuma cobrança por contratação; a assinatura de ERP carrega `includes_recruitment = TRUE`; a Assinatura de Vagas é produto próprio para quem não tem ERP.
9. **Publicações:** assinatura anual por pacote; o acesso ao recorte das tarefas de manutenção é verificado pela assinatura ativa (Parte 9 — CertPub).
10. **Suspensão de Publicações** → tarefas de manutenção abrem sem o recorte (orientação de obtenção externa) — sem bloquear a tarefa em si.

### 3.3 Endpoints
- `POST /subscriptions`
- `GET /subscriptions`
- `POST /subscriptions/:id/cancel`
- `POST /subscriptions/:id/reactivate`
- `POST /tenants`
- `POST /tenants/:id/users`
- `GET /subscriptions/usage`
- `POST /invoices/:id/retry`
- `GET /commissions` (console/admin)
- `POST /commissions/:id/charge`

## 4. RBAC 120 — PPSP (PROGRAMA DE PREVENÇÃO AO USO DE SUBSTÂNCIAS PSICOATIVAS)

> **Nota:** o RBAC 120 EMD 04 trata do PPSP (prevenção ao uso de substâncias psicoativas), NÃO do SGSO. O SGSO da OM 145 está na IS 145.214-001B; o SGSO dos operadores está no RBAC 121.1225-001.

### 4.1 Fundamentação regulatória
- RBAC 120: aplicabilidade (120.1), definições PPSP/ARSO (120.3), pessoal abrangido ARSO (120.5), substâncias psicoativas (120.7, Portaria SVS/MS 344/98 e álcool), programa de prevenção (120.9), manual de prevenção (120.11), declaração de conformidade (120.13), exames toxicológicos (120.15), registros do programa no ledger (120.17), educação e treinamento (120.19), supervisão (120.21), afastamento do ARSO (120.23).
- IS 120-002D: orientações de implantação, identificação de ARSO, exame de janela longa, subprogramas de educação.

### 4.2 Entidades
```sql
-- SCHEMA: identity (PPSP) — usa o Cadastro Central de Pessoas como fonte única
CREATE TABLE identity.arso_personnel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    company_id UUID NOT NULL,
    arso_function VARCHAR(50) NOT NULL CHECK (arso_function IN
      ('PILOTO_COMANDO','COPILOTO','COMISSARIO_VOO','MECANICO_VOO','MECANICO_MANUTENCAO_AERONAUTICA','DESPACHANTE_OPERACIONAL_VOO','OPERADOR_TRATOR_RAMPA_AEROPORTO','AGENTE_PROTECAO_AVSEC')),
    status VARCHAR(50) NOT NULL DEFAULT 'ATIVO',
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE identity.toxicological_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arso_personnel_id UUID NOT NULL REFERENCES identity.arso_personnel(id),
    exam_date DATE NOT NULL,
    validity_end DATE NOT NULL, -- 90 dias (janela longa)
    result VARCHAR(50) NOT NULL CHECK (result IN ('NEGATIVO','POSITIVO','INCONCLUSIVO')),
    laboratory VARCHAR(255),
    report_hash VARCHAR(64),
    ledger_block_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.3 Regras de negócio do PPSP
1. Validade do exame toxicológico de janela longa: **90 dias** (alerta 15 dias antes).
2. Exame vencido → bloqueio da função crítica (ARSO).
3. Sorteio aleatório inopinado: mínimo de 25% do efetivo ARSO testado por ano (algoritmo auditável, semente ancorada no ledger).
4. Resultado positivo → afastamento imediato e irrevogável, notificação ao Gestor do PPSP.
5. Substâncias rastreadas: álcool etílico, canabinoides, cocaína, opiáceos, anfetaminas, fenciclidina (Portaria 344/98).
6. Registro imutável no ledger (ID 120.17).

### 4.4 Endpoints
- `POST /arso-personnel`
- `GET /arso-personnel`
- `POST /toxicological-exams`
- `GET /toxicological-exams`
- `GET /arso-personnel/expiring`
- `POST /arso-personnel/:id/random-test`

## 5. HUB DE ALERTAS PREDITIVOS

### 5.1 Conceito
- Centraliza alertas automáticos de vencimento, bloqueio e conformidade de TODO o ecossistema.
- Alimenta os badges da Shell (sino de notificações) — **com push via WebSockets (v2)**.
- Dispara notificações in-app e e-mail transacional.
- **Opera sobre dados do núcleo e dos apps — nunca cria cadastro próprio.**

### 5.2 Entidade
```sql
-- SCHEMA: notifications
CREATE TABLE notifications.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('INFO','WARNING','CRITICAL','BLOCKING')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    entity_type VARCHAR(100),
    entity_id UUID,
    due_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'ABERTO' CHECK (status IN ('ABERTO','LIDO','RESOLVIDO','EXPIRADO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);
```

### 5.3 Alertas obrigatórios (todo o ecossistema)
| Alerta | Severidade | Antecedência |
|--------|-----------|--------------|
| Credenciamento RBAC 183 vencendo | CRITICAL | 60 dias |
| Licença/CMA vencendo | CRITICAL | 30 dias |
| Exame toxicológico vencendo | CRITICAL | 15 dias |
| Item MEL vencendo | CRITICAL | 3 dias |
| Treinamento vencendo | WARNING | 30 dias |
| Aprovação operacional expirando | WARNING | 30 dias |
| Relatório ANAC vencendo | CRITICAL | 15 dias |
| Fatura vencida | BLOCKING | imediato |
| Aeronave bloqueada | CRITICAL | imediato |
| Ferramenta com calibração vencida | BLOCKING | imediato |
| Dispersor com calibração vencida | BLOCKING | imediato |
| Credencial de acesso vencida | BLOCKING | imediato |
| Checklist de manutenção atrasado | WARNING | imediato |
| Agente extintor abaixo do mínimo | CRITICAL | imediato |
| RWYCC rebaixado | CRITICAL | imediato |
| Vínculo de experiência pendente de aprovação | INFO | imediato |
| Documento cadastral pendente de validação | INFO | imediato |
| Anúncio da RLoja pendente de aprovação do Admin | INFO | imediato |
| Assinatura de ERP vencendo/suspensa | BLOCKING | 7 dias |
| **Assinatura de Publicações vencendo (v2)** | WARNING | 30 dias |
| **Quebra de integridade do ledger (v2)** | BLOCKING | imediato |
| **Concessão de acesso expirando (v2)** | INFO | 24 horas |

### 5.4 Regras do hub
1. Varredura preditiva a cada 6 horas (job).
2. Alertas BLOCKING bloqueiam a ação correspondente.
3. Alertas alimentam os badges da Shell (sino) — push em tempo real via WebSockets.
4. Notificações in-app + e-mail transacional (idempotente por notification_key).
5. Toda criação/resolução de alerta → ledger.

### 5.5 Endpoints
- `GET /alerts`
- `GET /alerts/:id`
- `POST /alerts/:id/read`
- `POST /alerts/:id/resolve`
- `GET /alerts/summary` (badges da Shell)

## 6. TESTES OBRIGATÓRIOS DA PARTE 4

1. Teste de billing: comissão de 3% da loja (vendedor); comprador isento.
2. Teste de comissões v2: Travel (e-ticket emitido) e Fretamento (contrato confirmado) geram comissão via evento do ledger.
3. Teste de planos: STARTER/PRO/ENTERPRISE com limites corretos.
4. Teste de medição: contagem de eventos do ledger por tenant/mês.
5. **Teste de recrutamento sem comissão:** contratação finalizada NÃO gera cobrança; assinatura de ERP carrega `includes_recruitment = TRUE`.
6. **Teste de Assinatura de Vagas:** empresa sem ERP compra e usa o Recrutamento; pessoas nunca pagam.
7. Teste de PPSP: exame toxicológico vencido (90 dias) bloqueia função ARSO.
8. Teste de sorteio: algoritmo de sorteio aleatório auditável e ancorado no ledger.
9. Teste de afastamento: resultado positivo bloqueia irrevogavelmente.
10. Teste de alertas: alerta de credenciamento dispara 60 dias antes.
11. Teste de badges: alertas alimentam o sino da Shell (push WebSocket).
12. Teste de idempotência: notificações não duplicam.
13. Teste de suspensão de ERP: fatura vencida suspende e migra o estoque de volta à Rconta.
14. Teste de Rconta VIP: remove anúncios apenas na Rconta do comprador.
15. **Teste de Publicações:** assinatura ativa libera recorte; suspensa → tarefa abre sem recorte (sem bloquear a tarefa).

## 7. CRITÉRIOS DE ACEITE DA PARTE 4

- [ ] Billing com planos, tenants, medição de uso e cobrança Asaas.
- [ ] Modelo de negócio v2: assinaturas (Rconta VIP, Assinatura de Vagas, 5 ERPs, Publicações) + comissões (RLoja 3%, Travel, Fretamento).
- [ ] **Recrutamento sem comissão** — embutido no ERP (`includes_recruitment`) ou Assinatura de Vagas; sem cobrança por contratação.
- [ ] Comissões acionadas por eventos do ledger (`subscriptions.commissions`).
- [ ] Módulo PPSP (RBAC 120) com ARSO, exames toxicológicos de 90 dias e sorteio aleatório.
- [ ] Afastamento imediato por resultado positivo.
- [ ] Hub de Alertas Preditivos com severidades e antecedências (incluindo alertas v2: Publicações, integridade do ledger, concessões).
- [ ] Alertas alimentam os badges da Shell com push WebSocket.
- [ ] Testes de aceite passando; lacunas listadas.
