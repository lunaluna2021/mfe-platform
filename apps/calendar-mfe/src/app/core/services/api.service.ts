import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  CalendarEventReq,
  CalendarEventRes,
  CustomerOptionRes,
} from '../bff/api.interface';
import type { DateRange } from '../interfaces/app.interface';

/**
 * 呼叫行程 API。網址、token 與錯誤轉換由共用的 apiInterceptor 處理，
 * 這裡只負責路徑與 request／response 型別。
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly _http = inject(HttpClient);

  /**
   * 後端限制查詢期間最多 62 天，超過回 400 INVALID_DATE_RANGE。
   *
   * @param range 查詢期間（兩端都包含）
   * @returns 期間內的行程
   */
  getEvents(range: DateRange): Observable<CalendarEventRes[]> {
    return this._http.get<CalendarEventRes[]>('api/calendar-events', {
      params: { from: range.from, to: range.to },
    });
  }

  /**
   * @param request 行程資料
   * @returns 新行程
   */
  createEvent(request: CalendarEventReq): Observable<CalendarEventRes> {
    return this._http.post<CalendarEventRes>('api/calendar-events', request);
  }

  /**
   * @param id 行程識別碼
   * @param request 行程資料
   * @returns 更新後的行程
   */
  updateEvent(
    id: string,
    request: CalendarEventReq,
  ): Observable<CalendarEventRes> {
    return this._http.put<CalendarEventRes>(
      `api/calendar-events/${encodeURIComponent(id)}`,
      request,
    );
  }

  /**
   * @param id 行程識別碼
   * @returns 完成
   */
  deleteEvent(id: string): Observable<void> {
    return this._http.delete<void>(
      `api/calendar-events/${encodeURIComponent(id)}`,
    );
  }

  /**
   * 客戶資料屬於客戶模組，這裡只讀精簡的選項（需要 customer:read）。
   *
   * @returns 客戶選項
   */
  getCustomerOptions(): Observable<CustomerOptionRes[]> {
    return this._http.get<CustomerOptionRes[]>('api/customers/options');
  }
}
