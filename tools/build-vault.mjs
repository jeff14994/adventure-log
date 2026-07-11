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

// 付費（master）密語：解鎖全部。可用 ACCESS_CODE 覆寫。
const PAID = (process.env.ACCESS_CODE || 'staycurious').trim().toLowerCase();
// 免費試閱密語：公開、自動套用，只解鎖 FREE_IDS 這幾則當作鉤子。
const FREE = (process.env.FREE_CODE || 'adv-free-sample').trim().toLowerCase();
// 免費試閱的故事（引流用）。其餘全部需付費密語。
const FREE_IDS = ['az-snow-mountain', 'car-haggle-6000', 'vietnam-haggle-scratch'];

const plaintext = JSON.parse(
  readFileSync(join(root, 'tools/plaintext.json'), 'utf8')
).reveal;

const enc = new TextEncoder();

async function deriveKey(code, salt) {
  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode(code), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
  );
}

async function encryptStory(code, paragraphs) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(code, salt);
  const data = enc.encode(JSON.stringify(paragraphs));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data));
  const blob = new Uint8Array(salt.length + iv.length + ct.length);
  blob.set(salt, 0); blob.set(iv, salt.length); blob.set(ct, salt.length + iv.length);
  return Buffer.from(blob).toString('base64');
}

const vault = {};       // 全部：付費密語可解
const vaultFree = {};   // 免費試閱：公開密語可解
for (const [id, paragraphs] of Object.entries(plaintext)) {
  vault[id] = await encryptStory(PAID, paragraphs);
  if (FREE_IDS.includes(id)) vaultFree[id] = await encryptStory(FREE, paragraphs);
}

const out =
  '/*\n' +
  ' * vault.js — 完整故事加密內容（由 tools/build-vault.mjs 產生，請勿手改）。\n' +
  ' * VAULT：付費密語解全部；VAULT_FREE：公開密語自動解鎖免費試閱幾則。\n' +
  ' */\n' +
  'window.VAULT_ITER = ' + ITERATIONS + ';\n' +
  'window.FREE_CODE = ' + JSON.stringify(FREE) + ';\n' +
  'window.FREE_IDS = ' + JSON.stringify(FREE_IDS) + ';\n' +
  'window.VAULT = ' + JSON.stringify(vault, null, 2) + ';\n' +
  'window.VAULT_FREE = ' + JSON.stringify(vaultFree, null, 2) + ';\n';

writeFileSync(join(root, 'js/vault.js'), out);
console.log(
  `vault.js OK：${Object.keys(vault).length} 則（付費密語 "${PAID}"）；` +
  `免費試閱 ${Object.keys(vaultFree).length} 則（公開密語 "${FREE}"）`
);
