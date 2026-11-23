package dev.mfeplatform.api.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import dev.mfeplatform.api.model.AppUser;

/**
 * 帳號與角色權限的資料存取（資料表 app_users、role_permissions）。
 */
@Repository
public class UserRepository {

	private static final String USER_COLUMNS = "id, email, password_hash, display_name, role, enabled";

	private final JdbcClient jdbc;

	/**
	 * @param jdbc 資料庫用戶端
	 */
	public UserRepository(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	/**
	 * @param email 已轉小寫的 email
	 * @return 帳號；不存在時為空
	 */
	public Optional<AppUser> findByEmail(String email) {
		return jdbc.sql("select " + USER_COLUMNS + " from app_users where email = :email")
				.param("email", email)
				.query(UserRepository::mapUser)
				.optional();
	}

	/**
	 * @param id 帳號識別碼
	 * @return 帳號；不存在時為空
	 */
	public Optional<AppUser> findById(UUID id) {
		return jdbc.sql("select " + USER_COLUMNS + " from app_users where id = :id")
				.param("id", id)
				.query(UserRepository::mapUser)
				.optional();
	}

	/**
	 * @return 所有帳號，依 email 排序
	 */
	public List<AppUser> findAll() {
		return jdbc.sql("select " + USER_COLUMNS + " from app_users order by email")
				.query(UserRepository::mapUser)
				.list();
	}

	/**
	 * @param role 角色
	 * @return 該角色的權限代碼
	 */
	public List<String> findPermissions(String role) {
		return jdbc.sql("select permission from role_permissions where role = :role order by permission")
				.param("role", role)
				.query(String.class)
				.list();
	}

	/**
	 * email 重複時資料庫拋出唯一鍵錯誤，由 service 處理。
	 *
	 * @param email        已轉小寫的 email
	 * @param passwordHash BCrypt 雜湊
	 * @param displayName  顯示名稱
	 * @param role         角色
	 * @return 新帳號
	 */
	public AppUser insert(String email, String passwordHash, String displayName, String role) {
		return jdbc.sql("insert into app_users (email, password_hash, display_name, role)"
				+ " values (:email, :passwordHash, :displayName, :role)"
				+ " returning " + USER_COLUMNS)
				.param("email", email)
				.param("passwordHash", passwordHash)
				.param("displayName", displayName)
				.param("role", role)
				.query(UserRepository::mapUser)
				.single();
	}

	/**
	 * @param id           帳號識別碼
	 * @param passwordHash 新的 BCrypt 雜湊
	 * @return 是否有更新
	 */
	public boolean updatePassword(UUID id, String passwordHash) {
		return jdbc.sql("update app_users set password_hash = :passwordHash, updated_at = now() where id = :id")
				.param("id", id)
				.param("passwordHash", passwordHash)
				.update() > 0;
	}

	/**
	 * @param id   帳號識別碼
	 * @param role 新角色
	 * @return 是否有更新
	 */
	public boolean updateRole(UUID id, String role) {
		return jdbc.sql("update app_users set role = :role, updated_at = now() where id = :id")
				.param("id", id)
				.param("role", role)
				.update() > 0;
	}

	/**
	 * @param id      帳號識別碼
	 * @param enabled 是否啟用
	 * @return 是否有更新
	 */
	public boolean updateEnabled(UUID id, boolean enabled) {
		return jdbc.sql("update app_users set enabled = :enabled, updated_at = now() where id = :id")
				.param("id", id)
				.param("enabled", enabled)
				.update() > 0;
	}

	private static AppUser mapUser(ResultSet rs, int rowNum) throws SQLException {
		return new AppUser(rs.getObject("id", UUID.class), rs.getString("email"), rs.getString("password_hash"),
				rs.getString("display_name"), rs.getString("role"), rs.getBoolean("enabled"));
	}
}
