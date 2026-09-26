#!/usr/bin/env node
/**
 * Gera o par de chaves Ed25519 do ledger (Lei 14.063/2020).
 *
 * Uso:
 *   node tools/gen-ledger-key.mjs [diretorio]
 *
 * Escreve `ledger_ed25519.pem` (PKCS#8, privada, modo 0600) e
 * `ledger_ed25519.pub` (SPKI, publica) em `diretorio` (padrao `.secrets`).
 * Nao sobrescreve chaves existentes: rotacionar a chave invalida a verificacao
 * das assinaturas anteriores.
 */
import { generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve(process.argv[2] ?? '.secrets');
const privatePath = resolve(dir, 'ledger_ed25519.pem');
const publicPath = resolve(dir, 'ledger_ed25519.pub');

if (existsSync(privatePath) || existsSync(publicPath)) {
  console.error(`Chave ja existe em ${dir}. Nada foi sobrescrito.`);
  process.exitCode = 1;
} else {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  mkdirSync(dir, { recursive: true });
  writeFileSync(privatePath, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
  writeFileSync(publicPath, publicKey.export({ type: 'spki', format: 'pem' }));
  console.log(`Chave privada: ${privatePath}`);
  console.log(`Chave publica: ${publicPath}`);
}
