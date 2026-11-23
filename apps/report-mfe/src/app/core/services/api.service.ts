import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  IndustryCountRes,
  MonthlyActivityRes,
} from '../bff/api.interface';

/**
 * 呼叫報表 API（需要 report:read）。網址、token 與錯誤轉換由共用的 apiInterceptor 處理。
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly _http = inject(HttpClient);

  /**
   * 新客戶依建立時間、拜訪依行程日期統計，以台北時間分月；沒有資料的月份為 0。
   *
   * @param months 月數（含本月），1～24
   * @returns 每月統計
   */
  getMonthlyActivity(months: number): Observable<MonthlyActivityRes[]> {
    return this._http.get<MonthlyActivityRes[]>(
      'api/reports/monthly-activity',
      {
        params: { months },
      },
    );
  }

  /** @returns 各產業客戶數 */
  getCustomersByIndustry(): Observable<IndustryCountRes[]> {
    return this._http.get<IndustryCountRes[]>(
      'api/reports/customers-by-industry',
    );
  }
}
