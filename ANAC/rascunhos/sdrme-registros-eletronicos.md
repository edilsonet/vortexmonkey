# SDRMe — Sistema de Documentos e Registros de Manutenção Eletrônicos

> **Assunto**: registros de manutenção em meio digital; requisitos do sistema; autorização ANAC
> **Fontes**: IS 43.9-004 Rev A · Res. 458/2017 (alterada pela Res. 511/2019 — blockchain)
> **Última destilação**: 12/09/2026 · **Status**: ✅ verificada contra o texto das normas

## 1. Fundamento

**IS 43.9-004 §3.1:** a **Resolução 458/2017** regulamenta o uso de sistemas informatizados para registro e guarda de informações **em substituição ao papel**. §3.3: a **Res. 511/2019** possibilitou o uso de **Blockchain** — os procedimentos da IS podem requerer adaptações nesse caso.

**§3.5:** todos os requisitos aplicáveis a registros em papel **também se aplicam** aos digitais aceitos nos termos desta IS.

## 2. Requisitos legais que migram para o digital (§3.6 — lista não exaustiva)

Conteúdo e conservação de registros de manutenção/inspeções (§91.417(a)(1)/(b)(1)), controle de tempo/aeronavegabilidade (§91.417(a)(2)/(b)(2)), registros 121 (§§121.380, 121.709, 121.701) e 135 (§§135.439, 135.443, 135.65), lista de discrepâncias (§43.11(b)), altímetro/transponder (§§91.411, 91.413 + Apêndices E/F), **transferência de registros** (§§91.419, 135.441, 121.380a), pesagem/balanceamento (§91.423), IAM (§91.203(a)(4)(iii)), RCA/LV (§91.403(f)), falsificação (§43.12), **peças com limite de vida** (§43.10(c)/(d)), grandes reparos (§§91.407, 91.409, Apêndice B), pessoal da OM (§145.161), **calibrações periódicas** (§145.109(b)-II), treinamento (§145.163(c)), SGSO da OM (§145.214-I), arquivamento (§145.219), manual 121/135 (§§121.369(c), 135.23(a)(24)).

## 3. Definições (§4)

| Termo | Definição |
|---|---|
| **dados significativos** | Informações requeridas pela legislação para certificação e fiscalização |
| **documento** | Dados significativos + meio físico/digital que os contém (ex.: OS em branco, planilha de calibração) — **passível de modificação** |
| **registro** | **Documento preenchido e emitido** por ente regulado, com **evidências objetivas** da atividade |
| **SDRMe** | Conjunto hardware + software + elementos necessários ao sistema de registro/guarda eletrônico, **aceito pela ANAC** (Res. 458) |

### Registros errôneos e irregulares (§4.4 Notas 1–4)

- **Errôneo**: falha de preenchimento que compromete completude/exatidão **sem afetar a regularidade**.
- **Irregular**: preenchimento/emissão que **não atende** às exigências legais.
- Registro errôneo/irregular deve ser **claramente identificado como inválido, conservado**, e **substituído** por outro corrigido **com referência ao número de controle do original**.
- **Legibilidade** é indispensável para atestar regularidade.

> 💡 **Princípio VORTEX**: correção por **novo evento** referenciando o original (nunca UPDATE/deleção) — exatamente o modelo de estorno do ledger. A IS manda conservar o registro inválido: o histórico completo permanece na cadeia.

## 4. Regras operacionais (§5)

- **§5.1.1**: autorização SDRMe aplica-se a **todos os operadores e OM certificadas**; OM estrangeiras seguem acordo bilateral.
- **§5.1.2**: registro de manutenção é documento de **emissão obrigatória**.
- **§5.1.3**: migração para digital **mantém** os requisitos de conteúdo/disposição/guarda/transferência.
- **§5.1.4**: **responsabilidade do operador** garantir que quem assina registros esteja **cadastrado no SDRMe**.
- **§5.1.5**: uso de SDRMe **não dispensa** a guarda de documentos físicos anteriores, a menos que **devidamente migrados**.
- **§5.1.6–5.1.7**: adaptações de interpretação (ex.: "rubrica" → "assinatura eletrônica") propostas pelo requerente, sem alterar conteúdo, preservação ou validação.
- **§5.2.1**: qualquer dispositivo de edição/visualização deve apresentar documentos e registros de forma **clara e legível**.

## 5. Pontos de atenção para sistemas (VORTEX)

- O ledger VORTEX é um **SDRMe** candidato: precisa de **aceitação ANAC** (Res. 458) — a arquitetura (hash SHA-256 + Ed25519 + append-only) atende e supera os requisitos de integridade.
- **Cadastro de assinantes** no sistema (§5.1.4) = identidade RBAC do VORTEX.
- **Correção por estorno referenciado** (§4.4 Nota 3) = padrão de eventos do ledger.
- Migração de papel → digital deve ser **documentada** (§5.1.5) — processo de digitalização com preservação de conteúdo.
- Blockchain (Res. 511/2019) é caminho explicitamente previsto — o ledger append-only com hash encadeado se enquadra.

---
### Fontes citadas
- IS 43.9-004 Rev A (08/11/2019), Origem SAR: §§3, 4, 5 — *acervo: is/is-43-9-004*
- Res. 458/2017 e Res. 511/2019 — *acervo: resolucoes/*
