# VORTEX — docs/03: CATÁLOGO COMPLETO DE FORMULÁRIOS ANAC (v2)

> **Versão 2 — 12/09/2026.** O catálogo de formulários permanece intocado (dados oficiais). Mudanças desta versão: mapeamento de módulos atualizado para os 13 apps (FCDAG → ERP Agrícola; ERP 135 → ERP Operadores), e regras de geração alinhadas ao **bloco de assinatura padrão SEI/ANAC (seção 5-B do contrato)**.
> Estes são os formulários oficiais integrados ao ecossistema VORTEX.
> Cada formulário é um documento estruturado (.md/XML) gerado sob demanda, assinado digitalmente e ancorado no ledger.

## 1. CATÁLOGO DE FORMULÁRIOS

| Código | Denominação Oficial | Módulo / Aplicação (v2) | Norma de Referência |
|--------|---------------------|--------------------------|---------------------|
| **F-101-06** | Relatório / Laudo / Parecer de Avaliação de Cumprimento | Rconta, ERP Manutenção | IS 183-002, IS 21-001 |
| **F-101-11** | Solicitação de Certificação de Tipo / Emenda / CST | Rconta, Núcleo (catálogo) | IS 21-001 §5 |
| **F-141-10** | Declaração de Qualificações / Credenciamento e Extensão PCA | Rconta, Recrutamento | IS 183-005 §5.1.9.4 |
| **F-141-12** | Relatório Periódico de Atividades do PCA | Rconta | IS 183-005 §5.1.9.3 |
| **Famma** | Ficha de Avaliação de Mecânico de Manutenção Aeronáutica | Rconta, Recrutamento | IS 183-003 §5.13 |
| **FAP 13** | Ficha de Avaliação de Piloto / Recredenciamento de Examinador | Rconta, Recrutamento | IS 135-001 §5.3.6.4 |
| **F-145-27E** | Relatório de Verificação de Aeronavegabilidade (CVA) | ERP Manutenção, Rconta | IS 91-403-001 §6.1 |
| **F-145-28** | Etiqueta de Conformidade de Aeronavegabilidade (CVA) | ERP Manutenção | IS 91-403-001 §6.3 |
| **FCDAG** | Formulário de Cadastro de Operador Aeroagrícola | Rconta, **ERP Agrícola** | IS 137-003 §5.2.5 |
| **FAI** | Formulário de Análise de Impacto de Alteração de COA/EO | Rconta | IS 119-004 §5.2.4.4 |
| **FAD** | Ficha de Avaliação de Despachante Operacional de Voo | Rconta, **ERP Operadores** | IS 121-022 Apêndice C |
| **Ficha Obs.** | Ficha de Observação para Credenciamento de Comissário | Rconta, Recrutamento | IS 135-004 §5.7 |
| **Termo Resp.** | Termo de Responsabilidade e Compromisso Ético do PCA | Rconta, VORTEX Sign | IS 183-005 Apêndice C |
| **FOP 107** | Envio e Submissão do Manual de Gerenciamento da Manutenção | Rconta, **ERP Operadores** | IS 121-024 §4.1 |
| **FOP 111** | Aprovação Formal de MGM e Lista de Equipamentos Mínimos | Rconta, **ERP Operadores** | IS 121-024, IS 91-012 |
| **FOP 200–226** | Série Completa de Certificação de Operadores RBAC 135 (27 formulários) | Rconta, **ERP Operadores** | IS 119-004 §5.2.4.3 |
| **FOP-CT 101–125** | Série de Certificação de Centro de Treinamento (CTAC) | Rconta, **ERP Cursos e Treinamentos** | IS 142-001 §5.2 |
| **FOP 400–422** | Série de Certificação de Centro de Instrução (CIAC) | Rconta, **ERP Cursos e Treinamentos** | IS 141-004 §5.2 |
| **D-144-02** | Declaração de Cumprimento do PMAC — Operador RBAC 121 | Rconta, **ERP Operadores** | IS 121-024 §4.1 |
| **D-142-01** | Declaração de Cumprimento do PMAC — Operador RBAC 135 | Rconta, **ERP Operadores** | IS 119-004 §5.2.11.1.4 |
| **SEGVOO 001** | Relatório de Execução de Grande Alteração ou Grande Reparo | Rconta, ERP Manutenção | IS 43.9-001 §5.1 |
| **FCDA** | Ficha de Cumprimento de Diretriz de Aeronavegabilidade | ERP Manutenção | RBAC 39, IS 43.9-003 |
| **FORM 8130-3** | Certificado de Liberação Autorizada / Conformidade de Peça Nova | Núcleo (catálogo), ERP Manutenção | IS 43-001 §5.4 |

