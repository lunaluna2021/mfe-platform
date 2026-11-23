import { ACTIVITY_CSV_HEADER } from '../const/app.const';
import type { MonthlyActivity } from '../interfaces/app.interface';

/** UTF-8 BOM；CSV 開頭加上它，Excel 開啟時中文才不會變成亂碼 */
const UTF8_BOM = String.fromCharCode(0xfeff);

/**
 * 轉成 CSV。
 * 欄位只有月份與數字，不含使用者輸入的文字，因此不需處理公式注入。
 *
 * @param rows 每月統計
 * @returns CSV 內容（含 BOM，CRLF 換行）
 */
export function toActivityCsv(rows: readonly MonthlyActivity[]): string {
  const lines = rows.map((row) =>
    [row.month, row.newCustomers, row.visits].join(','),
  );
  return UTF8_BOM + [ACTIVITY_CSV_HEADER.join(','), ...lines].join('\r\n');
}

/**
 * 在瀏覽器下載文字檔。
 *
 * @param fileName 檔名
 * @param content 內容
 * @param mimeType MIME 類型
 */
export function downloadTextFile(
  fileName: string,
  content: string,
  mimeType: string,
): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
