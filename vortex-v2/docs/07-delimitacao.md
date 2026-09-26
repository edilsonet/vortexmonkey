# VORTEX — docs/07: DOCUMENTO DE DELIMITAÇÃO PARAMÉTRICA E CORREÇÃO PONTUAL (v2)

> **Versão 2 — 12/09/2026.** Documento de **prevalência** — permanece quase intocado, pois define os VALORES OFICIAIS que anulam qualquer valor gerado. Mudanças desta versão: destinos de correção atualizados para os 13 apps, nota de que as injeções do docs/06 já aconteceram no contrato v2, e a regra de prevalência ampliada (valores: este documento; arquitetura: CLAUDE.md v2).
> PRINCÍPIO: em qualquer divergência, o **Valor Oficial (prevalece)** anula e substitui qualquer valor gerado preliminarmente.
> Nenhum parâmetro deve ser hardcoded — sempre lido dos seeds.
> As 10 partes (v2) permanecem inalteradas em seu esqueleto estrutural.

## 1. DELIMITAÇÃO DOS PARÂMETROS DE MANUTENÇÃO (RBAC 43/145)

| Parâmetro | Valor Gerado (a corrigir) | Valor Oficial (prevalece) | Norma | Local de Correção (v2) |
|-----------|---------------------------|---------------------------|-------|------------------------|
| Validade / Inspeção de Aeronavegabilidade | Validade genérica anual | CVA válido por exatamente 365 dias (1 ano civil), alerta 30 dias antes | IS 91-403-001 / RBAC 91.403 | Seed `rbac-43-145.ts` + módulo de frota (Parte 5 — ERP Manutenção) |
| Retenção de Registros de Manutenção | Período não especificado | Mínimo 1 ano após a retirada definitiva de serviço | RBAC 43.9/43.11, IS 43.9-002 | Seed `rbac-43-145.ts` + expurgo |
| Calibração de Ferramental | Validade genérica | Rastreável à RBC/INMETRO, bloqueio automático de ferramentas vencidas | IS 43.13-005 / RBAC 145.109 | Seed `rbac-43-145.ts` + abertura de OS |
| Etiquetas de Peças | Verde/amarela/vermelha sem taxonomia | Verde (serviçável/documentada), Amarela (inspeção/quarentena), Vermelha (não aeronavegável/refugo) | IS 43-001 / RBAC 145.211 | Seed `rbac-43-145.ts` + `parts_inventory` |
| SEGVOO 001 | Grandes intervenções exigem relatório | Geração mandatória após grande alteração/reparo, remessa via SEI antes do CRS | IS 43.9-001 / RBAC 145.221 | Seed `rbac-43-145.ts` + workflow de retorno |
| END | Métodos LP/PM/US/RX/Eddy/Visual, níveis I/II/III | Laudo técnico assinado por profissional qualificado + registro do equipamento | IS 43.13-004 / RBAC 145.107 | Seed `rbac-43-145.ts` + `non_destructive_tests` |

## 2. DELIMITAÇÃO DOS PARÂMETROS DE OPERAÇÕES (RBAC 91/119/121/135)

| Parâmetro | Valor Gerado (a corrigir) | Valor Oficial (prevalece) | Norma | Local de Correção (v2) |
|-----------|---------------------------|---------------------------|-------|------------------------|
| Categorias MEL | B=3, C=10, D=120 dias | A=prazo especificado; B=3 dias (72h); C=10 dias (240h); D=120 dias | IS 91-012 | Seed `rbac-121-135.ts` + contagem de prazos (ERP Operadores) |
| Revisão de MEL | 60 dias genérico | 60 dias por impacto técnico; 30 dias se notificado pela ANAC | IS 91-012 | Seed + alertas |
| Combustível VFR 135 | +30 dia/+45 noite | Avião +30 min (dia)/+45 min (noite); helicóptero +20 min | IS 135-006 / RBAC 135.209 | Seed + checklist de despacho |
| Combustível IFR sem alternativa | 2 horas genérico | 2 horas sobre o destino (turboélice/jato) | IS 135-006 / RBAC 135.223 | Seed + cálculo de despacho |
| Margem de desempenho sem met | Não quantificada | Temp. máx. prevista (±3h) + 4°C | IS 135-007 | Seed + motor de performance |
| Gatilhos PAADV | Discrepâncias genéricas | +5°C, -5 hPa, variação >1% | IS 135-007 | Seed + validação de despacho |
| Repeso de frota | Periódico | A cada 36 meses | IS 135-21-001 / RBAC 135.185 | Seed + alertas |
| Adequação AOM | Prazo genérico | 180 dias | IS 121-004 | Seed + gestão documental |
| Atualização EGPWS | Prazo genérico | 60 dias | IS 121-020 | Seed + controle de software |
| Retenção ETOPS 207 min | Não fixado | 5 anos | IS 121-012 | Seed + retenção |
| Retenção despacho padrão | Genérico | 30 dias | RBAC 121.695/135.401 | Seed + expurgo |
| Relatório mensal ANAC | Mensal | Dia 15 de cada mês | IS 121-023/135-003 | Seed + cron (ERP Operadores) |
| Relatório semestral examinador 135 | Semestral | Março e setembro | IS 135-001 | Seed + alertas RH |
| PSF RBAC 135 | Prazo genérico | 30 dias fatal sem dilação; ROP antecedência 10 dias | IS 119-004 | Seed + protocolos |
| FOP 224 | Prazo genérico | 30 dias para saneamento | IS 119-004 | Seed + workflow |

