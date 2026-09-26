# VORTEX — Fase 5

ERP Manutencao 43/145 (schema `mro`).

## Feito

- Migracao `0011_mro_rbac43_145.sql`: OM, aeronave, OS, pecas, ferramentas, ADs, manuais, NDT imutavel + RLS
- OS em 12 etapas; avanco de 1 em 1; APRS/CRS so a partir da etapa 9
- SEGVOO marcado em GRANDE_REPARO e GRANDE_ALTERACAO
- Escritas geram ledger + protocolo
- UI no app MR: Dashboard, Oficina, Registros, Suprimentos, Biblioteca

## Nao feito

- Camada administrativa geral (RH/Financeiro/Contabilidade/Compras) do ERP — ainda stub
- CRM de servicos de manutencao — stub
- Qualidade/SGSO, relatorios, config — stub
- 12 etapas de shop-floor detalhadas (inspecao, NDT operacional, FORM 8130-3 estruturado)
- Publicacao de vagas do MRO no Recrutamento
- Importacoes e compras tecnicas alem do cadastro de peca/ferramenta
