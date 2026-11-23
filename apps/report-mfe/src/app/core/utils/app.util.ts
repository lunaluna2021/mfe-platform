import type {
  IndustryCountRes,
  MonthlyActivityRes,
} from '../bff/api.interface';
import type {
  ActivityTotals,
  IndustryCount,
  MonthlyActivity,
} from '../interfaces/app.interface';

/**
 * @param res API 回傳的每月統計
 * @returns 畫面使用的資料，依月份排序
 */
export function toMonthlyActivities(
  res: readonly MonthlyActivityRes[],
): MonthlyActivity[] {
  return res
    .map((row) => ({
      month: row.MONTH,
      newCustomers: row.NEW_CUSTOMERS,
      visits: row.VISITS,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * @param res API 回傳的產業統計
 * @returns 畫面使用的資料，客戶數多的在前
 */
export function toIndustryCounts(
  res: readonly IndustryCountRes[],
): IndustryCount[] {
  return res
    .map((row) => ({
      industry: row.INDUSTRY,
      customerCount: row.CUSTOMER_COUNT,
    }))
    .sort(
      (a, b) =>
        b.customerCount - a.customerCount ||
        a.industry.localeCompare(b.industry, 'zh-Hant'),
    );
}

/**
 * @param rows 每月統計
 * @returns 期間合計
 */
export function sumActivity(rows: readonly MonthlyActivity[]): ActivityTotals {
  return rows.reduce(
    (totals, row) => ({
      newCustomers: totals.newCustomers + row.newCustomers,
      visits: totals.visits + row.visits,
    }),
    { newCustomers: 0, visits: 0 },
  );
}

/**
 * 長條圖寬度。
 *
 * @param value 數值
 * @param max 最大值；小於 1 時當成 1，避免除以 0
 * @returns CSS 百分比，例如 `40%`
 */
export function toBarWidth(value: number, max: number): string {
  return `${Math.round((value / Math.max(1, max)) * 100)}%`;
}
