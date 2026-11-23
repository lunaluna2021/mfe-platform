import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { isNotifyLevel } from '@mfe-platform/shared-contracts';
import { createMfeEventBus } from '@mfe-platform/shared-event-bus';
import { hasPermission } from '@mfe-platform/shared-permission';
import { NOTIFY_MAX_LENGTH } from '../const/app.const';
import { AuthService } from './auth.service';
import { MfeHostContextService } from './mfe-host-context.service';
import { MfeManifestService } from './mfe-manifest.service';
import { ToastService } from './toast.service';

/**
 * 接收 MFE 發出的事件並交給 Host 的服務處理。
 * 事件來自另一個 bundle，型別只在編譯時有效，執行時仍逐一檢查 payload。
 */
@Injectable({ providedIn: 'root' })
export class MfeEventBridgeService {
  private readonly _toast = inject(ToastService);
  private readonly _hostContext = inject(MfeHostContextService);
  private readonly _manifest = inject(MfeManifestService);
  private readonly _auth = inject(AuthService);
  private readonly _router = inject(Router);

  /**
   * 開始接收事件。
   *
   * @returns 取消所有訂閱的函式，由建立者在銷毀時呼叫
   */
  connect(): () => void {
    const bus = createMfeEventBus('host');
    const unsubscribers = [
      bus.on('notify', ({ payload, source }) =>
        this._handleNotify(payload, source),
      ),
      bus.on('navigate', ({ payload, source }) =>
        this._handleNavigate(payload.mfe, source),
      ),
      bus.on('customer:selected', ({ payload, source }) =>
        this._handleCustomerSelected(payload.customer, source),
      ),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }

  private _handleNotify(
    payload: { level: unknown; message: unknown },
    source: string,
  ): void {
    const message =
      typeof payload.message === 'string'
        ? payload.message.trim().slice(0, NOTIFY_MAX_LENGTH)
        : '';
    if (!message || !isNotifyLevel(payload.level)) {
      console.warn(
        `[host] 忽略格式不符的 notify 事件（來源：${source}）`,
        payload,
      );
      return;
    }
    this._toast.show(payload.level, message, source);
  }

  private _handleNavigate(mfe: unknown, source: string): void {
    const name = typeof mfe === 'string' ? mfe : '';
    const entry = this._manifest.findByName(name);
    if (
      !entry ||
      !hasPermission(this._auth.permissions(), entry.requiredPermission)
    ) {
      this._toast.show(
        'warning',
        `無法切換到「${name}」：模組不存在或沒有權限`,
        source,
      );
      return;
    }
    void this._router.navigate(['/', entry.route]);
  }

  private _handleCustomerSelected(customer: unknown, source: string): void {
    if (customer === null) {
      this._hostContext.selectCustomer(null);
      return;
    }
    const record = customer as Record<string, unknown> | undefined;
    if (
      typeof record?.['id'] !== 'string' ||
      typeof record['name'] !== 'string'
    ) {
      console.warn(
        `[host] 忽略格式不符的 customer:selected 事件（來源：${source}）`,
        customer,
      );
      return;
    }
    this._hostContext.selectCustomer({
      id: record['id'],
      name: record['name'],
    });
  }
}
