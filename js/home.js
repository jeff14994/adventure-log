/*
 * 首頁邏輯：驚險足跡地圖 + 故事卡片牆 + 分類篩選。
 * 依賴 data.js、map.js 與 d3。
 */

(function () {
  const stories = window.STORIES || [];
  const CATEGORIES = window.CATEGORIES || {};

  const grid = document.getElementById('story-grid');
  const filterRow = document.getElementById('category-filter');
  const statEl = document.getElementById('stat-line');

  let activeCat = 'all';
  let mapApi = null;

  /* ---------- d3 驚險指數計量條 ---------- */
  // 在卡片上畫一條 10 格的分段條，填滿到 thrill 值。
  function drawThrillMeter(mountEl, value, color) {
    const segments = 10;
    const w = 132, h = 12, gap = 2;
    const segW = (w - gap * (segments - 1)) / segments;
    const svg = d3
      .select(mountEl)
      .append('svg')
      .attr('class', 'thrill-svg')
      .attr('viewBox', `0 0 ${w} ${h}`)
      .attr('width', w)
      .attr('height', h)
      .attr('aria-hidden', 'true');

    svg
      .selectAll('rect')
      .data(d3.range(segments))
      .join('rect')
      .attr('x', (i) => i * (segW + gap))
      .attr('y', 0)
      .attr('width', segW)
      .attr('height', h)
      .attr('rx', 2)
      .attr('fill', (i) => (i < value ? color : 'rgba(255,255,255,0.08)'));
  }

  /* ---------- 卡片牆 ---------- */
  function cardHtml(d) {
    const cat = CATEGORIES[d.category] || { label: '其他', color: '#8b9bb4' };
    return `
      <a class="story-card" href="story.html?id=${encodeURIComponent(d.id)}"
         data-id="${d.id}"
         style="--cat:${cat.color}">
        <div class="card-top">
          <span class="card-emoji">${d.emoji}</span>
          <span class="card-tags">
            ${d.year ? `<span class="card-year">${d.year}</span>` : ''}
            <span class="card-cat" style="--cat:${cat.color}">${cat.label}</span>
          </span>
        </div>
        <h3 class="card-title">${d.title}</h3>
        <div class="card-place">📍 ${d.place}</div>
        <p class="card-summary">${d.summary}</p>
        <div class="card-meter">
          <span class="meter-label">驚險指數</span>
          <span class="meter-mount"></span>
          <span class="meter-num">${d.thrill}<span class="meter-max">/10</span></span>
        </div>
        <span class="card-cta">🔒 只講一半 · 點進來看鉤子</span>
      </a>`;
  }

  function renderGrid() {
    const list =
      activeCat === 'all'
        ? stories
        : stories.filter((s) => s.category === activeCat);

    grid.innerHTML = list.map(cardHtml).join('');

    // 為每張卡片畫 d3 計量條
    list.forEach((d) => {
      const card = grid.querySelector(`.story-card[data-id="${d.id}"]`);
      if (!card) return;
      const mount = card.querySelector('.meter-mount');
      const color = (CATEGORIES[d.category] || {}).color || '#38bdf8';
      drawThrillMeter(mount, d.thrill, color);

      // 卡片 hover 時，地圖對應的標記亮起來
      card.addEventListener('mouseenter', () => mapApi && mapApi.highlight(d.id));
      card.addEventListener('mouseleave', () => mapApi && mapApi.highlight(null));
    });
  }

  /* ---------- 分類篩選 ---------- */
  function renderFilters() {
    const cats = Array.from(new Set(stories.map((s) => s.category)));
    const chips = [`<button class="chip active" data-cat="all">全部 ${stories.length}</button>`];
    cats.forEach((key) => {
      const c = CATEGORIES[key] || { label: key, color: '#8b9bb4' };
      const n = stories.filter((s) => s.category === key).length;
      chips.push(
        `<button class="chip" data-cat="${key}" style="--cat:${c.color}">${c.label} ${n}</button>`
      );
    });
    filterRow.innerHTML = chips.join('');

    filterRow.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      activeCat = btn.dataset.cat;
      filterRow
        .querySelectorAll('.chip')
        .forEach((c) => c.classList.toggle('active', c === btn));
      renderGrid();
    });
  }

  /* ---------- 統計列 ---------- */
  function renderStats() {
    const countries = new Set(stories.map((s) => s.country)).size;
    const maxThrill = d3.max(stories, (s) => s.thrill);
    const avg = (d3.mean(stories, (s) => s.thrill) || 0).toFixed(1);
    statEl.innerHTML =
      `<b>${stories.length}</b> 則驚險故事 · 橫跨 <b>${countries}</b> 個國家 · ` +
      `最高驚險指數 <b>${maxThrill}</b> · 平均 <b>${avg}</b>`;
  }

  /* ---------- 地圖 / 時間軸 切換 ---------- */
  let timelineDrawn = false;
  function setupViewToggle() {
    const toggle = document.getElementById('view-toggle');
    const mapWrap = document.getElementById('world-map');
    const tlWrap = document.getElementById('timeline');
    const heading = document.getElementById('view-heading');
    const hint = document.getElementById('view-hint');
    if (!toggle) return;

    toggle.addEventListener('click', (e) => {
      const btn = e.target.closest('.vt-btn');
      if (!btn) return;
      const view = btn.dataset.view;
      toggle
        .querySelectorAll('.vt-btn')
        .forEach((b) => b.classList.toggle('active', b === btn));

      const isMap = view === 'map';
      mapWrap.hidden = !isMap;
      tlWrap.hidden = isMap;
      heading.textContent = isMap ? '驚險足跡地圖' : '驚險時間軸';
      hint.textContent = isMap
        ? '點擊地圖上的標記，或往下滑看故事卡片'
        : '由舊到新，一路走到最近的驚險——點任一張卡片看鉤子';

      if (!isMap && !timelineDrawn) {
        window.renderTimeline('#timeline');
        timelineDrawn = true;
      }
    });
  }

  /* ---------- 啟動 ---------- */
  async function init() {
    renderStats();
    renderFilters();
    renderGrid();
    setupViewToggle();
    mapApi = await window.renderWorldMap('#world-map');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
