# VORTEX — VISÃO GERAL DO ECOSSISTEMA

## 1. O QUE É
O VORTEX é uma plataforma integrada de gestão de conformidade e governança de processos para a aviação civil brasileira, rigorosamente estruturada em consonância com os Regulamentos Brasileiros da Aviação Civil (RBAC), Instruções Suplementares (IS) e Resoluções expedidas pela ANAC.

## 2. SEGMENTOS COBERTOS
- Manutenção aeronáutica (RBAC 43 e 145)
- Operações de transporte aéreo regular e não regular (RBAC 91, 121 e 135)
- Operações aeroagrícolas (RBAC 137)
- Centros de formação e treinamento (RBAC 141 e 142)
- Infraestrutura aeroportuária (RBAC 153)
- Credenciamento de pessoas físicas e jurídicas (RBAC 183)
- Requisitos de tripulação, licenças e saúde (RBAC 61, 63, 65 e 120)
- Definições e regras gerais (RBAC 01 e 119)

## 3. OS 8 APLICATIVOS
| App | Função | Subdomínio |
|-----|--------|-----------|
| Rconta | Identidade, SSO, ledger, protocolo, cadastros | rconta.vortex.com |
| Catálogo Central | MDM de produtos e serviços | catalogo.vortex.com |
| Rloja | Marketplace B2B (estoque pessoal/empresarial) | market.vortex.com |
| Recrutamento | RH técnico, licenças, treinamento | recruta.vortex.com |
| ERP 43+145 | Manutenção (fluxo completo da oficina) | mro.vortex.com |
| ERP 91/121/135/137 | Operadores aéreos e aeroagrícola | ops.vortex.com |
| ERP 141/142 | Instrução (CIAC/CTAC) | training.vortex.com |
| ERP 153 | Infraestrutura aeroportuária | airport.vortex.com |

## 4. NÚCLEOS DE BACKEND
- Identity (Rconta): identidade única, SSO, MFA, assinatura, procurações, aeronaves
- RH Core: pessoas, vínculos, cargos, folha, recrutamento, treinamento
- Catálogo Central (MDM): produtos, serviços, certificação, vínculos, manuais
- Estoque Central: itens, dono (pessoa/empresa), acesso por vínculo, quarentena
- Ledger: linha do tempo imutável, auditoria, Res. 458
- Ops/ERP: regras por RBAC (91, 121, 135, 137, 145, 153)

## 5. ARQUITETURA E STACK
- Backend: NestJS (TypeScript), monorepo Turborepo
- Banco: PostgreSQL 16 com Row-Level Security (RLS)
- Cache/fila: Redis, RabbitMQ; Arquivos: MinIO
- Frontend: React 19, Vite, Module Federation, Tailwind, shadcn/ui
- Ledger imutável: hash SHA-256 encadeado + assinatura Ed25519 (Res. 458/2017)

## 6. FASES DO PROJETO
1. **Fase 1 (Rconta):** Identidade, Ledger, Protocolo, MDM de Pessoas, Assinatura, Billing
2. **Fase 2:** Catálogo Central (MDM de Ativos)
3. **Fase 3:** Motor de Processos Rconta (protocolo, formulários, workflows, SEI)
4. **Fase 4:** VORTEX Sign + Recrutamento
5. **Fase 5:** ERP 43+145 (Manutenção)
6. **Fase 6:** Engenharia (grandes alterações/reparos, SEGVOO 001)
7. **Fase 7:** ERP 141/142 (CIAC/CTAC)
8. **Fase 8:** ERP Operacional Unificado (121/135/137/153)

## 7. COMO O AGENTE DEVE USAR ESTA PASTA
- Leia sempre o `CLAUDE.md` no início de cada sessão.
- Consulte `docs/01-matriz-regulatoria.md` para os requisitos (IDs).
- Consulte `docs/02-parametros-prazos.md` para os valores oficiais (prazos, jobs).
- Consulte `docs/03-formularios-anac.md` e `docs/04-enums-controlados.md` para dados canônicos.
- Consulte `docs/05-seeds-rbac.md` para os seeds por RBAC.
- Consulte `docs/06-lacunas.md` e `docs/07-delimitacao.md` para correções.
- Execute os prompts em `docs/prompts/parte-1.md` a `parte-8.md`, um por vez.
- Em qualquer divergência de valor, o **Valor Oficial (docs/07-delimitacao.md) prevalece**.