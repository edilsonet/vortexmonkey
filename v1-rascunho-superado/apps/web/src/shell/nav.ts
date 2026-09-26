export type AppId = "rc" | "cc" | "rl" | "rh" | "mr" | "op" | "tr" | "ap";

export type NavItem = { to: string; label: string; adminOnly?: boolean };

export type NavChild = { to: string; label: string; adminOnly?: boolean };

export type NavGroup = {
  id: string;
  label: string;
  to: string;
  exact?: boolean;
  adminOnly?: boolean;
  children?: NavChild[];
};

export type AppDef = {
  id: AppId;
  code: string;
  label: string;
  home: string;
  phase: string;
  note: string;
  groups: NavGroup[];
};

function layerAdmin(p: string, crm: [string, string, string]): NavGroup[] {
  return [
    {
      id: `${p}-comercial`,
      label: "Comercial",
      to: `${p}/comercial`,
      children: [
        { to: `${p}/comercial/pipeline`, label: crm[0] },
        { to: `${p}/comercial/propostas`, label: crm[1] },
        { to: `${p}/comercial/contratos`, label: crm[2] },
      ],
    },
    {
      id: `${p}-rh`,
      label: "RH",
      to: `${p}/rh`,
      children: [
        { to: `${p}/rh/colaboradores`, label: "Colaboradores" },
        { to: `${p}/rh/contratos`, label: "Contratos" },
        { to: `${p}/rh/escalas`, label: "Escalas" },
      ],
    },
    {
      id: `${p}-financeiro`,
      label: "Financeiro",
      to: `${p}/financeiro`,
      children: [
        { to: `${p}/financeiro/pagar`, label: "Contas a pagar" },
        { to: `${p}/financeiro/receber`, label: "Contas a receber" },
        { to: `${p}/financeiro/caixa`, label: "Fluxo de caixa" },
      ],
    },
    {
      id: `${p}-contabilidade`,
      label: "Contabilidade",
      to: `${p}/contabilidade`,
      children: [
        { to: `${p}/contabilidade/diario`, label: "Diario" },
        { to: `${p}/contabilidade/dre`, label: "DRE" },
        { to: `${p}/contabilidade/fechamento`, label: "Fechamento" },
      ],
    },
    {
      id: `${p}-compras`,
      label: "Compras",
      to: `${p}/compras`,
      children: [
        { to: `${p}/compras/pedidos`, label: "Pedidos" },
        { to: `${p}/compras/cotacoes`, label: "Cotacoes" },
        { to: `${p}/compras/recebimento`, label: "Recebimento" },
      ],
    },
  ];
}

function layerClose(p: string): NavGroup[] {
  return [
    {
      id: `${p}-qualidade`,
      label: "Qualidade / SGSO",
      to: `${p}/qualidade`,
      children: [
        { to: `${p}/qualidade/sgso`, label: "SGSO" },
        { to: `${p}/qualidade/ncs`, label: "Nao conformidades" },
        { to: `${p}/qualidade/auditorias`, label: "Auditorias" },
      ],
    },
    {
      id: `${p}-relatorios`,
      label: "Relatorios",
      to: `${p}/relatorios`,
      children: [
        { to: `${p}/relatorios/operacionais`, label: "Operacionais" },
        { to: `${p}/relatorios/regulatorios`, label: "Regulatorios" },
      ],
    },
    {
      id: `${p}-config`,
      label: "Configuracao",
      to: `${p}/config`,
      children: [
        { to: `${p}/config/empresa`, label: "Empresa" },
        { to: `${p}/config/permissoes`, label: "Permissoes" },
      ],
    },
  ];
}

