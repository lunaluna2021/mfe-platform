import { RETRY_BASE_DELAY_MS } from '../const/mfe-loader.const';
import type { LoadableMfeEntry } from '../interfaces/loadable-mfe-entry.interface';

/**
 * 入口網址加上版本參數。
 *
 * - `v`：manifest 的版本改變時網址跟著改變，瀏覽器就會下載新檔。
 * - `retry`：瀏覽器會依網址記住 module script 的結果，不論是下載失敗，
 *   還是已經執行過（即使執行後初始化失敗）。同一個網址再插入一次，
 *   既不會重新下載也不會重新執行，所以每次重試都必須是從沒用過的網址。
 *
 * @param entry manifest 項目
 * @param requestSerial 這個 MFE 在整個頁面期間第幾次發出請求（跨多輪「重新載入」累計）
 * @returns 要插入 script 的網址
 */
export function buildEntryUrl(
  entry: LoadableMfeEntry,
  requestSerial: number,
): string {
  const url = new URL(entry.entryUrl);
  url.searchParams.set('v', entry.version);
  if (requestSerial > 1) {
    url.searchParams.set('retry', String(requestSerial));
  }
  return url.href;
}

/**
 * 指數退避：第 1 次失敗後等 500 ms，第 2 次後等 1000 ms，依此類推。
 *
 * @param failedAttempt 剛失敗的是第幾次嘗試
 * @returns 下一次嘗試前要等待的毫秒數
 */
export function retryDelayMs(failedAttempt: number): number {
  return RETRY_BASE_DELAY_MS * 2 ** (failedAttempt - 1);
}
