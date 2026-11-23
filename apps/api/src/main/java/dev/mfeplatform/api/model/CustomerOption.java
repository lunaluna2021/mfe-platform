package dev.mfeplatform.api.model;

import java.util.UUID;

/**
 * 下拉選單用的客戶精簡資料。
 *
 * @param id   客戶識別碼
 * @param name 公司名稱
 */
public record CustomerOption(UUID id, String name) {
}
