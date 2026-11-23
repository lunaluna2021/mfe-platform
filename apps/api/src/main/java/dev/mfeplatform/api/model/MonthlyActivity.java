package dev.mfeplatform.api.model;

/**
 * 每月活動統計。
 *
 * @param month        月份，格式 YYYY-MM（台北時間）
 * @param newCustomers 當月新增的客戶數
 * @param visits       當月的拜訪行程數
 */
public record MonthlyActivity(String month, int newCustomers, int visits) {
}
