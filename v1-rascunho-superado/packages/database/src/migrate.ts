import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");

export async function migrate(databaseUrl = process.env.DATABASE_URL): Promise<void> {
  if (!databaseUrl) throw new Error("DATABASE_URL ausente");
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS public.schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      const applied = await client.query("SELECT 1 FROM public.schema_migrations WHERE id = $1", [file]);
      if (applied.rowCount) continue;
      const sql = await readFile(path.join(dir, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO public.schema_migrations(id) VALUES ($1)", [file]);
        await client.query("COMMIT");
        process.stdout.write(`applied ${file}\n`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
