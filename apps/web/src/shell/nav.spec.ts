import { describe, expect, it } from "vitest";
import { appFromPath, childActive, groupsFor, modulesFor, pageTitle } from "./nav.ts";

describe("modulesFor", () => {
  it("admin sees configuracoes", () => {
    const paths = modulesFor(["ADMIN"], "rc").map((m) => m.to);
    expect(paths).toContain("/configuracoes");
    expect(paths).not.toContain("/recrutamento");
  });

  it("user rconta does not see admin menus", () => {
    const paths = modulesFor(["RCONTA"], "rc").map((m) => m.to);
    expect(paths).toContain("/pessoal");
    expect(paths).toContain("/profissional");
    expect(paths).not.toContain("/configuracoes");
    expect(paths).not.toContain("/ledger");
  });

  it("responsavel tecnico uses user menus", () => {
    const paths = modulesFor(["RCONTA", "RESPONSAVEL_TECNICO"], "rc").map((m) => m.to);
    expect(paths).not.toContain("/configuracoes");
    expect(paths).toContain("/empresarial");
  });
});

describe("groupsFor", () => {
  it("user pessoal has identity and contact submenus", () => {
    const pessoal = groupsFor(["RCONTA"], "rc").find((g) => g.id === "pessoal");
    expect(pessoal?.children?.map((c) => c.to)).toEqual(["/pessoal#identidade", "/pessoal#contato"]);
  });

  it("user documentos submenus include assinar and lgpd", () => {
    const docs = groupsFor(["RCONTA"], "rc").find((g) => g.id === "documentos");
    expect(docs?.children?.map((c) => c.to)).toEqual(["/documentos#acervo", "/assinar", "/verificar", "/lgpd"]);
  });

  it("user sees assinaturas and ppsp in rconta", () => {
    const paths = modulesFor(["RCONTA"], "rc").map((m) => m.to);
    expect(paths).toContain("/assinaturas");
    expect(paths).toContain("/ppsp");
  });

  it("rconta does not include recrutamento", () => {
    expect(groupsFor(["RCONTA"], "rc").some((g) => g.id === "recrutamento")).toBe(false);
    expect(groupsFor(["ADMIN"], "rc").some((g) => g.id === "recrutamento")).toBe(false);
  });
});

describe("appFromPath", () => {
  it("maps each prefix to its app", () => {
    expect(appFromPath("/")).toBe("rc");
    expect(appFromPath("/pessoal")).toBe("rc");
    expect(appFromPath("/cc/busca/nsn")).toBe("cc");
    expect(appFromPath("/rl/pedidos")).toBe("rl");
    expect(appFromPath("/rh/vagas")).toBe("rh");
    expect(appFromPath("/mr/oficina/reparos")).toBe("mr");
    expect(appFromPath("/op/frota")).toBe("op");
    expect(appFromPath("/tr/cursos")).toBe("tr");
    expect(appFromPath("/ap/pista/rwycc")).toBe("ap");
  });
});

describe("eight apps have distinct menus", () => {
  it("each app home is unique and has groups", () => {
    const homes = ["/", "/cc", "/rl", "/rh", "/mr", "/op", "/tr", "/ap"];
    const ids = ["rc", "cc", "rl", "rh", "mr", "op", "tr", "ap"] as const;
    ids.forEach((id, i) => {
      const groups = groupsFor(["ADMIN"], id);
      expect(groups.length).toBeGreaterThan(2);
      expect(groups[0].to).toBe(homes[i]);
    });
  });

  it("mr oficina has 12 etapa submenus", () => {
    const oficina = groupsFor(["RCONTA"], "mr").find((g) => g.id === "mr-oficina");
    expect(oficina?.children?.length).toBe(12);
  });

  it("rh app exposes vagas for any role", () => {
    const paths = modulesFor(["RCONTA"], "rh").map((m) => m.to);
    expect(paths).toContain("/rh");
    expect(paths).toContain("/rh/vagas");
  });
});

describe("childActive", () => {
  it("matches hash submenu only when hash is present", () => {
    expect(childActive("/pessoal#identidade", "/pessoal", "#identidade")).toBe(true);
    expect(childActive("/pessoal#contato", "/pessoal", "#identidade")).toBe(false);
    expect(childActive("/pessoal#identidade", "/pessoal", "")).toBe(false);
  });
});

describe("pageTitle", () => {
  it("uses communication and document child labels", () => {
    const groups = groupsFor(["ADMIN"], "rc");
    expect(pageTitle("/comunicacao/chat", groups)).toBe("Chat");
    expect(pageTitle("/assinar", groups)).toBe("Assinar");
    expect(pageTitle("/pessoal", groups)).toBe("Pessoal");
  });

  it("titles erp submenu dashboards", () => {
    const groups = groupsFor(["RCONTA"], "mr");
    expect(pageTitle("/mr/oficina/reparos", groups)).toBe("5 Reparos");
  });
});
