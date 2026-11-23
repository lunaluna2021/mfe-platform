import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DEMO_ACCOUNTS, type DemoAccount } from '@mfe-platform/shared-auth';
import { resolvePermissions } from '@mfe-platform/shared-permission';
import { APP_TITLE, ROLE_LABELS } from '../app.constants';
import { isSafeReturnUrl } from '../core/auth/auth.guard';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="login">
      <h1>{{ appTitle }}</h1>
      <p class="lead">選擇一個示範帳號登入，觀察不同權限看到的選單與按鈕。</p>
      <p class="notice">這是練習用的模擬登入，沒有密碼，也沒有後端驗證。</p>

      <div class="accounts">
        @for (account of accounts; track account.id) {
          <button type="button" class="account" (click)="login(account)">
            <span class="name">{{ account.displayName }}</span>
            <span class="role">{{ roleText(account) }}</span>
            <span class="description">{{ account.description }}</span>
            <span class="permissions">{{ permissionText(account) }}</span>
          </button>
        }
      </div>
    </main>
  `,
  styles: `
    .login {
      max-width: 720px;
      margin: 0 auto;
      padding: 48px 16px;
    }
    h1 {
      margin: 0 0 8px;
    }
    .lead {
      margin: 0 0 4px;
    }
    .notice {
      margin: 0 0 24px;
      color: var(--color-muted);
      font-size: 14px;
    }
    .accounts {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
      gap: 12px;
    }
    .account {
      display: grid;
      gap: 4px;
      padding: 16px;
      border: 1px solid var(--color-border);
      border-radius: 10px;
      background: var(--color-surface);
      color: var(--color-text);
      text-align: left;
      font: inherit;
      cursor: pointer;
    }
    .account:hover,
    .account:focus-visible {
      border-color: var(--color-primary);
      outline: none;
    }
    .name {
      font-weight: 700;
      font-size: 17px;
    }
    .role {
      color: var(--color-primary);
      font-size: 14px;
    }
    .description {
      font-size: 14px;
    }
    .permissions {
      color: var(--color-muted);
      font-size: 12px;
      font-family: var(--font-mono);
    }
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly appTitle = APP_TITLE;
  protected readonly accounts = DEMO_ACCOUNTS;

  constructor() {
    if (this.auth.isAuthenticated(Date.now())) {
      void this.router.navigateByUrl('/');
    }
  }

  protected roleText(account: DemoAccount): string {
    return account.roles.map((role) => ROLE_LABELS[role]).join('、');
  }

  protected permissionText(account: DemoAccount): string {
    return resolvePermissions(account.roles).join(' ');
  }

  protected login(account: DemoAccount): void {
    this.auth.login(account);
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    void this.router.navigateByUrl(
      isSafeReturnUrl(returnUrl) ? returnUrl : '/',
    );
  }
}
