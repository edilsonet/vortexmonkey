# VORTEX — docs/09: MAPA DE ADAPTAÇÃO: conceitos Odoo → aplicativos VORTEX (v2)

> **Versão 2 — 12/09/2026.** Regra-mãe atualizada: **Núcleo (Cadastro Central + Ledger + Banco Central) dono da verdade, separado da Rconta; TODOS os apps — sem exceção — inserem e consomem.** O mapa diz *onde* cada conceito entra e *o que muda* — com desenho e regras 100% VORTEX. Mudanças v2: 13 apps (Agrícola desmembrado; Travel, Fretamento, Certificações e Publicações e App ANAC novos), console de gestão, contabilidade de dupla entrada, estoque bidirecional.

## 1. Camada administrativa geral (departamentos de uso geral)

Qualquer empresa/tenant que use a plataforma (com qualquer ERP ou só com a Rconta empresarial) tem acesso a estes departamentos, que funcionam de forma idêntica em todos os ERPs:

| Departamento | Menus (submenus) | Conteúdo | Origem dos dados |
|--------------|-------------------|----------|------------------|
| **RH** | Colaboradores · Contratos · Cargos · Escalas · Férias/Ausências · Ponto · Despesas · Treinamentos internos | Funcionário (vínculo), contrato, cargo, folgas com aprovação, despesas | Vínculo e dados pessoais vêm do Núcleo (nunca duplicados) |
| **Financeiro** | Contas a Pagar · Contas a Receber · Faturas · Cobranças · Fluxo de Caixa · Conciliação | Títulos, pagamentos, recebimentos, previsão de caixa | Empresas e clientes/fornecedores vêm do Núcleo |
| **Contabilidade (v2 — dupla entrada)** | Plano de Contas · Diário · Razão · Lançamentos (balanceamento em tempo real) · Balancete · DRE · Fechamento | Escrituração com partidas dobradas, estorno em vez de UPDATE, relatórios padrão (normas públicas) | Lançamentos gerados por faturamento/compras; origem rastreável (source_module) e ancorada no ledger |
| **Compras** | Pedidos de Compra · Cotações · Fornecedores · Recebimento · Faturamento de Compra | Solicitação → Cotação → Pedido → Recebimento → Fatura | Fornecedor = empresa do Núcleo |
| **Comercial/CRM** | Pipeline · Leads · Relatórios · Configuração | Oportunidades do negócio (estágios, equipes, motivos de perda) | Clientes = pessoas/empresas do Núcleo |
| **Estoque/Administrativo** | Inventário · Movimentações · Ajustes | Itens do catálogo do Núcleo sem custódia técnica | Catálogo + Estoque (Núcleo/ERP) |

## 2. Central de Comunicação (barra superior da Shell — em todos os apps)

| Item | Conteúdo |
|------|----------|
| **Chat** | Conversas entre usuários da empresa/tenant + conversas do processo seletivo — **tempo real via WebSockets (v2)** |
| **Alertas** | Badges do Hub Preditivo (severidades INFO/WARNING/CRITICAL/BLOCKING) |
| **E-mails** | Caixa de e-mails transacionais (entrada/saída) |
| **Comunicados Oficiais** | Avisos da plataforma e da empresa |
| **Tema** | Claro → Escuro → Personalizado (alterna a cada clique) |

> Toda conversa/comunicado gera bloco no Ledger; a Central apenas exibe filtros.

## 3. CRM por ERP (pipeline comercial do domínio)

Cada ERP tem o seu **CRM próprio** com a mesma estrutura conceitual (pipeline, leads, relatórios, configuração) adaptada ao negócio:

| ERP | O que o CRM vende | Estágios típicos | Conduzido por (v2) |
|-----|-------------------|------------------|--------------------|
| **Operadores (91/121/135)** | Fretamento/charters, contratos de operação, manutenção de linha | Novo → Qualificado → Proposta → Ganho/Perdido | CRM do ERP + app **Fretamento** (venda/reserva) |
| **Manutenção (43/145)** | Serviços de manutenção, revisões, venda de peças/serviços | Novo → Cotação → Aprovado → OS → Concluído | CRM do ERP |
| **Cursos (141/142 + ISs)** | Matrículas, cursos, treinamentos, simuladores | Novo → Interessado → Matrícula → Concluído | CRM do ERP (cursos vendidos na RLoja) |
| **Agrícola (137)** | Serviços aeroagrícolas, aplicações | Novo → Proposta → Contrato → Execução | CRM do ERP + app **Fretamento** (agrícola) |
| **Aeródromos (153)** | Contratos (operadores, lojas, espaços), serviços de pátio | Novo → Proposta → Contrato → Ativo | CRM do ERP |

## 4. Menus por aplicativo VORTEX (esqueleto adaptado — v2 com 13 apps)

### 4.1 Núcleo (`nucleo.vortex.com`) — console de gestão (v2)

> **v2:** o que no Odoo seria "Configurações do sistema" vira o console do Núcleo — restrito a admins, zero-trust (vê estados/métricas, nunca conteúdo), toda ação vira meta-evento.

- Dashboard `[KPIs de plataforma]` · Tenants `[estados, sem conteúdo]` · Concessões de acesso `[por protocolo/auditoria/justiça]` · Revisão de descriptografias `[meta-eventos]` · Integridade do ledger `[cadeia, quebras]` · Catálogo `[deduplicação, taxonomia ATA]` · Auditoria da plataforma `[timeline]` · Restaurações `[SYSTEM_RESTORED]` · Configuração `[papéis admin, parâmetros]`

### 4.2 Rconta — árvore de menus completa (7 módulos + 2 menus)

> Estrutura global: barra superior da Shell com **Central de Comunicação** (Chat · Alertas · E-mails · Comunicados Oficiais) e **Tema** (Claro → Escuro → Personalizado); navegação lateral com os 7 módulos + 2 menus.

**Menu Dashboard**
- Widgets por módulo (Pessoal, Profissional, Empresarial, Protocolo, Assinaturas, Segurança)
- Pendências de validação (selos N0–N3), vínculos pendentes de aprovação, alertas ativos, estoque

**Módulo Pessoal** → *Meus dados*
- **Dados pessoais:** nome, social, nascimento, gênero, CPF (selo) — form com ValidationBadge
- **Contatos:** múltiplos e-mails/telefones, tipo, principal, selo
- **Endereços:** múltiplos, CEP via ViaCEP (preenche rua/bairro/cidade/UF), principal, selo
- **Documentos pessoais:** tipos CPF, RG, Título de Eleitor, Passaporte, outros — anexo, validade, selo
- **Redes sociais pessoais:** LinkedIn, Instagram, Facebook, X, YouTube (links)

**Módulo Profissional** → *Dados profissionais*
- **Dados profissionais:** e-mails/telefones profissionais, selo
- **Documentos profissionais:** CANAC, Licenças CHT, Habilitações, CREA, CNH, outros — anexo, validade, selo
- **Redes sociais profissionais**
- **Currículo:**
  - Cursos (tipo PP/PC/PLA/IFR/Comissário/MMA/DOV/Instrutor; instituição; carga; certificado; selo)
  - Treinamentos (periódico, recorrência, fatores humanos, UPRT, ETOPS, PTO, LOFT; validade; certificado)
  - Experiências profissionais (empresa, cargo, período; **dupla confirmação mista**; selo 🔵 quando aprovado)
  - CMA (classe 1/2/3, validade RBAC 67, restrições, integração SACI → N2)
  - CIV — Caderneta Individual de Voo (lançamentos de voo; **assinar**; **endosso** de instrutor; retificação; cancelamento; enviar à ANAC)
- **Declarações de experiência (v2):** solicitar declaração automática (documento assinado gerado do histórico do núcleo)
- **Meu estoque (pessoal):** itens (catálogo do núcleo), quantidade, condição, etiqueta; ação "Anunciar na RLoja"

