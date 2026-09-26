# VORTEX — docs/10: NAVEGAÇÃO POR APP (v2 — nível de clique, referência do frontend)

> **Versão 2 — 12/09/2026.** Reformulado para os **14 aplicativos**, a **SPA única Angular** (Opção A — lazy loading por feature-lib) e o **Núcleo separado da Rconta**.
> Estrutura global: a Shell Angular hospeda as 14 feature-libs; a rota inicial é resolvida pelo **subdomínio**. Barra superior global: **Central de Comunicação** (Chat · Alertas · E-mails · Comunicados Oficiais) + **Tema** (Claro → Escuro → Personalizado, alterna a cada clique). Barra lateral por app conforme abaixo.
> Convenção: `[lista]`, `[kanban]`, `[form]`, `[detalhe]`, `[timeline]` indicam o tipo de tela. Toda tela de escrita valida permissão no backend; a navegação esconde apenas o que o usuário não pode ver (UX).
> Componentes do Design System (`@vortex/ui`): **ValidationBadge** (selos N0–N3) ao lado de dados validáveis; **LedgerTimeline** (`[timeline]`) abre o histórico de qualquer registro como filtro do ledger — nunca lista editável.

---

## 0. SHELL (global — todos os apps)

- **Top bar:** logo (white-label no Enterprise) · seletor de app (14 apps autorizados ao usuário) · Central de Comunicação (Chat `[chat websocket]` · Alertas com badges `[lista]` · E-mails `[lista → leitor]` · Comunicados `[lista → detalhe]`) · Tema `[toggle 3 estados]` · perfil/sessão.
- **Sidebar:** menus do app ativo (abaixo), gerados por permissão.
- **Padrão de detalhe:** abas `Dados · Itens · [timeline Ledger] · Documentos · Comunicação`.
- **Rotas:** cada app = `loadChildren` de sua feature-lib; guards de permissão (UX) + validação no backend (verdade).

---

## 1. NÚCLEO (`nucleo.vortex.com`) — console de gestão (restrito a admins da plataforma; zero-trust)

> O console vê **estados e métricas, nunca conteúdo**. Toda ação exige protocolo e vira meta-evento no ledger.

- Dashboard `[KPIs de plataforma: tenants ativos, apps, integridade do ledger, fila de concessões]`
- **Tenants** `[lista → detalhe: estado, assinaturas, métricas de uso — sem conteúdo]`
- **Concessões de acesso** `[lista → detalhe: tipo (DONO/SUPORTE_PROTOCOLO/AUDITORIA_CONSENTIDA/AUDITORIA_COMPULSORIA/JUSTICA), escopo, validade, status]`
  - Nova concessão por protocolo `[form: nº do protocolo + escopo mínimo]` → execução às cegas `[form escopado]`
- **Revisão de descriptografias** `[lista de meta-eventos → relatório: quem, escopo, protocolo, quando]`
- **Integridade do ledger** `[status da cadeia → verificação por intervalo → relatório de quebras]`
- **Catálogo** `[lista → detalhe]` · deduplicação/taxonomia `[árvore ATA]`
- **Auditoria da plataforma** `[timeline de meta-eventos]`
- **Restaurações** `[histórico SYSTEM_RESTORED → nova restauração reconciliada]`
- **Configuração** `[papéis de admin, parâmetros da plataforma]`

---

## 2. RCONTA (`rconta.vortex.com`) — 7 módulos + 2 menus

- Dashboard `[widgets por módulo + pendências de validação + vínculos pendentes + alertas]`
- **Pessoal**
  - Meus dados `[form]`
  - Contatos `[lista → form]`
  - Endereços `[lista → form]` (CEP via ViaCEP preenche)
  - Documentos pessoais `[lista → form + anexo]` (CPF, RG, Título, Passaporte, outros)
  - Redes sociais pessoais `[lista → form]`
- **Profissional**
  - Dados profissionais `[form]`
  - Documentos profissionais `[lista → form]` (CANAC, Licenças CHT, Habilitações, CREA, CNH, outros)
  - Redes sociais profissionais `[lista → form]`
  - Currículo
    - Cursos `[lista → detalhe + certificado]`
    - Treinamentos `[lista → detalhe + certificado]`
    - Experiências `[lista → detalhe]` (dupla confirmação)
    - CMA `[lista → detalhe]`
    - CIV `[lista → lançamento → assinar → endosso → enviar ANAC]`
  - **Declarações de experiência** `[lista → solicitar → documento assinado (gerado do ledger)]`
  - Meu estoque (pessoal) `[lista → item → anunciar na RLoja]`
