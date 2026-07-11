# 💰 Monetization Roadmap

策略：免費鉤子故事 = 流量；付費解鎖 + 殺價教學 = 收入。
現有的密語加密系統直接變成付費牆（付款 → 給密語）。

## Phase 1 — 立刻能收錢（零後端）✅ 已實作
- [x] 分層密語：免費試閱 3 則（自動解鎖，引流）/ 付費密語解全部
- [x] 付費 CTA 按鈕（故事鎖下方；設定 payUrl 才顯示）
- [x] 故事頁分享按鈕（LINE / Threads / FB / X / 複製連結）
- [x] Email 名單 footer 連結（設定 newsletterUrl 才顯示）
- [x] 站台級 OG / twitter meta
- [ ] 👉 **你要做**：把 `js/config.js` 的 payUrl / newsletterUrl 填上真實連結
- [ ] 👉 **你要做**：付款後把付費密語（目前 `staycurious`）寄給買家
- [ ] 每則故事獨立 OG 圖（需預渲染，見 Phase 4）

## 🤖 自動化（付款 → 密語，零後端）
- [x] 大綱：見 `docs/haggle-playbook-outline.md`
- [ ] **推薦做法**：Gumroad 建產品 → 「Content」欄位貼上付費密語
      → 買家付款後 Gumroad 自動顯示 + Email 密語，完全免手動
- [ ] 把 Gumroad 產品連結填入 `js/config.js` payUrl
- [ ] 進階（防止密語外流）：改用 Gumroad License Key，每人一組唯一碼；
      網站串 Gumroad license verify API 驗證（需要我再幫你接）
- [ ] 部署已自動化：push main → GitHub Actions 自動上線 ✅

## Phase 2 — 產品化（最有價值）
- [ ] 《美國買車殺價實戰手冊》PDF/Notion — 用 $6k 故事當廣告，賣 NT$490（大綱已備）
- [ ] 越南/東南亞殺價指南（第二本）
- [ ] Gumroad 上架（處理金流+自動發密語，免後端）
- [ ] 付費電子報：每月一則完整驚險故事 + 談判技巧
- [ ] 1:1 諮詢：陪你視訊殺價/看車報價，抽成或時薪

## Phase 3 — 流量引擎
- [ ] Threads/IG 連載鉤子（每則故事切 3 篇短文，結尾導流網站）
- [ ] Dcard/PTT 發「在美國殺價 $6000 的完整過程」→ 文末導流
- [ ] YouTube Shorts / 播客：口述故事前半，後半在網站
- [ ] SEO：故事頁加 meta/OG/sitemap，標題含「美國買車殺價」等搜尋詞
- [ ] Google Analytics / Plausible 裝上，看哪則故事轉換最高

## Phase 4 — 網站功能支援
- [ ] 每則故事獨立 OG image（分享時好看）
- [ ] 「解鎖率」偽計數器（「已有 127 人解鎖」社會證明）
- [ ] 解鎖後 upsell 區塊：「喜歡？看殺價手冊 →」
- [ ] 留言/敲碗區（Giscus，免後端）
- [ ] 多密語 + 過期密語輪替（防止外流）

## 定價草案
| 產品 | 價格 |
|---|---|
| 全站故事密語 | NT$99–149 一次性 |
| 殺價手冊 PDF | NT$490 |
| 手冊+密語 bundle | NT$549 |
| 諮詢 | NT$1500/hr 或省下金額 10% |
