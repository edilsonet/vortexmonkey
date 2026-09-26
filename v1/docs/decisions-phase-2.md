# Decisões arquiteturais — Fase 2

## ADR-201 — Ponteiro transacional da cadeia

**Decisão.** Usar `ledger.chain_heads` com uma linha por tenant, advisory lock e `SELECT ... FOR UPDATE`.

**Motivo.** O teste concorrente demonstrou que ordenar pelo `now()` da transação permite bifurcações: o PostgreSQL mantém o mesmo valor de `now()` durante toda a transação. O ponteiro explícito torna o último hash uma decisão transacional, e `clock_timestamp()` preserva a hora real da inserção.

## ADR-202 — Verificação pela relação de hashes

**Decisão.** Remontar a cadeia a partir do hash zero e exigir um único sucessor por hash.

**Motivo.** A ordem física ou temporal não é uma propriedade criptográfica. O algoritmo detecta bifurcações e blocos desconectados mesmo quando a consulta retorna linhas fora de ordem.

## ADR-203 — Agendamento da verificação

| Opção | Vantagem | Limitação |
|---|---|---|
| Cron no monólito NestJS | Simples, observável e sem componente adicional | Exige instância única ou trava em escala horizontal |
| Cron do sistema na VPS | Independente do processo da API | Operação fora do código e deploy menos autocontido |
| BullMQ/worker dedicado | Retry distribuído e escala | Custo operacional desnecessário nesta fase |

**Decisão.** Usar `@nestjs/schedule` diariamente às 02:00 UTC. A arquitetura atual prevê uma instância do monólito na VPS. Em escala horizontal, introduzir liderança ou trava distribuída.

## ADR-204 — Protocolo no PostgreSQL

**Decisão.** Gerar `AAAA-NNNNNN` em função transacional com upsert na sequência anual.

**Motivo.** O PostgreSQL já oferece serialização e durabilidade. Redis não é fonte adequada para numeração oficial.

## ADR-205 — Prova Merkle exportável

**Decisão.** Exportar JSON com raiz, assinatura Ed25519, chave pública e prova por folha.

**Motivo.** O artefato pode ser verificado fora do VORTEX. Carimbo de tempo externo e ICP-Brasil permanecem na fase documental seguinte.

## ADR-206 — Pesquisa pública mínima

**Decisão.** Expor apenas número, assunto, tipo de entidade e data para processos públicos sem dado pessoal.

**Motivo.** A função `SECURITY DEFINER` evita depender de um usuário fictício e reduz a superfície de vazamento.
