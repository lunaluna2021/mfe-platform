/** GET／POST／PUT api/calendar-events 回傳的行程 */
export interface CalendarEventRes {
  readonly ID: string;
  readonly CUSTOMER_ID: string;
  readonly CUSTOMER_NAME: string;
  /** YYYY-MM-DD */
  readonly EVENT_DATE: string;
  /** HH:mm */
  readonly START_TIME: string;
  readonly TITLE: string;
  readonly NOTE: string;
}

/** POST／PUT api/calendar-events 的請求內容 */
export interface CalendarEventReq {
  readonly CUSTOMER_ID: string;
  readonly EVENT_DATE: string;
  readonly START_TIME: string;
  readonly TITLE: string;
  readonly NOTE: string;
}

/** GET api/customers/options 回傳的客戶選項 */
export interface CustomerOptionRes {
  readonly ID: string;
  readonly NAME: string;
}
