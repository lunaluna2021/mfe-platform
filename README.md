# mfe-platform：微前端練習平台

用 Nx 與 Angular 22 從零打造的小型企業管理平台，練習「Host 依 manifest 在執行時動態載入微前端 JS」的架構。

- **Host**：登入、外框、選單、路由、提示訊息；依 `manifest.json` 決定要載入哪些模組。
- **3 個 MFE**：客戶管理、行事曆、報表管理。各自是獨立的 Angular 應用程式，打包成 Custom Element；也能自帶登入畫面獨立執行。
- **後端**：Java（Spring Boot，三層式架構），負責登入（BCrypt＋JWT）與所有資料 API；資料庫是 Supabase 的 PostgreSQL。
- **SSO**：同網域的 Host 與各模組共用瀏覽器中的登入狀態。
- **模擬 API**：MSW（Mock Service Worker），沒有後端也能獨立開發模組畫面。
- **部署**：前端以 GitHub Actions 發布到 GitHub Pages；後端以 Docker 部署到 Render。

> 這是練習專案，示範資料皆為虛構。

## 架構

```
瀏覽器（同一個網域）
 │
 ├─ Host（Angular 22，zoneless）
 │    1. 讀取 runtime-config.json（後端網址）與 manifest.json（模組清單）
 │    2. 登入：POST /api/auth/login → access token＋refresh token（存在 localStorage，同網域共用）
 │    3. 依權限過濾選單；進入 /customers → MfeLoaderService 載入 mfe/customer/main.js
 │    4. 等 <mfe-customer> 註冊完成 → 建立元素、設定 context 屬性 → 掛到畫面上
 │
 ├─ mfe/customer/main.js → 註冊 <mfe-customer>  （各自一份 Angular、Shadow DOM 隔離樣式）
 ├─ mfe/calendar/main.js → 註冊 <mfe-calendar>
 └─ mfe/report/main.js   → 註冊 <mfe-report>
        │  HttpClient → 共用 apiInterceptor 接上 context.api 的網址與 Bearer token
        ▼
Java API（Spring Boot：controller → service → repository）
        │  JDBC
        ▼
Supabase PostgreSQL（schema mfe）

Host → MFE：element property `context`（使用者、權限、目前選取的客戶、api）
MFE → Host：window 上的 CustomEvent（mfe:notify、mfe:navigate、mfe:customer:selected）
```

## 目錄結構

```
mfe-platform/
├── apps/
│   ├── host/                     主程式
│   ├── customer-mfe/             客戶管理（增刪改查）
│   ├── calendar-mfe/             行事曆（行程增刪改查）
│   ├── report-mfe/               報表（統計、匯出 CSV）
│   └── api/                      Java 後端（Spring Boot＋Maven＋Flyway）
├── libs/
│   ├── shared-contracts/         Host 與 MFE 的契約：manifest、context、事件型別、權限代碼
│   ├── shared-auth/              登入流程 PlatformAuth、執行時設定、context 組裝（不依賴框架）
│   ├── shared-permission/        權限判斷
│   ├── shared-data-api/          API interceptor、錯誤格式與訊息轉換、LoadStatus
│   ├── shared-event-bus/         以 window CustomEvent 實作的事件匯流排
│   ├── shared-ui/                共用元件：登入表單、確認對話框
│   ├── shared-mocks/             共用的 MSW handlers（登入 API）
│   └── shared-mfe-element/       MFE 啟動程式；第二入口 /standalone 是獨立執行用的登入外框
├── config/
│   ├── manifest.json             模組清單
│   └── runtime-config*.json      各環境的後端網址
├── tools/                        建置組裝、Maven 包裝、帳號管理指令
├── render.yaml                   Render 部署設定（Blueprint）
└── .github/workflows/            GitHub Pages 部署、後端 CI
```

每個 Angular 應用程式的 `src/` 依相同結構分層：