- **Empresarial**
  - Responsabilidades legais `[lista → documento assinado]`
  - Procurações `[lista → documento assinado]`
  - Minhas empresas `[lista]`
    - Detalhe da empresa `[detalhe: Dados | Funcionários | Assinaturas | Estoque da empresa | [timeline da assinatura]]`
- **Protocolo** `[lista → detalhe]`
- **Assinaturas** `[lista → detalhe → cancelar/reativar]`
- **Personalização** `[form: tema/fonte/cor]`
- **Segurança** — Senha `[form]` · Dispositivos `[lista → desconectar]` · 2FA `[form]`
- **Configurações** `[form: idioma/UTC/notificações]`

---

## 3. RLOJA (`market.vortex.com`) — multi-vendor, comissão 3%

- Explorar `[busca + filtros por categoria/origem]`
- Anúncio `[detalhe → comprar]`
- Meus anúncios `[lista → criar (visão do estoque: pessoal OU empresarial) → editar → pausar]`
- Minhas compras `[lista → detalhe]`
- Minhas vendas `[lista → detalhe → comissão 3%]`
- **Meus dados de compra** `[form: endereços pessoais/empresariais — edita o cadastro no NÚCLEO; visível igual na Rconta]`
- Configuração de vendedor `[form: perfil privado/público, banners]`

---

## 4. RECRUTAMENTO (`recruta.vortex.com`) — agregador + RH completo

- Dashboard `[KPIs: vagas abertas, candidatos por estágio, tempo médio]`
- **Vagas** `[lista/kanban]` — Externas | Internas
  - Criar/editar vaga `[form completo de RH: cargo, função, salário, requisitos, objetivo, escala, visibilidade]` (origem: aqui OU no RH do ERP)
- **Candidatos** `[kanban por estágio → detalhe]`
  - Detalhe do candidato `[perfil (núcleo) + comparação de habilidades + estágio + [timeline]]`
- **Perfil profissional** (tudo que o Profissional da Rconta faz — mesmo cadastro no núcleo)
  - Currículo: Cursos `[lista → form]` · Treinamentos `[lista → form]` · Documentos `[lista → form]` · Experiências `[lista → form]`
  - Declarações de experiência `[lista → solicitar → documento assinado]`
- Comparar candidatos `[tabela/score]`
- Entrevistas `[agenda]`
- Relatórios `[por vaga/origem/estádio/tempo]`
- Configuração `[estágios, cargos, fontes, templates, habilidades]`

---

## 5. ERP OPERADORES 91/121/135 (`ops.vortex.com`)

- Dashboard `[KPIs frota/despacho/conformidade]`
- **Departamento Operações**
  - Comercial/CRM `[pipeline fretamento → proposta → contrato]` (a venda conduzida pelo app Fretamento)
  - Frota `[aeronaves (validação RAB) | contratos | repeso 36 meses]`
  - Despacho `[liberações → validação (combustível/met/P&B/MEL/tripulação via núcleo) → release]`
  - Diário técnico da aeronave `[lançamentos → [timeline]]`
  - Tripulação `[escalas; qualificação via núcleo]`
  - Manuais `[MGO/AOM/MCmsV/MGM/PTO]` + recortes de Publicações
- **Departamento Manutenção**
  - Manutenção de linha `[solicitações → OS]`
  - Controle de manutenção `[programada | DA | MEL — atualizado automaticamente pelo APRS]`
  - Suprimentos técnicos `[peças | ferramentas]`
  - Compras `[pedidos | fornecedores]`
- RH interno + Vagas · Administrativo geral `[RH | Financeiro | Contabilidade | Compras]`
- Relatórios / Configuração

---

## 6. ERP CURSOS E TREINAMENTOS 141/142 (`training.vortex.com`)

