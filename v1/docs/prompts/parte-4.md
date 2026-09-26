# VORTEX — PARTE 4/8: BILLING, RBAC 120 (PPSP) E HUB DE ALERTAS PREDITIVOS

> Instrução ao agente de código: você é um engenheiro de software sênior especialista em billing multi-tenant, assinaturas SaaS, programas de prevenção ao uso de substâncias psicoativas na aviação (RBAC 120) e sistemas de alertas preditivos. Construa o módulo de Billing/Subscriptions, o módulo PPSP (RBAC 120) e o Hub de Alertas Preditivos do ecossistema VORTEX conforme a especificação abaixo, com rigor absoluto, TypeScript estrito, testes e documentação. Execute este prompt por completo, sem resumir, sem pular seções, sem simplificar.

## 1. OBJETIVO DA PARTE 4

Entregar três capacidades:
1. **Billing e Subscriptions** — planos, tenants, medição de uso e cobrança recorrente (Asaas), incluindo o modelo de negócio de 3%.
2. **RBAC 120 (PPSP)** — Programa de Prevenção ao Uso de Substâncias Psicoativas, com exames toxicológicos de janela longa.
3. **Hub de Alertas Preditivos** — alertas automáticos de vencimento, bloqueio e conformidade em todo o ecossistema.

## 2. BILLING E SUBSCRIPTIONS

### 2.1 Modelo de negócio (Diretriz Comercial VORTEX)
| Fonte | Regra |
|-------|-------|
| Marketplace (RLoja) | 3% da venda, cobrado do VENDEDOR; comprador isento |
| Recrutamento | 3% do primeiro salário, cobrado do CONTRATANTE, com garantia de reposição de 90 dias; candidato nunca paga |

### 2.2 Planos de assinatura
| Plano | Limites |
|-------|---------|
| **STARTER** | 1 empresa, 5 usuários, ledger+protocolo básico, 1GB |
| **PRO** | Múltiplos módulos, 50 usuários, assinatura digital, 10GB |
| **ENTERPRISE** | Ilimitado, auditoria certificada, API |

### 2.3 Entidades (schema subscriptions)
```sql
-- SCHEMA: subscriptions
CREATE TABLE subscriptions.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('ERP','RH','CRM','LOJA','OPERADORES','MANUTENCAO','INSTRUCAO')),
    owner_company_id UUID NOT NULL REFERENCES identity.companies(id),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscriptions.tenant_users (
    tenant_id UUID NOT NULL REFERENCES subscriptions.tenants(id),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN','USER')),
    PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE subscriptions.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES subscriptions.tenants(id),
    plan VARCHAR(50) NOT NULL CHECK (plan IN ('STARTER','PRO','ENTERPRISE')),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    renews_at TIMESTAMPTZ,
    ledger_block_id UUID REFERENCES ledger.ledger_blocks(id)
);
```

### 2.4 Medição de uso
- Query que conta eventos do ledger por tenant/mês.
- Billing Asaas: PIX/boleto/cartão, cobrança recorrente, webhook idempotente.

### 2.5 Regras de billing
1. Tenant vinculado à empresa (não confundir tenant com empresa).
2. Medição correta de uso via ledger.
3. Cobrança recorrente; webhook não duplica.
4. Fatura vencida após 7 dias de tolerância bloqueia módulos pagos.
5. Comissão de 3% da loja (vendedor) e 3% do recrutamento (contratante, garantia 90 dias).

### 2.6 Endpoints
- `POST /subscriptions`
- `GET /subscriptions`
- `POST /tenants`
- `POST /tenants/:id/users`
- `GET /subscriptions/usage`

## 3. RBAC 120 — PPSP (PROGRAMA DE PREVENÇÃO AO USO DE SUBSTÂNCIAS PSICOATIVAS)

> **Nota:** o RBAC 120 EMD 04 trata do PPSP (prevenção ao uso de substâncias psicoativas), NÃO do SGSO. O SGSO da OM 145 está na IS 145.214-001B; o SGSO dos operadores está no RBAC 121.1225-001.

### 3.1 Fundamentação regulatória
- RBAC 120: aplicabilidade (120.1), definições PPSP/ARSO (120.3), pessoal abrangido ARSO (120.5), substâncias psicoativas (120.7, Portaria SVS/MS 344/98 e álcool), programa de prevenção (120.9), manual de prevenção (120.11), declaração de conformidade (120.13), exames toxicológicos (120.15), registros do programa no ledger (120.17), educação e treinamento (120.19), supervisão (120.21), afastamento do ARSO (120.23).
- IS 120-002D: orientações de implantação, identificação de ARSO, exame de janela longa, subprogramas de educação.

