/** 單次載入（下載加上元素註冊）的預設逾時，manifest 可個別覆寫 */
export const DEFAULT_LOAD_TIMEOUT_MS = 10_000;

/** 第一次失敗後的預設重試次數，manifest 可個別覆寫 */
export const DEFAULT_MAX_RETRIES = 2;

/** 重試的基本等待時間；每次失敗後加倍 */
export const RETRY_BASE_DELAY_MS = 500;

/** 讀取 manifest 的逾時 */
export const MANIFEST_TIMEOUT_MS = 8_000;
