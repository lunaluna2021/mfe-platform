package dev.mfeplatform.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 更新 token 或登出的請求：{@code {"REFRESH_TOKEN": "..."}}。
 *
 * @param refreshToken 登入時取得的 refresh token
 */
public record RefreshTokenReq(@NotBlank(message = "缺少 refresh token") @Size(max = 200) String refreshToken) {
}
