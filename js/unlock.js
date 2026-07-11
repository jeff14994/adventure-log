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

  // 解出某則故事的完整段落；密語錯誤會 throw。
  async function decryptStory(id, rawCode) {
    const vault = window.VAULT || {};
    const blob = vault[id];
    if (!blob) throw new Error('no-vault');
    const bytes = b64ToBytes(blob);
    const salt = bytes.slice(0, 16);
    const iv = bytes.slice(16, 28);
    const ct = bytes.slice(28);
    const key = await deriveKey(norm(rawCode), salt);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return JSON.parse(dec.decode(plain)); // 段落陣列
  }

  const savedCode = () => sessionStorage.getItem(KEY);
  const rememberCode = (code) => sessionStorage.setItem(KEY, norm(code));

  return { decryptStory, savedCode, rememberCode, norm };
})();