```
src/
├── environments/     environment.ts（default）、.sit、.uat、.prod
├── mocks/            MSW：browser.ts、handlers.ts、mock.json
├── styles/
├── bootstrap.ts      啟動流程（是否啟動 MSW → 啟動 Angular）
└── app/
    ├── core/         const、enums、interfaces、bff（API 的 Req/Res 型別）、services、utils、guards…
    ├── shared/       components、dialogs
    └── features/     各功能頁
```

`core/` 裡的檔案不加功能模組前綴，例如 `core/services/api.service.ts`（`ApiService`）、`core/const/app.const.ts`。API 路徑直接寫在 `api.service.ts` 的方法裡。

### 模組邊界

依賴方向由 ESLint 規則 `@nx/enforce-module-boundaries` 強制檢查（見 `eslint.config.mjs`）：

| 專案               | tag                | 只能依賴                          |
| ------------------ | ------------------ | --------------------------------- |
| host               | `type:host`        | `type:shared`                     |
| 各 MFE             | `type:mfe`         | `type:shared`、`type:mfe-runtime` |
| shared-mfe-element | `type:mfe-runtime` | `type:shared`                     |
| 其他 shared lib    | `type:shared`      | `type:shared`                     |

Host 不能 import 任何 MFE，MFE 之間也不能互相 import。違反時 `npm run lint` 會失敗。

## 後端（apps/api）

- 三層式架構：`controller`（HTTP 與權限）→ `service`（商業規則、交易）→ `repository`（SQL）。ArchUnit 測試確保依賴方向。
- 登入：密碼以 BCrypt 雜湊；access token 是 HS256 JWT（15 分鐘），refresh token 7 天、每次使用都輪替。舊 token 在 30 秒寬限期後又被使用，視為外洩，撤銷該使用者所有 token。
- 權限：JWT 帶 `permissions`，每支 API 以 `@PreAuthorize` 檢查。前端的選單、路由守衛與按鈕只是使用體驗，就算有人改了 JS，後端仍會拒絕。
- JSON 欄位一律大寫底線（`CUSTOMER_NAME`），錯誤格式為 `{ "CODE": "...", "MESSAGE": "..." }`。
- 資料表由 Flyway 建立（`src/main/resources/db/migration`）；客戶還有行程時不能刪除（API 回 409，資料庫外鍵 `on delete restrict` 是最後一道防線）。

| 角色    | 權限                         |
| ------- | ---------------------------- |
| admin   | 全部                         |
| manager | 客戶與行事曆唯讀、報表與匯出 |
| sales   | 客戶與行程維護，看不到報表   |
| viewer  | 客戶與行事曆唯讀             |

### 第一次設定

1. 複製 `apps/api/config/application-local.example.yml` 成 `application-local.yml`（不進版控），填入資料庫連線與 JWT 金鑰。
2. `npx nx build api`。
3. 建立帳號（沒有註冊畫面，以管理指令建立）：

   ```bash
   npm run api:admin -- create-user --email you@example.com --password <至少10個字> --display-name 王小明 --role sales
   npm run api:admin -- list-users
   ```

   其他指令：`reset-password`、`set-role`、`disable`、`enable`。

## 本機執行

需要 Node.js 22.22.3 以上或 24.15 以上（Angular 22 的要求，見 `.nvmrc`），以及 Java 21。

登入頁提供系統管理員、業務主管、業務人員與唯讀人員四個「範例帳號」按鈕，點選後填入帳號與密碼，再按「登入」。Host 與獨立執行的模組使用同一個登入表單。這四組練習帳密依示範用途公開在前端，仍由 Java API 驗證帳密與角色權限。

```bash
npm ci
npx nx serve api   # 後端 http://localhost:8080
npm start          # 前端 http://localhost:4200
```

`npm start` 會同時執行三件事：

| 名稱   | 指令                 | 作用                                        |
| ------ | -------------------- | ------------------------------------------- |
| mfes   | `npm run watch:mfes` | 以 watch 模式建置三個 MFE 到 `dist/mfe/`    |
| static | `npm run serve:mfes` | 在 4300 提供 `dist/` 靜態檔                 |
| host   | `npm run serve:host` | Host 開發伺服器（4200），`/mfe` 代理到 4300 |

