package dev.mfeplatform.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 登入請求：{@code {"EMAIL": "...", "PASSWORD": "..."}}。
 *
 * @param email    登入 email
 * @param password 密碼
 */
public record LoginReq(
		@NotBlank(message = "請輸入 Email") @Email(message = "Email 格式不正確") @Size(max = 254, message = "Email 太長") String email,
		@NotBlank(message = "請輸入密碼") @Size(max = 200, message = "密碼太長") String password) {
}
