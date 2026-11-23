package dev.mfeplatform.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * mfe-platform 後端 API。
 *
 * <p>負責帳號登入與 token 簽發、權限檢查，以及客戶、行程、報表的資料存取。
 * 資料庫是 Supabase 的 PostgreSQL，資料表放在獨立的 {@code mfe} schema。
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class ApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(ApiApplication.class, args);
	}
}
