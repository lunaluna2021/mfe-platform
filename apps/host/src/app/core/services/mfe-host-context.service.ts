import { Injectable, computed, inject, signal } from '@angular/core';
import { buildHostContext } from '@mfe-platform/shared-auth';
import type {
  MfeHostContext,
  MfeSelectedCustomer,
} from '@mfe-platform/shared-contracts';
import { AuthService } from './auth.service';

/**
 * 組出傳給 MFE 的 context。
 *
 * 跨 MFE 共用的狀態（例如目前選取的客戶）由 Host 保存：
 * MFE 發出事件 → Host 更新狀態 → 新的 context 物件設定到所有掛載中的 MFE。
 * MFE 之間不直接互相呼叫，也不共用 service。
 * token 自動更新時 context 也會換新，MFE 隨即改用新的 token。
 */
@Injectable({ providedIn: 'root' })
export class MfeHostContextService {
  private readonly _auth = inject(AuthService);
  private readonly _selectedCustomer = signal<MfeSelectedCustomer | null>(null);

  /** 目前選取的客戶 */
  readonly selectedCustomer = this._selectedCustomer.asReadonly();

  /** 傳給 MFE 的 context；未登入時為 null */
  readonly context = computed<MfeHostContext | null>(() =>
    buildHostContext(
      this._auth.snapshot(),
      this._auth.config(),
      this._selectedCustomer(),
    ),
  );

  /**
   * @param customer 選取的客戶；null 表示取消選取
   */
  selectCustomer(customer: MfeSelectedCustomer | null): void {
    this._selectedCustomer.set(customer);
  }
}
