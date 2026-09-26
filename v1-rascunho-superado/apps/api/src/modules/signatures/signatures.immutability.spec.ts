import { describe, expect, it } from "vitest";
import pg from "pg";

const url = process.env.DATABASE_URL ?? "postgres://vortex:vortex_dev_password@localhost:5432/vortex";

async function insertFixture(client: pg.Client): Promise<string> {
  const doc = await client.query<{ id: string }>(
    `INSERT INTO documents.documents(
       tenant_id, name, mime_type, size_bytes, hash, storage_key, classification,
       contains_personal_data, created_by
     ) VALUES (
       '11111111-1111-4111-8111-111111111111', 'immut.md', 'text/markdown', 12,
       'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
       'test/immut', 'RESTRICTED', false, '22222222-2222-4222-8222-222222222222'
     ) RETURNING id`,
  );
  const sig = await client.query<{ id: string }>(
    `INSERT INTO signatures.signatures(
       document_id, document_hash, signer_person_id, tenant_id, signature_level,
       provider_code, method, verification_code, crc_code
     ) VALUES (
       $1, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
       '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111',
       'SIMPLE', 'SIMPLE', 'SENHA', $2, 'DEADBEEF'
     ) RETURNING id`,
    [doc.rows[0]!.id, `VRTX-TEST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`],
  );
  return sig.rows[0]!.id;
}

describe("signatures immutability", () => {
  it("blocks UPDATE on signatures.signatures", async () => {
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    try {
      await client.query("BEGIN");
      const id = await insertFixture(client);
      await expect(client.query("UPDATE signatures.signatures SET method = method WHERE id = $1", [id])).rejects.toThrow(
        /SIGNATURES_IMMUTABLE/,
      );
      await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  });

  it("blocks DELETE on signatures.signatures", async () => {
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    try {
      await client.query("BEGIN");
      const id = await insertFixture(client);
      await expect(client.query("DELETE FROM signatures.signatures WHERE id = $1", [id])).rejects.toThrow(/SIGNATURES_IMMUTABLE/);
      await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  });
});