## 3. DELIMITAÇÃO DOS PARÂMETROS DE INSTRUÇÃO (RBAC 141/142)

| Parâmetro | Valor Gerado (a corrigir) | Valor Oficial (prevalece) | Norma | Local de Correção (v2) |
|-----------|---------------------------|---------------------------|-------|------------------------|
| Validade ground school | 12 meses | 12 meses | IS 141-006 | Seed `rbac-141-142.ts` (ERP Cursos) |
| Certificado de conclusão | Até 10 dias | Até 10 dias corridos | RBAC 141.67 / IS 141-001 | Seed + workflow acadêmico |
| Trava de matrícula | Dobro do período letivo | Dobro do período homologado | IS 141-001 | Seed + validação de aluno |
| Recertificação examinadores | 24 meses | 24 meses | RBAC 141/142 | Seed + escalas |
| Retenção fichas de instrução | Período regulamentar | 5 anos | IS 141-006 | Seed + `student_grades` |
| Vistorias semestrais CIAC | Semestral | 2x/ano (máx. 180 dias entre) | IS 141-005 | Seed + calendário |
| Vacância de cargos | Não fixado | 60 dias | IS 141-004 | Seed + alertas |
| Carga horária pedagógica CTAC | Mínima não fixada | 8 horas (inicial) | IS 142-003 | Seed + docentes |

## 4. DELIMITAÇÃO DOS PARÂMETROS DE AERÓDROMOS (RBAC 153)

| Parâmetro | Valor Gerado (a corrigir) | Valor Oficial (prevalece) | Norma | Local de Correção (v2) |
|-----------|---------------------------|---------------------------|-------|------------------------|
| Tempo-resposta SESCINC | 3 minutos | Máx. 3 min do acionamento até aplicação no ponto mais distante | IS 153.409-001 | Seed `rbac-153.ts` + `fire_response_logs` (ERP Aeródromos) |
| IRI | Limite genérico | ≤ 2,5 m/km | IS 153.205-001 | Seed + `runway_pavement` |
| Macrotextura | Limite genérico | ≥ 0,60 mm | IS 153.205-001 | Seed + `runway_pavement` |
| Retenção checklists | Não delimitado | 6 meses | IS 153.63-001 | Seed + expurgo |
| Ações corretivas de engenharia | Prazo genérico | 12 meses | IS 153.73-001 | Seed + planos de ação |
| Relatório quadrimestral SGSO | Quadrimestral | 20/01, 20/05, 20/09 | IS 153.51-001 | Seed + cron |
| RWYCC/RCR | 0 a 6 por terço | RWYCC 0-6 por terço (T1/T2/T3) via RCAM, mensagem RCR | IS 153.133-001 | Seed + `calculate-rwycc` |

## 5. DELIMITAÇÃO DE CREDENCIAMENTO E PESSOAL (RBAC 183/61/63/65/120)

