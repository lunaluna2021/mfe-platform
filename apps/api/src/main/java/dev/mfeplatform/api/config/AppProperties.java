package dev.mfeplatform.api.config;

import java.time.Duration;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 應用程式設定（application.yml 的 {@code app.*}）。
 *
 * @param jwt  token 簽發設定
 * @param cors 允許呼叫 API 的前端網址
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(Jwt jwt, Cors cors) {

	/**
	 * @param secret          HS256 簽章金鑰，Base64 編碼，解碼後至少 32 bytes
	 * @param issuer          token 的發行者，驗證時必須相同
	 * @param accessTokenTtl  access token 有效時間
	 * @param refreshTokenTtl refresh token 有效時間
	 */
	public record Jwt(String secret, String issuer, Duration accessTokenTtl, Duration refreshTokenTtl) {
	}

	/**
	 * @param allowedOrigins 允許的來源，例如 GitHub Pages 與本機開發網址
	 */
	public record Cors(List<String> allowedOrigins) {
	}
}
