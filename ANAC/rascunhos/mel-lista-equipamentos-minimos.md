# MEL — Lista de Equipamentos Mínimos

> **Assunto**: operação com equipamentos inoperantes; elaboração e aprovação de MEL; MMEL
> **Fontes**: IS 91-012 · IS 21.61-005 · RBAC 91 §91.213 · RBAC 121/135
> **Última destilação**: 12/09/2026 · **Status**: ✅ verificada contra o texto das normas

## 1. Hierarquia normativa

- **MMEL** (Master MEL): emitido pela ANAC por tipo/modelo de aeronave — base para a MEL do operador.
- **MEL**: elaborada pelo **operador** a partir do MMEL, aprovada pela ANAC — permite operar com equipamentos inoperantes **dentro de limites e procedimentos**.
- **Sem MEL aprovada**: aplica-se **§91.213(d)** — operação só se o equipamento inoperante não estiver listado como obrigatório e a desinoperância não for exigida pelo tipo de operação (avaliação caso a caso pelo piloto, com placar INOPERANTE e registro).

## 2. Regras centrais (IS 91-012)

- A MEL **não autoriza** voar com equipamento inoperante sem os **procedimentos (O) e (M)** especificados.
- **Procedimento (O)**: executado pela **tripulação** (operacional). **Procedimento (M)**: executado pela **manutenção**.
- **Categoria de reparo** (prazo máximo para corrigir): A (conforme MMEL), B (3 dias), C (10 dias), D (120 dias) — contados a partir da **descoberta** da inoperância.
- **Placar "INOPERANTE"** nos controles/instrumentos afetados (§43.11(b) RBAC 43).
- **Registro**: anotação no registro de manutenção + item na lista de discrepâncias.
- A MEL do operador deve ser **idêntica ao MMEL** no que não for mais restritiva; pode ser **mais restritiva** (limitar prazos, retirar itens).

## 3. Aplicabilidade por tipo de operação

- **RBAC 91**: MEL opcional — sem MEL, usa §91.213(d).
- **RBAC 121/135**: MEL **obrigatória** para operar com inoperância (programa de aeronavegabilidade continuada).
- **RAB**: aeronave experimental/agrícola segue regras próprias — MEL não se aplica da mesma forma.

## 4. Pontos de atenção para sistemas (VORTEX)

- **MEL como entidade versionada** por operador e aeronave, com itens, prazos (categorias A–D) e procedimentos (O/M).
- **Relógio de categoria de reparo** inicia na descoberta da inoperância → o sistema deve registrar a **data/hora da descoberta** e alertar o vencimento (N0–N3).
- Integração com **manutenção**: item MEL vencido = aeronave não aeronavegável → bloqueia APRS.
- Integração com **Publicações**: o MMEL/fabricante é dado técnico licenciado — recorte consumido pela tarefa.
- Placar físico "INOPERANTE" + registro digital simultâneos (§43.11(b)).

---
### Fontes citadas
- IS 91-012 (MEL) — *acervo: is/is-91-012*
- IS 21.61-005 (MMEL) — *acervo: is/is-21-61-005*
- RBAC 91: §91.213 — *acervo: rbac/rbac-91*
