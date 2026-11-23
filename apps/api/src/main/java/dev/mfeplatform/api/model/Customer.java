package dev.mfeplatform.api.model;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * 客戶，對應資料表 {@code mfe.customers}。
 *
 * @param id        客戶識別碼
 * @param name      公司名稱
 * @param industry  產業
 * @param contact   聯絡人
 * @param phone     電話
 * @param level     等級 A／B／C
 * @param createdAt 建立時間
 */
public record Customer(UUID id, String name, String industry, String contact, String phone, String level,
		OffsetDateTime createdAt) {
}
