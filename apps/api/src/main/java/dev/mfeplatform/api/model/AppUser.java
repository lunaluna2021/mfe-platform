package dev.mfeplatform.api.model;

import java.util.UUID;

/**
 * 帳號，對應資料表 {@code mfe.app_users}。
 *
 * @param id           帳號識別碼，也是 access token 的 subject
 * @param email        登入用 email（一律存小寫）
 * @param passwordHash BCrypt 雜湊，不可回傳給前端
 * @param displayName  顯示名稱
 * @param role         角色，見 {@link Role}
 * @param enabled      停用的帳號無法登入或更新 token
 */
public record AppUser(UUID id, String email, String passwordHash, String displayName, String role, boolean enabled) {
}
