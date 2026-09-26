# VORTEX — Status da Fase 4: Billing, RBAC 120 (PPSP) e Hub de Alertas Preditivos

## Resumo da Fase 4

A Fase 4 do VORTEX adicionou três módulos centrais ao ecossistema:
1. **Billing & Subscriptions**:
   - Planos `STARTER` (1 empresa, 5 usuários, 1GB), `PRO` (10 empresas, 50 usuários, 10GB, assinaturas) e `ENTERPRISE` (ilimitado, API).
   - Diretriz Comercial de **3%**:
     - Marketplace (RLoja): 3% cobrado do VENDEDOR (comprador isento).
     - Recrutamento: 3% do 1º salário cobrado do CONTRATANTE com **garantia de reposição de 90 dias** (candidato nunca paga).
   - Medição de uso por tenant baseada na contagem de eventos do Ledger.
   - Cobrança recorrente via Asaas com tolerância de 7 dias antes do bloqueio de módulos pagos.

2. **RBAC 120 — PPSP (Prevenção ao Uso de Substâncias Psicoativas)**:
   - Cadastro e acompanhamento das 8 funções ARSO da aviação civil.
   - Exames toxicológicos de janela longa com **90 dias** de validade (alerta preventivo 15 dias antes).
   - **Sorteio aleatório inopinado**: amostragem auditável (mínimo de 25% do efetivo ARSO por ano) com semente determinística ancorada no hash do Ledger.
   - **Afastamento imediato e irrevogável**: resultado POSITIVO ou exame vencido impõe status `SUSPENDED` e bloqueia a função crítica no sistema.

3. **Hub de Alertas Preditivos**:
   - Centralizador de alertas com 4 níveis de severidade (`INFO`, `WARNING`, `CRITICAL`, `BLOCKING`).
   - Matriz de 15 alertas obrigatórios (RBAC 183 60d, licenças 30d, toxicológico 15d, MEL 3d, fatura vencida BLOCKING, etc.).
   - Consolidação de badges para o sino da Shell (`GET /alerts/summary`).
   - Resolução de alertas com ancoragem no Ledger.

---

## Arquivos Criados / Modificados

```
packages/
├── contracts-be/src/
│   ├── subscriptions.ts       # Planos, comissões de 3% e eventos
│   ├── ppsp.ts                # Funções ARSO, janela longa 90d e sorteio 25%/ano
│   └── alerts.ts              # Severidades e matriz de 15 alertas obrigatórios
└── database/migrations/
    └── 0015_billing_ppsp_alerts.sql # Schemas subscriptions, identity PPSP e notifications

apps/api/src/modules/
├── subscriptions/
│   ├── subscriptions.dto.ts
│   ├── subscriptions.service.ts
│   ├── subscriptions.controller.ts
│   ├── subscriptions.module.ts
│   └── subscriptions.service.spec.ts
├── ppsp/
│   ├── ppsp.dto.ts
│   ├── ppsp.service.ts
│   ├── ppsp.controller.ts
│   ├── ppsp.module.ts
│   └── ppsp.service.spec.ts
└── alerts/
    ├── alerts.dto.ts
    ├── alerts.service.ts
    ├── alerts.controller.ts
    ├── alerts.module.ts
    └── alerts.service.spec.ts
```

---

## Verificação e Qualidade

- **Testes Unitários**: 13 arquivos de teste passando (45 testes no total, 100% de aprovação).
- **Build Monorepo**: 18 pacotes compilados com sucesso via `npx pnpm build`.
- **Imutabilidade e RLS**: Triggers PostgreSQL e políticas RLS ativos nas novas tabelas.
