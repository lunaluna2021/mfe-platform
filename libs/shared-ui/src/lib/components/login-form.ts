import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import { DEMO_ACCOUNTS } from '../const/demo-accounts';

/** 登入表單送出的資料 */
export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
}

/**
 * 共用的登入表單。只負責畫面與必填檢查；送出後由呼叫端執行登入，
 * 再把 isSubmitting、errorMessage 傳回來顯示。Host 的登入頁與獨立執行的模組都用它。
 *
 * 顏色使用 Host 定義的 CSS 變數並附預設值，放在 Shadow DOM 內也能正常顯示。
 */
@Component({
  selector: 'lib-login-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="login-form" (submit)="onSubmit($event)" novalidate>
      <h1>{{ heading() }}</h1>
      @if (description()) {
        <p class="description">{{ description() }}</p>
      }
      <label>
        Email
        <input
          type="email"
          name="email"
          autocomplete="username"
          [value]="email()"
          (input)="email.set(readValue($event))"
        />
      </label>
      <label>
        密碼
        <input
          type="password"
          name="password"
          autocomplete="current-password"
          [value]="password()"
          (input)="password.set(readValue($event))"
        />
      </label>
      @if (localError() ?? errorMessage(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }
      <button type="submit" [disabled]="isSubmitting()">
        {{ isSubmitting() ? '登入中…' : '登入' }}
      </button>
      <fieldset class="demo-accounts" [disabled]="isSubmitting()">
        <legend>範例帳號</legend>
        <div class="demo-grid">
          @for (account of demoAccounts; track account.email) {
            <button
              type="button"
              class="demo-account"
              (click)="fillDemoAccount(account)"
            >
              <span>{{ account.label }}</span>
              <small>{{ account.email }}</small>
            </button>
          }
        </div>
      </fieldset>
      <p class="hint">帳號由管理員建立，不開放自行註冊。</p>
    </form>
  `,
  styles: `
    .login-form {
      box-sizing: border-box;
      display: grid;
      gap: 14px;
      width: min(100%, 380px);
      padding: 24px;
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 12px;
      background: var(--color-surface, #fff);
      color: var(--color-text, #1f2937);
      font-family: var(--font-sans, system-ui, sans-serif);
    }
    h1 {
      margin: 0;
      font-size: 20px;
    }
    .description,
    .hint {
      margin: 0;
      color: var(--color-muted, #6b7280);
      font-size: 13px;
    }
    label {
      display: grid;
      gap: 4px;
      font-size: 14px;
    }
    input {
      padding: 8px 10px;
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 6px;
      font: inherit;
    }
    button {
      padding: 8px 14px;
      border: 0;
      border-radius: 6px;
      background: var(--color-primary, #2563eb);
      color: #fff;
      font: inherit;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.6;
      cursor: progress;
    }
    .demo-accounts {
      min-width: 0;
      margin: 0;
      padding: 14px 0 0;
      border: 0;
      border-top: 1px solid var(--color-border, #e5e7eb);
    }
    legend {
      padding: 0 8px 0 0;
      color: var(--color-muted, #6b7280);
      font-size: 13px;
    }
    .demo-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    .demo-account {
      display: grid;
      gap: 4px;
      padding: 10px 8px;
      border: 1px solid var(--color-border, #e5e7eb);
      background: var(--color-primary-soft, #e0eaff);
      color: var(--color-text, #1f2937);
      text-align: left;
    }
    .demo-account small {
      overflow-wrap: anywhere;
      color: var(--color-muted, #6b7280);
      font-size: 11px;
    }
    .error {
      margin: 0;
      color: var(--color-danger, #dc2626);
      font-size: 14px;
    }
  `,
})
export class LoginForm {
  /** 表單標題 */
  readonly heading = input('登入');
  /** 標題下方的說明 */
  readonly description = input('');
  /** 呼叫端正在登入時為 true，按鈕停用 */
  readonly isSubmitting = input(false);
  /** 呼叫端的登入結果訊息，例如密碼錯誤 */
  readonly errorMessage = input<string | null>(null);

  /** 通過必填檢查後送出 */
  readonly submitted = output<LoginCredentials>();

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly localError = signal<string | null>(null);
  protected readonly demoAccounts = DEMO_ACCOUNTS;

  /** 點選範例帳號時填入欄位，登入仍由使用者按下送出按鈕。 */
  protected fillDemoAccount(account: LoginCredentials): void {
    if (this.isSubmitting()) {
      return;
    }
    this.email.set(account.email);
    this.password.set(account.password);
    this.localError.set(null);
  }

  /**
   * @param event input 事件
   * @returns 輸入框目前的值
   */
  protected readValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  /**
   * 檢查必填後送出；登入中不重複送出。
   *
   * @param event submit 事件
   */
  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (this.isSubmitting()) {
      return;
    }
    const email = this.email().trim();
    const password = this.password();
    if (!email || !password) {
      this.localError.set('請輸入 Email 與密碼');
      return;
    }
    this.localError.set(null);
    this.submitted.emit({ email, password });
  }
}
