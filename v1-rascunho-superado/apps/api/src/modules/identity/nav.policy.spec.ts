import { describe, expect, it } from "vitest";

const ADMIN = new Set(["ADMIN", "REPRESENTANTE_LEGAL"]);
const ITEMS = [
  { to: "/pessoal", adminOnly: false },
  { to: "/empresarial", adminOnly: false },
  { to: "/configuracoes", adminOnly: true },
  { to: "/recrutamento", adminOnly: true },
  { to: "/ledger", adminOnly: true },
];

const modulesFor = (roles: string[]) => {
  const admin = roles.some((r) => ADMIN.has(r));
  return ITEMS.filter((i) => admin || !i.adminOnly).map((i) => i.to);
};

describe("user vs admin menus", () => {
  it("admin sees configuracoes", () => {
    expect(modulesFor(["ADMIN"])).toContain("/configuracoes");
  });

  it("rconta user does not see admin menus", () => {
    const paths = modulesFor(["RCONTA"]);
    expect(paths).toContain("/pessoal");
    expect(paths).not.toContain("/configuracoes");
    expect(paths).not.toContain("/ledger");
  });

  it("responsavel tecnico uses user menus", () => {
    const paths = modulesFor(["RCONTA", "RESPONSAVEL_TECNICO"]);
    expect(paths).toContain("/empresarial");
    expect(paths).not.toContain("/configuracoes");
  });
});
