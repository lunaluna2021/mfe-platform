package dev.mfeplatform.api.service;

import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import dev.mfeplatform.api.common.ApiException;
import dev.mfeplatform.api.dto.TokenRes;
import dev.mfeplatform.api.dto.UserRes;
import dev.mfeplatform.api.model.AppUser;
import dev.mfeplatform.api.model.RefreshToken;
import dev.mfeplatform.api.repository.RefreshTokenRepository;
import dev.mfeplatform.api.repository.UserRepository;

/**
 * 登入、更新 token、登出。
 *
 * <p>refresh token 每用一次就輪替成新的。若收到已經輪替掉的 token：
 * <ul>
 * <li>輪替後 30 秒內：多半是多個分頁同時更新，回 409，請前端改用其他分頁存下的新 token；</li>
 * <li>超過 30 秒：視為 token 外流後被重複使用，撤銷這個帳號所有 token，強制重新登入。</li>
 * </ul>
 *
 * <p>交易範圍：撤銷 token 的寫入必須在回傳錯誤前就生效，所以不包在會因錯誤而回滾的交易裡；
 * 只有「新增新 token＋撤銷舊 token」這組必須一起成功或一起失敗的寫入才放進交易。
 */
@Service
public class AuthService {

	private static final Duration ROTATION_GRACE = Duration.ofSeconds(30);

	private final UserRepository users;
	private final RefreshTokenRepository refreshTokens;
	private final TokenService tokenService;
	private final PasswordEncoder passwordEncoder;
	private final TransactionTemplate transaction;
	/** 帳號不存在時也比對一次密碼，讓回應時間一致，無法藉此猜出哪些 email 已建立帳號 */
	private final String dummyHash;

	/**
	 * @param users              帳號資料
	 * @param refreshTokens      refresh token 資料
	 * @param tokenService       token 簽發
	 * @param passwordEncoder    密碼雜湊
	 * @param transactionManager 交易管理
	 */
	public AuthService(UserRepository users, RefreshTokenRepository refreshTokens, TokenService tokenService,
			PasswordEncoder passwordEncoder, PlatformTransactionManager transactionManager) {
		this.users = users;
		this.refreshTokens = refreshTokens;
		this.tokenService = tokenService;
		this.passwordEncoder = passwordEncoder;
		this.transaction = new TransactionTemplate(transactionManager);
		this.dummyHash = passwordEncoder.encode(UUID.randomUUID().toString());
	}

	/**
	 * 帳號不存在、密碼錯誤或帳號停用，都回同一個訊息，不透露是哪一種。
	 *
	 * @param email    登入 email
	 * @param password 密碼
	 * @return 新的 token
	 */
	public TokenRes login(String email, String password) {
		AppUser user = users.findByEmail(normalizeEmail(email)).orElse(null);
		boolean passwordMatches = passwordEncoder.matches(password, user != null ? user.passwordHash() : dummyHash);
		if (user == null || !passwordMatches || !user.enabled()) {
			throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email 或密碼錯誤");
		}
		refreshTokens.deleteStale(user.id());
		return transaction.execute(status -> issueTokens(user, null));
	}

	/**
	 * 撤銷類的寫入各自立即生效（不在交易中），之後才拋出錯誤；
	 * 輪替成功的路徑才放進交易。
	 *
	 * @param refreshToken 前端保存的 refresh token
	 * @return 新的 token（refresh token 也會換新）
	 */
	public TokenRes refresh(String refreshToken) {
		RefreshToken record = refreshTokens.findByHash(tokenService.hash(refreshToken))
				.orElseThrow(AuthService::invalidRefreshToken);
		OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

		if (record.revokedAt() != null) {
			if (record.revokedAt().isAfter(now.minus(ROTATION_GRACE))) {
				throw rotatedElsewhere();
			}
			refreshTokens.revokeAllForUser(record.userId());
			throw invalidRefreshToken();
		}
		if (record.expiresAt().isBefore(now)) {
			throw invalidRefreshToken();
		}

		AppUser user = users.findById(record.userId()).filter(AppUser::enabled).orElse(null);
		if (user == null) {
			refreshTokens.revoke(record.id(), null);
			throw invalidRefreshToken();
		}
		// 並行輪替時，失敗的一方回 409 並回滾它新增的 token
		return transaction.execute(status -> issueTokens(user, record.id()));
	}

	/**
	 * 撤銷 refresh token。token 不存在或已撤銷時也視為成功，登出不應該失敗。
	 *
	 * @param refreshToken 前端保存的 refresh token
	 */
	public void logout(String refreshToken) {
		refreshTokens.findByHash(tokenService.hash(refreshToken))
				.ifPresent(record -> refreshTokens.revoke(record.id(), null));
	}

	/**
	 * @param userId access token 的 subject
	 * @return 登入者資料（以資料庫目前的角色為準）
	 */
	public UserRes currentUser(UUID userId) {
		AppUser user = users.findById(userId).filter(AppUser::enabled)
				.orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "帳號已停用或不存在，請重新登入"));
		return UserRes.from(user, users.findPermissions(user.role()));
	}

	/**
	 * @param email 使用者輸入的 email
	 * @return 去除空白並轉小寫
	 */
	public static String normalizeEmail(String email) {
		return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
	}

	/**
	 * 簽發新的 access token 與 refresh token；更新時同時撤銷舊的 refresh token。
	 * 並行更新時只有一個請求能撤銷成功，另一個回 409 並回滾這次新增的 token。
	 */
	private TokenRes issueTokens(AppUser user, UUID previousTokenId) {
		List<String> permissions = users.findPermissions(user.role());
		Instant now = Instant.now();
		String refreshToken = tokenService.newRefreshToken();
		OffsetDateTime refreshExpiresAt = OffsetDateTime.ofInstant(tokenService.refreshTokenExpiresAt(now),
				ZoneOffset.UTC);
		UUID newTokenId = refreshTokens.insert(user.id(), tokenService.hash(refreshToken), refreshExpiresAt);

		if (previousTokenId != null && !refreshTokens.revoke(previousTokenId, newTokenId)) {
			throw rotatedElsewhere();
		}

		return new TokenRes(tokenService.issueAccessToken(user, permissions, now), refreshToken,
				tokenService.accessTokenTtlSeconds(), UserRes.from(user, permissions));
	}

	private static ApiException invalidRefreshToken() {
		return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "登入已過期，請重新登入");
	}

	private static ApiException rotatedElsewhere() {
		return new ApiException(HttpStatus.CONFLICT, "REFRESH_TOKEN_ROTATED", "登入狀態已在其他分頁更新");
	}
}
