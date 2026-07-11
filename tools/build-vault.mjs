#!/usr/bin/env node
/*
 * build-vault.mjs — 把「完整故事」的私密原文加密成 js/vault.js
 *
 * 用法：
 *   ACCESS_CODE="你的通關密語" node tools/build-vault.mjs
 *   （不給就用預設值 staycurious）
 *
 * 加密：PBKDF2(SHA-256, 150000 次) 由通關密語導出金鑰 → AES-GCM 256。
 * 每則故事各自帶隨機 salt(16) 與 iv(12)，輸出 base64(salt|iv|ciphertext)。
 * 通關密語會先 trim + 轉小寫，與前端 unlock.js 完全一致（大小寫不敏感）。
 *
 * 明文只存在 tools/plaintext.json（已被 .gitignore 排除），
 * repo 裡只會有加密後的 js/vault.js，因此沒有密語就讀不到完整故事。
 */
import { webcrypto as crypto } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ITERATIONS = 150000;
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const rawCode = process.env.ACCESS_CODE || 'staycurious';
const code = rawCode.trim().toLowerCase();

const plaintext = JSON.parse(
  readFileSync(join(root, 'tools/plaintext.json'), 'utf8')
).reveal;

const enc = new TextEncoder();

async function deriveKey(salt) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(code),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
}

async function encryptStory(paragraphs) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(salt);
  const data = enc.encode(JSON.stringify(paragraphs));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  );
  const blob = new Uint8Array(salt.length + iv.length + ct.length);
  blob.set(salt, 0);
  blob.set(iv, salt.length);
  blob.set(ct, salt.length + iv.length);
  return Buffer.from(blob).toString('base64');
}

const vault = {};
for (const [id, paragraphs] of Object.entries(plaintext)) {
  vault[id] = await encryptStory(paragraphs);
}

const out =
  '/*\n' +
  ' * vault.js — 完整故事的加密內容（由 tools/build-vault.mjs 產生，請勿手改）\n' +
  ' * 需要正確的通關密語才能在瀏覽器端解密（js/unlock.js）。\n' +
  ' */\n' +
  'window.VAULT_ITER = ' + ITERATIONS + ';\n' +
  'window.VAULT = ' + JSON.stringify(vault, null, 2) + ';\n';

writeFileSync(join(root, 'js/vault.js'), out);
console.log(
  `vault.js 產生完成：加密了 ${Object.keys(vault).length} 則故事（通關密語："${code}"）`
);
