# Elegibilidade e Identificação de Peças

> **Assunto**: peças aprovadas, etiquetas de condição, rastreabilidade, peças suspeitas
> **Fontes**: IS 43-001 · RBAC 43 §43.10 · RBAC 21
> **Última destilação**: 12/09/2026 · **Status**: ✅ verificada contra o texto das normas

## 1. Etiquetas de condição (IS 43-001)

A IS 43-001 regulamenta o **Certificado de Liberação Autorizada / Etiqueta de Aprovação de Aeronavegabilidade (F-100-01)** para peças e artigos:

- **Etiqueta verde** (nova): artigo **novo**, fabricado sob certificação (produção aprovada).
- **Etiqueta amarela**: artigo **usado/em estoque**, avaliado e aprovado para instalação (ou para venda como capaz).
- **Etiqueta vermelha**: artigo **não aprovado** — reparável, a revisar, ou inservível; **impede instalação**.

### Regras de emissão e guarda (IS 43-001)

- A etiqueta acompanha o artigo **individualmente** (ou lote homogêneo, quando aplicável).
- **Fabricante**: conserva cópia arquivada das etiquetas emitidas por **≥ 2 anos** (§5.4.6.4).
- **Empresa aérea/OM**: mantém arquivadas **em papel** cópias dos originais (§5.2.6.4) — quando o sistema é eletrônico, aplica-se o SDRMe (IS 43.9-004).
- **Extravio**: comunicar **por escrito** e emitir segunda via com referência ao original (§5.6.3.4).
- Formulário **F-100-01** disponível eletronicamente no sítio da ANAC (§5.6.2.2).

## 2. Peças com limite de vida (RBAC 43 §43.10)

- **Definição (§43.10(a)(1))**: peça/parte com **limite obrigatório de substituição** especificado no projeto de tipo, ICA ou manual de manutenção.
- **Situação de vida (a)(2)**: número acumulado de **ciclos, horas** ou outro limite obrigatório.
- **§43.10(c)**: registros de controle de peças com limite de vida — conteúdo, forma e conservação (aplicável também em meio digital via SDRMe).
- **§43.10(d)**: transferência de peças com limite de vida — a peça **acompanhada do registro** de sua situação de vida.

## 3. Pontos de atenção para sistemas (VORTEX)

- **Peça = entidade rastreável** com: P/N, S/N (quando aplicável), situação de vida (horas/ciclos), etiqueta de condição (cor + número + data + emissor).
- **Transferência de peça exige o registro junto** (§43.10(d)) → no estoque do VORTEX, a saída de peça com limite de vida carrega o histórico (evento do ledger).
- Etiqueta vermelha = **bloqueio de instalação** (validação N0–N3 sinaliza, fluxo não para).
- Extravio de etiqueta = evento com segunda via referenciada (mesma lógica de estorno do ledger).
- Integração com **Publicações/CertPub**: o recorte do manual que define o limite de vida é o dado técnico que valida a peça.

---
### Fontes citadas
- IS 43-001 (etiquetas de condição) — *acervo: is/is-43-001*
- RBAC 43, Emenda 05: §43.10 — *acervo: rbac/rbac-43*
