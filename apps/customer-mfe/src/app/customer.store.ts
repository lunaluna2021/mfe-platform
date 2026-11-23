import { Injectable, signal } from '@angular/core';
import {
  createCustomer,
  DEMO_CUSTOMERS,
  type Customer,
  type NewCustomerInput,
} from './customer.data';

/**
 * 客戶清單。
 *
 * providedIn: 'root' 指的是這個 MFE 自己的根 injector（由 createApplication 建立），
 * 不是 Host 的。元素被移出畫面時元件會銷毀，但根 injector 會保留到整頁關閉，
 * 所以切到其他模組再回來，剛新增的客戶仍然存在；重新整理頁面才會回到示範資料。
 */
@Injectable({ providedIn: 'root' })
export class CustomerStore {
  private readonly customersState = signal<readonly Customer[]>(DEMO_CUSTOMERS);

  readonly customers = this.customersState.asReadonly();

  hasName(name: string): boolean {
    return this.customersState().some((customer) => customer.name === name);
  }

  add(input: NewCustomerInput): Customer {
    const customer = createCustomer(this.customersState(), input);
    this.customersState.update((customers) => [...customers, customer]);
    return customer;
  }
}
