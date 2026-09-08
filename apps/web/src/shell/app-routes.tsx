import type { ReactNode } from "react";
import { Route } from "react-router-dom";
import { AppDashboardPage } from "../pages/AppDashboardPage.tsx";
import { RecrutamentoPage } from "../pages/RecrutamentoPage.tsx";
import { mroElement } from "../pages/mro/MroPages.tsx";
import { opsElement } from "../pages/ops/OpsPages.tsx";
import { trainingElement } from "../pages/training/TrainingPages.tsx";
import { airportElement } from "../pages/airport/AirportPages.tsx";
import { rlojaElement } from "../pages/rloja/RlojaPages.tsx";
import { APP_DEFS, pathOf, type AppDef, type NavChild, type NavGroup } from "./nav.ts";

function dash(app: AppDef, group?: NavGroup, child?: NavChild) {
  return <AppDashboardPage app={app} group={group} child={child} />;
}

function uniquePaths(app: AppDef): { path: string; group?: NavGroup; child?: NavChild }[] {
  const seen = new Set<string>();
  const out: { path: string; group?: NavGroup; child?: NavChild }[] = [];
  const add = (path: string, group?: NavGroup, child?: NavChild) => {
    if (seen.has(path)) return;
    seen.add(path);
    out.push({ path, group, child });
  };
  for (const g of app.groups) {
    add(g.to, g);
    for (const c of g.children ?? []) {
      const p = pathOf(c.to);
      if (p.includes("#") || p === g.to) continue;
      add(p, g, c);
    }
  }
  if (!seen.has(app.home)) add(app.home);
  return out;
}

function elementFor(app: AppDef, path: string, group?: NavGroup, child?: NavChild) {
  if (app.id === "rh" && (path === "/rh/vagas" || path === "/rh/candidaturas")) {
    return <RecrutamentoPage />;
  }
  if (app.id === "mr") return mroElement(path, group, child);
  if (app.id === "op") return opsElement(path, group, child);
  if (app.id === "tr") return trainingElement(path, group, child);
  if (app.id === "ap") return airportElement(path, group, child);
  if (app.id === "rl") return rlojaElement(path, group, child);
  return dash(app, group, child);
}

export function stubAppRoutes(): ReactNode {
  return APP_DEFS.filter((a) => a.id !== "rc").flatMap((app) =>
    uniquePaths(app).map(({ path, group, child }) => (
      <Route key={path} path={path} element={elementFor(app, path, group, child)} />
    )),
  );
}
