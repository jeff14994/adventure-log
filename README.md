# 驚險人生 — 個人驚險故事集

橫跨 **美國 / 越南 / 台灣** 的九則驚險經歷，用一張 **d3.js 互動世界地圖** 與 **時間軸** 串起每一次心跳加速的瞬間。

> **設計理念：只給鉤子，不給結局。** 每則故事都刻意寫成懸念——先把你拉進現場、
> 在最關鍵的地方停住，再邀請你「當面來問」。目的是勾起好奇、製造話題。

**純靜態、零建置、零外部相依**（d3 與世界地圖資料已 vendor 進 `vendor/`）。
直接用瀏覽器開 `index.html`，或用任何靜態伺服器託管即可（可原樣部署到 GitHub Pages）。

## 系統設計 / Architecture

```
adventure-log/
├── index.html          首頁：地圖／時間軸切換 + 故事卡片牆 + 分類篩選
├── story.html          內文頁樣板（以 ?id= 決定顯示哪一則）
├── css/blog.css        暗色主題
├── js/
│   ├── data.js         ★ 唯一資料來源：九則故事（含年份、鉤子）+ 分類定義
│   ├── map.js          d3 世界地圖（geoNaturalEarth1 + 可點擊標記）
│   ├── timeline.js     d3 垂直時間軸（依年份由舊到新、左右交錯、捲動進場）
│   ├── home.js         首頁邏輯：地圖／時間軸切換、卡片牆、d3 計量條、篩選、統計
│   └── story.js        內文頁邏輯：讀 ?id=、d3 迷你地圖、鉤子區塊、上/下篇
└── vendor/
    ├── d3.v7.min.js
    ├── topojson-client.min.js
    └── countries-110m.json   世界地圖資料（TopoJSON）
```

### 資料模型（`js/data.js`）

每一則故事都是一個物件；**首頁地圖、卡片牆、內文頁全部讀同一份資料**。

```js
{
  id: 'az-snow-mountain',      // 網址用的唯一代號
  title: '受困亞利桑那雪山',
  emoji: '🏔️',
  country: '美國',
  place: '亞利桑那州・弗拉格斯塔夫',
  coords: [-111.65, 35.20],    // [經度, 緯度]，d3.geo 慣例
  year: 2023,                  // 年份，用於時間軸排序與顯示
  category: 'survival',        // 對應 CATEGORIES
  thrill: 9,                   // 驚險指數 1–10
  summary: '一句話鉤子（卡片與內文頁的標語）',
  body: [ '把你拉進現場的短鋪陳', '在關鍵處停住' ],  // 只鋪陳、不劇透
  teaser: '「當面來問」的懸念收尾（內文頁的鉤子區塊）',
}
```

分類（`CATEGORIES`）：`survival 天災受困` / `bureaucracy 官僚簽證` /
`accident 意外驚魂` / `travel 旅途驚魂` / `traffic 交通事故` / `negotiation 談判殺價`，
各自帶一個代表色，會套用到地圖標記、卡片邊條與分類標籤。

### d3.js 用在哪

| 位置 | 投影 / 元件 | 說明 |
|---|---|---|
| 首頁地圖 | `geoNaturalEarth1` | 世界輪廓 + 經緯線 + 各事件的脈動標記，點擊前往內文；hover 出現提示框 |
| 卡片牆 | SVG 分段條 | 每張卡片的「驚險指數」由 d3 畫成 10 格計量條 |
| 內文頁 | `geoOrthographic` | 以事件座標為中心的「地球局部」迷你地圖 |
| 統計列 | `d3.max` / `d3.mean` | 國家數、最高與平均驚險指數 |

## 如何新增 / 修改故事

1. 打開 `js/data.js`，在 `STORIES` 陣列尾端新增一個物件（或修改既有的）。
2. `coords` 用 **[經度, 緯度]**；地圖標記、卡片、迷你地圖會自動更新，不需改其他檔案。
3. 想加新分類：在 `CATEGORIES` 加一組 `key: { label, color }` 即可。

> ⚠️ 部分美國個人事件（溜冰、車禍、買車、放煙火）的座標目前是 **鳳凰城一帶的概略值**，
> 請依實際發生地點修改 `coords`。

## 本地預覽

```bash
# 在專案根目錄起一個靜態伺服器
python3 -m http.server 8000
# 開 http://localhost:8000/
```

## 部署到 GitHub Pages

Settings → Pages → Source 選 `main`（或本分支）、資料夾選 `/ (root)`，
儲存後即可透過 `https://jeff14994.github.io/adventure-log/` 瀏覽。

## 後續可以做的事（Roadmap）

- 每則故事加上照片 / 地圖截圖
- 內文頁支援分享用的 Open Graph 圖與描述
- 首頁地圖加入依分類過濾標記
- 依日期排序 / 時間軸視圖
