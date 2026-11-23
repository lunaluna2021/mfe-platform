import type { MfeUser, Permission, Role } from '@mfe-platform/shared-contracts';
import { normalizePermissions } from '@mfe-platform/shared-permission';
import {
  parseTokenRes,
  type LoginReq,
  type RefreshTokenReq,
  type TokenRes,
} from './bff/auth-api.interface';
import { postJson, readErrorCode, readErrorMessage } from './http';
import type { PlatformRuntimeConfig } from './runtime-config';
import {
  SESSION_STORAGE_KEY,
  readStoredSession,
  writeStoredSession,
  type StoredSession,
} from './session-storage';

/** 登入狀態 */
export enum AuthStatus {
  INITIALIZING = 'initializing',
  SIGNED_OUT = 'signed-out',
  SIGNED_IN = 'signed-in',
  ERROR = 'error',
}

/** 登入狀態的快照，畫面依它顯示 */
export interface AuthSnapshot {
  readonly status: AuthStatus;
  readonly user: MfeUser | null;
  readonly email: string | null;
  readonly role: Role | null;
  readonly permissions: readonly Permission[];
  readonly accessToken: string | null;
  /** 需要讓使用者知道的原因，例如登入已過期 */
  readonly error: string | null;
}

export const INITIAL_AUTH_SNAPSHOT: AuthSnapshot = {
  status: AuthStatus.INITIALIZING,
  user: null,
  email: null,
  role: null,
  permissions: [],
  accessToken: null,
  error: null,
};

const SIGNED_OUT_SNAPSHOT: AuthSnapshot = {
  ...INITIAL_AUTH_SNAPSHOT,
  status: AuthStatus.SIGNED_OUT,
};

/** 同一個瀏覽器中，同時只允許一個分頁更新 token */
const REFRESH_LOCK_NAME = 'mfe-platform.refresh';
/** access token 到期前多久更新 */
const REFRESH_MARGIN_MS = 60_000;
/** 網路錯誤時多久後重試更新 */
const RETRY_DELAY_MS = 30_000;
/** 收到「已在其他分頁輪替」時，等待其他分頁寫回新 token 的時間 */
const ROTATION_WAIT_MS = 1_000;

/**
 * 平台的登入流程（不依賴 Angular），Host 與獨立執行的模組共用。
 *
 * - 登入狀態存在同網域的 localStorage，所有分頁與模組共用（SSO）；
 *   其他分頁登入、更新 token 或登出時，透過 storage 事件同步。
 * - access token 到期前 1 分鐘自動更新；多個分頁同時要更新時用 Web Locks 排隊，
 *   取得鎖後先重新讀取，其他分頁已更新就直接沿用，避免重複輪替。
 * - 非同步回應回來時先確認登入狀態沒有改變（例如期間已登出），才寫回結果。
 */
export class PlatformAuth {
  private _state: AuthSnapshot = INITIAL_AUTH_SNAPSHOT;
  private readonly _listeners = new Set<(snapshot: AuthSnapshot) => void>();
  private _initializing: Promise<void> | null = null;
  private _refreshing: Promise<boolean> | null = null;
  private _refreshTimer: ReturnType<typeof setTimeout> | undefined;
  private _isDisposed = false;

  /** 其他分頁或模組改變登入狀態時同步；key 為 null 代表整個儲存區被清除 */
  private readonly _handleStorage = (event: StorageEvent): void => {
    if (event.key === SESSION_STORAGE_KEY || event.key === null) {
      this._applySession(readStoredSession());
    }
  };

  /**
   * @param _config 執行時設定（後端網址）
   */
  constructor(private readonly _config: PlatformRuntimeConfig) {
    window.addEventListener('storage', this._handleStorage);
  }

  /** 目前的登入狀態 */
  get snapshot(): AuthSnapshot {
    return this._state;
  }

  /**
   * 訂閱狀態變化，會立即收到目前的狀態。
   *
   * @param listener 狀態改變時呼叫
   * @returns 取消訂閱的函式
   */
  subscribe(listener: (snapshot: AuthSnapshot) => void): () => void {
    this._listeners.add(listener);
    listener(this._state);
    return () => this._listeners.delete(listener);
  }

  /**
   * 還原既有的登入（例如在其他模組已登入）；重複呼叫共用同一次結果。
   *
   * @returns 還原完成
   */
  initialize(): Promise<void> {
    this._initializing ??= this._restore();
    return this._initializing;
  }

  /**
   * @param email 登入 email
   * @param password 密碼
   * @returns 失敗時回傳給使用者看的訊息，成功回傳 null
   */
  async signIn(email: string, password: string): Promise<string | null> {
    const request: LoginReq = { EMAIL: email, PASSWORD: password };
    const response = await postJson(this._url('login'), request);
    if (response.status === 200) {
      const token = parseTokenRes(response.body);
      if (!token) {
        return '登入回應格式不正確，請稍後再試';
      }
      this._saveAndApply(this._toSession(token));
      return null;
    }
    if (response.status === 0) {
      return '無法連線到伺服器，請檢查網路後再試';
    }
    return (
      readErrorMessage(response.body) ?? `登入失敗（HTTP ${response.status}）`
    );
  }

