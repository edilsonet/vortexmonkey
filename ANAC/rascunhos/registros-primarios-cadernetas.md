# Registros Primários — Cadernetas de Célula, Motor e Hélice

> **Assunto**: registros primários de manutenção; cadernetas (Partes I–IV); registro primário vs. secundário
> **Fontes**: RBAC 43 §43.9 · IS 43.9-003 Rev B · RBAC 01 (definição de tempo em serviço)
> **Última destilação**: 12/09/2026 · **Status**: ✅ verificada contra o texto das normas

## 1. O que é registro primário (definição legal)

**IS 43.9-003 §4.6:** registro primário é o **registro principal** das atividades de manutenção — deve ser **completo e claro**, conter o **método de cumprimento** e o **resultado** da ação. É aquele com o conteúdo/forma do **RBAC 43 §43.9 ou §43.11**. Meios aceitos: **cadernetas, Ordens de Serviço, FCDA, SEGVOO 001/003**, etc.

**Registro secundário (§4.7):** registro **simplificado** que referencia ou complementa um primário. Não precisa do conteúdo 43.9, **mas deve**:
- conter o **número/referência do registro primário** usado para o retorno ao serviço;
- identificar **quem transcreveu**;
- ser capaz de **comprovar sua veracidade**.

> 💡 **Princípio VORTEX**: "registro é um só" — primário no ledger; caderneta Parte I e controles de manutenção são **projeções agregadas recomputáveis** a partir do primário. Esta página confirma a base regulatória: secundário sempre referencia o primário.

## 2. Conteúdo mínimo da anotação (RBAC 43 §43.9(a))

Cada pessoa que executa manutenção/preventiva/reconstrução/alteração deve anotar:

1. **Descrição** (ou referência a dados aceitos pela ANAC) do trabalho executado;
2. **Data** de conclusão;
3. **Nome** de quem executou (se diferente de quem aprovou);
4. **Assinatura + número da licença** de quem aprovou — a assinatura constitui aprovação para retorno ao serviço **apenas quanto ao serviço realizado**.

Exceções: (b) operadores 121/135 com EsO anotam conforme os respectivos RBACs; (c) inspeções do RBAC 91 / §135.411(a)(1) / §135.419 não seguem 43.9.
**Grandes reparos/alterações**: além da anotação, preencher formulário do **Apêndice B** do RBAC 43 (§43.9(d)); artigo **fora** da aeronave: retorno ao serviço em formulário próprio (§43.9(d)-I).

## 3. Cadernetas (IS 43.9-003 Rev B, 28/02/2020)

### 3.1 Definições (§§4.1–4.3)

| Caderneta | Escopo |
|---|---|
| **Célula** | Registros primários e secundários da aeronave e componentes: correções, trocas, inspeções/revisões, BS/DA, modificações e reparos |
| **Motor** | Idem, para o motor e seus componentes |
| **Hélice** | Idem, para a hélice e seus componentes |

Objetivo: **centralizar** os registros que evidenciem as reais condições de aeronavegabilidade (Apêndices A/B/C trazem os modelos).

### 3.2 Aplicabilidade (§5.1.1)

- **Obrigatórias**: aeronaves sob **RBHA 91 e RBAC 135** (inclusive motor/hélice em estoque para instalação). Procedimentos alternativos possíveis se aceitos formalmente pela ANAC.
- **Opcionais**: aeronaves sob **RBAC 121**.

### 3.3 Numeração (§5.1.3)

- **Célula**: `sequencial / matrícula / ano de abertura` — ex.: `01/PT-XYZ/02`. Mudança de marcas/modelo mantém a sequência e **encerra** a caderneta anterior, que permanece no acervo (§5.1.4, com textos de rastreabilidade obrigatórios nos Termos de Abertura/Encerramento).
- **Motor**: `sequencial / modelo do motor / ano` — ex.: `03/IO-470C/02`.
- **Hélice**: `sequencial / modelo da hélice / ano` — ex.: `02/HC-B3YT-3C/02`.
- Mudança de modelo do motor/hélice: mesma lógica de encerramento (§5.1.5); mudança de marcas da aeronave **não** encerra cadernetas de motor/hélice — apenas anotação nas Observações.

### 3.4 Estrutura interna (§§5.2.4–5.2.7)

| Parte | Conteúdo |
|---|---|
| **Parte I** | **Controle Mensal de Utilização** — logo após o Termo de Abertura (horas/ciclos do mês) |
| **Parte II** | **Registros primários** de serviços de manutenção, inspeção, revisão |
| **Parte III** | **Registros secundários** de DA, Grandes Reparos executados |
| **Parte IV** | **Registros primários** de instalação e remoção de componentes |

### 3.5 Tempo em serviço (§§4.4–4.5)

- Definição remete ao **RBAC 01**: do momento em que a aeronave deixa a superfície até tocar no pouso.
- **TSN**: soma total desde o primeiro voo; horas/ciclos de **banco de ensaio e solo** somam-se ao TSN quando os manuais do fabricante assim definirem.

## 4. Pontos de atenção para sistemas (VORTEX)

- A caderneta digital deve preservar a **estrutura Parte I–IV** e a **numeração** com regras de encerramento/rastreabilidade.
- Registro secundário **exige referência ao primário** → no ledger, todo evento de projeção carrega a referência do evento de origem.
- Assinatura de aprovação vale **só para o serviço executado** → o retorno ao serviço (APRS/CRS) é evento distinto da anotação do trabalho.
- Retenção: registros de manutenção seguem §43.9/43.11 e regras de guarda da OM (ver página *Retenção e guarda de registros*).

---
### Fontes citadas
- RBAC 43, Emenda 05 (vigência 26/05/2021): §43.9 — *acervo: rbac/rbac-43*
- IS 43.9-003 Rev B (28/02/2020), Origem SAR: §§4.1–4.7, 5.1, 5.2 — *acervo: is/is-43-9-003*