**Módulo Empresarial** → *Minhas empresas*
- **Responsabilidades legais:** lista de empresas onde sou responsável; ao clicar → **documento digital assinado** (aceite do administrador)
- **Procurações:** como procurador ou procurado (pessoa/empresa); ao clicar → **documento digital assinado**
- **Vínculos de funcionário:** empresas onde atuo via recrutamento ou ERP (vínculo aprovado)
- **Detalhe da empresa:** abas — Dados empresariais · Funcionários · Assinaturas · **Estoque da empresa** (1 por empresa) · **[timeline da assinatura]** (v2: histórico desde a compra, congelado e legível por 5 anos após encerramento)

**Módulo Protocolo** → *Meus protocolos* (padrão AAAA-NNNNNN, detalhe, acompanhamento)

**Módulo Assinaturas** → *Minhas assinaturas*
- Lista: Rconta VIP · Assinatura de Vagas · ERP Manutenção · ERP Operadores · ERP Cursos · ERP Agrícola · ERP Aeródromos · Publicações (v2)
- Detalhe por assinatura (plano, início, renovação, faturas) + **Cancelar** / **Reativar**
- Efeitos: Rconta VIP/ERP remove banners; cancelamento/suspensão de ERP → estoque empresarial volta à Rconta

**Módulo Personalização** → *Aparência*
- Tema: Claro → Escuro → **Personalizado** (alterna a cada clique)
- Tamanho do texto (escala), tipo de fonte, cor de fundo

**Módulo Segurança**
- **Senha:** alterar (cada troca desconecta todos os dispositivos)
- **Dispositivos:** listar, desconectar individual ou todos
- **2FA:** configurar TOTP (Google Authenticator), SMS ou e-mail

**Menu Configurações**
- Idioma, horário em UTC e outras configurações do sistema

### 4.3 Recrutamento (agregador refinado — v2 completo)
- **Início/Dashboard** → métricas: vagas abertas, candidatos por estágio, tempo médio de contratação
- **Vagas** → Externas (listadas livremente) | Internas (só funcionários com vínculo ativo)
  - **Criar/editar vaga (v2):** form RH completo — cargo, função, salário, requisitos, objetivo, escala, visibilidade (origem: aqui OU no RH do ERP)
- **Candidatos** → Kanban por estágio (Novo → Primeiro contato → Entrevista → Proposta → Contratado | Recusado)
- **Perfil profissional (v2):** tudo que o Profissional da Rconta faz — Cursos · Treinamentos · Documentos · Experiências · Declarações (mesmo cadastro do núcleo; origem no ledger)
- **Comparar candidatos** → score de habilidades do núcleo vs. exigidas na vaga
- **Entrevistas** → agenda ligada aos candidatos
- **Relatórios** → por vaga, origem, estágio, tempo médio
- **Configuração** → Estágios; Cargos; Fontes de candidato; Templates de e-mail; Habilidades
- *(sem cadastro de pessoa próprio: perfis vêm do núcleo; vagas de 2 origens; histórico lido do Ledger; **sem comissão** — embutido no ERP ou Assinatura de Vagas)*

### 4.4 ERP Manutenção (43/145) — departamentos e setores
| Setor | Menus (submenus) | Conteúdo |
|-------|------------------|----------|
| **Comercial/CRM** | Pipeline · Propostas · Clientes | Oportunidades de serviços → cotação → aprovação → OS |
| **Biblioteca Técnica** | Manuais · Boletins · DA/FCDA · Documentação por aeronave | Manuais do fabricante, boletins, DA aplicáveis — **v2: recortes de Publicações na tarefa (se assinante)** |
| **Suprimentos** | Ferramentaria · Estoque técnico · Compras · Importações | Ferramentas (calibração RBC), peças (etiquetas verde/amarela/vermelha), pedidos, importações |
| **Setor de Registros** | Cadernetas · OS arquivadas · Retenções · Histórico | Cadernetas (Parte I = projeção; Parte II = eventos primários), registros de manutenção, retenções |
| **Manutenção/Oficina** | Ordens de Serviço (12 etapas) · Inspeções · END · APRS/CRS · SEGVOO · SGSO | Fluxo completo da oficina, inspeções, END, liberação ao serviço |
| **RH interno** | Mecânicos · Treinamentos · Escalas · **Vagas (v2)** | CHT/credenciais via núcleo; treinamentos internos; vagas → Recrutamento |
| **Administrativo geral** | RH · Financeiro · **Contabilidade (dupla entrada)** · Compras | Camada comum |
| **Relatórios / Configuração** | Indicadores · Conformidade · Estágios de OS · Tipos de serviço | KPIs e parâmetros |

