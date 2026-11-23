import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthStatus } from '@mfe-platform/shared-auth';
import { LoginForm, type LoginCredentials } from '@mfe-platform/shared-ui';
import { APP_TITLE } from '../../core/const/app.const';
import { AuthService } from '../../core/services/auth.service';
import { isSafeReturnUrl } from '../../core/utils/return-url.util';

/** 登入頁。已登入時（包含在其他分頁或模組登入，SSO）自動進入原本要去的頁面 */
@Component({
  selector: 'app-login-page',
  imports: [LoginForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="login">
      @switch (auth.status()) {
        @case (authStatus.INITIALIZING) {
          <p class="note">正在確認登入狀態…</p>
        }
        @case (authStatus.ERROR) {
          <div class="note error" role="alert">
            <p>{{ auth.errorMessage() }}</p>
            <button type="button" class="button" (click)="onRetry()">
              重試
            </button>
          </div>
        }
        @default {
          <lib-login-form
            [heading]="appTitle"
            description="登入一次即可使用所有模組；在模組的獨立頁登入也會共用（SSO）。"
            [isSubmitting]="isSubmitting()"
            [errorMessage]="loginError() ?? auth.errorMessage()"
            (submitted)="onLogin($event)"
          />
        }
      }
    </main>
  `,
  styles: `
    .login {
      display: flex;
      justify-content: center;
      padding: 64px 16px;
    }
    .note {
      margin: 0;
      color: var(--color-muted);
    }
    .error {
      color: var(--color-text);
    }
  `,
})
export class LoginPage {
  protected readonly auth = inject(AuthService);
  protected readonly authStatus = AuthStatus;
  protected readonly appTitle = APP_TITLE;
  protected readonly isSubmitting = signal(false);
  protected readonly loginError = signal<string | null>(null);

  private readonly _router = inject(Router);
  private readonly _route = inject(ActivatedRoute);

  constructor() {
    void this.auth.initialize();

    // 不只檢查一次：其他分頁或模組登入後，這一頁也要跟著進入
    effect(() => {
      if (this.auth.status() === AuthStatus.SIGNED_IN) {
        untracked(() => this._goToReturnUrl());
      }
    });
  }

  /** 讀取設定失敗後重試 */
  protected onRetry(): void {
    void this.auth.initialize();
  }

  /**
   * 登入成功後由 effect 導頁，這裡只處理失敗訊息。
   *
   * @param credentials 登入表單送出的 email 與密碼
   */
  protected async onLogin(credentials: LoginCredentials): Promise<void> {
    this.isSubmitting.set(true);
    this.loginError.set(null);
    const error = await this.auth.signIn(
      credentials.email,
      credentials.password,
    );
    this.isSubmitting.set(false);
    this.loginError.set(error);
  }

  private _goToReturnUrl(): void {
    const returnUrl = this._route.snapshot.queryParamMap.get('returnUrl');
    void this._router.navigateByUrl(
      isSafeReturnUrl(returnUrl) ? returnUrl : '/',
    );
  }
}