## 2. GRUPOS DE FORMULÁRIOS (por domínio)

### 2.1 Certificação de Operadores RBAC 135 (FOP 200–226)
- Série completa de 27 formulários para certificação de operadores sob RBAC 135.
- Inclui: FOP 200 (ROP), FOP 219 (alterações de COA/EO/base), FOP 224 (manuais).
- Norma: IS 119-004 §5.2.4.3.

### 2.2 Certificação de CIAC (FOP 400–422)
- Série de certificação de Centros de Instrução de Aviação Civil (RBAC 141).
- Norma: IS 141-004 §5.2.

### 2.3 Certificação de CTAC (FOP-CT 101–125)
- Série de certificação de Centros de Treinamento de Aviação Civil (RBAC 142).
- Norma: IS 142-001 §5.2.

### 2.4 Manutenção e Aeronavegabilidade
- F-145-27E e F-145-28 (CVA), FCDA (cumprimento de DA), SEGVOO 001 (grandes intervenções), FORM 8130-3 (peça nova).

### 2.5 Credenciamento (RBAC 183)
- F-101-06, F-141-10, F-141-12, Famma, Termo de Responsabilidade (Apêndice C).

### 2.6 Pessoal e Operações
- FAP 13 (piloto examinador), FAD (despachante), Ficha Obs. (comissário), FCDAG (aeroagrícola), FAI (análise de impacto).

## 3. REGRAS DE GERAÇÃO DE FORMULÁRIOS (v2 — alinhadas à seção 5-B do contrato)

1. Todo formulário é um **documento estruturado** (.md ou XML), nunca um binário.
2. Geração de PDF **somente sob demanda** (efêmero, nunca persistido).
3. Todo formulário é **assinado digitalmente** (3 níveis) e **ancorado no ledger**.
4. **Bloco de assinatura padrão SEI/ANAC (seção 5-B):** QR code em **SVG** (fallback base64 PNG) + manifesto textual gerado do ledger (nome, papel, empresa, data/hora de Brasília, art. 4º do Decreto 10.543/2020, URL de autenticidade + código verificador + CRC). Um bloco por signatário, em ordem cronológica; bloco selado junto com o documento.
5. Formulários com dado pessoal são RESTRICTED/PRIVATE, nunca PUBLIC — **exceto a consulta de autenticidade** (`/ass/autenticidade`), que confirma códigos sem expor conteúdo.
6. Versionamento N1.N2 com diff e hash SHA-256.
7. Logomarcas em SVG/base64 para nitidez e leveza.
8. Modelos oficiais da ANAC dispõem a inclusão individualizada nos manuais (Certificação Descomplicada).

## 4. MAPEAMENTO PARA OS APPS (v2)

| Formulário | App responsável | Fluxo |
|-----------|-----------------|-------|
| SEGVOO 001 | ERP Manutenção | Grande reparo/alteração → gera SEGVOO → protocolo SEI → CRS |
| FCDA | ERP Manutenção | Cumprimento de DA → FCDA com hash → ledger |
| F-145-27E/28 | ERP Manutenção | CVA anual → relatório + etiqueta |
| F-101-06 | Rconta | Laudo de avaliação de cumprimento |
| FOP 200-226 | ERP Operadores | Certificação de operador 135 |
| FOP 400-422 | ERP Cursos e Treinamentos | Certificação de CIAC |
| FOP-CT 101-125 | ERP Cursos e Treinamentos | Certificação de CTAC |
| FCDAG | **ERP Agrícola** | Cadastro de operador aeroagrícola |
| Famma | Rconta | Avaliação de MMA |
| FAP 13 | Recrutamento | Recredenciamento de examinador |
| FAD | **ERP Operadores** | Avaliação de DOV |
| FAI | **ERP Operadores** | Análise de impacto de COA/EO |
| F-101-11 / FORM 8130-3 | Núcleo (catálogo) | Certificação de tipo / conformidade de peça |

## 5. MUDANÇAS DA v1 → v2 NESTE DOCUMENTO
1. **Mapeamento atualizado para os 13 apps** — "ERP 43+145" → **ERP Manutenção**; "ERP 135/121" → **ERP Operadores**; "ERP 137" → **ERP Agrícola**; "ERP 141/142" → **ERP Cursos e Treinamentos**; "Catálogo" → **Núcleo (catálogo)**.
2. **Regra 4 reescrita** — bloco de assinatura padrão SEI/ANAC (QR SVG + manifesto textual, seção 5-B do contrato).
3. **Regra 5** — exceção da consulta pública de autenticidade (`/ass/autenticidade`).
