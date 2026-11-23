package dev.mfeplatform.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 新增或修改客戶的請求。欄位長度與資料表的 check 條件一致。
 *
 * @param name     公司名稱
 * @param industry 產業；空白時存為「未分類」
 * @param contact  聯絡人
 * @param phone    電話
 * @param level    等級 A／B／C
 */
public record CustomerReq(
		@NotBlank(message = "請輸入公司名稱") @Size(max = 40, message = "公司名稱最多 40 個字") String name,
		@Size(max = 20, message = "產業最多 20 個字") String industry,
		@Size(max = 20, message = "聯絡人最多 20 個字") String contact,
		@Size(max = 20, message = "電話最多 20 個字") String phone,
		@NotNull(message = "請選擇客戶等級") @Pattern(regexp = "[ABC]", message = "客戶等級必須是 A、B 或 C") String level) {
}
