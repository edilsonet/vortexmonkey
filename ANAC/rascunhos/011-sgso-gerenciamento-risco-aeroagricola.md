# SGSO e Gerenciamento de Risco — Operações Aeroagrícolas

> **Assunto**: identificação de perigos, avaliação/mitigação de riscos e treinamento no RBAC 137
> **Fontes principais**: RBAC 137 §§137.201, 137.203, 137.207, 137.215 · IS 137.215-001 · Resoluções 709/2023 e 714/2023
> **Fonte Markdown revisada**: `artifacts/cerebro-anac/markdown/is/is-137-215-001.md`
> **Última revisão**: 12/09/2026 · **Status**: rascunho v1 revisado com base no Markdown integral

## 1. Regra central

O operador aeroagrícola é responsável pelo gerenciamento do risco das operações, pela identificação dos perigos e pela adoção das respectivas mitigações (**RBAC 137 §137.215(a)**).

A IS 137.215-001 estrutura o processo em quatro fases (**§5.1.4**):

1. indicar responsável pelo gerenciamento do risco;
2. identificar perigos;
3. avaliar e mitigar os riscos decorrentes;
4. realizar treinamento inicial e periódico.

O objetivo não é simplesmente classificar risco: é eliminar o perigo quando possível ou reduzir o risco a nível tão baixo quanto praticável (**IS §5.1.1**).

## 2. Quando o gerenciamento deve ser documentado

No mínimo, o processo deve ser realizado e documentado quando houver (**IS §5.1.5**):

- operação noturna;
- operação VFR com visibilidade abaixo de **5.000 m**;
- operação em **nova área agrícola**.

O operador pode exigir análise para outros cenários conforme sua avaliação (**nota do §5.1.5**).

## 3. Responsabilidade e independência

O RBAC 137 não exige uma pessoa exclusivamente dedicada ao gerenciamento, mas a IS recomenda essa estrutura para operadores mais complexos (**§5.2.1**).

Para operadores menores, deve existir ao menos uma pessoa formalmente indicada, com tempo compatível para a atividade (**§5.2.2**). A atividade pode ser terceirizada, mas:

- o histórico de perigos e mitigações deve permanecer sob guarda do operador;
- deve haver continuidade em trocas de contratados;
- a responsabilidade perante a ANAC continua sendo do operador (**§5.2.3**).

O responsável pelo risco deve poder reportar-se diretamente ao gestor responsável; as duas funções não deveriam ser exercidas pela mesma pessoa (**§5.2.4**).

## 4. Identificação de perigos

### 4.1 Tipos de perigo

**Naturais** (**IS §5.3.2**):
- meteorologia/clima adversos;
- eventos geofísicos;
- condições geográficas;
- obstáculos;
- eventos ambientais ou de saúde pública.

**Técnicos e organizacionais** (**§5.3.3**):
- aeronave, componentes, sistemas e equipamentos;
- instalações, ferramentas e equipamentos da organização;
- recursos externos usados na operação;
- deficiências de treinamento;
- desvios de padrões operacionais;
- projeto, procedimentos e práticas;
- comunicações e fatores organizacionais;
- ambiente de trabalho, fatores regulamentares, defesas existentes e desempenho humano.

### 4.2 Métodos e fontes

Os métodos de aquisição de dados podem ser (**§5.3.6**):

| Método | Momento | Exemplo |
|---|---|---|
| Reativo | depois do evento | acidente/incidente |
| Preventivo | antes do evento, baseado em estudos | substituição programada |
| Preditivo | considerando condições atuais | monitoramento de deterioração |

O gerenciamento de risco **não pode substituir requisito prescritivo** do regulamento, manual da aeronave ou procedimento aprovado (**§5.3.7**).

Fontes internas e externas incluem autoinspeção, dados de voo, relatos voluntários, auditorias, relatórios CENIPA, recomendações de segurança, reportes mandatórios/voluntários, RAC e fiscalizações ANAC (**§§5.3.8–5.3.9**).

A comunicação entre responsável pelo risco e gestor deve ser formal, completa e rastreável; comunicação apenas verbal não é suficiente (**§5.3.5**).

## 5. Avaliação e mitigação

