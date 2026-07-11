/*
 * 內文頁邏輯：依網址的 ?id= 找到對應故事並渲染，
 * 右上角用 d3 畫一張聚焦該事件地點的小地圖。
 */

(function () {
  const stories = window.STORIES || [];
  const CATEGORIES = window.CATEGORIES || {};

  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const story = stories.find((s) => s.id === id) || stories[0];

  const root = document.getElementById('story-root');
  if (!story) {
    root.innerHTML = '<p class="story-missing">找不到這則故事。<a href="index.html">回首頁</a></p>';
    return;
  }

  document.title = `${story.title} — 驚險人生`;

  const cat = CATEGORIES[story.category] || { label: '其他', color: '#8b9bb4' };
  const idx = stories.indexOf(story);
  const prev = stories[idx - 1];
  const next = stories[idx + 1];

  const paras = story.body.map((p) => `<p>${p}</p>`).join('');

  // 驚險指數：10 顆點
  const dots = Array.from({ length: 10 }, (_, i) =>
    `<span class="dot ${i < story.thrill ? 'on' : ''}"></span>`
  ).join('');

  root.innerHTML = `
    <a class="back-link" href="index.html">← 回到驚險足跡</a>
    <header class="story-header" style="--cat:${cat.color}">
      <div class="story-head-text">
        <div class="story-meta">
          ${story.year ? `<span class="story-year">${story.year}</span>` : ''}
          <span class="story-cat" style="--cat:${cat.color}">${cat.label}</span>
          <span class="story-loc">📍 ${story.place}</span>
        </div>
        <h1 class="story-title"><span class="story-emoji">${story.emoji}</span>${story.title}</h1>
        <p class="story-summary">${story.summary}</p>
        <div class="story-thrill">
          <span class="st-label">驚險指數</span>
          <span class="st-dots">${dots}</span>
          <span class="st-num">${story.thrill}<span class="st-max">/10</span></span>
        </div>
      </div>
      <div class="story-minimap" id="story-minimap" aria-label="事件地點地圖"></div>
    </header>

    <article class="story-body">${paras}</article>

    <aside class="story-lock" id="story-lock" style="--cat:${cat.color}">
      <span class="hook-badge" id="lock-badge">✋ 故事只到這裡</span>
      ${story.teaser ? `<p class="hook-text">${story.teaser}</p>` : ''}
      <div class="lock-ui" id="lock-ui">
        <p class="lock-prompt">🔒 完整故事上了鎖。有通關密語就直接解鎖，或付費取得。</p>
        <div class="pay-cta" id="pay-cta" hidden>
          <a class="pay-btn" id="pay-btn" target="_blank" rel="noopener"></a>
          <span class="pay-note" id="pay-note"></span>
        </div>
        <form class="lock-form" id="lock-form" autocomplete="off">
          <input id="lock-input" type="password" placeholder="輸入通關密語…" aria-label="通關密語" />
          <button type="submit" class="lock-btn">解鎖</button>
        </form>
        <span class="lock-err" id="lock-err" role="alert"></span>
      </div>
      <div class="reveal-body" id="reveal-body" hidden></div>
    </aside>

    <div class="share-row" id="share-row">
      <span class="share-label">覺得精彩？分享鉤子給朋友 👉</span>
      <div class="share-btns">
        <a class="share-btn" data-net="line" target="_blank" rel="noopener" title="分享到 LINE">LINE</a>
        <a class="share-btn" data-net="threads" target="_blank" rel="noopener" title="分享到 Threads">Threads</a>
        <a class="share-btn" data-net="fb" target="_blank" rel="noopener" title="分享到 Facebook">Facebook</a>
        <a class="share-btn" data-net="x" target="_blank" rel="noopener" title="分享到 X">X</a>
        <button class="share-btn" id="copy-btn" type="button" title="複製連結">🔗 複製連結</button>
      </div>
    </div>

    <nav class="story-nav">
      ${prev ? `<a class="nav-prev" href="story.html?id=${encodeURIComponent(prev.id)}">← ${prev.emoji} ${prev.title}</a>` : '<span></span>'}
      ${next ? `<a class="nav-next" href="story.html?id=${encodeURIComponent(next.id)}">${next.emoji} ${next.title} →</a>` : '<span></span>'}
    </nav>`;

  drawMiniMap('#story-minimap', story, cat.color);
  setupLock();
  setupShare();

  /* ---------- 分享按鈕（引流） ---------- */
  function setupShare() {
    const cfg = window.ADV_CONFIG || {};
    const base = (cfg.siteUrl || location.origin).replace(/\/$/, '');
    const url = `${base}/story.html?id=${encodeURIComponent(story.id)}`;
    const text = `${story.title}｜${story.summary}`;
    const eu = encodeURIComponent(url);
    const et = encodeURIComponent(text);
    const links = {
      line: `https://social-plugins.line.me/lineit/share?url=${eu}`,
      threads: `https://www.threads.net/intent/post?text=${et}%20${eu}`,
      fb: `https://www.facebook.com/sharer/sharer.php?u=${eu}`,
      x: `https://twitter.com/intent/tweet?text=${et}&url=${eu}`,
    };
    document.querySelectorAll('.share-btn[data-net]').forEach((a) => {
      a.href = links[a.dataset.net];
    });
    const copyBtn = document.getElementById('copy-btn');
    copyBtn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(url); copyBtn.textContent = '✅ 已複製'; }
      catch (e) { copyBtn.textContent = url; }
      setTimeout(() => (copyBtn.textContent = '🔗 複製連結'), 1800);
    });
  }

  /* ---------- 通關密語解鎖 / 付費 ---------- */
  function setupLock() {
    const Unlock = window.Unlock;
    const cfg = window.ADV_CONFIG || {};
    const hasVault = Unlock && window.VAULT && window.VAULT[story.id];
    const free = Unlock && Unlock.isFree(story.id);
    const lockUi = document.getElementById('lock-ui');
    const badge = document.getElementById('lock-badge');
    const revealBody = document.getElementById('reveal-body');
    const form = document.getElementById('lock-form');
    const input = document.getElementById('lock-input');
    const err = document.getElementById('lock-err');

    if (!hasVault) { if (lockUi) lockUi.hidden = true; return; }
    if (!window.crypto || !crypto.subtle) {
      lockUi.innerHTML =
        '<p class="lock-prompt">此瀏覽器環境無法解密（需 https 或 localhost）。</p>';
      return;
    }

    // 付費按鈕：只有設定了 payUrl、且非免費試閱時才顯示。
    if (!free && cfg.payUrl) {
      const cta = document.getElementById('pay-cta');
      const btn = document.getElementById('pay-btn');
      btn.href = cfg.payUrl;
      btn.textContent = `🔓 付費解鎖完整故事 · ${cfg.payPrice || ''}`.trim();
      document.getElementById('pay-note').textContent = cfg.payNote || '';
      cta.hidden = false;
    }
    // 有序號驗證時，輸入框同時接受密語或購買序號。
    if (!free && cfg.licenseVerifyUrl) {
      input.placeholder = '輸入通關密語或購買序號…';
    }

    function reveal(paragraphs) {
      revealBody.innerHTML = paragraphs.map((p) => `<p>${p}</p>`).join('');
      revealBody.hidden = false;
      lockUi.hidden = true;
      badge.textContent = free ? '🎁 免費試閱 · 完整故事' : '🔓 已解鎖 · 完整故事';
    }

    async function tryUnlock(code, { silent, remember } = {}) {
      try {
        const paragraphs = await Unlock.decryptStory(story.id, code);
        if (remember) Unlock.rememberCode(code);
        reveal(paragraphs);
        return true;
      } catch (e) {
        if (!silent) err.textContent = '密語不對，再試一次（或付費取得 😏）';
        return false;
      }
    }

    // 1) 這趟已用付費密語解鎖過 → 自動套用。 2) 免費試閱 → 用公開密語自動解鎖。
    const saved = Unlock.savedCode();
    if (saved) {
      tryUnlock(saved, { silent: true }).then((ok) => {
        if (!ok && free) tryUnlock(Unlock.freeCode(), { silent: true });
      });
    } else if (free) {
      tryUnlock(Unlock.freeCode(), { silent: true });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.textContent = '';
      const val = input.value;
      if (!val.trim()) return;
      // 先當密語試；失敗且有設定序號驗證 → 當 Gumroad 序號驗證。
      if (await tryUnlock(val, { remember: true, silent: !!cfg.licenseVerifyUrl })) return;
      if (cfg.licenseVerifyUrl) {
        err.textContent = '驗證中…';
        try {
          const pass = await Unlock.verifyLicense(val);
          if (await tryUnlock(pass, { remember: true })) { err.textContent = ''; return; }
        } catch (_) {}
        err.textContent = '密語或序號不正確（或已達使用上限）';
      }
    });
  }

  /* ---------- d3 迷你地圖：聚焦單一事件 ---------- */
  async function drawMiniMap(sel, story, color) {
    const el = document.querySelector(sel);
    if (!el) return;
    const size = el.clientWidth || 260;
    const h = Math.round(size * 0.78);

    let topo;
    try {
      topo = await d3.json('vendor/countries-110m.json');
    } catch (e) {
      el.innerHTML = '<span class="mini-fallback">📍</span>';
      return;
    }
    const land = topojson.feature(topo, topo.objects.countries);

    // 以事件座標為中心，用正射投影營造「地球局部」的感覺。
    const projection = d3
      .geoOrthographic()
      .rotate([-story.coords[0], -story.coords[1]])
      .fitExtent([[10, 10], [size - 10, h - 10]], { type: 'Sphere' });
    const path = d3.geoPath(projection);

    const svg = d3
      .select(el)
      .append('svg')
      .attr('viewBox', `0 0 ${size} ${h}`)
      .attr('class', 'mini-svg')
      .attr('aria-hidden', 'true');

    svg.append('path').attr('class', 'mini-sphere').attr('d', path({ type: 'Sphere' }));
    svg.append('path').attr('class', 'mini-graticule').attr('d', path(d3.geoGraticule10()));
    svg.append('path').attr('class', 'mini-land').attr('d', path(land));

    const p = projection(story.coords);
    if (p) {
      const g = svg.append('g').attr('transform', `translate(${p[0]},${p[1]})`);
      g.append('circle').attr('class', 'mini-pulse').attr('r', 7).attr('fill', color);
      g.append('circle').attr('r', 4.5).attr('fill', color)
        .attr('stroke', '#05070d').attr('stroke-width', 1.5);
    }
  }
})();
