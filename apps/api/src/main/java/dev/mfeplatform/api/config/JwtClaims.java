package dev.mfeplatform.api.config;

/**
 * access token 的自訂 claim 名稱。簽發（service）與驗證（security 設定）共用。
 */
public final class JwtClaims {

	/** 權限代碼清單，Spring Security 直接轉成 authority */
	public static final String PERMISSIONS = "permissions";
	/** 顯示名稱 */
	public static final String NAME = "name";
	/** 角色 */
	public static final String ROLE = "role";

	private JwtClaims() {
	}
}
