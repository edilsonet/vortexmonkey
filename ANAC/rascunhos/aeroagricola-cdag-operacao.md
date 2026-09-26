# Aeroagrícola — CDAG e Operação

> **Assunto**: CDAG (Cadastro de Aeroagrícola); requisitos operacionais e de manutenção do RBAC 137
> **Fontes**: IS 137-003 · RBAC 137 (EMD 06) · IS 137.201-001E
> **Última destilação**: 12/09/2026 · **Status**: ✅ verificada contra o texto das normas

## 1. CDAG — ciclo de vida (IS 137-003)

- O CDAG é o **cadastro** do operador aeroagrícola (Subparte B do RBAC 137) — obtido, alterado, suspenso, revogado via **FCDAG** no **SEI**.
- **Dispensas**: operadores RBAC 133 em combate a incêndio (§137.1(e)/(f)); operadores de helicóptero com dispensadores externos fixos (não precisam RBAC 133); **VANT/RPAS** dispensados das Subpartes C, D e F, mas **precisam de CDAG** se operarem remunerado (§137.1(c)(1)).
- **Gestor responsável** (§137.127): designação conforme atos constitutivos (PJ) ou a própria pessoa (PF); não aceita procurador para a designação em si.
- **Aeronave no cadastro**: informa-se ao menos uma aeronave para verificação do §137.201, mas **não consta no CDAG** — alterações de frota não exigem atualização do cadastro.
- Comunicações oficiais: **SEI**, com representantes legais/procuradores cadastrados (Res. 520/2019 — protocolo eletrônico).

## 2. Requisitos operacionais (RBAC 137, EMD 06)

### §137.201 — Requisitos para operação

- Aeronave **registrada no Brasil**, aeronavegável, com manuais à disposição de piloto e manutenção, cintos/suspensórios adequados, **sem transporte de pessoa não envolvida**;
- Equipamento (dispersor etc.) instalado com aprovação ANAC quando grande alteração + manual disponível;
- **Alijamento de emergência**: ≥ 50% da carga máxima líquida em **5s** (monomotor) / **10s** (multimotor); comando do tanque com proteção contra alijamento inadvertido;
- Combustível não previsto no projeto: só com **autorização especial de voo**;
- **Abastecimento com motor ligado** (combustível e produto): permitido se não vedado no manual e risco aceitável (operador + PIC);
- Combustível/óleo: translado segue RBAC 91; operação agrícola = suficiente + **contingência determinada pelo operador** (Res. 772/2025).

### §§137.203–137.215

- **137.203 (manutenção)**: conforme RBAC 43/145 + Subparte E do 91; tarefas com instruções do fabricante, dados aprovados, ferramentas adequadas; **OM com CDAG pode contratar MMA habilitado** para manutenção no local da operação;
- **137.205 (privados)**: só sobre imóveis próprios/arrendados;
- **137.207 (pilotos)**: piloto agrícola habilitado (RBAC 61) + CMA válido (RBAC 67); treinamentos adequados (prevenção à distração, CRM tripulação simples, perigos conhecidos e lições do §137.215);
- **137.209 (EPIs)**: cintos/suspensórios; máscara com filtro (produtos tóxicos); capacete antichoque com viseira/abafador; calçados fechados;
- **137.211**: vedado operar com produtos químicos sobre áreas densamente povoadas/embarcações/aglomerações (exceto controle de vetores);
- **137.213 (noturno)**: conforme §§91.205(c) e 91.209;
- **137.215 (gerenciamento de risco)**: operador é responsável pela identificação de perigos e mitigações (detalhado na IS 137.201-001E);
- **137.301 (área de pouso)**: responsabilidade do proprietário; **não precisa cadastro na ANAC**; uso exclusivo aeroagrícola + concordância do proprietário.

## 3. Pontos de atenção para sistemas (VORTEX)

- **CDAG = entidade** com gestor responsável, situação (ativo/suspenso/revogado/cassado), histórico de alterações — eventos no ledger.
- **Frota não vinculada ao cadastro** (§5.2.4 da IS): o sistema não deve exigir atualização do CDAG a cada troca de aeronave — a frota é gerida à parte.
- **RPAS agrícola**: fluxo próprio (sem Subpartes C/D/F) — o ERP Agrícola precisa de modo VANT.
- **Alijamento 50%/5s/10s** como verificação de conformidade na aeronave.
- **Área de pouso agrícola**: entidade simples (proprietário + concordância + uso exclusivo) sem cadastro ANAC.
- Integração com **Fretamento 137** e **CertPub** (manuais de dispersores/fabricantes).

---
### Fontes citadas
- IS 137-003 (CDAG) — *acervo: is/is-137-003*
- RBAC 137, EMD 06 — *acervo: rbac/rbac-137*
- IS 137.201-001E (SGSO/gerenciamento de risco) — *acervo: is/is-137-201-001e*
