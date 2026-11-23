import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import {
  AuthStatus,
  INITIAL_AUTH_SNAPSHOT,
  PlatformAuth,
  loadRuntimeConfig,
  type AuthSnapshot,
  type PlatformRuntimeConfig,
} from '@mfe-platform/shared-auth';
import type { Permission } from '@mfe-platform/shared-contracts';
import { hasPermission } from '@mfe-platform/shared-permission';
import { environment } from '../../../environments/environment';

/**
 * Host 的登入狀態，包裝共用的 PlatformAuth 並轉成 signal。
 *
 * 登入狀態與獨立執行的模組共用（同網域的瀏覽器儲存區），
 * 在模組的獨立頁登入後，回到 Host 不必再登入，反之亦然（SSO）。
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _document = inject(DOCUMENT);
  private readonly _snapshot = signal<AuthSnapshot>(INITIAL_AUTH_SNAPSHOT);
  private readonly _config = signal<PlatformRuntimeConfig | null>(null);
  private _platformAuth: PlatformAuth | null = null;
  private _initializing: Promise<void> | null = null;

  readonly snapshot = this._snapshot.asReadonly();
  readonly config = this._config.asReadonly();
  readonly status = computed(() => this._snapshot().status);
  readonly user = computed(() => this._snapshot().user);
  readonly role = computed(() => this._snapshot().role);
  readonly permissions = computed<readonly Permission[]>(
    () => this._snapshot().permissions,
  );
  readonly errorMessage = computed(() => this._snapshot().error);

  /**
   * 讀取執行時設定並還原既有登入；重複呼叫共用同一次結果，失敗後可再呼叫重試。
   *
   * @returns 初始化完成
   */
  initialize(): Promise<void> {
    this._initializing ??= this._start().catch((error: unknown) => {
      this._initializing = null;
      this._snapshot.set({
        ...INITIAL_AUTH_SNAPSHOT,
        status: AuthStatus.ERROR,
        error: `無法讀取平台設定：${error instanceof Error ? error.message : String(error)}`,
      });
    });
    return this._initializing;
  }

  /** @returns 是否已登入 */
  isAuthenticated(): boolean {
    return this.status() === AuthStatus.SIGNED_IN;
  }

  /**
   * @param permission 權限代碼
   * @returns 目前登入者是否有這個權限
   */
  can(permission: Permission): boolean {
    return hasPermission(this.permissions(), permission);
  }

  /**
   * @param email 登入 email
   * @param password 密碼
   * @returns 失敗時回傳給使用者看的訊息，成功回傳 null
   */
  async signIn(email: string, password: string): Promise<string | null> {
    await this.initialize();
    if (!this._platformAuth) {
      return this.errorMessage() ?? '登入服務尚未就緒';
    }
    return this._platformAuth.signIn(email, password);
  }

  /** 登出；所有分頁與獨立執行的模組同步登出 */
  async signOut(): Promise<void> {
    await this._platformAuth?.signOut();
  }

  private async _start(): Promise<void> {
    const configUrl = new URL(
      environment.runtimeConfigFile,
      this._document.baseURI,
    ).href;
    const config = await loadRuntimeConfig(configUrl);
    this._config.set(config);
    const platformAuth = new PlatformAuth(config);
    platformAuth.subscribe((snapshot) => this._snapshot.set(snapshot));
    this._platformAuth = platformAuth;
    await platformAuth.initialize();
  }
}