const RC_GROUPS: NavGroup[] = [
  { id: "dashboard", label: "Dashboard", to: "/", exact: true },
  {
    id: "pessoal",
    label: "Pessoal",
    to: "/pessoal",
    children: [
      { to: "/pessoal#identidade", label: "Identidade" },
      { to: "/pessoal#contato", label: "Contato" },
    ],
  },
  {
    id: "profissional",
    label: "Profissional",
    to: "/profissional",
    children: [
      { to: "/profissional#perfil", label: "Perfil" },
      { to: "/profissional#civ", label: "CIV" },
      { to: "/profissional#cma", label: "CMA" },
      { to: "/profissional#experiencia", label: "Experiencia" },
    ],
  },
  {
    id: "empresarial",
    label: "Empresarial",
    to: "/empresarial",
    children: [
      { to: "/empresarial#cadastro", label: "Cadastro" },
      { to: "/empresarial#vinculos", label: "Vinculos" },
    ],
  },
  {
    id: "estoque",
    label: "Estoque",
    to: "/estoque",
    children: [
      { to: "/estoque#pessoal", label: "Pessoal" },
      { to: "/estoque#empresarial", label: "Empresarial" },
    ],
  },
  {
    id: "documentos",
    label: "Documentos",
    to: "/documentos",
    children: [
      { to: "/documentos#acervo", label: "Acervo" },
      { to: "/assinar", label: "Assinar" },
      { to: "/verificar", label: "Verificar" },
      { to: "/lgpd", label: "LGPD" },
    ],
  },
  { id: "protocolo", label: "Protocolo", to: "/protocolos" },
  { id: "ledger", label: "Ledger", to: "/ledger", adminOnly: true },
  {
    id: "assinaturas",
    label: "Assinaturas",
    to: "/assinaturas",
    children: [
      { to: "/assinaturas#produtos", label: "Produtos" },
      { to: "/assinaturas#minhas", label: "Minhas" },
      { to: "/assinaturas#comissoes", label: "Comissoes 3%" },
    ],
  },
  {
    id: "ppsp",
    label: "PPSP",
    to: "/ppsp",
    children: [
      { to: "/ppsp#programa", label: "Programa / ARSO" },
      { to: "/ppsp#exame", label: "Toxicologico" },
      { to: "/ppsp#sorteio", label: "Sorteio 25%" },
    ],
  },
  { id: "personalizacao", label: "Personalizacao", to: "/personalizacao" },
  {
    id: "seguranca",
    label: "Seguranca",
    to: "/seguranca",
    children: [
      { to: "/seguranca#sessao", label: "Sessao" },
      { to: "/seguranca#senha", label: "Alterar senha" },
    ],
  },
  { id: "configuracoes", label: "Configuracoes", to: "/configuracoes", adminOnly: true },
];

