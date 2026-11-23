package dev.mfeplatform.api.dto;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

import dev.mfeplatform.api.model.CalendarEvent;

/**
 * 行程資料。
 *
 * @param id           行程識別碼
 * @param customerId   客戶識別碼
 * @param customerName 客戶名稱
 * @param eventDate    日期
 * @param startTime    開始時間，格式 HH:mm
 * @param title        主題
 * @param note         備註
 */
public record CalendarEventRes(UUID id, UUID customerId, String customerName, LocalDate eventDate, String startTime,
		String title, String note) {

	private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

	/**
	 * @param event 行程
	 * @return 回應資料
	 */
	public static CalendarEventRes from(CalendarEvent event) {
		return new CalendarEventRes(event.id(), event.customerId(), event.customerName(), event.eventDate(),
				event.startTime().format(TIME_FORMAT), event.title(), event.note());
	}
}