Árvore nível-clique (docs/10 v2 §7 — verbatim):
- Dashboard `[turmas | certificados | vendas]`
- Comercial/CRM `[pipeline → matrículas]`
- Cursos `[catálogo → publicar na RLoja]` — inclui currículos das ISs 121-006/007/008/011, 135-001/003, 137-207
- Turmas `[alunos | instrutores | agenda | frequência | avaliações]` + **Turmas corporativas (contratadas por operadores/agrícola)**
- Simuladores (FSTD) `[dispositivos | qualificações | reservas]`
- Certificados `[emissão ≤10 dias | diplomas]`
- S141 `[sincronização ANAC]`
- RH interno `[instrutores | examinadores]` + Vagas
- Administrativo geral `[RH | financeiro | contabilidade | compras]`
- Relatórios `[desempenho | conformidade S141 | vendas]`
- Configuração `[tipos de curso | matriz curricular | templates de certificado]`

## 7. ERP MANUTENÇÃO 43/145 (`mro.vortex.com`)

- Dashboard `[KPIs: OS por etapa, atrasos, calibrações vencendo, retenções]`
- Comercial/CRM `[pipeline → proposta → OS]`
- **Biblioteca Técnica** `[manuais | boletins | DA/FCDA]` — com **recortes de Publicações** `[tarefa → recorte do manual (se assinante); sem assinatura → orientação de obtenção externa]`
- Suprimentos
  - Ferramentaria `[lista → calibração]`
  - Estoque técnico `[lista → etiquetas → FORM 8130-3]`
  - Compras `[pedidos → fornecedores]`
  - Importações `[processos]`
- Setor de Registros `[cadernetas (Parte I = projeção; Parte II = eventos) | OS arquivadas | retenções]`
- Manutenção/Oficina `[OS kanban 12 etapas → APRS/CRS → SEGVOO]`
- Qualidade/SGSO `[NC | auditorias | perigos]`
- RH interno `[mecânicos (CHT via núcleo) | treinamentos | escalas]` + **Vagas** `[form RH completo → Recrutamento]`
- Administrativo geral `[RH | Financeiro | Contabilidade (dupla entrada) | Compras]`
- Relatórios / Configuração

---

## 8. ERP AGRÍCOLA 137 (`agri.vortex.com`)

- Dashboard `[CDAG | dispersores | aplicações]`
- Comercial/CRM `[pipeline de serviços agrícolas → contratos]`
- Operador aeroagrícola `[CDAG (3 iterações) | FCDAG | RT]`
- Frota aeroagrícola `[aeronaves + dispersores (calibração) + DGPS (Declaração de Conformidade)]`
- Operações `[planejamento de aplicação | EMC | registro georreferenciado de faixas]`
- SGSO aeroagrícola `[perigos/riscos (3 cenários) | biblioteca de perigos | relatórios]`
- RH interno + Vagas · Administrativo geral `[RH | Financeiro | Contabilidade | Compras]`
- Relatórios / Configuração

---

## 9. ERP AERÓDROMOS 153 (`airport.vortex.com`)

- Dashboard `[RWYCC | SESCINC | fauna | inspeções | pousos/decolagens]`
- Comercial/CRM `[pipeline → contratos (operadores, lojas, espaços, slots)]`
- Infraestrutura `[pista/taxiway/pátio | pavimento (PCN/IRI/macrotextura) | sinalização | iluminação]`
- Operações `[pousos e decolagens | RWYCC/RCR | inspeções (checklists) | credenciamento lado ar]`
- SESCINC `[viaturas | agentes | tempo-resposta ≤3 min | exercícios]`
- Fauna/SIGRA `[registros | risco | mitigação]`
- Manutenção (8 áreas) `[ordens por área]`
- SGSO `[perigos | riscos | relatório quadrimestral]`
- RH interno + Vagas · Administrativo geral `[RH | Financeiro | Contabilidade | Compras]`
- Relatórios / Configuração

---

## 10. APP ANAC (`anac.vortex.com`) — uso oficial; auditor

- Dashboard `[fila de solicitações | certificações sob monitoramento]`
- **Solicitar acesso ao ledger** `[form: filtro (pessoa/empresa/aeronave/peça/OS/acidente) + justificativa]`
- **Audiências** `[lista → detalhe: status (aguardando autorização/autorizada/compulsória/encerrada) → visualização somente-leitura [timeline descriptografada do filtro] → encerrar]`
- **Suspensão de certificação** `[form: empresa/aeronave + motivo (recusa de acesso)]`
- **Consulta de pessoas/empresas** `[busca → detalhe regulatório (somente-leitura, conforme concessão)]`
- Histórico de auditorias `[timeline dos próprios acessos]`
- *(sem escrita em dados de domínio — somente-leitura sempre)*