  /**
   * 先清除本機的登入狀態（所有分頁立即同步登出），再通知後端撤銷 refresh token。
   * 通知失敗不影響登出結果。
   */
  async signOut(): Promise<void> {
    const session = readStoredSession();
    writeStoredSession(null);
    this._applySession(null);
    if (session) {
      const request: RefreshTokenReq = { REFRESH_TOKEN: session.refreshToken };
      await postJson(this._url('logout'), request);
    }
  }

  /** 停止監聽與排程；建立者不再需要時呼叫（例如元件銷毀） */
  dispose(): void {
    this._isDisposed = true;
    clearTimeout(this._refreshTimer);
    window.removeEventListener('storage', this._handleStorage);
    this._listeners.clear();
  }

  /** 讀取既有的登入；access token 快到期時先更新 */
  private async _restore(): Promise<void> {
    const session = readStoredSession();
    if (!session) {
      this._applySession(null);
      return;
    }
    if (session.expiresAt - Date.now() > REFRESH_MARGIN_MS) {
      this._applySession(session);
      return;
    }
    await this._refresh();
  }

  /** 同一個分頁內的更新共用同一個 Promise */
  private _refresh(): Promise<boolean> {
    this._refreshing ??= this._withRefreshLock(() => this._doRefresh()).finally(
      () => {
        this._refreshing = null;
      },
    );
    return this._refreshing;
  }

  /** 瀏覽器支援 Web Locks 時，跨分頁排隊更新；不支援時直接執行 */
  private _withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
    const locks =
      typeof navigator === 'undefined' ? undefined : navigator.locks;
    return locks ? locks.request(REFRESH_LOCK_NAME, task) : task();
  }

  /**
   * @returns 更新後是否仍是登入狀態
   */
  private async _doRefresh(): Promise<boolean> {
    // 取得鎖之後重新讀取：其他分頁可能已經更新或登出
    const current = readStoredSession();
    if (!current) {
      this._applySession(null);
      return false;
    }
    if (current.expiresAt - Date.now() > REFRESH_MARGIN_MS) {
      this._applySession(current);
      return true;
    }

    const request: RefreshTokenReq = { REFRESH_TOKEN: current.refreshToken };
    const response = await postJson(this._url('refresh'), request);

    // 等待期間已登出或換了帳號：丟棄這次結果，以目前儲存的狀態為準
    const latest = readStoredSession();
    if (!latest || latest.refreshToken !== current.refreshToken) {
      this._applySession(latest);
      return latest !== null;
    }

    if (response.status === 200) {
      const token = parseTokenRes(response.body);
      if (token) {
        this._saveAndApply(this._toSession(token));
        return true;
      }
    } else if (
      response.status === 409 &&
      readErrorCode(response.body) === 'REFRESH_TOKEN_ROTATED'
    ) {
      // 其他分頁剛輪替過（沒有共用鎖的情況），稍等後改用它存下的新 token
      await delay(ROTATION_WAIT_MS);
      const rotated = readStoredSession();
      if (rotated && rotated.refreshToken !== current.refreshToken) {
        this._applySession(rotated);
        return true;
      }
      return this._expire();
    } else if (response.status === 401) {
      return this._expire();
    }

    // 網路錯誤、伺服器錯誤或格式不符：保留目前狀態，稍後再試
    this._applySession(current);
    clearTimeout(this._refreshTimer);
    this._refreshTimer = setTimeout(() => void this._refresh(), RETRY_DELAY_MS);
    return true;
  }

  /** refresh token 已失效：清除登入，提示重新登入 */
  private _expire(): boolean {
    writeStoredSession(null);
    this._applySession(null, '登入已過期，請重新登入');
    return false;
  }

  private _saveAndApply(session: StoredSession): void {
    writeStoredSession(session);
    this._applySession(session);
  }

  /** 套用登入狀態並排程下一次更新 */
  private _applySession(
    session: StoredSession | null,
    error: string | null = null,
  ): void {
    if (this._isDisposed) {
      return;
    }
    clearTimeout(this._refreshTimer);
    if (!session) {
      this._update({ ...SIGNED_OUT_SNAPSHOT, error });
      return;
    }
    this._update({
      status: AuthStatus.SIGNED_IN,
      user: session.user,
      email: session.email,
      role: session.role,
      permissions: session.permissions,
      accessToken: session.accessToken,
      error: null,
    });
    const delayMs = Math.max(
      session.expiresAt - Date.now() - REFRESH_MARGIN_MS,
      0,
    );
    this._refreshTimer = setTimeout(() => void this._refresh(), delayMs);
  }

  private _toSession(token: TokenRes): StoredSession {
    return {
      accessToken: token.ACCESS_TOKEN,
      refreshToken: token.REFRESH_TOKEN,
      expiresAt: Date.now() + token.EXPIRES_IN * 1000,
      user: {
        id: token.USER.ID,
        displayName: token.USER.DISPLAY_NAME,
        roles: [token.USER.ROLE],
      },
      email: token.USER.EMAIL,
      role: token.USER.ROLE,
      permissions: normalizePermissions(token.USER.PERMISSIONS),
    };
  }

  private _update(snapshot: AuthSnapshot): void {
    this._state = snapshot;
    this._listeners.forEach((listener) => listener(snapshot));
  }

  private _url(action: 'login' | 'refresh' | 'logout'): string {
    return `${this._config.api.baseUrl}/api/auth/${action}`;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
