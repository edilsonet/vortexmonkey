import { describe, expect, it } from "vitest";
import { createHash, generateKeyPairSync, sign, verify } from "node:crypto";

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`)
    .join(",")}}`;
};

describe("ledger hashing", () => {
  it("chains sha-256 and ed25519", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const material = "GENESIS|PERSON|abc|INSERT|{}";
    const hash = createHash("sha256").update(material).digest("hex");
    const signature = sign(null, Buffer.from(hash), privateKey);
    expect(verify(null, Buffer.from(hash), publicKey, signature)).toBe(true);
    expect(hash).toHaveLength(64);
  });

  it("canonicalizes json key order", () => {
    const a = stableStringify({ b: 1, a: 2 });
    const b = stableStringify({ a: 2, b: 1 });
    expect(a).toBe(b);
    expect(createHash("sha256").update(a).digest("hex")).toBe(createHash("sha256").update(b).digest("hex"));
  });
});
