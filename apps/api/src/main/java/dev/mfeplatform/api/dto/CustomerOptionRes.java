package dev.mfeplatform.api.dto;

import java.util.UUID;

import dev.mfeplatform.api.model.CustomerOption;

/**
 * 下拉選單用的客戶精簡資料。
 *
 * @param id   客戶識別碼
 * @param name 公司名稱
 */
public record CustomerOptionRes(UUID id, String name) {

	/**
	 * @param option 客戶選項
	 * @return 回應資料
	 */
	public static CustomerOptionRes from(CustomerOption option) {
		return new CustomerOptionRes(option.id(), option.name());
	}
}
