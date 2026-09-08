import pg from "pg";
import { createHash, randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);

const TENANT = "11111111-1111-4111-8111-111111111111";
const EDILSON = "22222222-2222-4222-8222-222222222222";
const VORTEX_CO = "33333333-3333-4333-8333-333333333333";
const PEREIRA = "44444444-4444-4444-8444-444444444444";
const PEMA = "55555555-5555-4555-8555-555555555555";

export async function seed(databaseUrl = process.env.DATABASE_URL): Promise<void> {
  if (!databaseUrl) throw new Error("DATABASE_URL ausente");
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const salt = randomBytes(16).toString("hex");
    const hash = ((await scrypt("Vortex@123", salt, 64)) as Buffer).toString("hex");
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO identity.tenants(id, name, slug, status)
       VALUES ($1, 'Organizacao VORTEX', 'vortex', 'ACTIVE')
       ON CONFLICT (id) DO NOTHING`,
      [TENANT],
    );

    await client.query(
      `INSERT INTO identity.people(id, cpf, full_name, email, phone, birth_date, professional_email, professional_phone, tenant_id)
       VALUES ($1, '52998224725', 'Edilson Alves Rocha Junior', 'edilsonet@gmail.com', '5562984689607',
               '1988-05-26', 'edilson@rocha.eng.br', '5599991792219', $2)
       ON CONFLICT (id) DO UPDATE SET
         full_name = EXCLUDED.full_name, email = EXCLUDED.email, phone = EXCLUDED.phone,
         birth_date = EXCLUDED.birth_date, professional_email = EXCLUDED.professional_email,
         professional_phone = EXCLUDED.professional_phone`,
      [EDILSON, TENANT],
    );

    await client.query(
      `INSERT INTO oauth.credentials(person_id, email, password_hash, salt)
       VALUES ($1, 'edilsonet@gmail.com', $2, $3)
       ON CONFLICT (person_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, salt = EXCLUDED.salt`,
      [EDILSON, hash, salt],
    );

    await client.query(
      `INSERT INTO identity.companies(id, cnpj, corporate_name, trade_name, tenant_id)
       VALUES ($1, '11222333000181', 'VORTEX Aviacao LTDA', 'VORTEX', $2)
       ON CONFLICT (id) DO NOTHING`,
      [VORTEX_CO, TENANT],
    );

    await client.query(
      `INSERT INTO identity.tenant_members(tenant_id, person_id, role, status)
       VALUES ($1, $2, 'ADMIN', 'ACTIVE')
       ON CONFLICT (tenant_id, person_id) DO UPDATE SET role = 'ADMIN', status = 'ACTIVE'`,
      [TENANT, EDILSON],
    );

    await client.query(
      `INSERT INTO identity.relationships(tenant_id, person_id, company_id, role, person_confirmed, company_confirmed, status, created_by)
       VALUES ($1, $2, $3, 'REPRESENTANTE_LEGAL', true, true, 'ACTIVE', $2)
       ON CONFLICT (tenant_id, person_id, company_id, role) DO UPDATE SET status = 'ACTIVE', person_confirmed = true, company_confirmed = true`,
      [TENANT, EDILSON, VORTEX_CO],
    );

    await upsertAddress(client, {
      personId: EDILSON,
      kind: "PERSONAL",
      street: "Rua Sergipe",
      number: "145",
      neighborhood: "Setor Urias Magalhaes",
      city: "Goiania",
      state: "Goias",
      country: "Brasil",
      cep: "74565220",
    });
    await upsertAddress(client, {
      personId: EDILSON,
      kind: "PROFESSIONAL",
      street: "Rua Sergipe",
      number: "145",
      neighborhood: "Setor Urias Magalhaes",
      city: "Goiania",
      state: "Goias",
      country: "Brasil",
      cep: "74565220",
    });

    await client.query(
      `INSERT INTO identity.people(id, cpf, full_name, email, phone, professional_email, professional_phone, tenant_id)
       VALUES ($1, '39053344705', 'Augusto Silvio Pereira', 'ctm@grupopema.com.br', '559499131264',
               'pema@grupoepema.com.br', '559434341233', $2)
       ON CONFLICT (id) DO UPDATE SET
         full_name = EXCLUDED.full_name, email = EXCLUDED.email, phone = EXCLUDED.phone,
         professional_email = EXCLUDED.professional_email, professional_phone = EXCLUDED.professional_phone`,
      [PEREIRA, TENANT],
    );

    const pereiraSalt = randomBytes(16).toString("hex");
    const pereiraHash = ((await scrypt("Vortex@123", pereiraSalt, 64)) as Buffer).toString("hex");
    await client.query(
      `INSERT INTO oauth.credentials(person_id, email, password_hash, salt)
       VALUES ($1, 'ctm@grupopema.com.br', $2, $3)
       ON CONFLICT (person_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, salt = EXCLUDED.salt`,
      [PEREIRA, pereiraHash, pereiraSalt],
    );

    await client.query(
      `INSERT INTO identity.companies(id, cnpj, corporate_name, trade_name, tenant_id)
       VALUES ($1, '04622892000113', 'PEMA - PEREIRA MARCELO TAXI AEREO LTDA', 'PEMA TAXI AERO', $2)
       ON CONFLICT (id) DO UPDATE SET corporate_name = EXCLUDED.corporate_name, trade_name = EXCLUDED.trade_name, cnpj = EXCLUDED.cnpj`,
      [PEMA, TENANT],
    );

    await client.query(
      `INSERT INTO identity.tenant_members(tenant_id, person_id, role, status)
       VALUES ($1, $2, 'RCONTA', 'ACTIVE')
       ON CONFLICT (tenant_id, person_id) DO UPDATE SET role = 'RCONTA', status = 'ACTIVE'`,
      [TENANT, PEREIRA],
    );

    await client.query(
      `INSERT INTO identity.relationships(tenant_id, person_id, company_id, role, person_confirmed, company_confirmed, status, created_by)
       VALUES ($1, $2, $3, 'RESPONSAVEL_TECNICO', true, true, 'ACTIVE', $2)
       ON CONFLICT (tenant_id, person_id, company_id, role) DO UPDATE SET status = 'ACTIVE', person_confirmed = true, company_confirmed = true`,
      [TENANT, PEREIRA, PEMA],
    );

    await upsertAddress(client, {
      personId: PEREIRA,
      kind: "PERSONAL",
      street: "Rodovia PA 279 S/N KM 152",
      number: "S/N",
      neighborhood: "Aeroporto",
      city: "Ourilandia do Norte",
      state: "Para",
      country: "Brasil",
      cep: "68390000",
    });
    await upsertAddress(client, {
      personId: PEREIRA,
      kind: "PROFESSIONAL",
      street: "Rodovia PA 279 S/N KM 152",
      number: "S/N",
      neighborhood: "Aeroporto",
      city: "Ourilandia do Norte",
      state: "Para",
      country: "Brasil",
      cep: "68390000",
    });
    await upsertAddress(client, {
      companyId: PEMA,
      kind: "COMPANY",
      street: "Rodovia PA 279 S/N KM 152",
      number: "S/N",
      neighborhood: "Aeroporto",
      city: "Ourilandia do Norte",
      state: "Para",
      country: "Brasil",
      cep: "68390000",
    });

    await client.query(
      `INSERT INTO identity.field_validations(person_id, field_name, level, source)
       SELECT $1, x.field, 'N1', 'sistema' FROM (VALUES ('cpf'),('email')) AS x(field)
       WHERE NOT EXISTS (
         SELECT 1 FROM identity.field_validations fv WHERE fv.person_id = $1 AND fv.field_name = x.field
       )`,
      [EDILSON],
    );
    await client.query(
      `INSERT INTO identity.field_validations(person_id, field_name, level, source)
       SELECT $1, x.field, 'N1', 'sistema' FROM (VALUES ('cpf'),('email')) AS x(field)
       WHERE NOT EXISTS (
         SELECT 1 FROM identity.field_validations fv WHERE fv.person_id = $1 AND fv.field_name = x.field
       )`,
      [PEREIRA],
    );

    await client.query(
      `INSERT INTO professional.profiles(person_id, professional_type, status, summary)
       VALUES ($1, 'OUTRO', 'ACTIVE', 'Administrador da plataforma VORTEX')
       ON CONFLICT (person_id) DO NOTHING`,
      [EDILSON],
    );
    await client.query(
      `INSERT INTO professional.profiles(person_id, professional_type, status, summary)
       VALUES ($1, 'OUTRO', 'ACTIVE', 'Responsavel tecnico PEMA Taxi Aereo')
       ON CONFLICT (person_id) DO NOTHING`,
      [PEREIRA],
    );

    await client.query(
      `INSERT INTO stock.holdings(tenant_id, kind, owner_person_id, origin_mark)
       SELECT $1, 'PERSONAL', $2, 'PERSONAL'
       WHERE NOT EXISTS (SELECT 1 FROM stock.holdings WHERE owner_person_id = $2 AND kind = 'PERSONAL')`,
      [TENANT, EDILSON],
    );
    await client.query(
      `INSERT INTO stock.holdings(tenant_id, kind, owner_person_id, origin_mark)
       SELECT $1, 'PERSONAL', $2, 'PERSONAL'
       WHERE NOT EXISTS (SELECT 1 FROM stock.holdings WHERE owner_person_id = $2 AND kind = 'PERSONAL')`,
      [TENANT, PEREIRA],
    );
    await client.query(
      `INSERT INTO stock.holdings(tenant_id, kind, owner_company_id, origin_mark)
       SELECT $1, 'COMPANY', $2, 'COMPANY'
       WHERE NOT EXISTS (SELECT 1 FROM stock.holdings WHERE owner_company_id = $2 AND kind = 'COMPANY')`,
      [TENANT, PEMA],
    );

    await client.query("COMMIT");
    process.stdout.write("seed applied\n");
    process.stdout.write("admin: edilsonet@gmail.com / Vortex@123\n");
    process.stdout.write("user:  ctm@grupopema.com.br / Vortex@123 (RT PEMA)\n");
    process.stdout.write(`checksum=${createHash("sha256").update(EDILSON + PEREIRA + PEMA).digest("hex").slice(0, 8)}\n`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

async function upsertAddress(
  client: pg.Client,
  input: {
    personId?: string;
    companyId?: string;
    kind: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    country: string;
    cep: string;
  },
): Promise<void> {
  const updated = await client.query(
    `UPDATE identity.addresses
     SET street = $4, number = $5, neighborhood = $6, city = $7, state = $8, country = $9, cep = $10
     WHERE kind = $3
       AND coalesce(person_id::text,'') = coalesce($1,'')
       AND coalesce(company_id::text,'') = coalesce($2,'')`,
    [
      input.personId ?? "",
      input.companyId ?? "",
      input.kind,
      input.street,
      input.number,
      input.neighborhood,
      input.city,
      input.state,
      input.country,
      input.cep,
    ],
  );
  if ((updated.rowCount ?? 0) > 0) return;
  await client.query(
    `INSERT INTO identity.addresses(person_id, company_id, kind, street, number, neighborhood, city, state, country, cep)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      input.personId ?? null,
      input.companyId ?? null,
      input.kind,
      input.street,
      input.number,
      input.neighborhood,
      input.city,
      input.state,
      input.country,
      input.cep,
    ],
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
