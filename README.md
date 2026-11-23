# mfe-platform：微前端練習平台

用 Nx 與 Angular 22 從零打造的小型企業管理平台，練習「Host 依 manifest 在執行時動態載入微前端 JS」的架構。

- **Host**：登入、外框、選單、路由、提示訊息；依 `manifest.json` 決定要載入哪些模組。
- **3 個 MFE**：客戶管理、行事曆、報表管理。各自是獨立的 Angular 應用程式，打包成 Custom Element。
- **部署**：GitHub Actions 建置後發布到 GitHub Pages（純靜態網站）。

> 這是練習專案：登入是模擬的（沒有密碼與後端），所有資料都是虛構的示範資料。

## 架構

```
瀏覽器
 │
 ├─ index.html + Host（Angular 22，zoneless）
 │    1. 讀取 manifest.json（執行時讀取，不打包進 Host）
 │    2. 依使用者權限過濾選單
 │    3. 進入 /customers → MfeLoaderService 載入 mfe/customer/main.js
 │    4. 等 <mfe-customer> 註冊完成 → 建立元素、設定 context 屬性 → 掛到畫面上
 │
 ├─ mfe/customer/main.js → 註冊 <mfe-customer>  （各自一份 Angular、Shadow DOM 隔離樣式）
 ├─ mfe/calendar/main.js → 註冊 <mfe-calendar>
 └─ mfe/report/main.js   → 註冊 <mfe-report>

Host → MFE：element property `context`（使用者、權限、目前選取的客戶）
MFE → Host：window 上的 CustomEvent（mfe:notify、mfe:navigate、mfe:customer:selected）
```

## 目錄結構

```
mfe-platform/
├── apps/
│   ├── host/                 主程式
│   │   └── src/app/mfe/      manifest 讀取、MfeLoaderService、掛載元件、事件接收
│   ├── customer-mfe/         客戶管理
│   ├── calendar-mfe/         行事曆
│   └── report-mfe/           報表管理
├── libs/
│   ├── shared-contracts/     Host 與 MFE 的契約：manifest、context、事件型別、權限代碼
│   ├── shared-auth/          登入狀態模型與示範帳號
│   ├── shared-permission/    角色與權限對照、權限判斷
│   ├── shared-event-bus/     以 window CustomEvent 實作的事件匯流排
│   └── shared-mfe-element/   MFE 共用的啟動程式（註冊 Custom Element）
├── config/manifest.json      模組清單（建置時複製到網站根目錄）
├── tools/assemble-site.mjs   把 Host 與 MFE 的建置結果組成 dist/site
└── .github/workflows/        GitHub Pages 部署流程
```

### 模組邊界

依賴方向由 ESLint 規則 `@nx/enforce-module-boundaries` 強制檢查（見 `eslint.config.mjs`）：

| 專案 | tag | 只能依賴 |
| --- | --- | --- |
| host | `type:host` | `type:shared` |
| 各 MFE | `type:mfe` | `type:shared`、`type:mfe-runtime` |
| shared-mfe-element | `type:mfe-runtime` | `type:shared` |
| 其他 shared lib | `type:shared` | `type:shared` |

Host 不能 import 任何 MFE，MFE 之間也不能互相 import。違反時 `npm run lint` 會失敗。

## 本機執行

需要 Node.js 22.22.3 以上或 24.15 以上（Angular 22 的要求，見 `.nvmrc`）。

```bash
npm ci
npm start
```

開啟 http://localhost:4200 。`npm start` 會同時執行三件事：

| 名稱 | 指令 | 作用 |
| --- | --- | --- |
| mfes | `npm run watch:mfes` | 以 watch 模式建置三個 MFE 到 `dist/mfe/` |
| static | `npm run serve:mfes` | 在 4300 提供 `dist/` 靜態檔 |
| host | `npm run serve:host` | Host 開發伺服器（4200），`/mfe` 代理到 4300 |

MFE 第一次建置完成前，Host 會顯示載入失敗；等建置完成後按「重新載入」即可。

### 單獨開發一個 MFE

```bash
npx nx serve customer-mfe   # http://localhost:4201
```

每個 MFE 的 `src/index.html` 是獨立執行頁，會用示範的 context 啟動元素，事件輸出到主控台。

## 建置與部署

