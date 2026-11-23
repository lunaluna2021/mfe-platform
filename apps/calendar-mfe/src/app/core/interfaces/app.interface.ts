/** 畫面使用的行程資料 */
export interface CalendarEvent {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  /** YYYY-MM-DD */
  readonly date: string;
  /** HH:mm */
  readonly time: string;
  readonly title: string;
  readonly note: string;
}

/** 表單客戶選單的項目 */
export interface CustomerOption {
  readonly id: string;
  readonly name: string;
}

/** 新增與編輯行程共用的表單資料 */
export interface EventDraft {
  readonly customerId: string;
  readonly date: string;
  readonly time: string;
  readonly title: string;
  readonly note: string;
}

/** 目前顯示的月份；month 為 0～11，與 Date 相同 */
export interface MonthCursor {
  readonly year: number;
  readonly month: number;
}

/** 查詢期間，兩端都包含，格式 YYYY-MM-DD */
export interface DateRange {
  readonly from: string;
  readonly to: string;
}

/** 月曆中的一格 */
export interface CalendarCell {
  readonly date: string;
  readonly day: number;
  /** 是否屬於目前月份；前後補位的日期為 false */
  readonly isInMonth: boolean;
  readonly isToday: boolean;
  readonly events: readonly CalendarEvent[];
}