> 如果你的環境設定了 `npm_config_legacy_peer_deps=true`，安裝套件前先清除它（或加上 `--legacy-peer-deps=false`），否則產生的 package-lock.json 會和 CI 不一致，`npm ci` 會失敗。

### 獨立執行一個模組（自帶登入）

每個 MFE 的 `src/index.html` 在元素上加了 `is-standalone` 屬性。模組看到這個屬性、又沒有 Host 提供的 context 時，會用 `@defer` 載入共用的登入外框，自己登入、自己組出 context：

- 經由 Host 的網址開啟：http://localhost:4200/mfe/customer/index.html （和 Host 同網域，共用登入狀態）
- 單獨啟動：`npx nx serve customer-mfe` → http://localhost:4201 （不同網域，需要另外登入）
- 線上：`https://<帳號>.github.io/mfe-platform/mfe/customer/`

登入外框放在 `@mfe-platform/shared-mfe-element/standalone` 這個第二入口，只有獨立執行時才下載；模組被 Host 載入時不會變大。

### 模擬模式（MSW，不需要後端）

```bash
npx nx serve customer-mfe -c sit   # http://localhost:4201
```

流程（每個 MFE 相同）：

1. `main.ts` → `bootstrap.ts` 判斷 `environment.isMock && environment.envName === 'SIT'`，而且是獨立執行頁。
2. 條件成立時動態載入 `mocks/browser.ts`：建立 MSW worker，註冊共用的登入 handlers（`shared-mocks`）與這個模組的 `mocks/handlers.ts`，再 `worker.start()`。
3. `worker.start()` 註冊 `mockServiceWorker.js`。這個檔案在 SIT 建置時由 assets 從 msw 套件複製到 main.js 旁邊。
4. 元件呼叫 API → HttpClient 與 interceptor 照常處理 → Service Worker 攔截 → 比對 handlers，回傳 `mock.json` 的資料。
5. 沒有 handler 的請求照常送到後端（PASSTHROUGH）。`urlPreWordList` 判斷是專案 API（`/api/`）的，會在主控台提醒「還沒寫 handler」。

模擬帳號：`admin@example.com`、`manager@example.com`、`sales@example.com`、`viewer@example.com`，密碼任意。新增、修改、刪除只存在記憶體，重新整理後恢復。

被 Host 載入時不會啟動 MSW：Service Worker 只能控制自己目錄底下的頁面，管不到 Host 的頁面。

## 建置與部署

```bash
npm run build:site   # 建置全部前端並組成 dist/site
```

- **前端**：推送到 `main` 後，GitHub Actions 會執行 lint、分別建置 MFE 與 Host（base href 設為 `/<repo 名稱>/`）、組成網站，再部署到 GitHub Pages。GitHub Pages 沒有伺服器端路由，所以 `404.html` 是 `index.html` 的複本。
- **後端**：Render 依 `render.yaml` 以 Docker 建置 `apps/api`。`DB_PASSWORD` 在 Render 後台填入，`JWT_SECRET` 由 Render 自動產生；`CORS_ALLOWED_ORIGINS` 只允許 GitHub Pages 的網域。部署後把網址填入 `config/runtime-config.prod.json`。

## 核心設計

### manifest.json 與 runtime-config.json

兩者都在執行時才讀取，不打包進程式。新增、下架模組或調整版本只改 manifest；換後端網址只改 runtime-config，都不必重新建置。manifest 決定要執行哪些 JS，屬於信任邊界，Host 會檢查：

- 格式與必要欄位（`parseMfeManifest`），單一項目錯誤只略過該項。
- name、route、tagName 不可重複，route 不可佔用 Host 保留的路由。
- 入口 JS 必須與 Host 同源，避免 manifest 被竄改成外部網址時執行任意程式。
- `entry` 是相對於 manifest.json 的路徑，所以網站放在 `/` 或 `/mfe-platform/` 都能使用。

### MfeLoaderService

位置：`apps/host/src/app/core/services/mfe-loader.service.ts`

