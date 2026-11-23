import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  DOCUMENT,
  type OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  AuthStatus,
  INITIAL_AUTH_SNAPSHOT,
  PlatformAuth,
  buildHostContext,
  loadRuntimeConfig,
  type AuthSnapshot,
  type PlatformRuntimeConfig,
} from '@mfe-platform/shared-auth';
import {
  isNotifyLevel,
  type MfeHostContext,
  type MfeNotifyLevel,
  type MfeSelectedCustomer,
} from '@mfe-platform/shared-contracts';
import { createMfeEventBus } from '@mfe-platform/shared-event-bus';
import { LoginForm, type LoginCredentials } from '@mfe-platform/shared-ui';

const MESSAGE_DISPLAY_MS = 4_000;

/** 獨立執行時頁面上方顯示的訊息 */
interface StandaloneMessage {
  readonly level: MfeNotifyLevel;
  readonly text: string;
}

/**
 * 模組獨立執行時的外框，取代 Host 的角色：
 * - 讀取 runtime-config，用共用的登入表單登入 Java 後端；
 * - 與 Host 使用同一份登入狀態，同網域已登入時直接沿用（SSO）；
 * - 接收模組發出的事件（選取客戶、提示訊息），組出和 Host 相同結構的 context。
 *
 * 模組在模板中用 @defer 載入這個元件，被 Host 載入時不會下載這段程式。
 */
@Component({
  selector: 'lib-mfe-standalone-session',
  imports: [LoginForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loadError(); as error) {
      <p class="session-error" role="alert">{{ error }}</p>
    } @else {
      @switch (snapshot().status) {
        @case (authStatus.INITIALIZING) {
          <p class="session-note">正在確認登入狀態…</p>
        }
        @case (authStatus.SIGNED_OUT) {
          <div class="login-wrap">
            <lib-login-form
              [heading]="appTitle() + '（獨立執行）'"
              description="使用平台帳號登入。若已在同一網域的平台或其他模組登入，會自動沿用（SSO）。"
              [isSubmitting]="isSubmitting()"
              [errorMessage]="loginError() ?? snapshot().error"
              (submitted)="onLogin($event)"
            />
          </div>
        }
        @case (authStatus.SIGNED_IN) {
          <div class="session-bar">
            <span>獨立執行模式・{{ snapshot().user?.displayName }}</span>
            <button type="button" (click)="onLogout()">登出</button>
          </div>
        }
      }
    }
    @if (message(); as current) {
      <p
        class="session-message"
        [class]="'level-' + current.level"
        role="status"
      >
        {{ current.text }}
      </p>
    }
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: 16px;
    }
    .login-wrap {
      display: flex;
      justify-content: center;
      padding: 24px 0;
    }
    .session-note {
      margin: 0;
      color: var(--color-muted, #6b7280);
    }
    .session-error {
      margin: 0;
      color: var(--color-danger, #dc2626);
    }
    .session-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      background: var(--color-primary-soft, #e0eaff);
      font-size: 14px;
    }
    button {
      padding: 4px 10px;
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 6px;
      background: var(--color-surface, #fff);
      font: inherit;
      cursor: pointer;
    }
    .session-message {
      margin: 8px 0 0;
      padding: 8px 12px;
      border-left: 4px solid var(--color-primary, #2563eb);
      border-radius: 6px;
      background: var(--color-surface, #fff);
      font-size: 14px;
    }
    .level-success {
      border-left-color: var(--color-success, #16a34a);
    }
    .level-warning {
      border-left-color: var(--color-warning, #d97706);
    }
    .level-error {
      border-left-color: var(--color-danger, #dc2626);
    }
  `,
})
export class MfeStandaloneSession implements OnInit {
  /** 模組名稱，顯示在登入表單標題 */
  readonly appTitle = input.required<string>();
  /** 相對於頁面的設定檔位置，由模組的 environment 決定 */
  readonly configUrl = input('runtime-config.json');
  /** 登入完成、token 更新或選取客戶時送出新的 context；登出時送出 null */
  readonly contextChange = output<MfeHostContext | null>();

  protected readonly authStatus = AuthStatus;
  protected readonly snapshot = signal<AuthSnapshot>(INITIAL_AUTH_SNAPSHOT);
  protected readonly loadError = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly loginError = signal<string | null>(null);
  protected readonly message = signal<StandaloneMessage | null>(null);

  private readonly _document = inject(DOCUMENT);
  private readonly _config = signal<PlatformRuntimeConfig | null>(null);
  private readonly _selectedCustomer = signal<MfeSelectedCustomer | null>(null);
  private readonly _context = computed(() =>
    buildHostContext(this.snapshot(), this._config(), this._selectedCustomer()),
  );
  private _auth: PlatformAuth | null = null;
  private _isDestroyed = false;
  private _messageTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    const bus = createMfeEventBus('standalone');
    const unsubscribers = [
      bus.on('customer:selected', ({ payload }) =>
        this._handleCustomerSelected(payload.customer),
      ),
      bus.on('notify', ({ payload }) => {
        if (
          isNotifyLevel(payload.level) &&
          typeof payload.message === 'string'
        ) {
          this._showMessage(payload.level, payload.message);
        }
      }),
      bus.on('navigate', () =>
        this._showMessage(
          'info',
          '獨立執行模式只有這個模組，無法切換到其他模組',
        ),
      ),
    ];

    effect(() => this.contextChange.emit(this._context()));

    inject(DestroyRef).onDestroy(() => {
      this._isDestroyed = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      clearTimeout(this._messageTimer);
      this._auth?.dispose();
    });
  }

  /** input 在 ngOnInit 時才有值，所以不在 constructor 讀取 configUrl */
  ngOnInit(): void {
    void this._start();
  }

  /**
   * @param credentials 登入表單送出的 email 與密碼
   */
  protected async onLogin(credentials: LoginCredentials): Promise<void> {
    if (!this._auth) {
      return;
    }
    this.isSubmitting.set(true);
    this.loginError.set(null);
    const error = await this._auth.signIn(
      credentials.email,
      credentials.password,
    );
    this.loginError.set(error);
    this.isSubmitting.set(false);
  }

  /** 登出：所有分頁與 Host 同步登出 */
  protected async onLogout(): Promise<void> {
    this._selectedCustomer.set(null);
    await this._auth?.signOut();
  }

  private async _start(): Promise<void> {
    try {
      const url = new URL(this.configUrl(), this._document.baseURI).href;
      const config = await loadRuntimeConfig(url);
      if (this._isDestroyed) {
        return;
      }
      this._config.set(config);
      const auth = new PlatformAuth(config);
      this._auth = auth;
      auth.subscribe((snapshot) => this.snapshot.set(snapshot));
      await auth.initialize();
    } catch (error) {
      this.loadError.set(
        `無法讀取平台設定：${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** 事件來自其他 bundle，執行時仍檢查格式 */
  private _handleCustomerSelected(customer: unknown): void {
    if (customer === null) {
      this._selectedCustomer.set(null);
      return;
    }
    const record = customer as Record<string, unknown> | undefined;
    if (
      typeof record?.['id'] === 'string' &&
      typeof record['name'] === 'string'
    ) {
      this._selectedCustomer.set({ id: record['id'], name: record['name'] });
    }
  }

  private _showMessage(level: MfeNotifyLevel, text: string): void {
    clearTimeout(this._messageTimer);
    this.message.set({ level, text });
    this._messageTimer = setTimeout(
      () => this.message.set(null),
      MESSAGE_DISPLAY_MS,
    );
  }
}
