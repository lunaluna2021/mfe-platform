import {
  PERMISSIONS,
  type Permission,
  type Role,
} from '@mfe-platform/shared-contracts';

/**
 * 角色與權限的對照。
 *
 * 前端只用權限決定「顯示什麼」：選單、路由與按鈕。
 * JS 檔是公開的靜態檔，任何人都能下載與修改，真正的授權必須在後端 API 執行。
 */
export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  admin: PERMISSIONS,
  manager: ['customer:read', 'calendar:read', 'report:read', 'report:export'],
  sales: ['customer:read', 'customer:write', 'calendar:read'],
  viewer: ['customer:read', 'calendar:read'],
};

/** 合併多個角色的權限，去除重複並依 PERMISSIONS 的順序排列 */
export function resolvePermissions(roles: readonly Role[]): Permission[] {
  const granted = new Set<Permission>(
    roles.flatMap((role) => ROLE_PERMISSIONS[role] ?? []),
  );
  return PERMISSIONS.filter((permission) => granted.has(permission));
}

export function hasPermission(
  granted: readonly Permission[],
  required: Permission,
): boolean {
  return granted.includes(required);
}
