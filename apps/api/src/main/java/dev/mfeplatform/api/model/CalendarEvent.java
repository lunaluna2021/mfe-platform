package dev.mfeplatform.api.model;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

/**
 * 拜訪行程，對應資料表 {@code mfe.calendar_events}，並帶出客戶名稱。
 *
 * @param id           行程識別碼
 * @param customerId   客戶識別碼
 * @param customerName 客戶名稱
 * @param eventDate    日期
 * @param startTime    開始時間
 * @param title        主題
 * @param note         備註
 */
public record CalendarEvent(UUID id, UUID customerId, String customerName, LocalDate eventDate, LocalTime startTime,
		String title, String note) {
}
