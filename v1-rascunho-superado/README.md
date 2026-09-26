# v1-rascunho-superado — rascunho v1 preservado

Este diretorio guarda, **como texto**, os arquivos do rascunho v1 do VORTEX que
nao existiam mais na arvore do workspace v4. Eles saem do historico do Git e
passam a viver no proprio repositorio, para consulta de dominio sem depender de
`git checkout` de commits antigos.

## Origem

- Repositorio: `edilsonet/vortexmonkey`
- Commit: `ed19136` ("feat: fase 8 RLoja, comunicacao, BRE e recuperacao de
  senha"), o ultimo da `main` v1 antes da promocao do v4.
- Escopo: os **216 arquivos** daquele commit cujo caminho nao existe no
  workspace v4 (de 242 no total). O restante ja esta coberto pelo v4 em outro
  caminho ou pelo proprio runtime atual.
- Conteudo copiado byte a byte do blob original (conferido por hash SHA-1 do
  Git, sem divergencias).

## O que tem aqui

- `apps/api` — API do rascunho v1 (NestJS) com modulos de dominio que o v4
  ainda nao portou: `billing`, `market`, `communication`, `bre`, `ppsp`,
  `training`, `operators`, `aerodromes`, `recruitment`, `signatures`, `stock`,
  `documents`, `professional`, `protocol`, `ledger`, `identity`, `auth`,
  `alerts`, `compliance`, `mro`, `health`.
- `apps/web` — frontend do rascunho v1 (React + Vite), incluindo paginas,
  shell e UI proprios.
- `packages/{config,database,types,utils}` — pacotes do monorepo Turborepo v1.
- `docs/fase-*-status.md` e `docs/10-navegacao-por-app.md` — status por fase e
  a arvore de navegacao por app.
- `infra/`, `turbo.json` — infraestrutura e configuracao do Turborepo.

## Status

**Superseded.** Isto e rascunho: nao compila, nao tem testes executados e nao
faz parte do workspace Nx. A stack do v1 (React + Vite + Turborepo) e diferente
da stack imutavel do v4 (Angular + Nx + NestJS). Use apenas como fonte de
dominio e referencia de regras; o codigo que vale e o de `apps/` e `libs/` na
raiz.

A pasta esta em `.nxignore`, portanto o Nx nao a inclui no grafo, no cache nem
nos alvos de `build`, `lint`, `typecheck` ou `test`.
