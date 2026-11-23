package dev.mfeplatform.api.dto;

/**
 * 登入或更新 token 的結果。
 *
 * @param accessToken  呼叫 API 用的 token
 * @param refreshToken 換發新 token 用；每次使用後就會換成新的
 * @param expiresIn    access token 的有效秒數
 * @param user         登入者資料
 */
public record TokenRes(String accessToken, String refreshToken, long expiresIn, UserRes user) {
}