```bash
npm run build:site   # 建置全部並組成 dist/site
```

推送到 `main` 後，GitHub Actions 會執行 lint、分別建置 MFE 與 Host（base href 設為 `/<repo 名稱>/`）、組成網站，再部署到 GitHub Pages。

GitHub Pages 沒有伺服器端路由，所以 `404.html` 是 `index.html` 的複本：直接開啟深層網址時，Pages 回傳 404.html，Angular 啟動後再依網址顯示正確的頁面。

## 核心設計

### manifest.json

Host 在執行時才讀取 manifest，所以新增、下架模組或調整版本，只要改這個檔案，不必重新建置 Host。manifest 決定要執行哪些 JS，屬於信任邊界，Host 會檢查：

- 格式與必要欄位（`parseMfeManifest`），單一項目錯誤只略過該項。
- name、route、tagName 不可重複，route 不可佔用 Host 保留的路由。
- 入口 JS 必須與 Host 同源，避免 manifest 被竄改成外部網址時執行任意程式。
- `entry` 是相對於 manifest.json 的路徑，所以網站放在 `/` 或 `/mfe-platform/` 都能使用。

### MfeLoaderService

位置：`apps/host/src/app/mfe/mfe-loader.service.ts`

| 需求 | 做法 |
| --- | --- |
| 動態載入 | 插入 `<script type="module">`，網址加上 `?v=<版本>` |
| Promise 去重 | 同一個 MFE 載入中時，重複呼叫共用同一個 Promise |
| 逾時 | 單次嘗試超過 `loadTimeoutMs` 仍未完成「註冊」就算失敗；`onload` 只代表程式執行了，要等 `customElements.whenDefined` |
| 重試 | 指數退避（500 ms、1000 ms…）最多 `maxRetries` 次；每次換網址（`&retry=N`），因為瀏覽器會依網址記住 module script 的失敗結果 |
| 狀態管理 | 每個 MFE 的狀態（idle、loading、retrying、loaded、failed、incompatible）放在 signal，畫面直接讀取 |
| 版本相容 | manifest 的 `contractVersion` 與 Host 不同時不載入，也不重試 |

### 為什麼不用 zone.js

Angular 22 預設 zoneless。如果 Host 與每個 MFE 都需要 zone.js，就會共用同一個全域 `Zone`，版本不一致時很難排查。這裡全部 zoneless，每個 MFE 只靠 signals 更新畫面，彼此沒有共用的全域執行環境。

### 事件匯流排為什麼放在 window

每個 bundle 都各自打包一份 shared lib，模組層級的變數（例如 RxJS Subject）在 bundle 之間並不共用。`shared-event-bus` 因此不保存任何狀態，而是把 `CustomEvent` 派送到同一個 `window`，由瀏覽器轉送。

### 權限在哪一層阻擋

1. **選單**：沒有 `requiredPermission` 的模組不出現。
2. **路由守衛**：直接輸入網址也會被導到「沒有權限」，而且不會下載該模組的 JS。
3. **MFE 內按鈕**：例如沒有 `customer:write` 就看不到新增表單。

這些都只是使用體驗。JS 是公開的靜態檔，真正的授權必須由後端 API 執行；這個練習專案沒有後端。

### 切換頁面時的清理

- Host 移除 Custom Element 後，Angular Elements 約 10 ms 後銷毀 MFE 內的元件。
- 已註冊的元素定義與載入過的 JS 無法卸載，下次進入直接使用，不會重新下載。
- MFE 自己的根 injector 會保留到整頁關閉。客戶管理 MFE 把資料放在 root service，所以切走再回來，新增的客戶還在。

## 練習建議

- 用不同示範帳號登入，比較選單、首頁與按鈕的差異。
- 開啟「庫存管理（故障示範）」，觀察重試次數與錯誤畫面；開發者工具的 Network 可以看到 `?retry=2` 的請求。
- 把 manifest 中某個 MFE 的 `contractVersion` 改成 2，觀察「契約版本不相容」。
- 把 `tagName` 改成和 MFE 程式不同的名稱，觀察逾時。
- 在客戶管理選取客戶後切到行事曆，觀察 MFE → Host → MFE 的資料流。
- 開發者工具輸入 `customElements.get('mfe-customer')`，或選取元素後查看 `$0.context`。
