package dev.mfeplatform.api.dto;

import dev.mfeplatform.api.model.IndustryCount;

/**
 * 各產業的客戶數。
 *
 * @param industry      產業
 * @param customerCount 客戶數
 */
public record IndustryCountRes(String industry, int customerCount) {

	/**
	 * @param count 統計資料
	 * @return 回應資料
	 */
	public static IndustryCountRes from(IndustryCount count) {
		return new IndustryCountRes(count.industry(), count.customerCount());
	}
}
