# CMA e aptidão psicofísica aeronáutica

> **Assunto**: classes, validade, concessão, revalidação, restrições, suspensão e recursos do Certificado Médico Aeronáutico
> **Fontes principais**: RBAC 67 · RBAC 61 §§61.23 e 61.25 · IS 67-002
> **Fontes Markdown**: `artifacts/cerebro-anac/markdown/rbac/rbac-67.md`, `artifacts/cerebro-anac/markdown/rbac/rbac-61.md`, `artifacts/cerebro-anac/markdown/is/is-67-002.md`
> **Última revisão**: 12/09/2026 · **Status**: rascunho v1

## 1. O que é o CMA

O **Certificado Médico Aeronáutico (CMA)** é emitido após exame de saúde pericial e comprova a aptidão psicofísica necessária para exercer funções relativas a aeronaves (**RBAC 67 §67.3**).

O CMA não substitui licença, habilitação, experiência recente ou treinamento. Para exercer prerrogativas, o piloto precisa cumulativamente de CMA adequado e válido, habilitações correspondentes válidas e experiência recente (**RBAC 61 §§61.17 e 61.25; RBAC 91 §91.5**).

O julgamento médico pode ser **apto**, **apto com restrição** ou **não apto**. A restrição deve ser tratada como condição operacional verificável, não como observação meramente textual.

## 2. Classes e correspondência com licenças

| CMA | Aplicação principal |
|---|---|
| 1ª classe | PLA, PC e PTM |
| 2ª classe | PP, PP-IFR, comissário, mecânico de voo, PBL e aluno piloto, salvo planador |
| 4ª classe | CPA, PPL e aluno piloto de planador |
| 5ª classe | piloto remoto de aeronave remotamente pilotada, conforme regulamento específico |

Um CMA de 1ª classe válido pode ser usado em lugar de CMA de 2ª, 4ª ou 5ª classe. Um CMA de 2ª classe válido pode ser usado em lugar de CMA de 4ª ou 5ª classe (**RBAC 67 §67.13(g)**). A passagem para classe superior exige exame inicial da classe pretendida (**§67.13(h)–(k)**).

## 3. Validade do CMA

Prazos máximos do RBAC 67 §67.15: PLA/PC/PTM, 12 meses; após 40 anos no transporte público com um piloto, 6 meses; piloto em transporte público após 60 anos, 6 meses; aluno/PP/PP-IFR/PBL/PPL/CPA, 60 meses antes dos 40 anos, 24 meses entre 40 e 50, e 12 meses a partir de 50; mecânico de voo, 12 meses; piloto remoto, 48 meses; comissário, 60 meses antes de 60 e 24 meses a partir de 60.

O examinador ou a ANAC pode reduzir a validade por motivo clínico, com justificativa expressa. Na revalidação de CMA ainda válido, exame feito até 45 dias antes do vencimento pode preservar a data anterior acrescida do novo prazo; CMA vencido ou suspenso conta da data do novo exame (**§67.15(b) e (e)**).

## 4. Concessão e revalidação

O candidato deve apresentar-se a examinador autorizado e cumprir os requisitos psicofísicos da classe (**RBAC 67 §67.11**). A IS 67-002 orienta: obter Código ANAC; confirmar classe; escolher examinador/clínica/entidade; apresentar identificação; preencher antecedentes e termos; realizar exame; verificar atualização no sistema; acompanhar validade e agendar revalidação.

O candidato responde pela veracidade de antecedentes, situação do CMA e alterações relevantes. Omissão pode gerar cassação e novo exame inicial.

## 5. Diminuição da aptidão psicofísica

O titular deve comunicar diminuição psicofísica que possa impedir o exercício seguro e deixar de exercer prerrogativas até novo julgamento apto ou apto com restrição (**RBAC 67 §67.15(c); RBAC 61 §61.25(a)**). Também possuem dever de reporte examinadores, CENIPA/investigadores, operador via serviço médico, servidores ANAC e organizações de instrução aplicáveis (**§67.15(d)**).

O VORTEX deve tratar o reporte como evento de segurança/elegibilidade, sem expor diagnóstico ao gestor operacional.

## 6. Suspensão, revogação e cassação

O CMA vigente é suspenso, entre outras hipóteses, após acidente ou incidente aeronáutico grave ou confirmação de diminuição de aptidão (**RBAC 67 §67.17(a)**). Pode voltar a ser válido após exame pericial. Pode ser revogado por condição incapacitante e cassado por omissão, fraude, informação falsa ou exercício de prerrogativas em condição proibida (**§67.17(b)–(h)**).

## 7. Acidente, incidente e recurso

Após acidente/incidente grave, separar evento aeronáutico, suspensão, exame pós-evento, julgamento e eventual reativação. O CMA não é reativado por decurso de tempo.

Contra “não apto” ou “apto com restrição”, o candidato pode requerer novo julgamento e recurso pela IS 67-002, com documentos médicos, parecer especializado ou teste médico de voo quando exigido. Recurso pendente não equivale a CMA válido.

## 8. Convalidação estrangeira

A ANAC pode convalidar certificado estrangeiro de piloto brasileiro, observando classe, restrições e validade. Se os requisitos estrangeiros forem inferiores, pode exigir complementação no Brasil (**RBAC 67 §67.19; IS 67-002 seção 9**).

## 9. Modelo de dados para o VORTEX

### `identity.aeromedical_certificates`
- pessoa; CMA; classe; licença/categoria; exame; início/vencimento; APTO/APTO_COM_RESTRICAO/NAO_APTO; restrições codificadas; examinador; origem; hash/ledger.

### `identity.aeromedical_status_events`
- CONCESSAO, REVALIDACAO, RESTRICAO, SUSPENSAO, REVOGACAO, CASSACAO, REATIVACAO, CONVALIDACAO, RECURSO; motivo; eficácia; autoridade; referência; escopo do bloqueio; ledger.

### `operations.crew_medical_eligibility`
- voo/escala; piloto/função; CMA adequado; validade; restrições; bloqueio; ELEGÍVEL/BLOQUEADO; motivo mínimo; instante da verificação.

### `medical.restricted_access_grants`
- finalidade; usuário; escopo; prazo; consentimento/base legal; acesso; auditoria.

## 10. Pontos de atenção para sistemas (VORTEX)

- Não confundir CMA com licença, habilitação ou experiência recente.
- Validar classe contra licença e operação.
- “Apto com restrição” exige verificar a restrição.
- Calcular validade por categoria, idade, operação e redução clínica.
- Reporte de diminuição psicofísica bloqueia prerrogativas até novo julgamento.
- Acidente/incidente gera suspensão e exame pós-evento.
- Recurso pendente não equivale a CMA válido.
- Gestor recebe decisão e restrições necessárias, nunca diagnóstico.
- Dados médicos cifrados, segregados e com acesso auditado.
- Alterações criam eventos novos; nunca sobrescrever julgamento anterior.

---
### Fontes citadas
- RBAC 67 — `artifacts/cerebro-anac/markdown/rbac/rbac-67.md`
- RBAC 61 — `artifacts/cerebro-anac/markdown/rbac/rbac-61.md`
- RBAC 91 — `artifacts/cerebro-anac/markdown/rbac/rbac-91.md`
- IS 67-002 — `artifacts/cerebro-anac/markdown/is/is-67-002.md`
