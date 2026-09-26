import { readFileSync } from 'node:fs';

export const readSecret = (fileVariable: string, valueVariable?: string): string => {
  const path = process.env[fileVariable];
  if (path) return readFileSync(path, 'utf8').trim();
  if (valueVariable && process.env[valueVariable]) return process.env[valueVariable] as string;
  throw new Error(`Secret obrigatório ausente: ${fileVariable}`);
};

export const integerFromEnv = (name: string, fallback: number): number => {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed)) throw new Error(`Valor inteiro inválido em ${name}.`);
  return parsed;
};
