package dev.mfeplatform.api.service;

import java.util.List;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.mfeplatform.api.model.AppUser;
import dev.mfeplatform.api.model.Role;
import dev.mfeplatform.api.repository.RefreshTokenRepository;
import dev.mfeplatform.api.repository.UserRepository;

/**
 * 帳號管理（由管理指令呼叫，沒有對外的 API）：建立帳號、重設密碼、變更角色、停用與啟用。
 * 重設密碼、變更角色或停用時，撤銷該帳號所有 refresh token，舊的登入在 access token 到期後失效。
 */
@Service
public class UserAdminService {

	/** 密碼最短長度 */
	public static final int MIN_PASSWORD_LENGTH = 10;

	private final UserRepository users;
	private final RefreshTokenRepository refreshTokens;
	private final PasswordEncoder passwordEncoder;

	/**
	 * @param users           帳號資料
	 * @param refreshTokens   refresh token 資料
	 * @param passwordEncoder 密碼雜湊
	 */
	public UserAdminService(UserRepository users, RefreshTokenRepository refreshTokens,
			PasswordEncoder passwordEncoder) {
		this.users = users;
		this.refreshTokens = refreshTokens;
		this.passwordEncoder = passwordEncoder;
	}

	/**
	 * @param email       登入 email
	 * @param password    密碼
	 * @param displayName 顯示名稱
	 * @param role        角色
	 * @return 新帳號
	 */
	@Transactional
	public AppUser createUser(String email, String password, String displayName, String role) {
		String normalizedEmail = requireEmail(email);
		requirePassword(password);
		requireRole(role);
		if (displayName == null || displayName.isBlank() || displayName.trim().length() > 40) {
			throw new IllegalArgumentException("顯示名稱必須是 1～40 個字");
		}
		try {
			return users.insert(normalizedEmail, passwordEncoder.encode(password), displayName.trim(), role);
		} catch (DuplicateKeyException exception) {
			throw new IllegalArgumentException("已經有這個 email 的帳號：" + normalizedEmail);
		}
	}

	/**
	 * @param email    登入 email
	 * @param password 新密碼
	 */
	@Transactional
	public void resetPassword(String email, String password) {
		requirePassword(password);
		AppUser user = requireUser(email);
		users.updatePassword(user.id(), passwordEncoder.encode(password));
		refreshTokens.revokeAllForUser(user.id());
	}

	/**
	 * @param email 登入 email
	 * @param role  新角色
	 */
	@Transactional
	public void changeRole(String email, String role) {
		requireRole(role);
		AppUser user = requireUser(email);
		users.updateRole(user.id(), role);
		refreshTokens.revokeAllForUser(user.id());
	}

	/**
	 * @param email   登入 email
	 * @param enabled 是否啟用
	 */
	@Transactional
	public void setEnabled(String email, boolean enabled) {
		AppUser user = requireUser(email);
		users.updateEnabled(user.id(), enabled);
		if (!enabled) {
			refreshTokens.revokeAllForUser(user.id());
		}
	}

	/**
	 * @return 所有帳號
	 */
	public List<AppUser> listUsers() {
		return users.findAll();
	}

	private AppUser requireUser(String email) {
		String normalizedEmail = requireEmail(email);
		return users.findByEmail(normalizedEmail)
				.orElseThrow(() -> new IllegalArgumentException("找不到帳號：" + normalizedEmail));
	}

	private static String requireEmail(String email) {
		String normalized = AuthService.normalizeEmail(email);
		if (!normalized.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+")) {
			throw new IllegalArgumentException("Email 格式不正確");
		}
		return normalized;
	}

	private static void requirePassword(String password) {
		if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
			throw new IllegalArgumentException("密碼至少需要 " + MIN_PASSWORD_LENGTH + " 個字元");
		}
	}

	private static void requireRole(String role) {
		if (!Role.isValid(role)) {
			throw new IllegalArgumentException("角色必須是 " + String.join("、", Role.ALL) + " 其中之一");
		}
	}
}