export const APP_DEFS: AppDef[] = [
  {
    id: "rc",
    code: "RC",
    label: "Rconta",
    home: "/",
    phase: "1-4",
    note: "Nucleo: 7 modulos + 2 menus. Paginas reais.",
    groups: RC_GROUPS,
  },
  {
    id: "cc",
    code: "CC",
    label: "Catalogo Central",
    home: "/cc",
    phase: "1",
    note: "Catalogo unico (insercao/busca). Nao e vendido.",
    groups: [
      { id: "cc-dashboard", label: "Dashboard", to: "/cc", exact: true },
      {
        id: "cc-busca",
        label: "Busca",
        to: "/cc/busca",
        children: [
          { to: "/cc/busca/itens", label: "Itens" },
          { to: "/cc/busca/nsn", label: "NSN" },
          { to: "/cc/busca/pn", label: "Part number" },
        ],
      },
      {
        id: "cc-insercao",
        label: "Insercao",
        to: "/cc/insercao",
        children: [
          { to: "/cc/insercao/novo", label: "Novo item" },
          { to: "/cc/insercao/rascunhos", label: "Rascunhos" },
        ],
      },
      {
        id: "cc-classificacao",
        label: "Classificacao",
        to: "/cc/classificacao",
        children: [
          { to: "/cc/classificacao/categorias", label: "Categorias" },
          { to: "/cc/classificacao/ata", label: "ATA" },
        ],
      },
    ],
  },
  {
    id: "rl",
    code: "RL",
    label: "RLoja",
    home: "/rl",
    phase: "8",
    note: "Marketplace B2B. Comissao 3% do vendedor. Comprador isento.",
    groups: [
      { id: "rl-dashboard", label: "Dashboard", to: "/rl", exact: true },
      {
        id: "rl-vitrine",
        label: "Vitrine",
        to: "/rl/vitrine",
        children: [
          { to: "/rl/vitrine/anuncios", label: "Anuncios" },
          { to: "/rl/vitrine/categorias", label: "Categorias" },
        ],
      },
      {
        id: "rl-pedidos",
        label: "Pedidos",
        to: "/rl/pedidos",
        children: [
          { to: "/rl/pedidos/abertos", label: "Abertos" },
          { to: "/rl/pedidos/faturados", label: "Faturados" },
        ],
      },
      {
        id: "rl-comissoes",
        label: "Comissoes",
        to: "/rl/comissoes",
        children: [
          { to: "/rl/comissoes/politica", label: "Politica 3%" },
          { to: "/rl/comissoes/extrato", label: "Extrato" },
        ],
      },
      {
        id: "rl-banners",
        label: "Banners",
        to: "/rl/banners",
        children: [
          { to: "/rl/banners/ativos", label: "Ativos" },
          { to: "/rl/banners/rconta", label: "Rconta gratis" },
        ],
      },
    ],
  },
  {
    id: "rh",
    code: "RH",
    label: "Recrutamento",
    home: "/rh",
    phase: "1+4",
    note: "Agregador de vagas (ERPs) + curriculos (Rconta). Comissao 3% na contratacao.",
    groups: [
      { id: "rh-dashboard", label: "Dashboard", to: "/rh", exact: true },
      {
        id: "rh-vagas",
        label: "Vagas",
        to: "/rh/vagas",
        children: [
          { to: "/rh/vagas/abertas", label: "Abertas" },
          { to: "/rh/vagas/encerradas", label: "Encerradas" },
        ],
      },
      {
        id: "rh-candidaturas",
        label: "Candidaturas",
        to: "/rh/candidaturas",
        children: [
          { to: "/rh/candidaturas/pipeline", label: "Pipeline" },
          { to: "/rh/candidaturas/contratacoes", label: "Contratacoes" },
        ],
      },
      {
        id: "rh-curriculos",
        label: "Curriculos",
        to: "/rh/curriculos",
        children: [
          { to: "/rh/curriculos/busca", label: "Busca Rconta" },
          { to: "/rh/curriculos/civ", label: "Filtro CIV/CMA" },
        ],
      },
    ],
  },
  {
    id: "mr",
    code: "MR",
    label: "ERP Manutencao",
    home: "/mr",
    phase: "5",
    note: "Oficina 43/145. OM, aeronave, OS 12 etapas, pecas, ferramentas, ADs.",
    groups: [
      { id: "mr-dashboard", label: "Dashboard", to: "/mr", exact: true },
      ...layerAdmin("/mr", ["Servicos", "Propostas", "OS comerciais"]),
      {
        id: "mr-biblioteca",
        label: "Biblioteca Tecnica",
        to: "/mr/biblioteca",
        children: [
          { to: "/mr/biblioteca/manuais", label: "Manuais" },
          { to: "/mr/biblioteca/ads", label: "ADs" },
          { to: "/mr/biblioteca/boletins", label: "Boletins" },
        ],
      },
      {
        id: "mr-suprimentos",
        label: "Suprimentos",
        to: "/mr/suprimentos",
        children: [
          { to: "/mr/suprimentos/ferramentaria", label: "Ferramentaria" },
          { to: "/mr/suprimentos/estoque", label: "Estoque tecnico" },
          { to: "/mr/suprimentos/compras", label: "Compras" },
          { to: "/mr/suprimentos/importacoes", label: "Importacoes" },
        ],
      },
      {
        id: "mr-registros",
        label: "Setor de Registros",
        to: "/mr/registros",
        children: [
          { to: "/mr/registros/os", label: "OS" },
          { to: "/mr/registros/form8130", label: "FORM 8130-3" },
          { to: "/mr/registros/segvoo", label: "SEGVOO 001" },
        ],
      },
      {
        id: "mr-oficina",
        label: "Oficina",
        to: "/mr/oficina",
        children: [
          { to: "/mr/oficina/recebimento", label: "1 Recebimento" },
          { to: "/mr/oficina/inspecao", label: "2 Inspecao inicial" },
          { to: "/mr/oficina/planejamento", label: "3 Planejamento" },
          { to: "/mr/oficina/desmontagem", label: "4 Desmontagem" },
          { to: "/mr/oficina/reparos", label: "5 Reparos" },
          { to: "/mr/oficina/montagem", label: "6 Montagem" },
          { to: "/mr/oficina/testes", label: "7 Testes" },
          { to: "/mr/oficina/inspecao-final", label: "8 Inspecao final" },
          { to: "/mr/oficina/documentacao", label: "9 APRS/CRS" },
          { to: "/mr/oficina/liberacao", label: "10 Liberacao" },
          { to: "/mr/oficina/entrega", label: "11 Entrega" },
          { to: "/mr/oficina/pos", label: "12 Pos-entrega" },
        ],
      },
      ...layerClose("/mr"),
    ],
  },
  {
    id: "op",
    code: "OP",
    label: "ERP Operadores",
    home: "/op",
    phase: "6",
    note: "91/119/121/135/137. Operacoes + Manutencao.",
    groups: [
      { id: "op-dashboard", label: "Dashboard", to: "/op", exact: true },
      ...layerAdmin("/op", ["Fretamento", "Charters", "Contratos"]),
      {
        id: "op-operacoes",
        label: "Operacoes",
        to: "/op/operacoes",
        children: [
          { to: "/op/operacoes/despacho", label: "Despacho" },
          { to: "/op/operacoes/combustivel", label: "Combustivel" },
          { to: "/op/operacoes/met", label: "MET" },
          { to: "/op/operacoes/pb", label: "Peso e balanceamento" },
          { to: "/op/operacoes/tripulacao", label: "Tripulacao" },
        ],
      },
      {
        id: "op-frota",
        label: "Frota",
        to: "/op/frota",
        children: [
          { to: "/op/frota/aeronaves", label: "Aeronaves" },
          { to: "/op/frota/repeso", label: "Repeso 36 meses" },
        ],
      },
      {
        id: "op-manutencao",
        label: "Manutencao",
        to: "/op/manutencao",
        children: [
          { to: "/op/manutencao/diario", label: "Diario tecnico" },
          { to: "/op/manutencao/mel", label: "MEL" },
          { to: "/op/manutencao/da", label: "DA/FCDA" },
        ],
      },
      {
        id: "op-aeroagricola",
        label: "Aeroagricola",
        to: "/op/aeroagricola",
        children: [
          { to: "/op/aeroagricola/137", label: "RBAC 137" },
          { to: "/op/aeroagricola/aplicacao", label: "Aplicacao" },
        ],
      },
      {
        id: "op-ppsp",
        label: "PPSP",
        to: "/op/ppsp",
        children: [
          { to: "/op/ppsp/arso", label: "ARSO" },
          { to: "/op/ppsp/tox", label: "Toxicologico 90d" },
        ],
      },
      ...layerClose("/op"),
    ],
  },
  {
    id: "tr",
    code: "TR",
    label: "ERP Cursos",
    home: "/tr",
    phase: "7",
    note: "141/142/145-010. Unico que cria e vende cursos na RLoja.",
    groups: [
      { id: "tr-dashboard", label: "Dashboard", to: "/tr", exact: true },
      ...layerAdmin("/tr", ["Matriculas", "Turmas", "Contratos"]),
      {
        id: "tr-cursos",
        label: "Cursos e Treinamentos",
        to: "/tr/cursos",
        children: [
          { to: "/tr/cursos/catalogo", label: "Catalogo" },
          { to: "/tr/cursos/turmas", label: "Turmas" },
          { to: "/tr/cursos/rloja", label: "Venda RLoja" },
        ],
      },
      {
        id: "tr-fstd",
        label: "FSTD",
        to: "/tr/fstd",
        children: [
          { to: "/tr/fstd/dispositivos", label: "Dispositivos" },
          { to: "/tr/fstd/sessoes", label: "Sessoes" },
        ],
      },
      {
        id: "tr-certificados",
        label: "Certificados",
        to: "/tr/certificados",
        children: [
          { to: "/tr/certificados/emissao", label: "Emissao <=10 dias" },
          { to: "/tr/certificados/acervo", label: "Acervo" },
        ],
      },
      {
        id: "tr-s141",
        label: "S141",
        to: "/tr/s141",
        children: [
          { to: "/tr/s141/programa", label: "Programa" },
          { to: "/tr/s141/cht", label: "CHT" },
        ],
      },
      ...layerClose("/tr"),
    ],
  },
  {
    id: "ap",
    code: "AP",
    label: "ERP Aerodromos",
    home: "/ap",
    phase: "7",
    note: "RBAC 153. Pista, SESCINC, fauna/SIGRA, SGSO.",
    groups: [
      { id: "ap-dashboard", label: "Dashboard", to: "/ap", exact: true },
      ...layerAdmin("/ap", ["Contratos", "Espacos", "Pipeline"]),
      {
        id: "ap-pista",
        label: "Pista",
        to: "/ap/pista",
        children: [
          { to: "/ap/pista/rwycc", label: "RWYCC" },
          { to: "/ap/pista/rcr", label: "RCR" },
          { to: "/ap/pista/pcn", label: "PCN/IRI" },
        ],
      },
      {
        id: "ap-sescinc",
        label: "SESCINC",
        to: "/ap/sescinc",
        children: [
          { to: "/ap/sescinc/resposta", label: "Resposta <=3 min" },
          { to: "/ap/sescinc/meios", label: "Meios" },
        ],
      },
      {
        id: "ap-fauna",
        label: "Fauna",
        to: "/ap/fauna",
        children: [
          { to: "/ap/fauna/sigra", label: "SIGRA" },
          { to: "/ap/fauna/eventos", label: "Eventos" },
        ],
      },
      {
        id: "ap-infra",
        label: "Infraestrutura",
        to: "/ap/infra",
        children: [
          { to: "/ap/infra/areas", label: "Areas" },
          { to: "/ap/infra/manutencao", label: "Manutencao 8 areas" },
        ],
      },
      {
        id: "ap-sgso",
        label: "SGSO",
        to: "/ap/sgso",
        children: [
          { to: "/ap/sgso/quadrimestral", label: "Quadrimestral" },
          { to: "/ap/sgso/ocorrencias", label: "Ocorrencias" },
        ],
      },
      ...layerClose("/ap"),
    ],
  },
];

