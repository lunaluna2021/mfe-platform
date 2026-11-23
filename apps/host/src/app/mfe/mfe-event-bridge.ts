import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { isNotifyLevel } from '@mfe-platform/shared-contracts';
import { createMfeEventBus } from '@mfe-platform/shared-event-bus';
import { hasPermission } from '@mfe-platform/shared-permission';
import { AuthService } from '../core/auth/auth.service';
import { ToastService } from '../core/toast/toast.service';
import { MfeHostContextService } from './mfe-host-context.service';
import { MfeManifestService } from './mfe-manifest.service';

const MAX_MESSAGE_LENGTH = 200;

/**
 * 接收 MFE 發出的事件並交給 Host 的服務處理。必須在 injection context 中呼叫。
 *
 * 事件來自另一個 bundle，型別只在編譯時有效，執行時仍逐一檢查 payload。
 *
 * @returns 取消所有訂閱的函式，由建立者在銷毀時呼叫
 */
export function connectMfeEvents(): () => void {
  const toast = inject(ToastService);
  const hostContext = inject(MfeHostContextService);
  const manifest = inject(MfeManifestService);
  const auth = inject(AuthService);
  const router = inject(Router);
  const bus = createMfeEventBus('host');

  const unsubscribers = [
    bus.on('notify', ({ payload, source }) => {
      const message =
        typeof payload.message === 'string'
          ? payload.message.trim().slice(0, MAX_MESSAGE_LENGTH)
          : '';
      if (!message || !isNotifyLevel(payload.level)) {
        console.warn(
          `[host] 忽略格式不符的 notify 事件（來源：${source}）`,
          payload,
        );
        return;
      }
      toast.show(payload.level, message, source);
    }),

    bus.on('navigate', ({ payload, source }) => {
      const name = typeof payload.mfe === 'string' ? payload.mfe : '';
      const entry = manifest.findByName(name);
      if (
        !entry ||
        !hasPermission(auth.permissions(), entry.requiredPermission)
      ) {
        toast.show(
          'warning',
          `無法切換到「${name}」：模組不存在或沒有權限`,
          source,
        );
        return;
      }
      void router.navigate(['/', entry.route]);
    }),

    bus.on('customer:selected', ({ payload, source }) => {
      const customer: unknown = payload.customer;
      if (customer === null) {
        hostContext.selectCustomer(null);
        return;
      }
      const record = customer as Record<string, unknown> | undefined;
      if (
        typeof record?.['id'] !== 'string' ||
        typeof record['name'] !== 'string'
      ) {
        console.warn(
          `[host] 忽略格式不符的 customer:selected 事件（來源：${source}）`,
          payload,
        );
        return;
      }
      hostContext.selectCustomer({ id: record['id'], name: record['name'] });
    }),
  ];

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