| 需求         | 做法                                                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| 動態載入     | 插入 `<script type="module">`，網址加上 `?v=<版本>`                                                                         |
| Promise 去重 | 同一個 MFE 載入中時，重複呼叫共用同一個 Promise                                                                             |
| 逾時         | 單次嘗試超過時限仍未完成「註冊」就算失敗；`onload` 只代表程式執行了，要等 `customElements.whenDefined`                      |
| 重試         | 指數退避（500 ms、1000 ms…）；每次請求都用沒用過的網址（`&retry=N`，整頁累計），因為瀏覽器會依網址記住 module script 的結果 |
| 狀態管理     | 每個 MFE 的狀態（idle、loading、retrying、loaded、failed、incompatible）放在 signal，畫面直接讀取                           |
| 版本相容     | manifest 的 `contractVersion` 與 Host 不同時不載入，也不重試                                                                |

### 契約版本

`MFE_CONTRACT_VERSION` 目前是 3：context 的 `api`（後端網址與 access token）是 MFE 讀寫資料的必要欄位，屬於不相容的變更，所以 manifest 的 `contractVersion` 也一起改成 3。

### 登入與 SSO

- `PlatformAuth`（shared-auth）負責登入、還原登入與 token 自動更新；Host 與獨立執行的模組共用。
- 所有地方使用同一個 localStorage key（`mfe-platform.session`）：在任何一處登入或登出，其他分頁與模組都會透過 `storage` 事件同步。
- 多個分頁同時要更新 token 時，以 Web Locks 確保只有一個分頁呼叫 refresh，其他分頁直接讀取新 token。
- 模組被 Host 載入時不自己登入，只用 Host 透過 context 傳來的 token；token 更新時 Host 會設定新的 context。

### 資料存取

- MFE 的 `ApiService` 只寫相對路徑（例如 `api/customers`）；共用的 `apiInterceptor` 從 context 取得後端網址與 token，並把錯誤轉成統一格式。
- 每個 MFE 的資料放在 `AppStore`（signals）。換人登入時先清空，並丟棄較早送出、較晚回來的回應，避免顯示上一位使用者的資料。

### 為什麼不用 zone.js

Angular 22 預設 zoneless。如果 Host 與每個 MFE 都需要 zone.js，就會共用同一個全域 `Zone`，版本不一致時很難排查。這裡全部 zoneless，每個 MFE 只靠 signals 更新畫面。

### 事件匯流排為什麼放在 window

每個 bundle 都各自打包一份 shared lib，模組層級的變數（例如 RxJS Subject）在 bundle 之間並不共用。`shared-event-bus` 因此不保存任何狀態，而是把 `CustomEvent` 派送到同一個 `window`，由瀏覽器轉送。

### 切換頁面時的清理

- Host 移除 Custom Element 後，Angular Elements 約 10 ms 後銷毀 MFE 內的元件。
- 已註冊的元素定義與載入過的 JS 無法卸載，下次進入直接使用，不會重新下載。
- MFE 自己的根 injector 會保留到整頁關閉。資料放在 root service，再次進入時先顯示上次的資料，同時重新讀取。

## 練習建議

- 用不同角色的帳號登入，比較選單、按鈕，以及沒有權限時後端回傳的訊息。
- 在 Host 登入後開啟 `/mfe/customer/index.html`，觀察獨立執行頁直接沿用登入（SSO）；在其中一處登出，另一處也會回到登入畫面。
- 開啟「庫存管理（故障示範）」，觀察重試次數與錯誤畫面；開發者工具的 Network 可以看到 `?retry=2` 的請求。
- 刪除一位還有行程的客戶，觀察 409 的提示訊息。
- 以模擬模式啟動模組，在開發者工具的 Application → Service Workers 看到 `mockServiceWorker.js`，Network 中的 API 由 Service Worker 回應。
- 把 manifest 中某個 MFE 的 `contractVersion` 改成 2，觀察「契約版本不相容」。
- 開發者工具輸入 `customElements.get('mfe-customer')`，或選取元素後查看 `$0.context`。