### 4.5 ERP Operadores (91/121/135) — 2 departamentos
**Departamento Operações:**
| Menu | Conteúdo |
|------|----------|
| **Comercial/CRM** | Oportunidades de fretamento/charters → propostas → contratos/clientes (venda conduzida pelo app Fretamento) |
| **Frota** | Aeronaves (**validação RAB — v2**) · Contratos/leasing · Custos · Repeso (36 meses) |
| **Despacho** | Liberações de voo (valida combustível, met, P&B, MEL **e tripulação via núcleo**) · DOV |
| **Diário técnico da aeronave** | Horas/ciclos de célula, motores, hélice, APU; discrepâncias; MEL — atualiza o controle de manutenção via APRS |
| **Tripulação** | Escalas (licenças/CMA/recenticidade validados no núcleo) |
| **Manuais** | MGO, AOM, MCmsV, MGM, PTO, SOP — **v2: recortes de Publicações** |
| **Relatórios ANAC** | Mensal dia 15 · Semestrais (examinadores março/setembro) · FOP/PSF/ROP |

**Departamento Manutenção:**
| Menu | Conteúdo |
|------|----------|
| **Manutenção de linha** | Solicitações · Ordens de manutenção da frota |
| **Controle de manutenção** | Cumprimento de manutenção programada, DA, MEL — **atualizado automaticamente pela liberação APRS (v2)** |
| **Suprimentos técnicos** | Peças da frota (catálogo do núcleo) · Ferramentas |
| **Compras** | Pedidos · Fornecedores |
| **Qualidade/SGSO** | Não conformidades · Perigos · Relatórios |

**+ RH interno/Vagas · Administrativo geral (RH | Financeiro | Contabilidade | Compras) · Relatórios · Configuração**

### 4.6 ERP Cursos e Treinamentos (141/142/145-010 + ISs)
| Menu | Conteúdo |
|------|----------|
| **Comercial/CRM** | Oportunidades de alunos → matrículas |
| **Cursos (produto digital)** | Catálogo de cursos (criados aqui, vendidos na RLoja) |
| **Turmas** | Alunos (do núcleo) · Instrutores · Agenda · Frequência · Avaliações |
| **Simuladores (FSTD)** | Dispositivos · Qualificações · Reservas |
| **Certificados** | Emissão (10 dias) · Diplomas |
| **S141** | Sincronização com a ANAC · Envio de dados |
| **RH interno** | Instrutores · Examinadores · **Vagas (v2)** |
| **Administrativo geral** | RH · Financeiro · Contabilidade · Compras |
| **Relatórios / Configuração** | Desempenho · Conformidade S141 · Tipos de curso · Matriz curricular |

### 4.7 ERP Agrícola (137) — v2 (desmembrado do Operadores)
| Menu | Conteúdo |
|------|----------|
| **Comercial/CRM** | Oportunidades de serviços agrícolas → contratos (venda conduzida pelo app Fretamento/agrícola) |
| **Operador aeroagrícola** | CDAG (3 iterações) · FCDAG · RT |
| **Frota aeroagrícola** | Aeronaves + dispersores (calibração) + DGPS (Declaração de Conformidade) |
| **Operações** | Planejamento de aplicação · EMC · registro georreferenciado de faixas · etanol hidratado |
| **SGSO aeroagrícola** | Perigos/riscos (3 cenários) · biblioteca de perigos · relatórios |
| **RH interno / Vagas · Administrativo geral · Relatórios · Configuração** | Camada comum |

