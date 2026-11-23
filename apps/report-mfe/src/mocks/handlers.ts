import { mockErrorRes } from '@mfe-platform/shared-mocks';
import { http, HttpResponse } from 'msw';
import type {
  IndustryCountRes,
  MonthlyActivityRes,
} from '../app/core/bff/api.interface';
import mock from './mock.json';

/** 月數範圍，與後端相同 */
const MIN_MONTHS = 1;
const MAX_MONTHS = 24;

/**
 * 報表 API 的 MSW handlers。路徑與錯誤代碼都和後端相同；
 * `*` 開頭表示不限後端網址（interceptor 會把 api/... 接上 runtime-config 的網址）。
 */
export const handlers = [
  http.get('*/api/reports/monthly-activity', ({ request }) => {
    const value = new URL(request.url).searchParams.get('months') ?? '6';
    const months = Number(value);
    if (!Number.isInteger(months)) {
      return mockErrorRes(400, 'INVALID_PARAMETER', '查詢參數不正確');
    }
    if (months < MIN_MONTHS || months > MAX_MONTHS) {
      return mockErrorRes(
        400,
        'VALIDATION_FAILED',
        months < MIN_MONTHS
          ? `月數至少 ${MIN_MONTHS}`
          : `月數最多 ${MAX_MONTHS}`,
      );
    }
    return HttpResponse.json(monthlyActivity(months));
  }),

  http.get('*/api/reports/customers-by-industry', () =>
    HttpResponse.json<IndustryCountRes[]>(mock.CUSTOMERS_BY_INDUSTRY),
  ),
];

/**
 * mock.json 只寫數字（由舊到新），這裡配上「含本月往前 months 個月」的月份；
 * 數字不夠時，較早的月份補 0，與後端沒有資料的月份一樣。
 *
 * @param months 月數（含本月）
 * @returns 由舊到新的每月統計
 */
function monthlyActivity(months: number): MonthlyActivityRes[] {
  const today = new Date();
  const seed = mock.MONTHLY_ACTIVITY;
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(
      today.getFullYear(),
      today.getMonth() - (months - 1 - index),
      1,
    );
    const row = seed[seed.length - months + index] ?? {
      NEW_CUSTOMERS: 0,
      VISITS: 0,
    };
    return {
      MONTH: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      NEW_CUSTOMERS: row.NEW_CUSTOMERS,
      VISITS: row.VISITS,
    };
  });
}
