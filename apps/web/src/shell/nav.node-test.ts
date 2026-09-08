import assert from "node:assert/strict";
import test from "node:test";
import { appFromPath, groupsFor, modulesFor } from "./nav.ts";

test("admin sees configuracoes and not recrutamento in rconta", () => {
  const paths = modulesFor(["ADMIN"], "rc").map((m) => m.to);
  assert.ok(paths.includes("/configuracoes"));
  assert.ok(!paths.includes("/recrutamento"));
});

test("user rconta does not see admin menus", () => {
  const paths = modulesFor(["RCONTA"], "rc").map((m) => m.to);
  assert.ok(paths.includes("/pessoal"));
  assert.ok(!paths.includes("/configuracoes"));
  assert.ok(!paths.includes("/ledger"));
});

test("responsavel tecnico uses user menus", () => {
  const paths = modulesFor(["RCONTA", "RESPONSAVEL_TECNICO"], "rc").map((m) => m.to);
  assert.ok(!paths.includes("/configuracoes"));
  assert.ok(paths.includes("/empresarial"));
});

test("pessoal exposes identity and contact submenus", () => {
  const pessoal = groupsFor(["RCONTA"], "rc").find((g) => g.id === "pessoal");
  assert.deepEqual(pessoal?.children?.map((c) => c.to), ["/pessoal#identidade", "/pessoal#contato"]);
});

test("user sees billing and ppsp menus", () => {
  const paths = modulesFor(["RCONTA"], "rc").map((m) => m.to);
  assert.ok(paths.includes("/assinaturas"));
  assert.ok(paths.includes("/ppsp"));
});

test("each launcher prefix maps to a distinct app", () => {
  assert.equal(appFromPath("/"), "rc");
  assert.equal(appFromPath("/cc"), "cc");
  assert.equal(appFromPath("/rl/vitrine"), "rl");
  assert.equal(appFromPath("/rh/vagas"), "rh");
  assert.equal(appFromPath("/mr/oficina"), "mr");
  assert.equal(appFromPath("/op/operacoes"), "op");
  assert.equal(appFromPath("/tr/cursos"), "tr");
  assert.equal(appFromPath("/ap/pista"), "ap");
});

test("erp manutencao oficina has 12 etapas", () => {
  const oficina = groupsFor(["RCONTA"], "mr").find((g) => g.id === "mr-oficina");
  assert.equal(oficina?.children?.length, 12);
});
