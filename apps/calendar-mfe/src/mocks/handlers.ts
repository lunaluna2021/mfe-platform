import { mockErrorRes } from '@mfe-platform/shared-mocks';
import { http, HttpResponse } from 'msw';
import type {
  CalendarEventReq,
  CalendarEventRes,
  CustomerOptionRes,
} from '../app/core/bff/api.interface';
import { dateKeyOf } from '../app/core/utils/grid.util';
import mock from './mock.json';

/** 查詢期間上限，與後端相同 */
const MAX_RANGE_DAYS = 62;
const DAY_MS = 24 * 60 * 60 * 1000;

const customerOptions: CustomerOptionRes[] = structuredClone(
  mock.CUSTOMER_OPTIONS,
);

/**
 * 記憶體中的行程：新增、修改、刪除只影響目前的頁面，重新整理後恢復。
 * mock.json 只寫「本月第幾天」（DAY），這裡換成本月的日期，打開月曆就看得到。
 */
const events: CalendarEventRes[] = mock.CALENDAR_EVENTS.map(
  ({ DAY, ...event }) => ({
    ...event,
    CUSTOMER_NAME: findCustomer(event.CUSTOMER_ID)?.NAME ?? '',
    EVENT_DATE: dateOfThisMonth(DAY),
  }),
);

/**
 * 行程與客戶選單 API 的 MSW handlers。路徑與錯誤代碼都和後端相同；
 * `*` 開頭表示不限後端網址（interceptor 會把 api/... 接上 runtime-config 的網址）。
 */
export const handlers = [
  http.get('*/api/calendar-events', ({ request }) => {
    const params = new URL(request.url).searchParams;
    const from = params.get('from') ?? '';
    const to = params.get('to') ?? '';
    if (!isValidRange(from, to)) {
      return mockErrorRes(
        400,
        'INVALID_DATE_RANGE',
        `查詢期間不正確，最多 ${MAX_RANGE_DAYS} 天`,
      );
    }
    return HttpResponse.json(
      events
        .filter((event) => event.EVENT_DATE >= from && event.EVENT_DATE <= to)
        .sort((a, b) =>
          `${a.EVENT_DATE}${a.START_TIME}`.localeCompare(
            `${b.EVENT_DATE}${b.START_TIME}`,
          ),
        ),
    );
  }),

  http.post<never, CalendarEventReq>(
    '*/api/calendar-events',
    async ({ request }) => {
      const body = await request.json();
      const customer = findCustomer(body.CUSTOMER_ID);
      if (!customer) {
        return customerNotFound();
      }
      const event: CalendarEventRes = {
        ID: crypto.randomUUID(),
        ...toFields(body, customer),
      };
      events.push(event);
      return HttpResponse.json(event, { status: 201 });
    },
  ),

  http.put<{ id: string }, CalendarEventReq>(
    '*/api/calendar-events/:id',
    async ({ params, request }) => {
      const index = events.findIndex((event) => event.ID === params.id);
      if (index < 0) {
        return eventNotFound();
      }
      const body = await request.json();
      const customer = findCustomer(body.CUSTOMER_ID);
      if (!customer) {
        return customerNotFound();
      }
      events[index] = { ID: params.id, ...toFields(body, customer) };
      return HttpResponse.json(events[index]);
    },
  ),

  http.delete<{ id: string }>('*/api/calendar-events/:id', ({ params }) => {
    const index = events.findIndex((event) => event.ID === params.id);
    if (index < 0) {
      return eventNotFound();
    }
    events.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('*/api/customers/options', () => HttpResponse.json(customerOptions)),
];

/**
 * @param body 請求內容
 * @param customer 行程的客戶
 * @returns 識別碼以外的欄位
 */
function toFields(
  body: CalendarEventReq,
  customer: CustomerOptionRes,
): Omit<CalendarEventRes, 'ID'> {
  return {
    CUSTOMER_ID: customer.ID,
    CUSTOMER_NAME: customer.NAME,
    EVENT_DATE: body.EVENT_DATE,
    START_TIME: body.START_TIME,
    TITLE: body.TITLE,
    NOTE: body.NOTE,
  };
}

/**
 * @param id 客戶識別碼
 * @returns 客戶選項；找不到時為 undefined
 */
function findCustomer(id: string): CustomerOptionRes | undefined {
  return customerOptions.find((option) => option.ID === id);
}

/**
 * @param day 本月第幾天
 * @returns YYYY-MM-DD
 */
function dateOfThisMonth(day: number): string {
  const today = new Date();
  return dateKeyOf(new Date(today.getFullYear(), today.getMonth(), day));
}

/**
 * @param from 開始日期
 * @param to 結束日期
 * @returns 期間是否合法（結束不早於開始，且不超過上限）
 */
function isValidRange(from: string, to: string): boolean {
  const days = (Date.parse(to) - Date.parse(from)) / DAY_MS;
  return Number.isFinite(days) && days >= 0 && days <= MAX_RANGE_DAYS;
}

function eventNotFound() {
  return mockErrorRes(404, 'EVENT_NOT_FOUND', '找不到這筆行程，可能已被刪除');
}

function customerNotFound() {
  return mockErrorRes(
    404,
    'CUSTOMER_NOT_FOUND',
    '找不到這位客戶，可能已被刪除',
  );
}
