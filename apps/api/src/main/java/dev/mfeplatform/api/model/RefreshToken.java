package dev.mfeplatform.api.model;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * refresh token 紀錄，對應資料表 {@code mfe.refresh_tokens}。資料庫只存 token 的雜湊。
 *
 * @param id        紀錄識別碼
 * @param userId    所屬帳號
 * @param expiresAt 到期時間
 * @param revokedAt 撤銷時間；尚未撤銷為 null
 */
public record RefreshToken(UUID id, UUID userId, OffsetDateTime expiresAt, OffsetDateTime revokedAt) {
}
