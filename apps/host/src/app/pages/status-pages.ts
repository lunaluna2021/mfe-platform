import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

const STATUS_PAGE_STYLES = `
  .status-page { max-width: 560px; padding: 32px 0; }
  h1 { margin: 0 0 8px; font-size: 22px; }
  p { margin: 0 0 16px; color: var(--color-muted); }
`;

@Component({
  selector: 'app-forbidden-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="status-page">
      <h1>沒有權限</h1>
      <p>你的帳號沒有使用這個模組的權限，請改用其他帳號或聯絡管理員。</p>
      <a class="button" routerLink="/">回首頁</a>
    </section>
  `,
  styles: STATUS_PAGE_STYLES,
})
export class ForbiddenPage {}

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="status-page">
      <h1>找不到頁面</h1>
      <p>這個模組不在 manifest 中，可能已被移除或網址有誤。</p>
      <a class="button" routerLink="/">回首頁</a>
    </section>
  `,
  styles: STATUS_PAGE_STYLES,
})
export class NotFoundPage {}
