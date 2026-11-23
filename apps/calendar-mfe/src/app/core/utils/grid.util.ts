import type {
  CalendarCell,
  CalendarEvent,
  DateRange,
  MonthCursor,
} from '../interfaces/app.interface';

const DAYS_PER_WEEK = 7;

/**
 * @param year 西元年
 * @param month 0～11
 * @param day 1～31
 * @returns YYYY-MM-DD
 */
export function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * @param date 日期
 * @returns 依瀏覽器時區的 YYYY-MM-DD
 */
export function dateKeyOf(date: Date): string {
  return toDateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * @param date 日期
 * @returns 該日期所在的月份
 */
export function monthOf(date: Date): MonthCursor {
  return { year: date.getFullYear(), month: date.getMonth() };
}

/**
 * @param cursor 目前月份
 * @param delta 要前進（正數）或後退（負數）的月數
 * @returns 新的月份
 */
export function addMonths(cursor: MonthCursor, delta: number): MonthCursor {
  return monthOf(new Date(cursor.year, cursor.month + delta, 1));
}

/**
 * 月曆以週日開始，前後補上相鄰月份的日期，湊滿整週。
 *
 * @param cursor 月份
 * @returns 第一格之前要補幾天、總共幾格
 */
function gridLayout(cursor: MonthCursor): {
  leading: number;
  totalCells: number;
} {
  const leading = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  return {
    leading,
    totalCells:
      Math.ceil((leading + daysInMonth) / DAYS_PER_WEEK) * DAYS_PER_WEEK,
  };
}

function cellDate(cursor: MonthCursor, leading: number, index: number): Date {
  return new Date(cursor.year, cursor.month, index - leading + 1);
}

/**
 * 月曆畫面涵蓋的第一天與最後一天（含補位日期），用來查詢這段期間的行程。
 * 最多 42 天，在後端限制的 62 天之內。
 *
 * @param cursor 月份
 * @returns 查詢期間
 */
export function gridDateRange(cursor: MonthCursor): DateRange {
  const { leading, totalCells } = gridLayout(cursor);
  return {
    from: dateKeyOf(cellDate(cursor, leading, 0)),
    to: dateKeyOf(cellDate(cursor, leading, totalCells - 1)),
  };
}

/**
 * @param cursor 月份
 * @param events 期間內的行程
 * @param todayKey 今天的 YYYY-MM-DD
 * @returns 以週分組的月曆格子；每格的行程依時間排序
 */
export function buildMonthGrid(
  cursor: MonthCursor,
  events: readonly CalendarEvent[],
  todayKey: string,
): CalendarCell[][] {
  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const event of [...events].sort((a, b) =>
    a.time.localeCompare(b.time),
  )) {
    const list = eventsByDate.get(event.date) ?? [];
    list.push(event);
    eventsByDate.set(event.date, list);
  }

  const { leading, totalCells } = gridLayout(cursor);
  const weeks: CalendarCell[][] = [];
  for (let index = 0; index < totalCells; index++) {
    const date = cellDate(cursor, leading, index);
    const key = dateKeyOf(date);
    if (index % DAYS_PER_WEEK === 0) {
      weeks.push([]);
    }
    weeks[weeks.length - 1].push({
      date: key,
      day: date.getDate(),
      isInMonth: date.getMonth() === cursor.month,
      isToday: key === todayKey,
      events: eventsByDate.get(key) ?? [],
    });
  }
  return weeks;
}

/**
 * 新增行程時的預設日期：顯示的是本月就用今天，否則用該月 1 日。
 *
 * @param cursor 目前月份
 * @param today 今天
 * @returns YYYY-MM-DD
 */
export function defaultDateFor(cursor: MonthCursor, today: Date): string {
  return cursor.year === today.getFullYear() &&
    cursor.month === today.getMonth()
    ? dateKeyOf(today)
    : toDateKey(cursor.year, cursor.month, 1);
}
