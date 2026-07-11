/*
 * 驚險足跡地圖 — d3.js 世界地圖 + 事件座標
 *
 * 用 d3-geo（geoNaturalEarth1 投影）畫世界輪廓，
 * 在每一則故事的座標上放一顆會脈動的標記，點擊即前往內文頁。
 *
 * 依賴：d3.v7.min.js、topojson-client.min.js、vendor/countries-110m.json
 *       以及 data.js 提供的 window.STORIES / window.CATEGORIES。
 */

async function renderWorldMap(containerSelector, { onSelect } = {}) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const stories = window.STORIES || [];
  const CATEGORIES = window.CATEGORIES || {};

  // 依容器寬度決定尺寸（RWD）。
  const width = container.clientWidth || 900;
  const height = Math.max(360, Math.round(width * 0.52));

  const svg = d3
    .select(container)
    .append('svg')
    .attr('class', 'map-svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .attr('role', 'img')
    .attr('aria-label', '驚險事件世界地圖');

  // 讀取本地世界地圖資料（TopoJSON）。
  let topo;
  try {
    topo = await d3.json('vendor/countries-110m.json');
  } catch (e) {
    container.innerHTML =
      '<p class="map-error">世界地圖資料載入失敗，請確認 vendor/countries-110m.json 存在。</p>';
    return;
  }
  const land = topojson.feature(topo, topo.objects.countries);
  const borders = topojson.mesh(topo, topo.objects.countries, (a, b) => a !== b);

  const projection = d3.geoNaturalEarth1().fitExtent(
    [[8, 8], [width - 8, height - 8]],
    land
  );
  const path = d3.geoPath(projection);

  // 經緯線
  const graticule = d3.geoGraticule10();
  svg
    .append('path')
    .attr('class', 'map-graticule')
    .attr('d', path(graticule));

  // 陸地
  svg
    .append('path')
    .attr('class', 'map-land')
    .attr('d', path(land));

  // 國界
  svg
    .append('path')
    .attr('class', 'map-border')
    .attr('d', path(borders));

  // 提示框（tooltip）
  const tip = d3
    .select(container)
    .append('div')
    .attr('class', 'map-tip')
    .style('opacity', 0);

  // 事件標記
  const pins = svg
    .append('g')
    .attr('class', 'map-pins')
    .selectAll('g')
    .data(stories)
    .join('g')
    .attr('class', 'map-pin')
    .attr('transform', (d) => {
      const p = projection(d.coords);
      return p ? `translate(${p[0]},${p[1]})` : 'translate(-100,-100)';
    })
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (d) => `${d.title}（${d.place}）`)
    .style('cursor', 'pointer');

  const colorOf = (d) => (CATEGORIES[d.category] || {}).color || '#38bdf8';

  // 外圈脈動
  pins
    .append('circle')
    .attr('class', 'pin-pulse')
    .attr('r', 6)
    .attr('fill', colorOf);

  // 實心點
  pins
    .append('circle')
    .attr('class', 'pin-dot')
    .attr('r', 5)
    .attr('fill', colorOf)
    .attr('stroke', '#05070d')
    .attr('stroke-width', 1.5);

  function showTip(event, d) {
    const [mx, my] = d3.pointer(event, container);
    tip
      .html(
        `<span class="tip-emoji">${d.emoji}</span>` +
          `<span class="tip-title">${d.title}</span>` +
          `<span class="tip-place">${d.year ? d.year + ' · ' : ''}${d.place}</span>`
      )
      .style('left', mx + 'px')
      .style('top', my + 'px')
      .transition()
      .duration(120)
      .style('opacity', 1);
  }
  function hideTip() {
    tip.transition().duration(200).style('opacity', 0);
  }

  const go = (d) => {
    if (typeof onSelect === 'function') onSelect(d);
    else window.location.href = `story.html?id=${encodeURIComponent(d.id)}`;
  };

  pins
    .on('mouseenter', function (event, d) {
      d3.select(this).classed('is-hover', true);
      showTip(event, d);
    })
    .on('mousemove', showTip)
    .on('mouseleave', function () {
      d3.select(this).classed('is-hover', false);
      hideTip();
    })
    .on('click', (event, d) => go(d))
    .on('keydown', (event, d) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        go(d);
      }
    });

  return { svg, projection, highlight: (id) => {
    pins.classed('is-active', (d) => d.id === id);
  }};
}

if (typeof window !== 'undefined') window.renderWorldMap = renderWorldMap;
