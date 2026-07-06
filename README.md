# 醫院 / 民護 / 救護車 打卡系統

這是一個簡易的打卡系統，前端頁面可以選擇醫院、民護，民護時可選救護車車號，並將打卡紀錄存到後端的統一資料檔案。

## 如何啟動

1. 開啟終端機並切換到專案資料夾：
   ```powershell
   cd "c:\Users\ptojf\Downloads\嘉蕭打卡系統"
   ```
2. 安裝依賴：
   ```powershell
   npm install
   ```
3. 啟動伺服器：
   ```powershell
   npm start
   ```
4. 開啟瀏覽器並前往：
   ```text
   http://localhost:3000
   ```

## 內容說明

- `index.html`：前端頁面
- `styles.css`：頁面樣式
- `script.js`：前端邏輯，透過 API 請求讀寫統一打卡紀錄
- `server.js`：後端 Express 伺服器，提供 `GET /api/records`、`POST /api/records`、`DELETE /api/records`
- `records.json`：後端儲存打卡紀錄的檔案（啟動伺服器後建立）

## 注意

- 目前後端資料存放在本地 `records.json`，如果要多人共同使用，需將此專案部署到可公開訪問的伺服器。

## Vercel + Supabase 部署

1. 建立 Supabase 專案
   - 登入 `https://supabase.com`
   - 創建一個新專案

2. 建立 `records` 資料表
   - 欄位：
     - `id`：bigint，Primary Key，自動遞增
     - `date`：text
     - `role`：text
     - `person`：text
     - `vehicle`：text
     - `type`：text
     - `time`：text
     - `created_at`：timestamptz，default `now()`

3. 取得 Supabase 連線資訊
   - `SUPABASE_URL`：Supabase 專案的網址，例如 `https://xxxxxx.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`：Supabase Settings > API 中的 service_role key
   - （如果只是測試，也可先使用 `SUPABASE_ANON_KEY`，但正式部署請用 `SUPABASE_SERVICE_ROLE_KEY`）

4. 安裝 Vercel CLI
   ```powershell
   npm install -g vercel
   ```

5. 部署到 Vercel
   - 登入：`vercel login`
   - 設定專案資料夾：`cd "c:\Users\ptojf\Downloads\嘉蕭打卡系統"`
   - 設定環境變數：
     - `SUPABASE_URL`   
     - `SUPABASE_SERVICE_ROLE_KEY`
   - 部署：`vercel --prod`

6. 本機測試
   ```powershell
   vercel dev
   ```

7. 產生的 API 路徑
   - `GET /api/records`
   - `POST /api/records`
   - `DELETE /api/records`

8. 使用方式
   - 前端會透過 `script.js` 直接呼叫 `/api/records`
   - 如果部署成功，前端資料會同步寫入 Supabase

- 目前後端資料存放在本地 `records.json`，如果要多人共同使用，需將此專案部署到可公開訪問的伺服器。