| Parâmetro | Valor Gerado (a corrigir) | Valor Oficial (prevalece) | Norma | Local de Correção (v2) |
|-----------|---------------------------|---------------------------|-------|------------------------|
| Validade credenciamento 183 | 3 anos genérico | 1.095 dias (3 anos), alerta 60 dias, bloqueio automático | RBAC 183.15 / IS 183-002 | Seed `rbac-183.ts` + MDM (Rconta) |
| Relatório trienal de interação | Periódico | A cada 3 anos | IS 183-002 | Seed + alertas |
| Credenciamento provisório SDEA | 1 ano | 365 dias | IS 183-001 | Seed + `accreditations` |
| Experiência examinador MMA | Genérica | 36 meses | IS 183-003 / RBAC 65 | Seed + elegibilidade |
| Recenticidade de piloto | 3 pousos/90 dias ou 5h | 3 pousos em 90 dias OU 5h no tipo/classe | RBAC 61.21 | Seed `rbac-61-63-65.ts` + despacho (ERP Operadores) |
| Exame toxicológico (PPSP) | 90 dias | 90 dias (janela longa), alerta 15 dias, bloqueio ARSO | RBAC 120 / IS 120-002D | Seed `rbac-120.ts` + PPSP |
| Certificados instrutor 135 | Não especificado | Máx. 4 anos da emissão | IS 135-004 | Seed `rbac-121-135.ts` + RH |

## 5-A. DELIMITAÇÃO AEROAGRÍCOLA (RBAC 137 — v2, ERP Agrícola)

| Parâmetro | Valor Oficial (prevalece) | Norma | Local de Correção (v2) |
|-----------|---------------------------|-------|------------------------|
| Iterações de análise CDAG (Etapa I) | máx. 3 | IS 137-003 | Seed `rbac-137.ts` |
| Inércia por 30 dias | desistência tácita | IS 137-003 | Seed + workflow |
| Vacância do RT por 30 dias | suspensão cautelar | IS 137-003 | Seed + workflow |
| Suspensão por 360 dias | cassação sumária | IS 137-003 | Seed + workflow |
| Calibração de dispersores | bloqueio de uso quando vencida | IS 137-001 | Seed + `dispersers` |
| DGPS | Declaração de Conformidade obrigatória | IS 137-002 | Seed + `agri_operators` |

## 6. DELIMITAÇÃO DE BILLING E MODELO DE NEGÓCIO (v2)

| Parâmetro | Valor Gerado (a corrigir) | Valor Oficial (prevalece) | Origem | Local de Correção (v2) |
|-----------|---------------------------|---------------------------|--------|------------------------|
| Comissão da loja | 3% do vendedor | 3% da venda, cobrado do vendedor; comprador isento | Diretriz Comercial | Parte 8 + gateway (RLoja) |
| ~~Comissão do recrutamento~~ | ~~3% do primeiro salário, garantia 90 dias~~ | **REMOVIDA (v2)** — Recrutamento sem comissão; embutido no ERP ou Assinatura de Vagas; pessoas nunca pagam | Decisão do Dr. Edilson (10/09/2026) | Parte 4 (Billing) + Recrutamento |
| Planos | STARTER/PRO/ENTERPRISE genéricos | STARTER (1 empresa, 5 usuários, 1GB); PRO (multi-módulos, 50 usuários, assinatura, 10GB); ENTERPRISE (ilimitado, auditoria, API) | Diretriz de Produto | Seed `plans` + Billing |
| **Publicações (v2)** | — | Assinatura anual por pacote de manuais; recorte da tarefa condicionado à assinatura | Decisão do Dr. Edilson (12/09/2026) | App Certificações e Publicações + ERPs |
| **Travel (v2)** | — | Comissão de agência por passagem 121 | Decisão do Dr. Edilson (12/09/2026) | App Travel + Billing |
| **Fretamento (v2)** | — | Comissão/contrato por fretamento 135/137 | Decisão do Dr. Edilson (12/09/2026) | App Fretamento + Billing |

## 7. REGRAS DE NEGÓCIO AUSENTES (INJEÇÃO NO BRE) — status v2

> **v2:** as regras abaixo foram **injetadas no CLAUDE.md v2 (seção 12)** — mantidas aqui como referência de prevalência.

