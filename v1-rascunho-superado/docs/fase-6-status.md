# VORTEX — Fase 6

ERP Operadores 91/119/121/135/137 (schema `ops`).

## Feito

- Migracao `0012_ops_rbac91_121_135_137.sql`: operador, aeronave, frota, MEL, DA, logbook, despacho, manuais, aeroagricola, dispersores + RLS
- Politica: MEL IS 91-012 (B=3d C=10d D=120d); DA prevalece; combustivel RBAC 135; repeso 36 meses; CVA 365d; PAADV; despacho bloqueia sem combustivel/MET/P&B/MEL/DA/CVA/repeso
- Logbook `draft -> signed`; despacho `RASCUNHO -> VALIDADO/BLOQUEADO -> LIBERADO` (liberado imutavel)
- Dispersor com calibracao vencida fica `CALIBRACAO_VENCIDA`
- Escritas geram ledger; operador/agri/despacho liberado geram protocolo
- UI no app OP: Dashboard, Frota, Operacoes/Despacho, MEL/DA, Diario, Aeroagricola 137, PPSP (reuso da pagina de PPSP)

## Nao feito

- Camada administrativa geral (RH/Financeiro/Contabilidade/Compras) do ERP — ainda stub
- CRM de fretamento/charters — stub
- Qualidade/SGSO, relatorios, config — stub
- ETOPS operacional alem do campo no operador
- Relatorios ANAC mensal/semestral, PSF/ROP/FOP, AOM 180d
- Endosso de instrutor e envio DBE no logbook
- CDAG 3 iteracoes detalhadas
