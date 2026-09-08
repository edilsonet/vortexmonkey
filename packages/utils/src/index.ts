import { createHash, randomBytes } from "node:crypto";

export const ok = <T>(data: T) => ({ success: true as const, data, error: null });
export const fail = (code: string, message: string, details?: unknown) => ({
  success: false as const,
  data: null,
  error: { code, message, details },
});

export const onlyDigits = (value: string): string => value.replace(/\D/g, "");

export const isValidCpf = (raw: string): boolean => {
  const cpf = onlyDigits(raw);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (base: number) => {
    let sum = 0;
    for (let i = 0; i < base; i += 1) sum += Number(cpf[i]) * (base + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
};

export const isValidCnpj = (raw: string): boolean => {
  const cnpj = onlyDigits(raw);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (len: number) => {
    const weights = len === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + Number(cnpj[i]) * w, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
};

export const formatProtocol = (year: number, seq: number): string =>
  `${year}-${String(seq).padStart(6, "0")}`;

export const parseProtocol = (value: string): { year: number; seq: number } | null => {
  const match = /^(\d{4})-(\d{6})$/.exec(value);
  if (!match) return null;
  return { year: Number(match[1]), seq: Number(match[2]) };
};

export const sha256Hex = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");

export const generateVerificationCode = (): string => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
  return `VRTX-${chars.slice(0, 4)}-${chars.slice(4, 8)}`;
};

export const computeCrc = (code: string, documentHash: string, signerId: string): string =>
  sha256Hex(`${code}|${documentHash}|${signerId}`).slice(0, 8).toUpperCase();

export const maskPersonalData = (value: string): string =>
  value
    .replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, "***.***.***-**")
    .replace(/\d{11}/g, "***.***.***-**")
    .replace(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g, "**.***.***/****-**")
    .replace(/\d{14}/g, "**.***.***/****-**");
