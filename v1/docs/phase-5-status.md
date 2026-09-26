# VORTEX — Status da Fase 5: ERP 43+145 — Manutenção Aeronáutica e Organizações de Manutenção

## Resumo da Fase 5

A Fase 5 do VORTEX adicionou o módulo completo de manutenção aeronáutica (RBAC 43 + RBAC 145):
1. **Gestão da Organização de Manutenção (OM - RBAC 145)**:
   - Certificado de OM (COM), Especificações Operativas (EO), Lista de Capacidade (LC), Manual da OM (MOM) e SGSO.
   - Credenciamento e qualificação de pessoal habilitado (RT, GR, Gerente de Qualidade, Inspetores, Técnicos com CHT ativa).

2. **Fluxo Comercial e Técnico em 12 Etapas (RBAC 43)**:
   - Máquina de estados das Ordens de Serviço (OS): Cotação (1) → Pré-Orçamento (2) → Aprovação (3) → Solicitação Peças (4) → Inspeção Recebimento (5) → Triagem (6) → Abertura (7) → Execução (8) → Fechamento APRS (9) → Orçamento Final (10) → Documentos CRS/SEGVOO (11) → Liquidação (12).

3. **As 5 Travas Regulatórias de Segurança de Voo**:
   - **Trava 1 (RBAC 43.7)**: Emissão de CRS/APRS bloqueada sem assinatura digital de profissional habilitado (RT ou Inspetor).
   - **Trava 2 (IS 43.13-005)**: Ferramenta com calibração RBC/INMETRO vencida bloqueia o avanço das tarefas na OS.
   - **Trava 3 (IS 43-001)**: Peça com etiqueta 🔴 VERMELHA ou sem Form 8130-3 (em quarentena) bloqueia instalação na OS.
   - **Trava 4 (RBAC 39)**: Diretriz de Aeronavegabilidade (DA) pendente bloqueia a emissão do CRS e o retorno ao serviço da aeronave.
   - **Trava 5 (IS 43.9-001)**: Grande Reparo ou Grande Alteração exige formulário SEGVOO 001 gerado antes do encerramento com CRS.

4. **Almoxarifado, Ferramentas, END & Cadernetas Digitais**:
   - Triagem de peças por etiquetas (🟢 Verde / 🟡 Amarela / 🔴 Vermelha), Form 8130-3 e controle de *shelf life*.
   - Controle de calibração metrológica de ferramentas (RBC/INMETRO).
   - Ensaios Não Destrutivos (END - IS 43.13-004) com qualificação de Inspetor Nível I/II/III.
   - Escrituração digital automática de Cadernetas de Célula, Motor, Hélice e Componentes (IS 43.9-003).

---

## Arquivos Criados / Modificados

```
packages/
├── contracts-be/src/
│   └── maintenance.ts         # 12 etapas da OS, etiquetas 🟢/🟡/🔴, métodos END, níveis de inspetor e eventos
└── database/migrations/
    └── 0016_maintenance_rbac43_145.sql # Schemas ops (OM, Aeronaves, Logbooks, OS, Peças, Ferramentas, END, DAs)

apps/api/src/modules/
└── maintenance/
    ├── maintenance.dto.ts
    ├── maintenance.service.ts
    ├── maintenance.controller.ts
    ├── maintenance.module.ts
    └── maintenance.service.spec.ts
```

---

## Verificação e Qualidade

- **Testes Unitários**: 14 arquivos de teste passando (**50 testes unitários no total, 100% de aprovação**).
- **Build Monorepo**: 18 pacotes compilados via `npx pnpm build`.
- **Imutabilidade e RLS**: Triggers PostgreSQL que bloqueiam `UPDATE` e `DELETE` em CRS, FCDA, cadernetas e laudos END.
