# MEL — Lista de Equipamentos Mínimos e equipamentos inoperantes

> **Assunto**: elaboração, aprovação, revisão e utilização da MEL; operação sem MEL pelo §91.213(d)
> **Fontes principais**: RBAC 91 §91.213 e §91.405 · IS 91-012-1
> **Fontes Markdown**: `artifacts/cerebro-anac/markdown/rbac/rbac-91.md`, `artifacts/cerebro-anac/markdown/is/is-91-012-1.md`
> **Última revisão**: 12/09/2026 · **Status**: rascunho v1

## 1. Conceitos fundamentais

A **MEL (Minimum Equipment List)** é a lista específica do operador que permite operar determinada aeronave com certos equipamentos ou instrumentos inoperantes, sob condições e limitações controladas.

A **MMEL (Master Minimum Equipment List)** é a referência aprovada para o modelo de aeronave. A MEL do operador não pode ser menos restritiva que a MMEL, o RBAC aplicável, as políticas MEL da ANAC ou as limitações de aeronavegabilidade (**IS 91-012-1 §§5.1.2.1–5.1.2.3**).

A MEL aprovada para um operador constitui, para efeitos legais, certificado suplementar de tipo da aeronave (**RBAC 91 §91.213(a)(2)**).

## 2. Requisitos para operar com MEL

Só é permitido decolar com equipamento/instrumento inoperante mediante todos estes controles (**RBAC 91 §91.213(a)**): existe MEL a bordo; MEL desenvolvida pelo operador e aprovada pela ANAC; MEL preparada dentro das limitações; procedimentos e métodos definidos; livro de manutenção informando o piloto; e operação sob todas as condições da MEL.

A MEL é específica para o operador e para a aeronave ou conjunto abrangido pela mesma MMEL, considerando configuração, alterações e operação do próprio operador (**IS §§5.1.2.4–5.1.2.4.1**).

## 3. Itens que não podem ser relaxados

Não podem ser incluídos na MEL (**RBAC 91 §91.213(b); IS §5.1.2.3.1**): itens essenciais à operação segura sob todas as condições de certificação; itens exigidos por DA ou equivalente; itens exigidos pelo RBAC para a operação específica; e itens que a MMEL não permita liberar inoperantes.

Itens requeridos para operação noturna, IFR, RVSM, PBN, ETOPS, sobre água ou outra operação autorizada devem permanecer operativos quando aquela operação estiver sendo realizada. DA não pode ser contrariada por MEL.

## 4. Conteúdo mínimo da MEL

A MEL deve conter página de rosto, aprovação, sumário, registro de revisões, lista de páginas efetivas, controle de aplicabilidade, itens por ATA, quantidade instalada e requerida para despacho, categoria de reparo, condições/limitações, procedimentos O/M quando exigidos e referências técnicas atualizadas (**IS §5.1.1.1**).

Para MEL de frota, o operador identifica configurações, alterações e quantidades instaladas. A responsabilidade pela quantidade instalada é do operador (**IS §§5.1.2.4.3 e 5.1.2.5.4.2**).

## 5. Categorias de reparo

As categorias devem ser iguais ou mais restritivas que as da MMEL (**IS §5.1.2.5.3**): A = prazo específico; B = até 3 dias calendáricos/72h; C = até 10 dias/240h; D = até 120 dias/2.880h. O dia da descoberta é excluído. O intervalo é limite máximo, não autorização para postergar reparo quando houver oportunidade anterior.

## 6. Procedimentos O e M

Procedimento **O** é operacional, normalmente executado pela tripulação, e deve ser cumprido no planejamento/operação. Procedimento **M** é de manutenção e deve ser concluído antes da operação prosseguir. Ambos devem ser desenvolvidos pelo operador a partir da MMEL e publicações técnicas vigentes; a responsabilidade continua sendo do operador (**IS §§5.1.2.6–5.1.2.6.2**).