| Regra | Descrição Oficial | Impacto | Destino (v2) |
|-------|-------------------|---------|--------------|
| Fluxo comercial da oficina (12 etapas) | Cotação → ... → Pagamento, com etiquetas verde/amarela/vermelha | Máquina de estados vinculada à OS | ✅ Injetada — contrato seção 12.1; seed `rbac-43-145.ts` (ERP Manutenção, Parte 5) |
| RLoja: anúncio como visão do estoque | Anúncio é projeção de item do estoque; estoque corporativo vs particular; autorização do admin do tenant | Integridade referencial anúncio↔estoque | ✅ Injetada — contrato seção 12.4 + princípio 11 (multi-vendor) |
| Validação RAB | Matrícula deve bater com nome/CPF do proprietário/operador; RAB via scraping | Trava de cadastro divergente da ANAC | ✅ Injetada — contrato seção 12.2 (BRE `AIRCRAFT_RAB_MISMATCH`) |
| Schema canônico do logbook | `vortex_logbook_entries`: horas, ciclos, discrepâncias, MEL, assinatura, status | Padronização dos registros de voo | ✅ Injetada — contrato seção 12.5 (CIV Digital, `professional.flight_log_entries`) |
| Núcleos de backend | Identity, RH Core, Catálogo Central, Estoque Central, Ledger, Ops/ERP | Padronização de nomenclatura | ✅ SUPERADA — Núcleo separado da Rconta (Cadastro Central + Ledger + Banco Central) |
| Papéis e procurações | Visitante, rConta, Criador de Empresa, Administrador, Representante Legal, Procurador, Operador | Permissões granulares RBAC/ABAC | ✅ Mantida — motor de permissões (Parte 1) + zero-trust do console (seção 5-A) |
| Links oficiais ANAC | RAB, SEI/ANAC, Portal ANAC, S141, SIGRA | Centralização de conectores | ✅ Injetada — Parte 8 v2 (módulo de integrações) |
| **Contabilidade de dupla entrada (v2)** | Partidas dobradas, estorno em vez de UPDATE | Escrituração financeira dos ERPs | ✅ Injetada — contrato seção 6 (schema `accounting`) |
| **Recorte de Publicações (v2)** | Tarefa consome recorte do manual licenciado; sem assinatura, sem recorte | Vínculo tarefa↔publicação | ✅ Injetada — contrato seção 12 + seed 2009 (docs/05) |
| **Estoque bidirecional RLoja↔ERP (v2)** | Lojas da RLoja viram estoque do ERP ao contratar (e vice-versa) | Custódia dinâmica | ✅ Injetada — contrato seção 4.5 |

## 8. PROCEDIMENTO DE APLICAÇÃO
```
1. Injeção de Seeds  →  2. Parametrização  →  3. Injeção no BRE  →  4. Validação e Testes
```

**Ordem de prioridade:**
1. **Manutenção e Estoque:** seed `rbac-43-145.ts`, CVA 365 dias, trava de ferramentas RBC, máquina de estados de 12 etapas.
2. **Marketplace RLoja:** vinculação `listings` ↔ estoque, retenção de 3% do vendedor.
3. **Operações e Despacho:** seed `rbac-121-135.ts` com `vortex_logbook_entries` e regras de combustível/MEL.
4. **Aeroagrícola (v2):** seed `rbac-137.ts` com CDAG, dispersores e DGPS.
5. **Recrutamento e Billing:** assinaturas v2 (embutido no ERP / Assinatura de Vagas; sem comissão de recrutamento).
6. **Conectores e Governança:** conectores externos, validação RAB, concessões de acesso (seção 5-A).

**Critérios de aceite:**
- Todo parâmetro consultado pelo backend é lido dos seeds ou tabelas de configuração, NUNCA de literais em código (hardcoded).
- Em qualquer divergência, o **Valor Oficial (prevalece)** deste documento anula e substitui qualquer outra especificação.
- Conformidade atestada por 100% dos testes unitários e de integração parametrizados com os valores oficiais.

## 9. MUDANÇAS DA v1 → v2 NESTE DOCUMENTO
1. **Valores oficiais intocados** — este documento continua sendo a fonte de prevalência paramétrica.
2. **Seção 5-A nova** — delimitação aeroagrícola (RBAC 137, ERP Agrícola).
3. **Seção 6** — comissão de recrutamento REMOVIDA (riscada, com a decisão registrada); linhas novas de Publicações, Travel e Fretamento.
4. **Seção 7** — status v2 de cada regra (✅ injetada no contrato); 3 regras novas (dupla entrada, recorte de Publicações, estoque bidirecional).
5. **Seção 8** — ordem de prioridade atualizada (aeroagrícola e billing v2 incluídos).
6. **Prevalência ampliada no cabeçalho** — valores: este documento; arquitetura: CLAUDE.md v2.
