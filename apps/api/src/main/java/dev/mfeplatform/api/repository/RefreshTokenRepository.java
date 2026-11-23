package dev.mfeplatform.api.repository;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import dev.mfeplatform.api.model.RefreshToken;

/**
 * refresh token 的資料存取（資料表 refresh_tokens）。只存 token 的 SHA-256 雜湊，
 * 資料外洩也無法拿來使用。
 */
@Repository
public class RefreshTokenRepository {

	private final JdbcClient jdbc;

	/**
	 * @param jdbc 資料庫用戶端
	 */
	public RefreshTokenRepository(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	/**
	 * @param userId    所屬帳號
	 * @param tokenHash token 的 SHA-256 雜湊
	 * @param expiresAt 到期時間
	 * @return 新紀錄的識別碼
	 */
	public UUID insert(UUID userId, String tokenHash, OffsetDateTime expiresAt) {
		return jdbc.sql("insert into refresh_tokens (user_id, token_hash, expires_at)"
				+ " values (:userId, :tokenHash, :expiresAt) returning id")
				.param("userId", userId)
				.param("tokenHash", tokenHash)
				.param("expiresAt", expiresAt)
				.query(UUID.class)
				.single();
	}

	/**
	 * @param tokenHash token 的 SHA-256 雜湊
	 * @return 紀錄；不存在時為空
	 */
	public Optional<RefreshToken> findByHash(String tokenHash) {
		return jdbc.sql("select id, user_id, expires_at, revoked_at from refresh_tokens where token_hash = :tokenHash")
				.param("tokenHash", tokenHash)
				.query((rs, rowNum) -> new RefreshToken(rs.getObject("id", UUID.class),
						rs.getObject("user_id", UUID.class), rs.getObject("expires_at", OffsetDateTime.class),
						rs.getObject("revoked_at", OffsetDateTime.class)))
				.optional();
	}

	/**
	 * 撤銷一個 token；已撤銷的不重複撤銷。
	 *
	 * @param id         紀錄識別碼
	 * @param replacedBy 輪替後的新紀錄；登出時為 null
	 * @return 這次是否真的撤銷（並行請求時只有一個會成功）
	 */
	public boolean revoke(UUID id, UUID replacedBy) {
		return jdbc.sql("update refresh_tokens set revoked_at = now(), replaced_by = :replacedBy"
				+ " where id = :id and revoked_at is null")
				.param("id", id)
				.param("replacedBy", replacedBy)
				.update() > 0;
	}

	/**
	 * 撤銷某帳號所有仍有效的 token，例如偵測到 token 被重複使用、或帳號被停用時。
	 *
	 * @param userId 帳號識別碼
	 */
	public void revokeAllForUser(UUID userId) {
		jdbc.sql("update refresh_tokens set revoked_at = now() where user_id = :userId and revoked_at is null")
				.param("userId", userId)
				.update();
	}

	/**
	 * 刪除某帳號已過期、或撤銷超過一天的紀錄，避免資料表無限成長。
	 *
	 * @param userId 帳號識別碼
	 */
	public void deleteStale(UUID userId) {
		jdbc.sql("delete from refresh_tokens where user_id = :userId"
				+ " and (expires_at < now() or revoked_at < now() - interval '1 day')")
				.param("userId", userId)
				.update();
	}
}
