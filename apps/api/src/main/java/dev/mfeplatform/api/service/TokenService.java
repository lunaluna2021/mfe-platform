package dev.mfeplatform.api.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import dev.mfeplatform.api.config.AppProperties;
import dev.mfeplatform.api.config.JwtClaims;
import dev.mfeplatform.api.model.AppUser;

/**
 * 簽發 access token（JWT）與產生 refresh token。
 *
 * <p>access token 有效時間短，內含使用者識別碼、角色與權限，API 不必每次查資料庫；
 * refresh token 是隨機字串，資料庫只存雜湊，可以撤銷。
 */
@Service
public class TokenService {

	private static final int REFRESH_TOKEN_BYTES = 32;

	private final JwtEncoder jwtEncoder;
	private final AppProperties properties;
	private final SecureRandom secureRandom = new SecureRandom();

	/**
	 * @param jwtEncoder JWT 簽發器
	 * @param properties 應用程式設定
	 */
	public TokenService(JwtEncoder jwtEncoder, AppProperties properties) {
		this.jwtEncoder = jwtEncoder;
		this.properties = properties;
	}

	/**
	 * @param user        帳號
	 * @param permissions 角色的權限
	 * @param now         簽發時間
	 * @return 已簽章的 access token
	 */
	public String issueAccessToken(AppUser user, List<String> permissions, Instant now) {
		JwtClaimsSet claims = JwtClaimsSet.builder()
				.issuer(properties.jwt().issuer())
				.subject(user.id().toString())
				.issuedAt(now)
				.expiresAt(now.plus(properties.jwt().accessTokenTtl()))
				.claim(JwtClaims.NAME, user.displayName())
				.claim(JwtClaims.ROLE, user.role())
				.claim(JwtClaims.PERMISSIONS, permissions)
				.build();
		JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
		return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
	}

	/**
	 * @return access token 的有效秒數
	 */
	public long accessTokenTtlSeconds() {
		return properties.jwt().accessTokenTtl().toSeconds();
	}

	/**
	 * @param now 目前時間
	 * @return refresh token 的到期時間
	 */
	public Instant refreshTokenExpiresAt(Instant now) {
		return now.plus(properties.jwt().refreshTokenTtl());
	}

	/**
	 * @return 新的 refresh token（只回傳給前端一次，資料庫只存雜湊）
	 */
	public String newRefreshToken() {
		byte[] bytes = new byte[REFRESH_TOKEN_BYTES];
		secureRandom.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	/**
	 * @param refreshToken 前端送來的 refresh token
	 * @return SHA-256 雜湊（十六進位）
	 */
	public String hash(String refreshToken) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			return HexFormat.of().formatHex(digest.digest(refreshToken.getBytes(StandardCharsets.UTF_8)));
		} catch (NoSuchAlgorithmException exception) {
			throw new IllegalStateException("JVM 不支援 SHA-256", exception);
		}
	}
}
