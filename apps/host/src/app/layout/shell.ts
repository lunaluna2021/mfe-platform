import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
} from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { hasPermission } from '@mfe-platform/shared-permission';
import { APP_TITLE, HOST_ROUTES, ROLE_LABELS } from '../app.constants';
import { AuthService } from '../core/auth/auth.service';
import { ToastStack } from '../core/toast/toast-stack';
import { connectMfeEvents } from '../mfe/mfe-event-bridge';
import { MfeHostContextService } from '../mfe/mfe-host-context.service';
import { MfeManifestService } from '../mfe/mfe-manifest.service';

/** 登入後的外框：頂列、依權限產生的選單、提示訊息，以及 MFE 事件的接收 */
@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ToastStack],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly manifest = inject(MfeManifestService);
  private readonly hostContext = inject(MfeHostContextService);

  protected readonly appTitle = APP_TITLE;
  protected readonly session = this.auth.session;
  protected readonly manifestStatus = this.manifest.status;
  protected readonly manifestError = this.manifest.error;
  protected readonly selectedCustomer = this.hostContext.selectedCustomer;

  protected readonly roleLabel = computed(() =>
    (this.session()?.user.roles ?? [])
      .map((role) => ROLE_LABELS[role])
      .join('、'),
  );

  /** 沒有權限的模組不出現在選單，也不會載入它的 JS */
  protected readonly visibleEntries = computed(() =>
    this.manifest
      .entries()
      .filter((entry) =>
        hasPermission(this.auth.permissions(), entry.requiredPermission),
      ),
  );

  constructor() {
    this.reloadManifest();
    inject(DestroyRef).onDestroy(connectMfeEvents());
  }

  protected reloadManifest(): void {
    // 失敗時 manifest 服務會記錄錯誤，畫面顯示重試按鈕
    this.manifest.load().catch(() => undefined);
  }

  protected clearCustomer(): void {
    this.hostContext.selectCustomer(null);
  }

  protected logout(): void {
    this.hostContext.selectCustomer(null);
    this.auth.logout();
    void this.router.navigate(['/', HOST_ROUTES.login]);
  }
}
