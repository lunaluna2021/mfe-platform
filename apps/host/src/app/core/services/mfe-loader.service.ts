import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import {
  MFE_CONTRACT_VERSION,
  isContractCompatible,
} from '@mfe-platform/shared-contracts';
import {
  DEFAULT_LOAD_TIMEOUT_MS,
  DEFAULT_MAX_RETRIES,
} from '../const/mfe-loader.const';
import {
  MfeLoadFailureReason,
  MfeLoadStatus,
} from '../enums/mfe-load-status.enum';
import type { LoadableMfeEntry } from '../interfaces/loadable-mfe-entry.interface';
import type { MfeLoadState } from '../interfaces/mfe-load-state.interface';
import { buildEntryUrl, retryDelayMs } from '../utils/entry-url.util';

/** 尚未載入過的 MFE 狀態 */
export const IDLE_LOAD_STATE: MfeLoadState = {
  status: MfeLoadStatus.IDLE,
  attempt: 0,
  maxAttempts: 0,
  errorMessage: null,
};

/** MFE 載入失敗 */
export class MfeLoadError extends Error {
  override readonly name = 'MfeLoadError';

  /**
   * @param mfeName manifest 的 name
   * @param reason 失敗原因
   * @param message 給使用者看的訊息
   */
  constructor(
    readonly mfeName: string,
    readonly reason: MfeLoadFailureReason,
    message: string,
  ) {
    super(message);
  }
}

/**
 * 依 manifest 動態載入 MFE 的入口 JS，並等到 Custom Element 註冊完成。
 *
 * 1. Promise 去重：同一個 MFE 同時被要求多次時，共用同一個載入中的 Promise。
 * 2. 逾時：單次嘗試超過 loadTimeoutMs 仍未完成註冊就算失敗。script 的 load 事件
 *    只代表程式執行了，MFE 內的 createApplication 是非同步的，要等 whenDefined 才算可用。
 * 3. 重試：失敗後以指數退避再試 maxRetries 次；契約不相容則不重試。
 * 4. 狀態管理：每個 MFE 的狀態放在 signal，畫面直接讀取。
 */
@Injectable({ providedIn: 'root' })
export class MfeLoaderService {
  private readonly _document = inject(DOCUMENT);
  private readonly _inFlight = new Map<string, Promise<void>>();
  private readonly _states = signal<Readonly<Record<string, MfeLoadState>>>({});
  /**
   * 每個 MFE 累計發出的請求數。不能用每一輪的 attempt：使用者按「重新載入」時
   * attempt 會從 1 重新計算，產生已經用過的網址，瀏覽器就不會再執行。
   */
  private readonly _requestSerials = new Map<string, number>();

  /**
   * 在 computed 或模板中讀取時會隨狀態更新。
   *
   * @param name manifest 的 name
   * @returns 載入狀態
   */
  stateFor(name: string): MfeLoadState {
    return this._states()[name] ?? IDLE_LOAD_STATE;
  }

  /**
   * 載入 MFE。已註冊的元素直接完成；失敗時 reject 為 MfeLoadError，
   * 之後再呼叫一次就會重新開始（例如使用者按「重新載入」）。
   *
   * @param entry manifest 項目
   * @returns 元素可以使用時完成
   */
  load(entry: LoadableMfeEntry): Promise<void> {
    if (!isContractCompatible(entry.contractVersion)) {
      const message = `${entry.title} 使用契約版本 ${entry.contractVersion}，Host 支援的是 ${MFE_CONTRACT_VERSION}`;
      this._setState(entry.name, {
        status: MfeLoadStatus.INCOMPATIBLE,
        attempt: 0,
        maxAttempts: 0,
        errorMessage: message,
      });
      return Promise.reject(
        new MfeLoadError(
          entry.name,
          MfeLoadFailureReason.INCOMPATIBLE,
          message,
        ),
      );
    }

    if (customElements.get(entry.tagName)) {
      this._markLoaded(entry.name);
      return Promise.resolve();
    }

    const pending = this._inFlight.get(entry.name);
    if (pending) {
      return pending;
    }

    const loading = this._loadWithRetry(entry).finally(() => {
      // 成功後由 customElements.get 判斷；失敗後清掉，下次呼叫才能重新開始
      this._inFlight.delete(entry.name);
    });
    this._inFlight.set(entry.name, loading);
    return loading;
  }

