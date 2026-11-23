import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import {
  isContractCompatible,
  MFE_CONTRACT_VERSION,
} from '@mfe-platform/shared-contracts';
import type { LoadableMfeEntry } from './loadable-entry';

export type MfeLoadStatus =
  'idle' | 'loading' | 'retrying' | 'loaded' | 'failed' | 'incompatible';

export interface MfeLoadState {
  readonly status: MfeLoadStatus;
  /** 目前或最後一次是第幾次嘗試（從 1 開始） */
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly error: string | null;
}

export const IDLE_LOAD_STATE: MfeLoadState = {
  status: 'idle',
  attempt: 0,
  maxAttempts: 0,
  error: null,
};

export type MfeLoadFailureReason = 'incompatible' | 'network' | 'timeout';

export class MfeLoadError extends Error {
  override readonly name = 'MfeLoadError';

  constructor(
    readonly mfeName: string,
    readonly reason: MfeLoadFailureReason,
    message: string,
  ) {
    super(message);
  }
}

export const DEFAULT_LOAD_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 500;

/**
 * 入口網址加上版本參數。
 *
 * - `v`：manifest 的版本改變時網址跟著改變，瀏覽器就會下載新檔。
 * - `retry`：瀏覽器會依網址記住 module script 的結果，不論是下載失敗，
 *   還是已經執行過（即使執行後初始化失敗）。同一個網址再插入一次，
 *   既不會重新下載也不會重新執行，所以每次重試都必須是從沒用過的網址。
 *
 * @param requestSerial 這個 MFE 在整個頁面期間第幾次發出請求（跨多輪「重新載入」累計）
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

/** 指數退避：第 1 次失敗後等 500 ms，第 2 次後等 1000 ms，依此類推 */
export function retryDelayMs(failedAttempt: number): number {
  return RETRY_BASE_DELAY_MS * 2 ** (failedAttempt - 1);
}

/**
 * 依 manifest 動態載入 MFE 的入口 JS，並等到 Custom Element 註冊完成。
 *
 * 處理四件事：
 * 1. Promise 去重：同一個 MFE 同時被要求多次時，共用同一個載入中的 Promise。
 * 2. 逾時：單次嘗試超過 loadTimeoutMs 仍未完成註冊就算失敗。
 *    script 的 load 事件只代表程式執行了，MFE 內的 createApplication 是非同步的，
 *    所以要等 customElements.whenDefined 才算真正可用。
 * 3. 重試：失敗後以指數退避再試 maxRetries 次；契約不相容則不重試。
 * 4. 狀態管理：每個 MFE 的狀態放在 signal，畫面直接讀取。
 */
@Injectable({ providedIn: 'root' })
export class MfeLoaderService {
  private readonly document = inject(DOCUMENT);
  private readonly inFlight = new Map<string, Promise<void>>();
  private readonly states = signal<Readonly<Record<string, MfeLoadState>>>({});
  /**
   * 每個 MFE 累計發出的請求數。不能用每一輪的 attempt：使用者按「重新載入」時
   * attempt 會從 1 重新計算，產生已經用過的網址，瀏覽器就不會再執行。
   */
  private readonly requestSerials = new Map<string, number>();

  /** 在 computed 或模板中讀取時會隨狀態更新 */
  stateFor(name: string): MfeLoadState {
    return this.states()[name] ?? IDLE_LOAD_STATE;
  }

  /**
   * 載入 MFE。已註冊的元素直接完成；失敗時 Promise 會 reject 為 MfeLoadError，
   * 之後再呼叫一次就會重新開始（例如使用者按「重新載入」）。
   */
  load(entry: LoadableMfeEntry): Promise<void> {
    if (!isContractCompatible(entry.contractVersion)) {
      const message = `${entry.title} 使用契約版本 ${entry.contractVersion}，Host 支援的是 ${MFE_CONTRACT_VERSION}`;
      this.setState(entry.name, {
        status: 'incompatible',
        attempt: 0,
        maxAttempts: 0,
        error: message,
      });
      return Promise.reject(
        new MfeLoadError(entry.name, 'incompatible', message),
      );
    }

    if (customElements.get(entry.tagName)) {
      this.markLoaded(entry.name);
      return Promise.resolve();
    }

    const pending = this.inFlight.get(entry.name);
    if (pending) {
      return pending;
    }

    const loading = this.loadWithRetry(entry).finally(() => {
      // 成功後由 customElements.get 判斷；失敗後清掉，下次呼叫才能重新開始
      this.inFlight.delete(entry.name);
    });
    this.inFlight.set(entry.name, loading);
    return loading;
  }

