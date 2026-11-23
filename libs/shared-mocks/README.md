# shared-mocks

各 MFE 共用的 MSW mock handlers。目前提供登入相關 API（`api/auth/login`、`refresh`、`logout`、`me`）的模擬，讓模擬模式不需要啟動後端。

- 模擬帳號在 `src/lib/mock.json`：admin、manager、sales、viewer（`@example.com`）。登入只比對 Email，密碼任意。
- 只在 MFE 獨立執行、且 `environment.isMock && environment.envName === 'SIT'` 時，由各 MFE 的 `mocks/browser.ts` 註冊。正式建置不會載入。
