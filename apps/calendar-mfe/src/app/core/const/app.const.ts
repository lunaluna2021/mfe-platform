/** 這個 MFE 在事件中的名稱，與 manifest 的 name 相同 */
export const MFE_NAME = 'calendar';

/** 註冊的 Custom Element 名稱，必須與 manifest 的 tagName 相同 */
export const TAG_NAME = 'mfe-calendar';

/** 欄位長度上限，與後端驗證、資料表的 check 條件相同 */
export const EVENT_LIMITS = {
  TITLE: 40,
  NOTE: 200,
} as const;

/** 新增行程時的預設時間 */
export const DEFAULT_EVENT_TIME = '10:00';

/** 月曆表頭，週日開始 */
export const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const;

/** 日期格式 YYYY-MM-DD */
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 時間格式 HH:mm（00:00～23:59） */
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
