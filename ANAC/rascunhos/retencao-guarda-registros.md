# Retenção e Guarda de Registros de Manutenção

> **Assunto**: prazos de conservação de registros; quem guarda o quê; transferência na venda
> **Fontes**: RBAC 43 §43.11 · RBAC 91 §§91.417, 91.419, 91.421 · RBAC 43 Apêndice B
> **Última destilação**: 12/09/2026 · **Status**: ✅ verificada contra o texto das normas

## 1. Registros de inspeção — conteúdo (RBAC 43 §43.11(a))

Pessoa que aprova/reprova retorno ao serviço após inspeção (RBAC 91 / §135.411(a)(1) / §135.419) deve anotar:

1. **Tipo de inspeção** e sua extensão;
2. **Data** e **horas totais** da aeronave, com marcas de nacionalidade e matrícula;
3. **Assinatura, número da licença e tipo de habilitação** de quem aprova/reprova;
4. Se aeronavegável (exceto inspeção progressiva): declaração "Certifico que a aeronave (identificação) foi inspecionada de acordo com a inspeção (tipo) e concluo que ela está em condições aeronavegáveis";
5. Se **não** aprovada: declaração equivalente + **lista de discrepâncias e itens não aeronavegáveis entregue ao proprietário**;
6. Inspeção progressiva: declaração própria (rotina + detalhada, aprovado/reprovado + lista de discrepâncias);
7. Programa aprovado: identificar o **programa**, qual parte executada e declaração de conformidade com aquele programa.

## 2. Lista de discrepâncias (§43.11(b))

- Lista **assinada e datada** ao proprietário/operador quando a aeronave não está aeronavegável.
- Itens cuja inoperância é permitida (§91.213(d)(2)): instalar placares **"INOPERANTE"** associados a cada instrumento/controle inoperante, e incluir na lista.

## 3. Falsificação (§43.12)

Ninguém pode fazer ou induzir anotação fraudulenta ou intencionalmente falsa em registro ou relatório de manutenção — base para a validade jurídica do ledger VORTEX (integridade por hash + assinatura).

## 4. Retenção pelo proprietário/operador (RBAC 91 §91.417)

### 4.1 O que conservar (§91.417(a))

1. **Registros de manutenção/preventiva/alteração e inspeções** (100h, anual, progressiva etc.) por aeronave (célula, motor, hélice, rotor, equipamentos), com: descrição, data de término, assinatura + licença de quem aprovou retorno ao serviço;
2. **Registros de controle**: tempo total de voo de cada célula/motor/hélice/rotor; situação de **partes com limite de vida**; tempo desde a última **revisão geral**; situação quanto a **inspeções** (tempos desde a última obrigatória); situação das **DA/DS** (método de cumprimento, número, data de revisão, próxima ação periódica); **cópias dos formulários 43.9(d)** (grandes reparos/alterações) dos itens instalados.

### 4.2 Por quanto tempo (§91.417(b))

| Registro | Prazo |
|---|---|
| Manutenção/inspeções (a)(1) | Até o trabalho ser repetido pela **3ª vez consecutiva**, ou **5 anos** após o término, **o que for maior** |
| Controle (a)(2) | **Permanente** — e **transferido com a aeronave** na venda |
| Lista de defeitos (43.11) | Até todos os defeitos reparados e aeronave aprovada para retorno ao voo |

- §91.417(c): todos os registros **disponíveis à ANAC** sempre que requerido.
- §91.417(d): registro de tanque de combustível adicional conservado **a bordo** da aeronave modificada.

## 5. Transferência de registros (§91.419)

Na venda, o vendedor transfere ao comprador:
- (a) registros de **controle** (§91.417(a)(2)); e
- (b) registros de **manutenção** (§91.417(a)(1)) não incluídos em (a), exceto se o comprador autorizar o vendedor a manter a **custódia física** — sem eximir o comprador da responsabilidade de disponibilizar à ANAC.

Forma: linguagem clara **ou codificada**, desde que a recuperação seja aceitável pela ANAC.

## 6. Motor reconstruído (§91.421)

- Pode-se usar **novo registro sem histórico prévio** para motor reconstruído por pessoa autorizada (RBAC 43).
- Quem concede **tempo zero** deve anotar no novo registro.

## 7. Grandes reparos/alterações — vias e retenção (RBAC 43 Apêndice B)

- Regra geral: formulário em **2 vias** — original ao proprietário, cópia conservada **≥ 5 anos**.
- OM com manual/especificações aprovadas: pode registrar na **ordem de serviço** (cópia assinada ≥ 5 anos após o retorno ao serviço) + **liberação de manutenção** com identificação completa e texto de encerramento padrão.
- Tanque de combustível em compartimento de passageiros/bagagem: **3 vias** (1 a bordo, 1 com instalador ≥ 5 anos, original ao proprietário).

## 8. Pontos de atenção para sistemas (VORTEX)

- Dois regimes de retenção convivem: **por evento** (5 anos/3 repetições) e **permanente** (controle de tempo/vida/DA) → no modelo de dados, distinguir registros "históricos" de registros "de estado atual".
- **Transferência na venda** = exportação completa do dossiê da aeronave (ledger exporta a cadeia inteira).
- Lista de discrepâncias com placar "INOPERANTE" → estado visível na aeronave **e** no sistema (MEL/defeitos).
- Liberação de manutenção da OM (Apêndice B(b)) tem texto padrão → template no sistema.

---
### Fontes citadas
- RBAC 43, Emenda 05: §§43.11, 43.12, Apêndice B — *acervo: rbac/rbac-43*
- RBAC 91, Emenda 00 (20/03/2020, vigência 01/06/2020): §§91.417, 91.419, 91.421 — *acervo: rbac/rbac-91*
