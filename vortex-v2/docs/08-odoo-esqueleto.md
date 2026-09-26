# VORTEX — docs/08: REFERÊNCIA CONCEITUAL: ESQUELETO DE ERP + CRM (inspiração Odoo) (v2)

> **Versão 2 — 12/09/2026.** Documento conceitual — a filosofia permanece a mesma. Mudanças desta versão: atualização para o **Núcleo separado da Rconta** (13 apps), os novos apps de serviço (Travel, Fretamento, Certificações e Publicações) e o console de gestão.
> **Aviso:** nada aqui copia código, telas ou programação do Odoo. Apenas o **esqueleto conceitual** (menus, submenus, conteúdo e estrutura) para desenharmos o VORTEX com programação e design próprios.
> Fonte da lista de módulos: https://github.com/odoo/odoo (branch 17.0, pasta `addons`). O Odoo Community é ERP open source; a Enterprise tem extras (Quality, Appraisals, Sign, etc.) citados apenas como referência de conceito.

## 1. Ideias centrais (conceitos, não código)

1. **Cadastro único de parceiro (pessoa/empresa)** usado por todos os apps: contatos com endereços (faturamento/entrega), telefones, e-mails, documentos. → No VORTEX isto equivale ao **Núcleo (Cadastro Central) dono da verdade** — v2: serviço próprio, separado da Rconta.
2. **Quase tudo é um "pipeline em estágios" (kanban)**: oportunidades, pedidos, candidatos, tarefas, ordens de manutenção, solicitações.
3. **Um registro é uma ficha** com: dados principais + abas (itens, histórico/thread, atividades, documentos, e-mails, anexos). → No VORTEX, a aba de histórico é a **LedgerTimeline** (filtro do ledger), nunca thread editável.
4. **Relatórios nativos por app** (tabela/pivot, gráfico, lista, dashboard).
5. **"Configuração" dentro de cada área**: estágios, equipes, tipos, templates, tags, categorias.
6. **Atividades e próximas ações** sobre qualquer registro (ligar, reunir, enviar, vistoriar).
7. **Cada app segue: Dashboard → Operação → Relatórios → Configuração.**

## 2. Camadas de um ERP completo (modelo que o VORTEX adota)

Um ERP completo de uso geral tem **duas camadas**:

### 2.1 Camada administrativa geral (vale para qualquer empresa/tenant)
Presente em qualquer empresa que use a plataforma — independe do domínio regulado:

- **RH (Employees):** funcionários (vínculo aprovado vindo do núcleo), contratos, cargos, departamentos, escalas, férias/ausências com aprovação, ponto/assiduidade, despesas, treinamentos internos da empresa, avaliações.
- **Financeiro:** contas a pagar e a receber, faturas, cobranças, fluxo de caixa simples, conciliação bancária básica.
- **Contabilidade (v2 — especificada no contrato, seção 6):** plano de contas padrão (normas públicas brasileiras — CPC/ITG), diário, razão, lançamentos com **partidas dobradas** (Σ débitos = Σ créditos), estorno em vez de UPDATE, relatórios (balancete, DRE simplificada), fechamento mensal.
- **Compras:** pedidos de compra, cotação de fornecedores, recebimento, faturamento de compra.
- **Comercial/CRM:** pipeline de oportunidades do negócio (prospecção → proposta → ganho/perdido), equipes de vendas, motivos de perda.
- **Estoque/Administrativo:** inventário geral quando não há domínio técnico específico (usa o catálogo do núcleo).
- **Documentos e Contratos:** contratos com fornecedores/clientes, renovação, alertas de vencimento.

