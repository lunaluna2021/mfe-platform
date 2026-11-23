package dev.mfeplatform.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

import dev.mfeplatform.api.model.Customer;

/**
 * 客戶資料。
 *
 * @param id        客戶識別碼
 * @param name      公司名稱
 * @param industry  產業
 * @param contact   聯絡人
 * @param phone     電話
 * @param level     等級
 * @param createdAt 建立時間
 */
public record CustomerRes(UUID id, String name, String industry, String contact, String phone, String level,
		OffsetDateTime createdAt) {

	/**
	 * @param customer 客戶
	 * @return 回應資料
	 */
	public static CustomerRes from(Customer customer) {
		return new CustomerRes(customer.id(), customer.name(), customer.industry(), customer.contact(),
				customer.phone(), customer.level(), customer.createdAt());
	}
}
