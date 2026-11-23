package dev.mfeplatform.api.model;

/**
 * 各產業的客戶數。
 *
 * @param industry      產業
 * @param customerCount 客戶數
 */
public record IndustryCount(String industry, int customerCount) {
}