### 2.2 Camada de domínio (particularidades de cada ERP VORTEX), organizada em setores/departamentos
- **ERP Manutenção (43/145):** Biblioteca Técnica · Suprimentos (ferramentaria, estoque técnico, compras, importações) · Setor de Registros · Manutenção/Oficina (12 etapas).
- **ERP Operadores (91/121/135):** 2 departamentos — **Operações** e **Manutenção**.
- **ERP Cursos e Treinamentos (141/142/145-010 + ISs):** departamento **Cursos e Treinamentos**.
- **ERP Agrícola (137):** CDAG · dispersores/DGPS · operações agrícolas · SGSO aeroagrícola.
- **ERP Aeródromos (153):** setores operacionais (pousos/decolagens, pista/RWYCC, SESCINC, fauna/SIGRA, SGSO, infraestrutura).

## 3. CRM (conceito do app — pipeline comercial de uso geral)

**Menus (submenus):**
- **Pipeline** (kanban de oportunidades) → por equipe; arrastar entre estágios.
- **Leads** (suspeitos) → converter lead em oportunidade ou em cliente/contato.
- **Relatórios** → Análise de pipeline; Análise de leads (pivot por estágio, equipe, origem, vencedor).
- **Configuração** → Estágios; Equipes de vendas; Motivos de perda; Previsões; Templates de e-mail; Fontes de leads.

**Ficha de uma oportunidade:** cliente, valor esperado, probabilidade, prioridade, data prevista, equipe/vendedor, próxima atividade (tipo, data, responsável), tags, histórico (ligações, reuniões, anotações), conversão em proposta/pedido.
**Estágios típicos:** Novo → Qualificado → Proposta → Ganho | Perdido.
**Ficha de um lead:** nome, e-mail, telefone, origem (site, indicação, mídia), empresa, descrição, equipe responsável.

> **No VORTEX:** cada ERP terá seu **CRM próprio do domínio** (pipeline comercial daquele negócio), usando a mesma estrutura conceitual: Operadores vendem fretamento (conduzido pelo app Fretamento); Manutenção vende serviços; Cursos vendem matrículas; Agrícola vende serviços agrícolas; Aeródromos vendem contratos/espaços.

## 4. Recrutamento (conceito do app — agregador refinado)

**Menus (submenus):**
- **Vagas (Jobs)** → lista/kanban de cargos em recrutamento; nº de candidatos novos, em andamento, contratados.
- **Candidatos (Applicants)** → kanban por estágio.
- **Comparar candidatos** (habilidades do perfil do núcleo vs. exigidas na vaga — score).
- **Agenda de Entrevistas** → reuniões/calendário ligadas aos candidatos.
- **Relatórios** → Análise de recrutamento (por vaga, departamento, origem, tempo médio).
- **Configuração** → Estágios; Cargos; Fontes de candidato; Templates de e-mail; Habilidades (skills).

**Ficha de uma vaga:** cargo, departamento, recrutador, nº de vagas, salário, descrição, habilidades exigidas, visibilidade (externa pública / interna), local, tipo de contrato, data prevista de contratação.
**Ficha de um candidato:** nome (do núcleo), vaga, fonte (LinkedIn, Indeed, site, indicação), estágio; **habilidades vs. vaga**; currículo e documentos (do núcleo); entrevistas agendadas; notas internas; consentimento LGPD; histórico de estágios e mensagens (via ledger).
**Estágios típicos:** Novo → Primeiro contato → Entrevista → Proposta → Contratado | Recusado/Arquivado.
**Ação final:** ao contratar → cria vínculo automático núcleo ↔ RH do ERP (nunca "criar funcionário" duplicado).

> **No VORTEX (v2):** o Recrutamento **não tem cadastro próprio de pessoas** — perfis vêm do núcleo; vagas nascem no RH de cada ERP **ou no próprio Recrutamento** (para quem não tem ERP); o app exibe, compara e conduz o processo (candidatura, etapas, comunicação), com histórico sempre lido do Ledger. **v2: o Recrutamento também permite editar o perfil profissional completo** (cursos, treinamentos, documentos, experiências) — mesmo cadastro do núcleo, origem registrada no ledger. **Sem comissão** — embutido no ERP ou Assinatura de Vagas.

## 5. Esqueleto dos demais módulos (conceito)