  private async loadWithRetry(entry: LoadableMfeEntry): Promise<void> {
    const maxAttempts = 1 + (entry.maxRetries ?? DEFAULT_MAX_RETRIES);
    let lastError: MfeLoadError | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      this.setState(entry.name, {
        status: attempt === 1 ? 'loading' : 'retrying',
        attempt,
        maxAttempts,
        error: lastError?.message ?? null,
      });

      try {
        await this.loadOnce(entry);
        this.setState(entry.name, {
          status: 'loaded',
          attempt,
          maxAttempts,
          error: null,
        });
        return;
      } catch (error) {
        lastError =
          error instanceof MfeLoadError
            ? error
            : new MfeLoadError(entry.name, 'network', String(error));
        console.warn(
          `[mfe:${entry.name}] 第 ${attempt}/${maxAttempts} 次載入失敗：${lastError.message}`,
        );
        if (attempt < maxAttempts) {
          await delay(retryDelayMs(attempt));
        }
      }
    }

    const finalError =
      lastError ?? new MfeLoadError(entry.name, 'network', '載入失敗');
    this.setState(entry.name, {
      status: 'failed',
      attempt: maxAttempts,
      maxAttempts,
      error: finalError.message,
    });
    throw finalError;
  }

  /** 單次嘗試：插入 module script，等待下載、執行與元素註冊，或逾時 */
  private loadOnce(entry: LoadableMfeEntry): Promise<void> {
    if (customElements.get(entry.tagName)) {
      // 前一次逾時的 script 可能已在背景完成註冊
      return Promise.resolve();
    }

    const timeoutMs = entry.loadTimeoutMs ?? DEFAULT_LOAD_TIMEOUT_MS;
    const url = buildEntryUrl(entry, this.nextRequestSerial(entry.name));

    return new Promise<void>((resolve, reject) => {
      const script = this.document.createElement('script');
      let settled = false;

      const settle = (error?: MfeLoadError): void => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        script.onload = null;
        script.onerror = null;
        if (error) {
          // 移除失敗的標籤，避免殘留的 script 讓之後的判斷誤以為已載入；
          // 已開始的下載或執行無法取消，所以 MFE 端也要防止重複註冊
          script.remove();
          reject(error);
        } else {
          resolve();
        }
      };

      const timer = setTimeout(
        () =>
          settle(
            new MfeLoadError(
              entry.name,
              'timeout',
              `超過 ${timeoutMs} ms 仍未完成 <${entry.tagName}> 的註冊`,
            ),
          ),
        timeoutMs,
      );

      script.type = 'module';
      script.src = url;
      script.dataset['mfe'] = entry.name;
      script.onerror = () =>
        settle(new MfeLoadError(entry.name, 'network', `無法下載 ${url}`));
      script.onload = () => {
        void customElements.whenDefined(entry.tagName).then(() => settle());
      };

      this.document.head.appendChild(script);
    });
  }

  private nextRequestSerial(name: string): number {
    const serial = (this.requestSerials.get(name) ?? 0) + 1;
    this.requestSerials.set(name, serial);
    return serial;
  }

  private markLoaded(name: string): void {
    const current = this.stateFor(name);
    if (current.status !== 'loaded') {
      this.setState(name, {
        status: 'loaded',
        attempt: current.attempt,
        maxAttempts: current.maxAttempts,
        error: null,
      });
    }
  }

  private setState(name: string, state: MfeLoadState): void {
    this.states.update((states) => ({ ...states, [name]: state }));
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
