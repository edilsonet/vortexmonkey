# VORTEX — Navegacao por aplicativo

Os icones RC CC RL RH MR OP TR AP da barra superior sao 8 aplicativos. Cada um troca sidebar, menus, submenus e o dashboard do submenu ativo.

Central de Comunicacao (chat, alertas, e-mails, comunicados, tema) permanece na barra em todos os apps.

## Rotas

| Codigo | App | Home | Fase de dominio |
|--------|-----|------|-----------------|
| RC | Rconta | `/` | 1-4 (paginas reais) |
| CC | Catalogo Central | `/cc` | 1 (arvore; busca/insercao ainda nucleo) |
| RL | RLoja | `/rl` | 8 (dominio real) |
| RH | Recrutamento | `/rh` | 1+4 (vagas/candidaturas reais; demais stub) |
| MR | ERP Manutencao | `/mr` | 5 (dominio real) |
| OP | ERP Operadores | `/op` | 6 (dominio real) |
| TR | ERP Cursos | `/tr` | 7 (dominio real) |
| AP | ERP Aerodromos | `/ap` | 7 (dominio real) |

Aliases `/apps/*` redirecionam para o home do app.

## Rconta (RC)

Dashboard · Pessoal · Profissional · Empresarial · Estoque · Documentos · Protocolo · Ledger (admin) · Assinaturas · PPSP · Personalizacao · Seguranca · Configuracoes (admin).

Recrutamento nao vive mais na Rconta.

## Demais apps

Ordem ERP: Dashboard → Comercial → RH → Financeiro → Contabilidade → Compras → setores de dominio → Qualidade/SGSO → Relatorios → Configuracao.

- CC: Busca, Insercao, Classificacao.
- RL: Vitrine, Pedidos, Comissoes 3%, Banners.
- RH: Vagas, Candidaturas, Curriculos.
- MR: Biblioteca Tecnica, Suprimentos, Setor de Registros, Oficina (12 etapas).
- OP: Operacoes, Frota, Manutencao, Aeroagricola, PPSP.
- TR: Cursos (unico que vende na RLoja), FSTD, Certificados <=10 dias, S141.
- AP: Pista RWYCC/RCR, SESCINC, Fauna/SIGRA, Infraestrutura, SGSO quadrimestral.

## Real vs stub

Reais: cadastro Rconta, documentos/assinatura/LGPD, ledger, protocolos, assinaturas, PPSP, alertas, vagas RH, MR oficina 43/145, OP frota/despacho/MEL/diario/137, TR cursos/FSTD/S141/certificados, AP pista/SESCINC/fauna/infra/SGSO, RL vitrine/pedidos/comissao 3%, chat/e-mail/comunicados, recuperar senha.

Stub (dashboard proprio, sem dominio): CC, CRM/admin dos ERPs.