### 3.2 Entidades
```sql
-- SCHEMA: identity (PPSP)
CREATE TABLE identity.arso_personnel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id),
    arso_function VARCHAR(50) NOT NULL CHECK (arso_function IN
      ('PILOTO_COMANDO','COPILOTO','COMISSARIO_VOO','MECANICO_VOO','MECANICO_MANUTENCAO_AERONAUTICA','DESPACHANTE_OPERACIONAL_VOO','OPERADOR_TRATOR_RAMPA_AEROPORTO','AGENTE_PROTECAO_AVSEC')),
    status VARCHAR(50) NOT NULL DEFAULT 'ATIVO',
    ledger_block_id UUID REFERENCES ledger.ledger_blocks(id),
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
    ledger_block_id UUID REFERENCES ledger.ledger_blocks(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.3 Regras de negócio do PPSP
1. Validade do exame toxicológico de janela longa: **90 dias** (alerta 15 dias antes).
2. Exame vencido → bloqueio da função crítica (ARSO).
3. Sorteio aleatório inopinado: mínimo de 25% do efetivo ARSO testado por ano (algoritmo auditável, semente ancorada no ledger).
4. Resultado positivo → afastamento imediato e irrevogável, notificação ao Gestor do PPSP.
5. Substâncias rastreadas: álcool etílico, canabinoides, cocaína, opiáceos, anfetaminas, fenciclidina (Portaria 344/98).
6. Registro imutável no ledger (ID 120.17).

### 3.4 Endpoints
- `POST /arso-personnel`
- `GET /arso-personnel`
- `POST /toxicological-exams`
- `GET /toxicological-exams`
- `GET /arso-personnel/expiring`
- `POST /arso-personnel/:id/random-test`

## 4. HUB DE ALERTAS PREDITIVOS

### 4.1 Conceito
- Centraliza alertas automáticos de vencimento, bloqueio e conformidade de TODO o ecossistema.
- Alimenta os badges da Shell (sino de notificações).
- Dispara notificações in-app e e-mail transacional.

### 4.2 Entidade
```sql
-- SCHEMA: notifications
CREATE TABLE notifications.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id),
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

### 4.3 Alertas obrigatórios (todo o ecossistema)
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

### 4.4 Regras do hub
1. Varredura preditiva a cada 6 horas (job).
2. Alertas BLOCKING bloqueiam a ação correspondente.
3. Alertas alimentam os badges da Shell (sino).
4. Notificações in-app + e-mail transacional (idempotente por notification_key).
5. Toda criação/resolução de alerta → ledger.

### 4.5 Endpoints
- `GET /alerts`
- `GET /alerts/:id`
- `POST /alerts/:id/read`
- `POST /alerts/:id/resolve`
- `GET /alerts/summary` (badges da Shell)

## 5. TESTES OBRIGATÓRIOS DA PARTE 4

1. Teste de billing: comissão de 3% da loja (vendedor) e 3% do recrutamento (contratante, garantia 90 dias).
2. Teste de planos: STARTER/PRO/ENTERPRISE com limites corretos.
3. Teste de medição: contagem de eventos do ledger por tenant/mês.
4. Teste de PPSP: exame toxicológico vencido (90 dias) bloqueia função ARSO.
5. Teste de sorteio: algoritmo de sorteio aleatório auditável e ancorado no ledger.
6. Teste de afastamento: resultado positivo bloqueia irrevogavelmente.
7. Teste de alertas: alerta de credenciamento dispara 60 dias antes.
8. Teste de badges: alertas alimentam o sino da Shell.
9. Teste de idempotência: notificações não duplicam.

## 6. CRITÉRIOS DE ACEITE DA PARTE 4

- [ ] Billing com planos, tenants, medição de uso e cobrança Asaas.
- [ ] Modelo de negócio de 3% (loja vendedor + recrutamento contratante com garantia 90 dias).
- [ ] Módulo PPSP (RBAC 120) com ARSO, exames toxicológicos de 90 dias e sorteio aleatório.
- [ ] Afastamento imediato por resultado positivo.
- [ ] Hub de Alertas Preditivos com severidades e antecedências.
- [ ] Alertas alimentam os badges da Shell.
- [ ] Testes de aceite passando; lacunas listadas.