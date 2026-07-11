/*
 * 驚險時間軸 — d3.js 垂直時間軸
 *
 * 以 d3 的 data-join 依年份（由舊到新）把每一則故事排在中央時間線兩側，
 * 左右交錯、點擊前往內文。純鉤子呈現，不劇透。
 * 依賴 data.js 提供的 window.STORIES / window.CATEGORIES 與 d3。
 */

function renderTimeline(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  container.innerHTML = '';

  const CATEGORIES = window.CATEGORIES || {};
  const stories = (window.STORIES || [])
    .slice()
    .sort((a, b) => a.year - b.year); // 由舊到新

  const colorOf = (d) => (CATEGORIES[d.category] || {}).color || '#38bdf8';
  const labelOf = (d) => (CATEGORIES[d.category] || {}).label || '其他';

  const timeline = d3
    .select(container)
    .append('div')
    .attr('class', 'timeline');

  const items = timeline
    .selectAll('a.tl-item')
    .data(stories)
    .join('a')
    .attr('class', (d, i) => `tl-item ${i % 2 === 0 ? 'left' : 'right'}`)
    .attr('href', (d) => `story.html?id=${encodeURIComponent(d.id)}`)
    .style('--cat', colorOf)
    .style('--i', (d, i) => i); // 供 CSS 做逐項進場延遲

  // 中央線上的節點（年份圓點）
  const node = items.append('span').attr('class', 'tl-node');
  node.append('span').attr('class', 'tl-year').text((d) => d.year);

  // 內容卡
  const card = items.append('span').attr('class', 'tl-card');

  const head = card.append('span').attr('class', 'tl-head');
  head.append('span').attr('class', 'tl-emoji').text((d) => d.emoji);
  head
    .append('span')
    .attr('class', 'tl-cat')
    .style('--cat', colorOf)
    .text(labelOf);

  card.append('span').attr('class', 'tl-title').text((d) => d.title);
  card.append('span').attr('class', 'tl-place').text((d) => `📍 ${d.place}`);
  card.append('span').attr('class', 'tl-hook').text((d) => d.summary);

  // 進場動畫：捲動到畫面內才淡入上浮
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    items.nodes().forEach((n) => io.observe(n));
  } else {
    items.classed('is-in', true);
  }
}

if (typeof window !== 'undefined') window.renderTimeline = renderTimeline;
