package dev.mfeplatform.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * 密碼雜湊。網頁模式（登入）與帳號管理指令（建立帳號、重設密碼）都會用到，所以獨立於安全設定之外。
 */
@Configuration
public class PasswordConfig {

	/**
	 * @return BCrypt 密碼雜湊
	 */
	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}
}
