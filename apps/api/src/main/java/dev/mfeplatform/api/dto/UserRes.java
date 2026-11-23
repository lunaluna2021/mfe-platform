package dev.mfeplatform.api.dto;

import java.util.List;
import java.util.UUID;

import dev.mfeplatform.api.model.AppUser;

/**
 * 登入者資料（不含密碼雜湊）。
 *
 * @param id          帳號識別碼
 * @param email       email
 * @param displayName 顯示名稱
 * @param role        角色
 * @param permissions 權限代碼
 */
public record UserRes(UUID id, String email, String displayName, String role, List<String> permissions) {

	/**
	 * @param user        帳號
	 * @param permissions 角色的權限
	 * @return 回應資料
	 */
	public static UserRes from(AppUser user, List<String> permissions) {
		return new UserRes(user.id(), user.email(), user.displayName(), user.role(), permissions);
	}
}
