package dev.mfeplatform.api.config;

import java.util.List;

import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import dev.mfeplatform.api.common.JsonCorsProcessor;
import dev.mfeplatform.api.common.SecurityErrorHandlers;

/**
 * 安全設定。
 *
 * <ul>
 * <li>無狀態：每個請求都帶 {@code Authorization: Bearer <access token>}，不使用 session 與 cookie，
 * 所以不需要 CSRF 防護。</li>
 * <li>token 的 {@code permissions} claim 直接轉成權限，API 方法用 {@code @PreAuthorize} 檢查。</li>
 * <li>前端（GitHub Pages）與 API（Render）不同網域，以 CORS 白名單開放。</li>
 * </ul>
 *
 * <p>只在網頁模式啟用；帳號管理指令以非網頁模式執行，不需要這些設定。
 */
@Configuration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@EnableMethodSecurity
public class SecurityConfig {

	/** 不需登入的端點：登入、更新 token、登出（登出靠 refresh token 識別）與健康檢查 */
	private static final String[] PUBLIC_AUTH_PATHS = { "/api/auth/login", "/api/auth/refresh", "/api/auth/logout" };

	/**
	 * @param http          Spring Security 設定
	 * @param errorHandlers 401／403 的 JSON 回應
	 * @param properties    應用程式設定（CORS 白名單）
	 * @return 過濾器鏈
	 * @throws Exception 設定失敗
	 */
	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, SecurityErrorHandlers errorHandlers,
			AppProperties properties) throws Exception {
		// 自訂的 CORS 過濾器：拒絕時回 JSON。直接加進安全過濾鏈，不註冊成 bean，避免被 Servlet 容器再套用一次
		CorsFilter corsFilter = new CorsFilter(corsConfigurationSource(properties));
		corsFilter.setCorsProcessor(new JsonCorsProcessor());

		http.csrf(AbstractHttpConfigurer::disable)
				.cors(AbstractHttpConfigurer::disable)
				.addFilterBefore(corsFilter, BearerTokenAuthenticationFilter.class)
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.authorizeHttpRequests(authorize -> authorize
						.requestMatchers(HttpMethod.POST, PUBLIC_AUTH_PATHS).permitAll()
						.requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
						.anyRequest().authenticated())
				.oauth2ResourceServer(resourceServer -> resourceServer
						.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
						.authenticationEntryPoint(errorHandlers)
						.accessDeniedHandler(errorHandlers))
				.exceptionHandling(exceptions -> exceptions
						.authenticationEntryPoint(errorHandlers)
						.accessDeniedHandler(errorHandlers));
		return http.build();
	}

	/**
	 * @param properties 應用程式設定
	 * @return CORS 設定
	 */
	private static CorsConfigurationSource corsConfigurationSource(AppProperties properties) {
		CorsConfiguration configuration = new CorsConfiguration();
		configuration.setAllowedOrigins(properties.cors().allowedOrigins());
		configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
		configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
		configuration.setMaxAge(3600L);
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/api/**", configuration);
		return source;
	}

	private static JwtAuthenticationConverter jwtAuthenticationConverter() {
		JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
		authorities.setAuthoritiesClaimName(JwtClaims.PERMISSIONS);
		authorities.setAuthorityPrefix("");
		JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
		converter.setJwtGrantedAuthoritiesConverter(authorities);
		return converter;
	}
}