---

## 11. TRAVEL (`travel.vortex.com`) — passagens 121, comissão de agência

- Buscar voos `[busca: origem/destino/data → resultados]`
- Reserva/compra `[detalhe → passageiros (dados do núcleo) → pagamento → e-ticket]`
- Minhas viagens `[lista → detalhe → remarcar/cancelar]`
- Minhas vendas (agência) `[lista → comissões]`
- Configuração `[companhias, tarifas, comissionamento]`

---

## 12. FRETIMENTO (`charter.vortex.com`) — 135 e 137

- Buscar/cotar fretamento `[busca: tipo (passageiros/carga/aeromédico/agrícola) → operadores disponíveis]`
- Reserva `[detalhe → contrato → confirmação]`
- Painel do operador `[solicitações recebidas → propostas → contratos → execução]`
- Minhas contratações `[lista → detalhe]`
- Configuração `[tipos de operação, tarifas]`

---

## 13. CERTIFICAÇÕES (`certificacoes.vortex.com`) — produto na RLoja

- Catálogo por norma `[91 Ap.K, 121, 135, 137, 145, 141, 142, 153 → comprar na RLoja]`
- **Trilha de conformidade** `[checklist por requisito → documentos → protocolos SEI → fases → acompanhamento]`
  - Minha certificação `[detalhe: fase atual, pendências, evidências, [timeline]]`
- Configuração `[produtos, preços]`

---

## 14. PUBLICAÇÕES (`publicacoes.vortex.com`) — assinatura anual de manuais

- Catálogo de pacotes `[manuais digitalizados (fabricante/Veryon, sob licenciamento) → assinar (anual)]`
- Biblioteca de manuais `[lista → leitor (digitalizado/OCR) → busca por ATA]`
- **Recortes** `[tarefa de manutenção → recorte do manual aplicável (se assinante); sem assinatura → orientação de obtenção externa]`
- Minhas assinaturas de publicações `[lista → detalhe → renovação]`
- Configuração `[pacotes, preços, licenças]`

---

## 15. CAMADA ADMINISTRATIVA GERAL (disponível em qualquer ERP/tenant)

- **RH:** Colaboradores · Contratos · Cargos · Escalas · Férias/Ausências · Ponto · Despesas · Treinamentos internos
- **Financeiro:** Contas a Pagar · Contas a Receber · Faturas · Cobranças · Fluxo de Caixa · Conciliação
- **Contabilidade (dupla entrada):** Plano de Contas · Diário · Razão · Lançamentos (com validação em tempo real do balanceamento) · Balancete · DRE · Fechamento
- **Compras:** Pedidos · Cotações · Fornecedores · Recebimento · Faturamento
- **Comercial/CRM (geral):** Pipeline · Leads · Relatórios · Configuração
- **Documentos/Contratos:** contratos, renovações, alertas de vencimento

---

## 16. REGRAS DE NAVEGAÇÃO (v2)

1. Toda tela de escrita exige permissão RBAC/ABAC no backend; a navegação esconde apenas o que o usuário não pode ver (UX), nunca valida regra.
2. Histórico de qualquer registro abre como **LedgerTimeline** (filtro do ledger), nunca como lista editável.
3. **ValidationBadge** (N0–N3) aparece ao lado de dados de pessoa/documentos/vínculos/certificados.
4. **O mesmo dado editável em vários apps** (Rconta, RLoja, Recrutamento, ERPs): qualquer app pode criar/editar cadastros do núcleo conforme permissão — o app de origem fica registrado no evento do ledger; o dado exibido é sempre o mesmo.
5. **Console do Núcleo:** somente admins da plataforma; vê estados/métricas, nunca conteúdo; toda ação exige protocolo e vira meta-evento.
6. **App ANAC:** somente-leitura sempre; toda visualização dentro do escopo de uma concessão ativa.
7. Tela de detalhe segue o padrão de abas: `Dados · Itens · [timeline Ledger] · Documentos · Comunicação`.