export const APPS: AppDef[] = APP_DEFS;

export const COMM_ITEMS = [
  { id: "chat", label: "Chat", to: "/comunicacao/chat" },
  { id: "alertas", label: "Alertas", to: "/comunicacao/alertas" },
  { id: "emails", label: "E-mails", to: "/comunicacao/emails" },
  { id: "comunicados", label: "Comunicados", to: "/comunicacao/comunicados" },
] as const;

const ADMIN_ROLES = new Set<string>(["ADMIN", "REPRESENTANTE_LEGAL"]);
const APP_KEY = "vortex.app";
const PREFIX: [string, AppId][] = [
  ["/cc", "cc"],
  ["/rl", "rl"],
  ["/rh", "rh"],
  ["/recrutamento", "rh"],
  ["/mr", "mr"],
  ["/op", "op"],
  ["/tr", "tr"],
  ["/ap", "ap"],
];

export function isAdminRole(roles: readonly string[]): boolean {
  return roles.some((r) => ADMIN_ROLES.has(r));
}

const RC_APP = APP_DEFS.find((a) => a.id === "rc")!;

export function appById(id: AppId): AppDef {
  return APP_DEFS.find((a) => a.id === id) ?? RC_APP;
}

export function persistApp(id: AppId): void {
  try {
    localStorage.setItem(APP_KEY, id);
  } catch {
    /* ignore */
  }
}

