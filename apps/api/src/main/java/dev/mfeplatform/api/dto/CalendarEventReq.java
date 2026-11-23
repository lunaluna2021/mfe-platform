package dev.mfeplatform.api.dto;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 新增或修改行程的請求。
 *
 * @param customerId 客戶識別碼
 * @param eventDate  日期，格式 YYYY-MM-DD
 * @param startTime  開始時間，格式 HH:mm
 * @param title      主題
 * @param note       備註
 */
public record CalendarEventReq(
		@NotNull(message = "請選擇客戶") UUID customerId,
		@NotNull(message = "請選擇日期") LocalDate eventDate,
		@NotNull(message = "請選擇時間") @Pattern(regexp = "([01]\\d|2[0-3]):[0-5]\\d", message = "時間格式必須是 HH:mm") String startTime,
		@NotBlank(message = "請輸入主題") @Size(max = 40, message = "主題最多 40 個字") String title,
		@Size(max = 200, message = "備註最多 200 個字") String note) {
}
