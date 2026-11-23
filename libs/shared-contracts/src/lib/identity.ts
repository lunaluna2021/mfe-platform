/**
 * 身分與權限的共用詞彙。
 *
 * Host 與每個 MFE 各自打包一份這個 lib；這裡只放型別與常數，
 * 不保存任何狀態，所以多份副本之間不會不一致。
 */

/** 平台所有的權限代碼，格式為「資源:動作」 */
export const PERMISSIONS = [
  'customer:read',
  'customer:write',
  'calendar:read',
  'report:read',
  'report:export',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** 平台角色；角色對應的權限由 shared-permission 決定 */
export const ROLES = ['admin', 'manager', 'sales', 'viewer'] as const;

export type Role = (typeof ROLES)[number];

export function isPermission(value: unknown): value is Permission {
  return (
    typeof value === 'string' &&
    (PERMISSIONS as readonly string[]).includes(value)
  );
}

export function isRole(value: unknown): value is Role {
  return (
    typeof value === 'string' && (ROLES as readonly string[]).includes(value)
  );
}

/** Host 交給 MFE 的使用者資訊（不含任何憑證） */
export interface MfeUser {
  readonly id: string;
  readonly displayName: string;
  readonly roles: readonly Role[];
}
