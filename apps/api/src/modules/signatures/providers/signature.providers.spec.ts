import { describe, expect, it } from "vitest";
import { SimpleProvider, GovBrProvider, IcpBrasilProvider } from "./signature.providers.ts";

const base = {
  documentId: "doc-1",
  documentHash: "a".repeat(64),
  signerUserId: "user-1",
  credential: "senha-secreta-123",
};

describe("SimpleProvider", () => {
  it("returns SENHA without leaking credential", async () => {
    const result = await new SimpleProvider().sign({ ...base, providerCode: "SIMPLE" });
    expect(result.method).toBe("SENHA");
    expect(JSON.stringify(result)).not.toContain("senha-secreta-123");
  });
});

describe("GovBrProvider", () => {
  it("accepts 6-digit totp", async () => {
    const result = await new GovBrProvider().sign({ ...base, providerCode: "GOVBR", credential: "123456" });
    expect(result.method).toBe("GOVBR_2FA");
  });

  it("rejects invalid totp", async () => {
    await expect(new GovBrProvider().sign({ ...base, providerCode: "GOVBR", credential: "ABCDEF" })).rejects.toThrow();
  });
});

describe("IcpBrasilProvider", () => {
  it("rejects invalid pem", async () => {
    await expect(
      new IcpBrasilProvider("ICP_SERPRO").sign({ ...base, providerCode: "ICP_SERPRO", credential: "NAO_E_UM_PEM" }),
    ).rejects.toThrow();
  });

  it("accepts structural pem", async () => {
    const pem = "-----BEGIN CERTIFICATE-----\nMIICpDCCAYwCCQDU\n-----END CERTIFICATE-----";
    const result = await new IcpBrasilProvider("ICP_SERPRO").sign({ ...base, providerCode: "ICP_SERPRO", credential: pem });
    expect(result.method).toMatch(/CERTIFICADO_A[13]/);
    expect(result.certificateSerial).toBeTruthy();
  });
});