O perigo deve ser eliminado quando possível. Quando não puder, avalia-se o risco da operação e adotam-se medidas mitigadoras (**§5.4.1**).

O cumprimento da legislação é a base mínima; medidas adicionais podem reduzir o risco além do mínimo regulamentar (**§§5.4.2–5.4.3**). Um risco significativo não significa automaticamente que a operação esteja proibida, desde que os requisitos sejam cumpridos, mas exige busca contínua por mitigações eficazes (**§5.4.4**).

As mitigações devem refletir-se nos manuais e, quando aplicável, nos checklists dos pilotos (**§5.4.6**). O operador pode usar matriz de risco baseada em probabilidade, severidade e pior condição possível (**§5.4.8**).

Exemplos de mitigação (**§5.4.9**): submeter operação de maior risco à hierarquia superior; alterar horário para evitar ofuscamento ou neblina; treinamento especial; revisar manual/checklist; usar lições aprendidas.

## 6. Treinamento

O piloto só pode ser designado após treinamento adequado que o mantenha qualificado e familiarizado com o local, aeronave, operador, situações anormais, perigos conhecidos e mitigações aplicáveis (**RBAC 137 §137.207(b); IS §§5.5.1–5.5.3**).

A IS recomenda treinamento anual ou no início de cada safra, embora não fixe prazo obrigatório nem exija envio do programa à ANAC (**§5.5.2**).

O treinamento deve incluir obrigatoriamente prevenção de distração física, auditiva, visual e cognitiva; gerenciamento de recursos de cabine em tripulação simples; perigos conhecidos; e lições aprendidas (**RBAC 137 §137.207(b); IS §5.5.4**).

Os currículos devem ser atualizados com novos perigos e mitigações (**IS §5.5.5**).

## 7. Reportes de segurança

A IS recomenda observar a Resolução 714/2023 (Programa de Reportes Mandatórios de Segurança Operacional) e a Resolução 709/2023 (notificação voluntária de desvios, de caráter não punitivo).

A IS registra que o reporte mandatório seria aplicável aos operadores aeroagrícolas a partir de 1º de dezembro de 2024; esta data e a aplicabilidade devem ser revalidadas contra a versão vigente da resolução antes de implementação.

## 8. Modelo de dados para o VORTEX

### `agri.risk_assessments`
- operador/tenant; cenário; área agrícola/coordenadas; aeronave/equipamento; data/safra/responsável; status; referências ao ledger.

### `agri.hazards`
- descrição; tipo; fonte; método; evidências; risco inicial; risco residual; proteção da fonte quando necessário.

### `agri.risk_mitigations`
- ação; responsável; prazo; custo/benefício; eficácia esperada/verificada; manual/checklist afetado; aprovação; conclusão/reavaliação.

### `agri.training_records`
- piloto; inicial/periódico; data; safra/área/aeronave; perigos/mitigações; distração; CRM single-pilot; lições aprendidas; instrutor/evidência/assinatura.

## 9. Pontos de atenção para sistemas (VORTEX)

- O responsável pelo risco identifica e propõe; o gestor decide e executa a mitigação.
- Toda comunicação de risco deve ser evento rastreável no ledger, com confirmação de recebimento/compreensão.
- Nova área agrícola, operação noturna e VFR abaixo de 5.000 m devem disparar análise obrigatória.
- Mitigação aprovada deve atualizar manual/checklist e gerar tarefa de treinamento quando aplicável.
- Nenhuma matriz de risco autoriza descumprimento de manual, RBAC ou requisito prescritivo.
- O histórico de perigos e mitigações pertence ao operador e não pode desaparecer com troca de consultoria.
- O sistema deve separar risco inicial de risco residual.

---
### Fontes citadas
- RBAC 137, Emenda 06: §§137.201, 137.203, 137.207, 137.215 — `artifacts/cerebro-anac/markdown/rbac/rbac-137--EMD06.md`
- IS 137.215-001: §§5.1–5.5 — `artifacts/cerebro-anac/markdown/is/is-137-215-001.md`
- Resolução 709/2023 — `artifacts/cerebro-anac/markdown/resolucoes/resolucao-709.md`
- Resolução 714/2023 — `artifacts/cerebro-anac/markdown/resolucoes/resolucao-714.md`
