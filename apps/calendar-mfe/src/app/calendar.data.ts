export interface CalendarEvent {
  readonly id: string;
  /** YYYY-MM-DD */
  readonly date: string;
  readonly time: string;
  readonly title: string;
  readonly customerId: string;
  readonly customerName: string;
}

/** month 為 0～11，與 Date 相同 */
export interface MonthCursor {
  readonly year: number;
  readonly month: number;
}

export interface CalendarCell {
  readonly date: string;
  readonly day: number;
  readonly inMonth: boolean;
  readonly isToday: boolean;
  readonly events: readonly CalendarEvent[];
}

/** 每個月固定的示範行程；客戶編號與客戶管理 MFE 的示範資料相同 */
const DEMO_SCHEDULE = [
  {
    day: 3,
    time: '10:00',
    title: '產品簡報',
    customerId: 'c001',
    customerName: '晨光資訊有限公司',
  },
  {
    day: 8,
    time: '14:30',
    title: '續約討論',
    customerId: 'c002',
    customerName: '青禾食品股份有限公司',
  },
  {
    day: 12,
    time: '09:30',
    title: '季度回顧',
    customerId: 'c003',
    customerName: '遠揚物流有限公司',
  },
  {
    day: 15,
    time: '16:00',
    title: '需求訪談',
    customerId: 'c004',
    customerName: '星河設計工作室',
  },
  {
    day: 21,
    time: '11:00',
    title: '報價說明',
    customerId: 'c005',
    customerName: '松林建材行',
  },
  {
    day: 26,
    time: '10:00',
    title: '系統展示',
    customerId: 'c001',
    customerName: '晨光資訊有限公司',
  },
  {
    day: 26,
    time: '15:00',
    title: '教育訓練',
    customerId: 'c006',
    customerName: '海灣餐飲有限公司',
  },
] as const;

export function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function addMonths(cursor: MonthCursor, delta: number): MonthCursor {
  const date = new Date(cursor.year, cursor.month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function buildDemoEvents(cursor: MonthCursor): CalendarEvent[] {
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  return DEMO_SCHEDULE.map((item, index) => {
    const day = Math.min(item.day, daysInMonth);
    return {
      id: `${cursor.year}-${cursor.month + 1}-${index}`,
      date: toDateKey(cursor.year, cursor.month, day),
      time: item.time,
      title: item.title,
      customerId: item.customerId,
      customerName: item.customerName,
    };
  });
}

/** 以週日為一週開始，產生完整的週列（含前後月份補位的日期） */
export function buildMonthGrid(
  cursor: MonthCursor,
  events: readonly CalendarEvent[],
  todayKey: string,
): CalendarCell[][] {
  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const event of [...events].sort((a, b) =>
    a.time.localeCompare(b.time),
  )) {
    eventsByDate.set(event.date, [
      ...(eventsByDate.get(event.date) ?? []),
      event,
    ]);
  }

  const first = new Date(cursor.year, cursor.month, 1);
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const leading = first.getDay();
  const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;

  const weeks: CalendarCell[][] = [];
  for (let index = 0; index < totalCells; index++) {
    const date = new Date(cursor.year, cursor.month, index - leading + 1);
    const key = toDateKey(date.getFullYear(), date.getMonth(), date.getDate());
    const cell: CalendarCell = {
      date: key,
      day: date.getDate(),
      inMonth: date.getMonth() === cursor.month,
      isToday: key === todayKey,
      events: eventsByDate.get(key) ?? [],
    };
    if (index % 7 === 0) {
      weeks.push([]);
    }
    weeks[weeks.length - 1].push(cell);
  }
  return weeks;
}
