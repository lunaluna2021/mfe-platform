import { Injectable, computed, inject, signal } from '@angular/core';
import {
  MFE_CONTRACT_VERSION,
  type MfeHostContext,
  type MfeSelectedCustomer,
} from '@mfe-platform/shared-contracts';
import { AuthService } from '../core/auth/auth.service';

/**
 * 組出傳給 MFE 的 context。
 *
 * 跨 MFE 共用的狀態（例如目前選取的客戶）由 Host 保存：
 * MFE 發出事件 → Host 更新狀態 → 新的 context 物件設定到所有掛載中的 MFE。
 * MFE 之間不直接互相呼叫，也不共用 service。
 */
@Injectable({ providedIn: 'root' })
export class MfeHostContextService {
  private readonly auth = inject(AuthService);
  private readonly selectedCustomerState = signal<MfeSelectedCustomer | null>(
    null,
  );

  readonly selectedCustomer = this.selectedCustomerState.asReadonly();

  readonly context = computed<MfeHostContext | null>(() => {
    const session = this.auth.session();
    if (!session) {
      return null;
    }
    return {
      contractVersion: MFE_CONTRACT_VERSION,
      user: session.user,
      permissions: this.auth.permissions(),
      selectedCustomer: this.selectedCustomerState(),
      locale: 'zh-TW',
    };
  });

  selectCustomer(customer: MfeSelectedCustomer | null): void {
    this.selectedCustomerState.set(customer);
  }
}
