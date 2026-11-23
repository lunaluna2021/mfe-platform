/** GET api/reports/monthly-activity 回傳的一個月份 */
export interface MonthlyActivityRes {
  /** YYYY-MM */
  readonly MONTH: string;
  readonly NEW_CUSTOMERS: number;
  readonly VISITS: number;
}

/** GET api/reports/customers-by-industry 回傳的一個產業 */
export interface IndustryCountRes {
  readonly INDUSTRY: string;
  readonly CUSTOMER_COUNT: number;
}
