import type {
  CalendarEventReq,
  CalendarEventRes,
  CustomerOptionRes,
} from '../bff/api.interface';
import { DEFAULT_EVENT_TIME } from '../const/app.const';
import type {
  CalendarEvent,
  CustomerOption,
  EventDraft,
} from '../interfaces/app.interface';

/**
 * @param res API 回傳的行程
 * @returns 畫面使用的行程
 */
export function toCalendarEvent(res: CalendarEventRes): CalendarEvent {
  return {
    id: res.ID,
    customerId: res.CUSTOMER_ID,
    customerName: res.CUSTOMER_NAME,
    date: res.EVENT_DATE,
    time: res.START_TIME,
    title: res.TITLE,
    note: res.NOTE ?? '',
  };
}

/**
 * @param res API 回傳的行程清單
 * @returns 畫面使用的行程清單
 */
export function toCalendarEvents(
  res: readonly CalendarEventRes[],
): CalendarEvent[] {
  return res.map(toCalendarEvent);
}

/**
 * @param res API 回傳的客戶選項
 * @returns 依名稱排序的選項
 */
export function toCustomerOptions(
  res: readonly CustomerOptionRes[],
): CustomerOption[] {
  return res
    .map((option) => ({ id: option.ID, name: option.NAME }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
}

/**
 * @param draft 已驗證的表單資料
 * @returns API 請求內容
 */
export function toCalendarEventReq(draft: EventDraft): CalendarEventReq {
  return {
    CUSTOMER_ID: draft.customerId,
    EVENT_DATE: draft.date,
    START_TIME: draft.time,
    TITLE: draft.title,
    NOTE: draft.note,
  };
}

/**
 * @param event 要編輯的行程
 * @returns 表單初始值
 */
export function toEventDraft(event: CalendarEvent): EventDraft {
  const { customerId, date, time, title, note } = event;
  return { customerId, date, time, title, note };
}

/**
 * @param date 預設日期 YYYY-MM-DD
 * @param customerId 預設客戶（目前選取的客戶），沒有時為空字串
 * @returns 新增行程的表單初始值
 */
export function createEmptyEventDraft(
  date: string,
  customerId: string,
): EventDraft {
  return { customerId, date, time: DEFAULT_EVENT_TIME, title: '', note: '' };
}

/**
 * @param draft 表單資料
 * @returns 去除前後空白的資料
 */
export function normalizeEventDraft(draft: EventDraft): EventDraft {
  return { ...draft, title: draft.title.trim(), note: draft.note.trim() };
}
