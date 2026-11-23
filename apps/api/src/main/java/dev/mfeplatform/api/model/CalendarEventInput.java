package dev.mfeplatform.api.model;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

/**
 * 寫入行程資料表前整理好的欄位。欄位名稱與 SQL 的具名參數相同。
 *
 * @param customerId 客戶識別碼
 * @param eventDate  日期
 * @param startTime  開始時間
 * @param title      主題
 * @param note       備註
 */
public record CalendarEventInput(UUID customerId, LocalDate eventDate, LocalTime startTime, String title,
		String note) {
}
