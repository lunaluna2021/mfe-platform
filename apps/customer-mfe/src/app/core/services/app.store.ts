import { Injectable, inject, signal } from '@angular/core';
import { LoadStatus, describeApiError } from '@mfe-platform/shared-data-api';
import { firstValueFrom } from 'rxjs';
import type { Customer, CustomerDraft } from '../interfaces/app.interface';
import {
  sortCustomers,
  toCustomer,
  toCustomerReq,
  toCustomers,
} from '../utils/app.util';
import { ApiService } from './api.service';

/**
 * 客戶清單的狀態。
 *
 * providedIn: 'root' 指的是這個 MFE 自己的根 injector（由 createApplication 建立），
 * 不是 Host 的。元素被移出畫面時元件會銷毀，但這份清單會保留，
 * 再次進入時先顯示上次的資料，同時重新讀取最新資料。
 */
@Injectable({ providedIn: 'root' })
export class AppStore {
  private readonly _api = inject(ApiService);
  private readonly _customers = signal<readonly Customer[]>([]);
  private readonly _status = signal<LoadStatus>(LoadStatus.IDLE);
  private readonly _errorMessage = signal<string | null>(null);
  /** 清單屬於哪個使用者；換人登入時先清空，避免看到上一位的資料 */
  private _ownerId: string | null = null;
  /** 每次讀取遞增；較早送出但較晚回來的結果直接丟棄 */
  private _loadGeneration = 0;

  readonly customers = this._customers.asReadonly();
  readonly status = this._status.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();

  /**
   * @param userId 目前登入者；與上次不同時先清空清單
   */
  async load(userId: string): Promise<void> {
    if (this._ownerId !== userId) {
      this._ownerId = userId;
      this._customers.set([]);
    }
    const generation = ++this._loadGeneration;
    this._status.set(LoadStatus.LOADING);
    this._errorMessage.set(null);
    try {
      const customers = toCustomers(
        await firstValueFrom(this._api.getCustomers()),
      );
      if (generation === this._loadGeneration) {
        this._customers.set(sortCustomers(customers));
        this._status.set(LoadStatus.READY);
      }
    } catch (error) {
      if (generation === this._loadGeneration) {
        this._status.set(LoadStatus.ERROR);
        this._errorMessage.set(describeApiError(error));
      }
    }
  }

  /**
   * 失敗時拋出錯誤，由呼叫端決定如何顯示。
   *
   * @param draft 已驗證的表單資料
   * @returns 新客戶
   */
  async create(draft: CustomerDraft): Promise<Customer> {
    const customer = toCustomer(
      await firstValueFrom(this._api.createCustomer(toCustomerReq(draft))),
    );
    this._customers.update((customers) =>
      sortCustomers([...customers, customer]),
    );
    return customer;
  }

  /**
   * @param id 客戶識別碼
   * @param draft 已驗證的表單資料
   * @returns 更新後的客戶
   */
  async update(id: string, draft: CustomerDraft): Promise<Customer> {
    const customer = toCustomer(
      await firstValueFrom(this._api.updateCustomer(id, toCustomerReq(draft))),
    );
    this._customers.update((customers) =>
      sortCustomers(
        customers.map((item) => (item.id === id ? customer : item)),
      ),
    );
    return customer;
  }

  /**
   * @param id 客戶識別碼
   */
  async remove(id: string): Promise<void> {
    await firstValueFrom(this._api.deleteCustomer(id), {
      defaultValue: undefined,
    });
    this._customers.update((customers) =>
      customers.filter((item) => item.id !== id),
    );
  }
}
