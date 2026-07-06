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