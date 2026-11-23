package dev.mfeplatform.api.config;

import java.util.Base64;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

/**
 * JWT 的簽發與驗證。使用 HS256（對稱金鑰），簽發者與驗證者都是這個 API。
 */
@Configuration
public class JwtConfig {

	private static final int MIN_SECRET_BYTES = 32;

	/**
	 * 由設定讀取簽章金鑰；長度不足時啟動失敗，避免用弱金鑰上線。
	 *
	 * @param properties 應用程式設定
	 * @return HS256 金鑰
	 */
	@Bean
	SecretKey jwtSecretKey(AppProperties properties) {
		String secret = properties.jwt().secret();
		if (secret == null || secret.isBlank()) {
			throw new IllegalStateException("缺少 app.jwt.secret（環境變數 JWT_SECRET）");
		}
		byte[] bytes = Base64.getDecoder().decode(secret.trim());
		if (bytes.length < MIN_SECRET_BYTES) {
			throw new IllegalStateException("app.jwt.secret 解碼後至少需要 " + MIN_SECRET_BYTES + " bytes");
		}
		return new SecretKeySpec(bytes, "HmacSHA256");
	}

	/**
	 * @param secretKey 簽章金鑰
	 * @return 簽發 access token 用的 encoder
	 */
	@Bean
	JwtEncoder jwtEncoder(SecretKey secretKey) {
		return NimbusJwtEncoder.withSecretKey(secretKey).algorithm(MacAlgorithm.HS256).build();
	}

	/**
	 * 驗證簽章、有效時間與簽發者。
	 *
	 * @param secretKey  簽章金鑰
	 * @param properties 應用程式設定
	 * @return 驗證 access token 用的 decoder
	 */
	@Bean
	JwtDecoder jwtDecoder(SecretKey secretKey, AppProperties properties) {
		NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(secretKey).macAlgorithm(MacAlgorithm.HS256).build();
		decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(properties.jwt().issuer()));
		return decoder;
	}
}
