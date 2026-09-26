/**
 * Contexto de requisicao do VORTEX.
 *
 * Tenant e CONTEXTO, nunca dono do dado (regra 3). O contexto e derivado do
 * vinculo do usuario e injetado em `app.current_user_id`/`tenant`/`company`
 * para que o Row-Level Security do PostgreSQL filtre por linha.
 *
 * IMPORTANTE: hoje o contexto e montado a partir de cabecalhos
 * (`x-user-id`/`x-tenant-id`/`x-company-id`) apenas para desenvolvimento. O
 * `auth-service` (JWT + RBAC/ABAC) substitui essa origem; o tipo permanece.
 */
export interface RequestContext {
  readonly userId: string;
  readonly tenantId: string;
  readonly companyId?: string | null;
  readonly requestId?: string;
}
