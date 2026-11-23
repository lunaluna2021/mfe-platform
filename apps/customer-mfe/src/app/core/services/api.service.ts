import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { CustomerReq, CustomerRes } from '../bff/api.interface';

/**
 * 呼叫客戶 API。網址、token 與錯誤轉換由共用的 apiInterceptor 處理，
 * 這裡只負責路徑與 request／response 型別。
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly _http = inject(HttpClient);

  /** @returns 所有客戶 */
  getCustomers(): Observable<CustomerRes[]> {
    return this._http.get<CustomerRes[]>('api/customers');
  }

  /**
   * @param request 客戶資料
   * @returns 新客戶
   */
  createCustomer(request: CustomerReq): Observable<CustomerRes> {
    return this._http.post<CustomerRes>('api/customers', request);
  }

  /**
   * @param id 客戶識別碼
   * @param request 客戶資料
   * @returns 更新後的客戶
   */
  updateCustomer(id: string, request: CustomerReq): Observable<CustomerRes> {
    return this._http.put<CustomerRes>(
      `api/customers/${encodeURIComponent(id)}`,
      request,
    );
  }

  /**
   * 客戶還有行程時，後端回 409 CUSTOMER_HAS_EVENTS（訊息包含行程數）。
   *
   * @param id 客戶識別碼
   * @returns 完成
   */
  deleteCustomer(id: string): Observable<void> {
    return this._http.delete<void>(`api/customers/${encodeURIComponent(id)}`);
  }
}
