import { bootstrap } from './bootstrap';

// 啟動流程在 bootstrap.ts：依環境決定是否先啟動 MSW 模擬 API，再註冊 Custom Element。
// 註冊的標籤名稱（core/const/app.const.ts 的 TAG_NAME）必須與 manifest.json 的 tagName 相同。
void bootstrap();
