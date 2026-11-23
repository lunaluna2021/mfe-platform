import { Injectable, computed, signal } from '@angular/core';
import type {
  MfeApiAccess,
  MfeHostContext,
} from '@mfe-platform/shared-contracts';

/**
 * 保存這個 MFE 目前使用的 context（來自 Host，或獨立執行時的登入外框）。
 *
 * providedIn: 'root' 指的是 MFE 自己的根 injector，不是 Host 的。
 * 根元件在 context 改變時寫入；service 與 interceptor 從這裡讀取，不必層層傳遞。
 */
@Injectable({ providedIn: 'root' })
export class MfeContextStore {
  private readonly _context = signal<MfeHostContext | null>(null);

  /** 目前的 context；未登入時為 null */
  readonly context = this._context.asReadonly();

  /**
   * 目前使用者的識別碼；未登入時為 null。
   * token 更新時 context 會換成新物件，但這個值不變，
   * 依使用者讀取資料的 effect 應該讀這裡，才不會每次換 token 都重讀。
   */
  readonly userId = computed(() => this._context()?.user.id ?? null);

  /**
   * @param context 新的 context；登出時為 null
   */
  setContext(context: MfeHostContext | null): void {
    this._context.set(context);
  }

  /**
   * 給 API interceptor 使用；每次請求都讀最新值，token 更新後立即生效。
   *
   * @returns 後端網址與 access token；未登入時為 null
   */
  apiAccess(): MfeApiAccess | null {
    return this._context()?.api ?? null;
  }
}
