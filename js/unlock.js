/*
 * unlock.js — 用通關密語解鎖「完整故事」（瀏覽器端 AES-GCM 解密）
 *
 * 密文放在 window.VAULT（js/vault.js）；只有正確的通關密語能解出內容。
 * 通關密語會 trim + 轉小寫（與 tools/build-vault.mjs 一致，大小寫不敏感）。
 * 解鎖成功後把密語存進 sessionStorage，整趟造訪其他故事自動解鎖。
 */
window.Unlock = (function () {
  const ITER = window.VAULT_ITER || 150000;
  const KEY = 'adv-unlock-code';
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const norm = (s) => (s || '').trim().toLowerCase();

  function b64ToBytes(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function deriveKey(code, salt) {
    const baseKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(code),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
  }

  async function decryptBlob(blob, code) {
    const bytes = b64ToBytes(blob);
    const salt = bytes.slice(0, 16);
    const iv = bytes.slice(16, 28);
    const ct = bytes.slice(28);
    const key = await deriveKey(norm(code), salt);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return JSON.parse(dec.decode(plain)); // 段落陣列
  }

  // 解某則故事：先試付費 vault，再試免費試閱 vault。都失敗才 throw。
  async function decryptStory(id, rawCode) {
    const paid = (window.VAULT || {})[id];
    const free = (window.VAULT_FREE || {})[id];
    if (paid) { try { return await decryptBlob(paid, rawCode); } catch (e) {} }
    if (free) { try { return await decryptBlob(free, rawCode); } catch (e) {} }
    throw new Error('locked');
  }

  const isFree = (id) => (window.FREE_IDS || []).includes(id);
  const freeCode = () => window.FREE_CODE || '';
  const savedCode = () => sessionStorage.getItem(KEY);
  const rememberCode = (code) => sessionStorage.setItem(KEY, norm(code));

  // 用 Gumroad 購買序號向 Worker 換取付費密語（防外流自動化）。
  // 成功回傳 passphrase 字串；失敗 throw。
  async function verifyLicense(key) {
    const url = (window.ADV_CONFIG || {}).licenseVerifyUrl;
    if (!url) throw new Error('no-verify-url');
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key: String(key).trim() }),
    });
    const data = await r.json().catch(() => ({}));
    if (!data.ok || !data.passphrase) throw new Error(data.error || 'invalid');
    return data.passphrase;
  }

  return { decryptStory, savedCode, rememberCode, norm, isFree, freeCode, verifyLicense };
})();
