import { describe, expect, it } from "vitest";
import pg from "pg";

const url = process.env.DATABASE_URL ?? "postgres://vortex:vortex_dev_password@localhost:5432/vortex";

describe("RLS", () => {
  it("usuario sem vinculo nao le linhas de outro tenant", async () => {
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL ROLE vortex_app");
      await client.query("SELECT set_config('app.person_id', '', true), set_config('app.tenant_id', '', true)");
      const denied = await client.query("SELECT count(*)::int AS n FROM identity.people");
      expect(denied.rows[0]?.n).toBe(0);
      await client.query("ROLLBACK");

      await client.query("BEGIN");
      await client.query("SET LOCAL ROLE vortex_app");
      await client.query(
        "SELECT set_config('app.person_id', $1, true), set_config('app.tenant_id', $2, true)",
        ["22222222-2222-4222-8222-222222222222", "11111111-1111-4111-8111-111111111111"],
      );
      const allowed = await client.query("SELECT count(*)::int AS n FROM identity.people");
      expect(allowed.rows[0]?.n).toBeGreaterThan(0);
      await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  });
});
