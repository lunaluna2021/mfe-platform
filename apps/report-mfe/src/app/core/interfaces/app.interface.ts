/** 一個月的活動統計 */
export interface MonthlyActivity {
  /** YYYY-MM（台北時間） */
  readonly month: string;
  readonly newCustomers: number;
  readonly visits: number;
}

/** 一個產業的客戶數 */
export interface IndustryCount {
  readonly industry: string;
  readonly customerCount: number;
}

/** 期間合計 */
export interface ActivityTotals {
  readonly newCustomers: number;
  readonly visits: number;
}