## 7. Descoberta, despacho e ACR

Item identificado como inoperante entre o início da movimentação/liberação e a aplicação de potência deve ser tratado na MEL (**IS §4.1.5**). Registrar dia de descoberta, item/ATA, aeronave/configuração, categoria, prazo, O/M, limitações, ordem/livro de manutenção, data-limite e responsável.

A **ACR (Ação Corretiva Retardada)** só existe quando o retardamento é permitido pela MEL; não é autorização genérica para manter defeito sem prazo ou procedimento.

## 8. Revisão e configuração

Revisar a MEL por nova MMEL, mudança regulatória, nova operação/autorização, alteração de configuração, instalação de item adicional ou mudança que afete o conteúdo (**IS §§5.2.2–5.2.2.3**). A revisão deve ser submetida nos prazos aplicáveis; a aprovação anterior pode ser revogada após a publicação de MMEL que exija atualização.

Alterações devem ser identificadas e refletidas nas cópias impressas e digitais. Após aprovação, atualizar cópias a bordo, no solo, para manutenção e em EFB. Usar apenas a revisão aprovada mais recente, salvo transição autorizada. A MEL deixa de valer para aeronave que muda de operador, salvo regra específica.

## 9. Operação sem MEL — RBAC 91 §91.213(d)

Sem MEL aprovada, o item não pode ser requerido para VFR diurno pela certificação, listado como requerido no manual de voo/AOM/KOEL, requerido pelo §91.205/outro RBAC ou exigido operativo por DA.

Deve ser removido e placardado com registro RBAC 43, ou desativado e rotulado “inoperante” com manutenção registrada quando aplicável; e um piloto habilitado ou pessoa de manutenção qualificada deve determinar que não há risco (**§91.213(d)**).

A aeronave é considerada apropriadamente modificada (**§91.213(d)-I**). O proprietário/operador deve providenciar reparo, substituição, remoção ou inspeção na próxima inspeção e manter a placa (**§91.405(c)–(d)**).

## 10. Modelo de dados para o VORTEX

### `maintenance.mel_documents`
- operador; aeronave/matrícula/SN ou frota; modelo/MMEL; revisão/aprovação; status; configurações/operações; cópia/hash; eventos do ledger.

### `maintenance.mel_items`
- ATA/item; quantidades instalada e requerida; aplicabilidade; categoria A/B/C/D/NO_GO; prazo; O/M; limitações; referências; MMEL/DA/políticas.

### `maintenance.deferred_items`
- item; aeronave/voo; descoberta/data-limite; categoria/ACR; O/M; placar/desativação/remoção; livro; liberação; encerramento; assinatura/ledger.

### `operations.dispatch_mel_checks`
- voo/aeronave; revisão vigente; itens; operação; limitações; DA; O/M; LIBERADO/BLOQUEADO; motivos/responsável.

## 11. Pontos de atenção para sistemas (VORTEX)

- MMEL não é autorização direta: é necessária MEL aprovada e específica.
- MEL não pode ser menos restritiva que MMEL, RBAC, DA ou política ANAC.
- Item exigido pela operação planejada deve ser validado contra o tipo de voo.
- O/M precisam ser concluídos e evidenciados antes da liberação.
- Categoria de reparo é prazo máximo; reparar na primeira oportunidade.
- Livro de manutenção e placar/desativação devem ser conciliados.
- Sem MEL, aplicar estritamente o §91.213(d).
- Revisão de MMEL, operação ou configuração deve disparar análise da MEL.
- Mudanças criam novos eventos e nunca sobrescrevem aprovação, configuração ou despacho anterior.
- DA e MEL devem ser reconciliadas: item requerido por DA não pode ser relaxado.

---
### Fontes citadas
- RBAC 91 — `artifacts/cerebro-anac/markdown/rbac/rbac-91.md`
- IS 91-012-1 — `artifacts/cerebro-anac/markdown/is/is-91-012-1.md`
