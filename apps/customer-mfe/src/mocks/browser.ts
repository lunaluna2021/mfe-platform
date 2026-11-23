import { authHandlers } from '@mfe-platform/shared-mocks';
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * 這個 MFE 的 MSW worker：註冊登入（共用）與客戶 API 的 handlers。
 * 只在模擬模式下由 bootstrap.ts 動態載入並啟動，正式環境不會下載。
 */
export const worker = setupWorker(...authHandlers, ...handlers);
