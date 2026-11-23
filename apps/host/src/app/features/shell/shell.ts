import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { AuthStatus } from '@mfe-platform/shared-auth';
import { hasPermission } from '@mfe-platform/shared-permission';
import {
  APP_TITLE,
  HOST_ROUTES,
  ROLE_LABELS,
} from '../../core/const/app.const';
import { ManifestStatus } from '../../core/enums/manifest-status.enum';
import { AuthService } from '../../core/services/auth.service';
import { MfeEventBridgeService } from '../../core/services/mfe-event-bridge.service';
import { MfeHostContextService } from '../../core/services/mfe-host-context.service';
import { MfeManifestService } from '../../core/services/mfe-manifest.service';
import { ToastStack } from '../../shared/components/toast-stack/toast-stack';

/** 登入後的外框：頂列、依權限產生的選單、提示訊息，以及 MFE 事件的接收 */
@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ToastStack],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly _auth = inject(AuthService);
  private readonly _router = inject(Router);
  private readonly _manifest = inject(MfeManifestService);
  private readonly _hostContext = inject(MfeHostContextService);

  protected readonly manifestStatus = ManifestStatus;
  protected readonly appTitle = APP_TITLE;
  protected readonly user = this._auth.user;
  protected readonly currentManifestStatus = this._manifest.status;
  protected readonly manifestErrorMessage = this._manifest.errorMessage;
  protected readonly selectedCustomer = this._hostContext.selectedCustomer;

  protected readonly roleLabel = computed(() => {
    const role = this._auth.role();
    return role ? ROLE_LABELS[role] : '';
  });

  /** 沒有權限的模組不出現在選單，也不會載入它的 JS */
  protected readonly visibleEntries = computed(() =>
    this._manifest
      .entries()
      .filter((entry) =>
        hasPermission(this._auth.permissions(), entry.requiredPermission),
      ),
  );

  constructor() {
    this.onReloadManifest();
    inject(DestroyRef).onDestroy(inject(MfeEventBridgeService).connect());

    // 自己登出、在其他分頁或模組的獨立頁登出（SSO），或 token 無法更新時，都回到登入頁
    effect(() => {
      if (this._auth.status() === AuthStatus.SIGNED_OUT) {
        untracked(() => {
          this._hostContext.selectCustomer(null);
          void this._router.navigate(['/', HOST_ROUTES.LOGIN]);
        });
      }
    });
  }

  /** 重新讀取 manifest；失敗時服務會記錄錯誤，畫面顯示重試按鈕 */
  protected onReloadManifest(): void {
    this._manifest.load().catch(() => undefined);
  }

  /** 清除目前選取的客戶 */
  protected onClearCustomer(): void {
    this._hostContext.selectCustomer(null);
  }

  /** 登出；導向登入頁由上面的 effect 處理 */
  protected onLogout(): void {
    void this._auth.signOut();
  }
}
