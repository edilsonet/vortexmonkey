# ANAC — Cérebro Regulatório

Acervo completo da legislação de aviação civil brasileira, coletado em 12/09/2026 das fontes oficiais (anac.gov.br + pergamum.anac.gov.br).

## Estrutura

- `ANAC/RBAC/` — 52 regulamentos (markdown integral)
- `ANAC/IS/` — 117 instruções suplementares (markdown integral)
- `ANAC/IAC/` — 15 instruções do ar (markdown integral)
- `ANAC/resolucao/` — 160 resoluções (markdown integral)
- `ANAC/TAXONOMIA-ASSUNTOS.md` — organização do cérebro **por assunto** (não por norma)
- `ANAC/INDICE-MESTRE.md` — índice das 344 normas
- `ANAC/rascunhos/` — sínteses por assunto (em progresso)

## Status (12/09/2026, 16:20)

- ✅ **Coleta completa**: 344 normas com texto extraído
- ✅ **Extração completa**: 344 markdowns com frontmatter + texto integral — **TODOS no GitHub**
- ✅ **Verificação**: tamanhos GitHub vs. local conferem (RBAC 52, IS 117, IAC 15, RES 160)
- ✅ IS 121-018 (932KB, contém FAA Order 8260.3E TERPS embutido) dividida em 10 partes
- ⚠️ 11 arquivos vazios por natureza: PDFs escaneados sem camada de texto (iac-2211/2214, is-121-012/014, is-119-008, is-117-001c, rbac-63, rbac-137-EMD05) — exigem OCR
- ⏳ Próxima fase: destilar os markdowns em páginas por assunto (taxonomia v1 pronta)

## Uso

O cérebro serve: (1) construção do VORTEX — módulos consultam a página do assunto, nunca o RBAC inteiro; (2) consultoria aeronáutica — resposta rastreável com citação de norma/parágrafo.

## Regra de trabalho (Dr. Edilson)

A cada ordem concluída (baixar, extrair, destilar), enviar TODOS os arquivos para este repositório — nada fica só local. Se a memória falhar, o repositório é a fonte de verdade.