  private async _loadWithRetry(entry: LoadableMfeEntry): Promise<void> {
    const maxAttempts = 1 + (entry.maxRetries ?? DEFAULT_MAX_RETRIES);
    let lastError: MfeLoadError | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      this._setState(entry.name, {
        status: attempt === 1 ? MfeLoadStatus.LOADING : MfeLoadStatus.RETRYING,
        attempt,
        maxAttempts,
        errorMessage: lastError?.message ?? null,
      });

      try {
        await this._loadOnce(entry);
        this._setState(entry.name, {
          status: MfeLoadStatus.LOADED,
          attempt,
          maxAttempts,
          errorMessage: null,
        });
        return;
      } catch (error) {
        lastError =
          error instanceof MfeLoadError
            ? error
            : new MfeLoadError(
                entry.name,
                MfeLoadFailureReason.NETWORK,
                String(error),
              );
        console.warn(
          `[mfe:${entry.name}] 第 ${attempt}/${maxAttempts} 次載入失敗：${lastError.message}`,
        );
        if (attempt < maxAttempts) {
          await delay(retryDelayMs(attempt));
        }
      }
    }

    const finalError =
      lastError ??
      new MfeLoadError(entry.name, MfeLoadFailureReason.NETWORK, '載入失敗');
    this._setState(entry.name, {
      status: MfeLoadStatus.FAILED,
      attempt: maxAttempts,
      maxAttempts,
      errorMessage: finalError.message,
    });
    throw finalError;
  }

  /** 單次嘗試：插入 module script，等待下載、執行與元素註冊，或逾時 */
  private _loadOnce(entry: LoadableMfeEntry): Promise<void> {
    if (customElements.get(entry.tagName)) {
      // 前一次逾時的 script 可能已在背景完成註冊
      return Promise.resolve();
    }

    const timeoutMs = entry.loadTimeoutMs ?? DEFAULT_LOAD_TIMEOUT_MS;
    const url = buildEntryUrl(entry, this._nextRequestSerial(entry.name));

    return new Promise<void>((resolve, reject) => {
      const script = this._document.createElement('script');
      let isSettled = false;

      const settle = (error?: MfeLoadError): void => {
        if (isSettled) {
          return;
        }
        isSettled = true;
        clearTimeout(timer);
        script.onload = null;
        script.onerror = null;
        if (error) {
          // 移除失敗的標籤；已開始的下載或執行無法取消，所以 MFE 端也要防止重複註冊
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
              MfeLoadFailureReason.TIMEOUT,
              `超過 ${timeoutMs} ms 仍未完成 <${entry.tagName}> 的註冊`,
            ),
          ),
        timeoutMs,
      );

      script.type = 'module';
      script.src = url;
      script.dataset['mfe'] = entry.name;
      script.onerror = () =>
        settle(
          new MfeLoadError(
            entry.name,
            MfeLoadFailureReason.NETWORK,
            `無法下載 ${url}`,
          ),
        );
      script.onload = () => {
        void customElements.whenDefined(entry.tagName).then(() => settle());
      };

      this._document.head.appendChild(script);
    });
  }

  private _nextRequestSerial(name: string): number {
    const serial = (this._requestSerials.get(name) ?? 0) + 1;
    this._requestSerials.set(name, serial);
    return serial;
  }

  private _markLoaded(name: string): void {
    const current = this.stateFor(name);
    if (current.status !== MfeLoadStatus.LOADED) {
      this._setState(name, {
        ...current,
        status: MfeLoadStatus.LOADED,
        errorMessage: null,
      });
    }
  }

  private _setState(name: string, state: MfeLoadState): void {
    this._states.update((states) => ({ ...states, [name]: state }));
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