export function storedApp(): AppId {
  try {
    const v = localStorage.getItem(APP_KEY);
    if (APP_DEFS.some((a) => a.id === v)) return v as AppId;
  } catch {
    /* ignore */
  }
  return "rc";
}

export function appFromPath(pathname: string): AppId {
  if (pathname.startsWith("/comunicacao")) return storedApp();
  for (const [prefix, id] of PREFIX) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return id;
  }
  return "rc";
}

function filterGroups(groups: NavGroup[], admin: boolean): NavGroup[] {
  return groups
    .filter((g) => admin || !g.adminOnly)
    .map((g) => ({
      ...g,
      children: g.children?.filter((c) => admin || !c.adminOnly),
    }));
}

export function groupsFor(roles: readonly string[], appId: AppId = "rc"): NavGroup[] {
  return filterGroups(appById(appId).groups, isAdminRole(roles));
}

export function modulesFor(roles: readonly string[], appId: AppId = "rc"): NavItem[] {
  return groupsFor(roles, appId).map((g) => ({ to: g.to, label: g.label, adminOnly: g.adminOnly }));
}

export function pathOf(to: string): string {
  const i = to.indexOf("#");
  return i === -1 ? to : to.slice(0, i);
}

export function groupMatches(group: NavGroup, pathname: string): boolean {
  if (group.exact || group.to === "/") return pathname === group.to;
  if (pathname === group.to) return true;
  if (pathname.startsWith(`${group.to}/`)) return true;
  return (group.children ?? []).some((c) => {
    const p = pathOf(c.to);
    return pathname === p || pathname.startsWith(`${p}/`);
  });
}

export function childActive(to: string, pathname: string, hash: string): boolean {
  const path = pathOf(to);
  const hashPart = to.split("#")[1];
  const h = hashPart ? `#${hashPart}` : "";
  if (h) return pathname === path && hash === h;
  return pathname === path;
}

export function appTarget(app: AppDef): string {
  return app.home;
}

export function locate(pathname: string, groups: NavGroup[]): { group?: NavGroup; child?: NavChild } {
  for (const g of groups) {
    const child = (g.children ?? []).find((c) => pathOf(c.to) === pathname);
    if (child) return { group: g, child };
    if (groupMatches(g, pathname)) return { group: g };
  }
  return {};
}

export function pageTitle(pathname: string, groups: NavGroup[]): string {
  const comm = COMM_ITEMS.find((c) => c.to === pathname);
  if (comm) return comm.label;
  const { group, child } = locate(pathname, groups);
  if (child) return child.label;
  if (group) return group.label;
  const app = APP_DEFS.find((a) => a.home === pathname);
  return app?.label ?? "VORTEX";
}

export const NAV_GROUPS = RC_GROUPS;
