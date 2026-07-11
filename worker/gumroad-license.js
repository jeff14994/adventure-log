/*
 * Cloudflare Worker — Gumroad 購買序號驗證（防止密語外流的自動化）
 *
 * 為什麼需要它：純前端無法「防外流」——解密祕密一定會出現在網頁原始碼。
 * 這個 Worker 把祕密（付費密語）藏在伺服器端，只有「持有效 Gumroad 序號」
 * 的買家驗證通過後才拿得到。部署在 Cloudflare 免費方案即可，近乎零成本。
 *
 * 部署步驟：
 *   1. Cloudflare Dashboard → Workers → 建立 Worker，貼上本檔內容。
 *   2. Settings → Variables 設定（Encrypt 建議打開）：
 *        GUMROAD_PRODUCT_ID  你的 Gumroad 產品 ID（產品頁 → Advanced 可查）
 *        PAID_PASSPHRASE     付費密語（目前是 staycurious；賣之前請換掉）
 *        ALLOW_ORIGIN        https://jeff14994.github.io（你的網站來源）
 *        MAX_USES            （選填）每組序號最多驗證次數，例如 3，防止分享
 *   3. 部署後取得 Worker 網址，填進 js/config.js 的 licenseVerifyUrl。
 *
 * Gumroad 產品要開啟「Generate a unique license key per sale」。
 */
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOW_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST')
      return json({ ok: false, error: 'method' }, 405, cors);

    let key = '';
    try { key = (await request.json()).license_key || ''; } catch (e) {}
    key = String(key).trim();
    if (!key) return json({ ok: false, error: 'no-key' }, 400, cors);

    // 向 Gumroad 驗證序號。
    const body = new URLSearchParams({
      product_id: env.GUMROAD_PRODUCT_ID || '',
      license_key: key,
      increment_uses_count: 'true',
    });
    let data;
    try {
      const r = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      data = await r.json();
    } catch (e) {
      return json({ ok: false, error: 'gumroad-unreachable' }, 502, cors);
    }

    if (!data || !data.success)
      return json({ ok: false, error: 'invalid' }, 200, cors);

    // 退款／取消訂閱的買家擋掉。
    const p = data.purchase || {};
    if (p.refunded || p.chargebacked || p.subscription_cancelled_at)
      return json({ ok: false, error: 'revoked' }, 200, cors);

    // 選填：限制每組序號驗證次數，降低外流。
    const max = parseInt(env.MAX_USES || '0', 10);
    if (max > 0 && typeof data.uses === 'number' && data.uses > max)
      return json({ ok: false, error: 'too-many-uses' }, 200, cors);

    // 驗證通過 → 釋出付費密語。
    return json({ ok: true, passphrase: env.PAID_PASSPHRASE || '' }, 200, cors);
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