### 4.8 ERP Aeródromos (153)
| Menu | Conteúdo |
|------|----------|
| **Comercial/CRM** | Contratos (operadores, lojas, slots, espaços) |
| **Infraestrutura** | Pista/taxiway/pátio · Pavimento (PCN/IRI/macrotextura) · Sinalização/iluminação |
| **Operações** | **Pousos e decolagens (v2)** · RWYCC/RCR · Inspeções (checklists) · Credenciamento de acesso (lado ar) |
| **SESCINC** | Viaturas · Agentes · Tempo-resposta (≤3 min) · Exercícios |
| **Fauna** | Registros · Risco · SIGRA |
| **Manutenção (8 áreas)** | Ordens por área · Equipamentos · Infraestrutura |
| **SGSO** | Perigos · Riscos · Relatório quadrimestral |
| **RH interno / Vagas · Administrativo geral · Relatórios · Configuração** | Camada comum |

### 4.9 RLoja (marketplace por comissão — multi-vendor)
- **Home/Explorar** → filtros por categoria (aeronaves, motores, hélices, rádios, instrumentos, acessórios, peças, consumíveis, inflamáveis, cursos, manuais) e por origem
- **Meus anúncios** → criados como visão do meu estoque (pessoal, empresarial **ou criado aqui — v2: migra ao ERP ao contratar**)
- **Meus dados de compra (v2):** endereços pessoais/empresariais — edita o cadastro no Núcleo (visível igual na Rconta)
- **Minhas compras** | **Minhas vendas** (comissão 3% do vendedor)
- **Configuração de vendedor** → perfil privado/público; banners removidos para VIP/quem tem ERP
- *(sem cadastro de estoque: anúncio = item de estoque do núcleo)*

### 4.10 Travel (v2 — passagens 121)
- Buscar voos `[origem/destino/data]` · Reserva/compra `[passageiros do núcleo → pagamento → e-ticket]` · Minhas viagens · Minhas vendas (comissão de agência) · Configuração `[companhias, tarifas]`

### 4.11 Fretamento (v2 — 135 e 137)
- Buscar/cotar `[tipo: passageiros/carga/aeromédico/agrícola → operadores]` · Reserva `[contrato → confirmação]` · Painel do operador `[solicitações → propostas → contratos → execução]` · Minhas contratações · Configuração

### 4.12 Certificações e Publicações (v2)
- **Certificações:** catálogo por norma (91 Ap.K, 121, 135, 137, 145, 141, 142, 153) → comprar na RLoja → trilha de conformidade (checklist por requisito, documentos, protocolos) → Minha certificação `[fase, pendências, evidências, timeline]`
- **Publicações:** catálogo de pacotes (fabricante/Veryon, sob licenciamento) → assinar (anual) → Biblioteca `[leitor digitalizado/OCR, busca por ATA]` → **Recortes** `[tarefa de manutenção → recorte aplicável; sem assinatura → obtenção por fora]` → Minhas assinaturas

### 4.13 App ANAC (v2 — auditor)
- Solicitar acesso ao ledger `[filtro + justificativa]` · Audiências `[status → visualização somente-leitura → encerrar]` · Suspensão de certificação `[empresa/aeronave por recusa de acesso]` · Consulta de pessoas/empresas `[somente-leitura conforme concessão]` · Histórico de auditorias

## 5. O que NÃO copiamos do Odoo
- **Programação, telas, arquitetura interna** do Odoo — apenas conceito.
- **Chat interno completo do Odoo** → temos a Central de Comunicação própria (chat, alertas, e-mails, comunicados) na barra superior.
- **Multiplicidade de parceiros duplicados** → Núcleo único com validação N0–N3; qualquer app autorizado cria/edita, origem no ledger.
- **Histórico em thread editável** → Ledger imutável (linha do tempo com conteúdo cifrado).
- **Plano de contas proprietário** → modelamos livremente conforme normas públicas brasileiras (conhecimento comum/regulatório).
- **"Configurações do sistema" dentro de cada app** → console do Núcleo, zero-trust, restrito a admins da plataforma.
