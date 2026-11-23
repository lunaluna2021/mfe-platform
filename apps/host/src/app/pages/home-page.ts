import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { hasPermission } from '@mfe-platform/shared-permission';
import { AuthService } from '../core/auth/auth.service';
import {
  MfeLoaderService,
  type MfeLoadStatus,
} from '../mfe/mfe-loader.service';
import { MfeManifestService } from '../mfe/mfe-manifest.service';

const STATUS_LABELS: Readonly<Record<MfeLoadStatus, string>> = {
  idle: '尚未載入',
  loading: '載入中',
  retrying: '重試中',
  loaded: '已載入（再次開啟不會重新下載）',
  failed: '載入失敗',
  incompatible: '契約版本不相容',
};

/** 首頁：列出 manifest 中所有模組，以及目前使用者能否使用、載入到什麼狀態 */
@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="intro">
      <h1>歡迎，{{ session()?.user?.displayName }}</h1>
      <p>
        你的權限：
        @for (permission of permissions(); track permission) {
          <code>{{ permission }}</code>
        }
      </p>
    </section>

    <section class="modules" aria-label="模組清單">
      @for (item of modules(); track item.entry.name) {
        <article class="card" [class.locked]="!item.allowed">
          <header>
            <h2>{{ item.entry.title }}</h2>
            <span class="version">v{{ item.entry.version }}</span>
          </header>
          @if (item.entry.description) {
            <p>{{ item.entry.description }}</p>
          }
          <dl>
            <dt>需要權限</dt>
            <dd>
              <code>{{ item.entry.requiredPermission }}</code>
            </dd>
            <dt>載入狀態</dt>
            <dd>{{ statusLabels[item.status] }}</dd>
          </dl>
          @if (item.allowed) {
            <a class="button" [routerLink]="['/', item.entry.route]">開啟</a>
          } @else {
            <span class="locked-note"
              >沒有權限，選單不顯示，也不會載入它的 JS</span
            >
          }
        </article>
      } @empty {
        <p>目前沒有可用的模組。</p>
      }
    </section>
  `,
  styles: `
    .intro h1 {
      margin: 0 0 8px;
      font-size: 22px;
    }
    .intro p {
      margin: 0 0 20px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }
    .modules {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
      gap: 16px;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      border: 1px solid var(--color-border);
      border-radius: 10px;
      background: var(--color-surface);
    }
    .card.locked {
      opacity: 0.6;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
    }
    h2 {
      margin: 0;
      font-size: 17px;
    }
    p {
      margin: 0;
      font-size: 14px;
    }
    .version {
      color: var(--color-muted);
      font-size: 12px;
      font-family: var(--font-mono);
    }
    dl {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 4px 12px;
      margin: 0;
      font-size: 13px;
    }
    dt {
      color: var(--color-muted);
    }
    dd {
      margin: 0;
    }
    .button {
      align-self: flex-start;
      margin-top: auto;
    }
    .locked-note {
      margin-top: auto;
      color: var(--color-muted);
      font-size: 13px;
    }
  `,
})
export class HomePage {
  private readonly auth = inject(AuthService);
  private readonly manifest = inject(MfeManifestService);
  private readonly loader = inject(MfeLoaderService);

  protected readonly statusLabels = STATUS_LABELS;
  protected readonly session = this.auth.session;
  protected readonly permissions = this.auth.permissions;

  protected readonly modules = computed(() =>
    this.manifest.entries().map((entry) => ({
      entry,
      allowed: hasPermission(this.auth.permissions(), entry.requiredPermission),
      status: this.loader.stateFor(entry.name).status,
    })),
  );
}
