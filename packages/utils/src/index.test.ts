import { describe, expect, it } from "vitest";
import {
  computeCrc,
  formatProtocol,
  generateVerificationCode,
  isValidCnpj,
  isValidCpf,
  maskPersonalData,
  parseProtocol,
  sha256Hex,
} from "./index.ts";

describe("cpf/cnpj", () => {
  it("accepts a valid CPF", () => {
    expect(isValidCpf("52998224725")).toBe(true);
  });
  it("rejects repeated CPF", () => {
    expect(isValidCpf("00000000000")).toBe(false);
  });
  it("accepts a valid CNPJ", () => {
    expect(isValidCnpj("11222333000181")).toBe(true);
  });
});

describe("protocol", () => {
  it("formats AAAA-NNNNNN", () => {
    expect(formatProtocol(2026, 42)).toBe("2026-000042");
  });
  it("parses protocol", () => {
    expect(parseProtocol("2026-000042")).toEqual({ year: 2026, seq: 42 });
  });
});

describe("phase 3 crypto", () => {
  it("hashes utf8 to sha-256 hex", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("formats verification code VRTX-XXXX-XXXX", () => {
    expect(generateVerificationCode()).toMatch(/^VRTX-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it("computes deterministic 8-char crc", () => {
    const a = computeCrc("VRTX-AAAA-BBBB", "a".repeat(64), "user-1");
    const b = computeCrc("VRTX-AAAA-BBBB", "a".repeat(64), "user-1");
    expect(a).toBe(b);
    expect(a).toHaveLength(8);
  });

  it("masks cpf and cnpj", () => {
    expect(maskPersonalData("CPF 529.982.247-25 e CNPJ 11.222.333/0001-81")).toContain("***.***.***-**");
    expect(maskPersonalData("CPF 529.982.247-25 e CNPJ 11.222.333/0001-81")).toContain("**.***.***/****-**");
  });
});
