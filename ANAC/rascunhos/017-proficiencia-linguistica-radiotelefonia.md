# Comunicações, radiotelefonia e proficiência linguística

> **Assunto**: proficiência em inglês para operações fora da jurisdição brasileira e registros de radiotelefonia
> **Fontes principais**: RBAC 61 §61.10 e Apêndice A
> **Fonte Markdown principal**: `artifacts/cerebro-anac/markdown/rbac/rbac-61.md`
> **Última revisão**: 12/09/2026 · **Status**: rascunho v1
> **Nota de acervo**: não foi localizada IS específica de proficiência linguística no acervo Markdown atual; o RBAC 61 §61.10(c) remete o detalhamento do exame a IS, que deverá ser localizada/confirmada em etapa posterior.

## 1. Aplicabilidade

O RBAC 61 §61.10 aplica-se a pilotos de avião, helicóptero, aeronave de decolagem vertical ou dirigível que pretendam operar aeronave civil brasileira fora da jurisdição do espaço aéreo brasileiro. Nessa situação, o piloto deve demonstrar capacidade de falar e compreender inglês mediante exame de proficiência linguística elaborado pela ANAC (**§61.10(a)–(b)**).

## 2. Averbações e nível mínimo

O resultado é averbado como **English level 4** (Operacional), **English level 5** (Avançado), **English level 6** (Expert) ou **English Not Compliant Annex 1** (nível 1–3 ou exame não realizado) (**§61.10(c)**). Somente níveis 4, 5 ou 6 permitem operar aeronave civil brasileira fora da jurisdição brasileira (**§61.10(d)**). Nível 4 é o mínimo operacional para comunicações radiotelefônicas.

## 3. Determinação do nível

O exame avalia pronúncia, estrutura, vocabulário, fluência, compreensão e interações (**Apêndice A, 1.1(a)**). Cada componente recebe nível 1 a 6; o nível final é o menor resultado. O piloto deve comunicar-se por voz/face a face, tratar temas de trabalho, esclarecer mal-entendidos, lidar com eventos inesperados e usar sotaque inteligível (**Apêndice A, 1.1(b)**).

## 4. Reavaliação

Nível 4 exige reavaliação pelo menos a cada **3 anos**; nível 5, pelo menos a cada **6 anos** (**§61.10(e)**). A seção não estabelece periodicidade para nível 6; o sistema deve preservar data do exame e averbação, sem presumir validade além do registro oficial.

## 5. Português

Licenças brasileiras recebem observação **“Português Nível 6”** quando emitidas, validadas ou quando habilitações são revalidadas (**§61.10(f)**). Isso não substitui inglês quando exigido.

## 6. Radiotelefonia e segurança

A proficiência busca comunicação segura por rádio: fraseologia, identificação de aeronave/estação, leitura/colação de autorizações, confirmação de números/altitudes/frequências/pistas, pedido de esclarecimento e comunicação de emergências. O treinamento deve cobrir ruído, velocidade, sotaque, ambiguidade e situações inesperadas.

## 7. Modelo de dados para o VORTEX

### `identity.language_proficiencies`
- piloto; idioma; AVERBACAO_LICENCA/EXAME; nível 1–6 ou NOT_COMPLIANT_ANNEX_1; seis componentes; menor componente; exame; averbação; próxima reavaliação; licença; documento/assinatura.

### `operations.international_communication_eligibility`
- piloto; voo/rota/aeronave; espaço aéreo; exigência; nível; validade; ELEGÍVEL/BLOQUEADO; motivo mínimo; instante; ledger.

### `training.radiotelephony_records`
- piloto; inicial/recorrente; fraseologia; readback; emergência; inglês; avaliação; resultado/validade; aeronave/FSTD; evidências.

## 8. Pontos de atenção para sistemas (VORTEX)

- Não aceitar inglês informalmente: exigir averbação oficial.
- Nível final é o menor dos seis componentes.
- Níveis 1–3 bloqueiam a operação internacional abrangida.
- Nível 4 exige 3 anos; nível 5, 6 anos.
- Português Nível 6 não substitui inglês.
- Considerar espaço aéreo/rota, não só nacionalidade da aeronave.
- Ausência da IS específica é lacuna de fonte; não inventar procedimento de exame.
- Mudanças criam eventos novos e preservam o histórico.

---
### Fontes citadas
- RBAC 61 §61.10 e Apêndice A — `artifacts/cerebro-anac/markdown/rbac/rbac-61.md`
- RBAC 121, contexto de operações internacionais — `artifacts/cerebro-anac/markdown/rbac/rbac-121.md`