| App | Menus (submenus) | Conteúdo típico |
|-----|------------------|-----------------|
| **Vendas (Sales)** | Pedidos; Produtos; Clientes; Relatórios; Configuração | Cotação → Pedido (estágios); produto com preço; faturamento |
| **Estoque (Inventory)** | Operações; Produtos; Relatórios; Configuração | Recebimentos, entregas, transferências; lotes/séries; armazéns; regras de reposição |
| **Manufatura (MRP/Repair)** | Ordens de Produção; Produtos; Ordens de Serviço; Relatórios; Configuração | MO com estágios; centros de trabalho; roteiro; lista técnica |
| **Compras (Purchase)** | Pedidos; Fornecedores; Relatórios; Configuração | Cotação → Pedido (confirmado, recebido, faturado) |
| **Financeiro (Accounting)** | Dashboard; Faturas; Pagamentos; Lançamentos; Relatórios; Configuração | Plano de contas, diários, conciliação, imposto |
| **Projetos (Project)** | Projetos; Tarefas (kanban); Relatórios; Configuração | Tarefas com responsável, prazo, prioridade, subtarefas |
| **RH (Employees)** | Colaboradores; Departamentos; Recrutamento; Férias; Ponto; Despesas; Configuração | Funcionário com contrato, cargo, documentos; folgas com aprovação |
| **Frota (Fleet)** | Veículos; Contratos; Serviços; Relatórios; Configuração | Veículo com custos, odômetro, abastecimento, manutenção, motorista |
| **Manutenção (Maintenance)** | Equipamentos (kanban); Solicitações; Relatórios; Configuração | Equipamento com categoria, times, preventiva/corretiva periódica |
| **Qualidade (Enterprise)** | Verificações; Pontos de controle; Alertas; Configuração | Checagem com aprovação/reprovação em etapas |
| **Contatos (Contacts)** | Pessoas; Empresas | Cadastro único com múltiplos endereços e contatos filhos |
| **Site/eCommerce** | Páginas; Produtos; Pedidos | Vitrine pública + carrinho + checkout |
| **eLearning (Website Slides)** | Cursos; Conteúdos; Alunos | Curso com aulas, certificado, progresso |
| **Comunicação (Discuss/Calendar)** | Chat, canais, agenda | Mensagens, reuniões, notificações |

## 6. Central de Comunicação (conceito)

> **No VORTEX:** uma **Central de Comunicação global** na barra superior da Shell, disponível em todos os apps, com 4 abas + seletor de tema:
> - **Chat** (conversas entre usuários da mesma empresa/tenant e do processo seletivo) — **tempo real via WebSockets (v2)**
> - **Alertas** (badges do Hub preditivo)
> - **E-mails** (caixa de e-mails transacionais)
> - **Comunicados Oficiais** (avisos da plataforma e da empresa)
> - **Tema** (claro → escuro → personalizado)
>
> Toda conversa/comunicado relevante gera bloco no Ledger; a Central apenas **exibe** (filtro do ledger), sem duplicar histórico.

## 7. O que significa para o VORTEX (filosofia v2)
- Adotamos o padrão **"pipeline + ficha + relatório + configuração"** por área, com identidade e regras próprias.
- Onde o Odoo duplica "parceiro", o VORTEX **consulta o Núcleo (Cadastro Central)** — e qualquer app autorizado pode criar/editar, com origem no ledger.
- Onde o Odoo guarda histórico em thread, o VORTEX **lê o Ledger** (linha do tempo com conteúdo cifrado).
- Onde o Odoo tem módulos fixos por instalação, o VORTEX tem **13 apps** consumindo o mesmo núcleo: 5 ERPs por RBAC + Rconta + RLoja + Recrutamento + Travel + Fretamento + Certificações e Publicações + App ANAC + console do Núcleo, cada um com sua camada administrativa geral + setores de domínio.
- **v2 — console de gestão:** o que no Odoo seria "Configurações do sistema" vira o **console do Núcleo**, restrito a admins, com zero-trust (vê estados, nunca conteúdo) e toda ação virando meta-evento.
