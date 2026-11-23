package dev.mfeplatform.api.dto;

import dev.mfeplatform.api.model.MonthlyActivity;

/**
 * 每月活動統計。
 *
 * @param month        月份，格式 YYYY-MM
 * @param newCustomers 新客戶數
 * @param visits       拜訪次數
 */
public record MonthlyActivityRes(String month, int newCustomers, int visits) {

	/**
	 * @param activity 統計資料
	 * @return 回應資料
	 */
	public static MonthlyActivityRes from(MonthlyActivity activity) {
		return new MonthlyActivityRes(activity.month(), activity.newCustomers(), activity.visits());
	}
}
