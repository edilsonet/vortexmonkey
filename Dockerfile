# syntax=docker/dockerfile:1
#
# VORTEX v4 — imagem do `ops-mro` (ERP Manutencao 43/145).
# Multi-stage: dependencias -> build Nx -> runtime minimo.
#
# O runtime e auto-contido: recebe `dist/apps/ops-mro` ja com `node_modules`
# de producao (gerado por `ops-mro:prune` + `pnpm install --prod`), os arquivos
# de `migrations/` e os runners `tools/migrate.mjs` e `tools/seed-dev.mjs`.
# A API aplica as migracoes no boot (idempotente por `schema_migrations`).

# Imagem glibc (slim, Debian): o pnpm 10.x distribui binario nativo `@pnpm/exe`
# para linux-x64-gnu, mas NAO para musl — Alpine falha com
# ERR_PNPM_PNPM_ENGINE_NO_NATIVE_BINARY.
ARG NODE_VERSION=22-slim
ARG PNPM_VERSION=10.34.5

# ---------------------------------------------------------------- deps ----
FROM node:${NODE_VERSION} AS deps
RUN npm install -g pnpm@${PNPM_VERSION} && pnpm --version
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/ops-mro/package.json apps/ops-mro/
COPY libs/shared-dto/package.json libs/shared-dto/
COPY libs/util-aeronautics/package.json libs/util-aeronautics/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# --------------------------------------------------------------- build ----
FROM deps AS build
ENV NX_DAEMON=false
ENV CI=true
COPY nx.json tsconfig.base.json ./
COPY apps ./apps
COPY libs ./libs
RUN pnpm nx build ops-mro --skip-nx-cache
# Gera package.json/pnpm-lock.yaml podados e instala SO as deps de runtime.
RUN pnpm nx run ops-mro:prune --skip-nx-cache
WORKDIR /workspace/dist/apps/ops-mro
RUN CI=true pnpm install --prod --ignore-workspace --frozen-lockfile

# ------------------------------------------------------------- runtime ----
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /workspace/dist/apps/ops-mro ./
COPY migrations ./migrations
COPY tools/migrate.mjs tools/seed-dev.mjs ./tools/
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh && mkdir -p /app/.data

EXPOSE 3400
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3400)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "main.js"]
