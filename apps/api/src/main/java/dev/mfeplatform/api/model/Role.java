package dev.mfeplatform.api.model;

import java.util.Set;

/**
 * 平台角色。每個角色擁有哪些權限記錄在資料表 {@code mfe.role_permissions}。
 */
public final class Role {

	/** 所有合法角色，與資料表 app_users.role 的 check 條件一致 */
	public static final Set<String> ALL = Set.of("admin", "manager", "sales", "viewer");

	private Role() {
	}

	/**
	 * @param role 要檢查的值
	 * @return 是否為合法角色
	 */
	public static boolean isValid(String role) {
		return role != null && ALL.contains(role);
	}
}
