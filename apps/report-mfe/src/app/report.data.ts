export interface SalesRow {
  /** YYYY-MM */
  readonly month: string;
  readonly revenue: number;
  readonly deals: number;
  readonly newCustomers: number;
}

export interface SalesTotals {
  readonly revenue: number;
  readonly deals: number;
  readonly newCustomers: number;
}

/**
 * 產生最近幾個月的示範業績（含本月）。
 * 數字由月份推算，同一個月每次都相同，方便對照。
 */
export function buildSalesReport(today: Date, months = 6): SalesRow[] {
  const rows: SalesRow[] = [];
  for (let offset = months - 1; offset >= 0; offset--) {
    const date = new Date(today.getFullYear(), today.getMonth() - offset, 1);
    const seed = date.getFullYear() * 12 + date.getMonth();
    rows.push({
      month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      revenue: 1_200_000 + ((seed * 7_919) % 900_000),
      deals: 8 + ((seed * 13) % 12),
      newCustomers: 2 + ((seed * 7) % 6),
    });
  }
  return rows;
}

export function sumSales(rows: readonly SalesRow[]): SalesTotals {
  return rows.reduce(
    (totals, row) => ({
      revenue: totals.revenue + row.revenue,
      deals: totals.deals + row.deals,
      newCustomers: totals.newCustomers + row.newCustomers,
    }),
    { revenue: 0, deals: 0, newCustomers: 0 },
  );
}

/**
 * 轉成 CSV。開頭加 BOM，Excel 開啟時中文才不會變成亂碼。
 * 欄位都是程式產生的數字與月份，不含使用者輸入，因此不需處理公式注入。
 */
export function toSalesCsv(rows: readonly SalesRow[]): string {
  const header = '月份,營收,成交數,新客戶數';
  const lines = rows.map((row) =>
    [row.month, row.revenue, row.deals, row.newCustomers].join(','),
  );
  return '﻿' + [header, ...lines].join('\r\n');
}
