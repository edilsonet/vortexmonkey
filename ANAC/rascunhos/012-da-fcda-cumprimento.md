# Diretrizes de Aeronavegabilidade (DA), FCDA e controle de cumprimento

> **Assunto**: aplicabilidade, cumprimento, registros e método alternativo de cumprimento de DAs
> **Fontes principais**: RBAC 39 · IS 39-001 Rev. C · IS 39.19-001
> **Fontes Markdown**: `artifacts/cerebro-anac/markdown/rbac/rbac-39.md`, `artifacts/cerebro-anac/markdown/is/is-39-001.md`, `artifacts/cerebro-anac/markdown/is/is-39-19-001.md`
> **Última revisão**: 12/09/2026 · **Status**: rascunho v1

## 1. Conceito e finalidade

A Diretriz de Aeronavegabilidade (DA) é uma prescrição legal aplicável a aeronaves, motores, hélices e equipamentos quando existe uma condição insegura que provavelmente existe ou se manifestará em outros produtos do mesmo projeto de tipo (**RBAC 39 §§39.3, 39.5 e 39.13-I; IS 39-001 §§3.3–3.4 e 4.4**).

A DA especifica inspeções, modificações, condições, limitações ou outras ações necessárias para restaurar o nível aceitável de segurança (**RBAC 39 §39.11**).

DAs ou documentos equivalentes emitidos pela autoridade do Estado de projeto são considerados pela ANAC como DAs, observada a prevalência de requisito brasileiro conflitante (**RBAC 39 §39.5-I; IS 39-001 §5.2**).

## 2. Efeito obrigatório

Operar produto sem cumprir DA infringe o RBAC 39 e pode sujeitar o responsável a multa, suspensão ou cassação do certificado de aeronavegabilidade (**RBAC 39 §39.7**). Cada nova operação ou utilização sem cumprimento constitui nova infração (**§39.9**).

A DA prevalece sobre classificação do fabricante. Se um Boletim de Serviço for incorporado por referência, suas partes referenciadas tornam-se requisito obrigatório, mesmo que o fabricante o classifique como recomendado (**RBAC 39 §39.27; IS 39-001 §§5.11.1–5.11.2**).

Uma modificação ou reparo prévio não elimina automaticamente a aplicabilidade da DA. Se afetar a capacidade de cumprir a DA, deve ser solicitado método alternativo à ANAC, salvo demonstração formal de que a condição insegura já foi eliminada (**RBAC 39 §§39.15–39.17**).

## 3. Análise de aplicabilidade

Para cada DA, o proprietário/operador deve analisar o produto individual e registrar se ela é aplicável ou não. O registro deve justificar a não aplicabilidade quando for o caso (**IS 39-001 §5.13.2(g)**).

A análise deve considerar, no mínimo:

- aeronave, motor, hélice ou equipamento afetado;
- fabricante, modelo, part number e número de série;
- modificações e reparos incorporados;
- posição de instalação ou condição “em estoque”;
- efetividade e revisão da DA;
- limites por data, horas, ciclos ou pousos;
- documento de serviço incorporado por referência.

## 4. Registro primário — FCDA

A **Ficha de Cumprimento de Diretriz de Aeronavegabilidade (FCDA)** é formato aceitável de registro primário relacionado à análise de aplicabilidade e ao cumprimento da DA (**IS 39-001 §4.6**).

O registro primário deve ser completo e claro, descrever o método empregado e o resultado obtido. Para cada DA aplicável, deve registrar pelo menos (**IS §5.13.1–5.13.2**):

| Campo | Conteúdo mínimo |
|---|---|
| Aeronave | marcas, modelo, número de série, conforme aplicável |
| Produto | fabricante, modelo, P/N, S/N e identificação inequívoca |
| DA | tipo e número: DA, AD, CN, BLA, EASA etc. |
| Efetividade | data de efetivação e revisão aplicável |
| Vencimento | data, horas, ciclos ou pousos |
| Tipo de ação | final, repetitiva ou parcial |
| Aplicabilidade | aplicável/não aplicável e justificativa |
| Referência | instrução da DA, SB e revisão |
| Dados de incorporação | TSN, CSN, TSO, CSO, posição instalada etc. |
| Método | ação executada ou MAC aprovado |
| Resultado | achados e condição final |
| Dificuldade | impedimentos ou falhas encontrados |
| Data | data de incorporação |
| Próximo vencimento | quando ação repetitiva/parcial |
| Executante | identificação, licença ANAC e assinatura |
| APRS | identificação, licença ANAC e assinatura |
| Empresa/local | empresa, certificado ANAC, cidade e estado |

A FCDA não é apenas um checklist de “cumprido”: deve evidenciar o que foi analisado, qual procedimento foi executado, o resultado e quando a próxima ação será exigida.

## 5. Registro secundário — mapa de controle

O **Mapa de Controle de DA** é registro secundário que permite consulta rápida da situação das DAs (**IS 39-001 §§4.9 e 5.14**). Pode ser uma planilha ou mapa atualizado durante IAM, inspeção do programa de manutenção ou cumprimento de DA.

O mapa deve, no mínimo, permitir visualizar:

- DA aplicável;
- produto/aeronave afetado;
- status de cumprimento;
- data, horas e ciclos do último cumprimento;
- próxima data/horas/ciclos;
- referência à FCDA e ao registro de manutenção;
- eventual MAC aprovado;
- condição de ação final, repetitiva ou parcial.

**O mapa não substitui o registro primário.** Durante vistoria, a simples apresentação do mapa, sem cadernetas, FCDA ou demais registros que comprovem o serviço, não é suficiente para demonstrar o cumprimento (**IS 39-001 §5.20.2**).

## 6. Ações parciais, repetitivas e finais

Uma DA pode exigir uma ação inicial ou parcial antes da ação final. A ação parcial deve ser registrada e gerar o controle da próxima etapa; o fato de iniciar o processo não significa cumprimento definitivo da DA (**IS 39-001 §§5.5.2–5.5.3**).

Para ações repetitivas, o registro deve conservar o novo vencimento e o histórico de cada execução. O sistema deve impedir que uma execução parcial seja confundida com encerramento da DA.

## 7. Método Alternativo de Cumprimento (MAC)

Qualquer pessoa pode propor à ANAC método alternativo de cumprimento ou alteração do prazo, desde que ofereça nível de segurança aceitável (**RBAC 39 §39.19**).

O MAC precisa ser aprovado antes do uso; deve identificar DA e produto afetado; demonstrar nível de segurança aceitável; definir escopo, procedimento, limites e validade; e ser associado ao registro primário (**IS 39-001 §5.18; IS 39.19-001**).

Para DA estrangeira, a ANAC pode aceitar MAC previamente aprovado pela autoridade estrangeira, respeitado o critério brasileiro (**RBAC 39 §39.19(b)**).

## 8. Dificuldades em serviço

Falha, defeito ou mau funcionamento encontrado no cumprimento de uma DA deve ser tratado como dificuldade em serviço quando se enquadrar nos requisitos aplicáveis aos operadores ou organizações de manutenção (**IS 39-001 §5.17**).

O sistema deve permitir registrar a dificuldade sem apagar ou substituir a evidência original do cumprimento.

## 9. Traslado para cumprir DA

Quando necessário trasladar aeronave para local adequado, o operador deve obter Autorização Especial de Voo, salvo se suas especificações operativas já contemplarem a autorização (**RBAC 39 §39.23**).

A autorização não deve ser emitida se a própria DA proibir o voo ou se a ANAC considerar que não há nível de segurança aceitável.

## 10. Modelo de dados para o VORTEX

### `maintenance.airworthiness_directives`
- identificador da DA/AD/CN/BLA/EASA;
- autoridade emissora e estado de projeto;
- número, revisão e data de efetividade;
- produto, modelo, P/N, S/N e aplicabilidade;
- documento de serviço incorporado;
- ação final/repetitiva/parcial;
- limites de data, horas, ciclos ou pousos;
- estado: EM_ANALISE, APLICAVEL_PENDENTE, PARCIAL, REPETITIVA, FINALIZADA, NAO_APLICAVEL;
- link para eventos do ledger.

### `maintenance.ad_compliance_records` — FCDA/registro primário
- DA e produto relacionados; aplicabilidade e justificativa; procedimento e referência/revisão; método normal ou MAC aprovado; TSN/CSN/TSO/CSO/posição; resultado e achados; dificuldade em serviço; data e próximo vencimento; executante e APRS; empresa/local; assinatura e evidências; hash do documento e evento de ledger.

### `maintenance.ad_control_maps` — registro secundário
- visão corrente por aeronave/produto; status e próximo vencimento; referência imutável ao registro primário; indicador de divergência entre mapa e FCDA; data da última reconciliação.

## 11. Pontos de atenção para sistemas (VORTEX)

- A DA deve ser tratada como requisito regulatório obrigatório, não como recomendação do fabricante.
- Uma DA estrangeira pode ser aplicável mesmo sem existir uma cópia “brasileira” separada.
- O sistema deve distinguir análise de aplicabilidade, ação parcial, ação repetitiva e ação final.
- Não permitir encerramento sem registro primário completo.
- Mapa de controle é projeção consultiva; a FCDA e o registro de manutenção são a evidência.
- MAC só pode ser selecionado após associação a aprovação verificável da ANAC/autoridade competente.
- Mudança de revisão da DA deve gerar reanálise de aplicabilidade e preservar o histórico anterior.
- Vencimentos devem ser calculados por data, horas, ciclos ou pousos, conforme a DA.
- Divergência entre mapa e registro primário deve gerar alerta e tarefa de reconciliação.
- Cumprimento de DA deve alimentar automaticamente o controle de manutenção e a linha do tempo do ledger.
- Documentos de serviço incorporados por referência devem ser tratados como parte obrigatória da DA.

---
### Fontes citadas
- RBAC 39 — `artifacts/cerebro-anac/markdown/rbac/rbac-39.md`
- IS 39-001 Rev. C — `artifacts/cerebro-anac/markdown/is/is-39-001.md`
- IS 39.19-001 — `artifacts/cerebro-anac/markdown/is/is-39-19-001.md`
