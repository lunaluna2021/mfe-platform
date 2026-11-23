package dev.mfeplatform.api.dto;

/**
 * 錯誤回應。JSON 欄位依設定轉為大寫：{@code {"CODE": "...", "MESSAGE": "..."}}。
 *
 * @param code    錯誤代碼，例如 {@code DUPLICATE_CUSTOMER_NAME}
 * @param message 給使用者看的訊息
 */
public record ErrorRes(String code, String message) {
}
