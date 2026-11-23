import {
  PERMISSIONS,
  isPermission,
  type Permission,
} from '@mfe-platform/shared-contracts';

/**
 * 權限判斷。
 *
 * 每個角色擁有哪些權限只記錄在資料庫的 role_permissions 表，前端不再保存一份對照，
 * 避免兩邊不一致。前端只用權限決定「顯示什麼」：選單、路由與按鈕；
 * 真正的授權由資料庫的 RLS 規則執行，因為 JS 是公開的靜態檔，任何人都能修改。
 */
export function hasPermission(
  granted: readonly Permission[],
  required: Permission,
): boolean {
  return granted.includes(required);
}

/** 過濾掉不認得的值，去除重複並依 PERMISSIONS 的順序排列 */
export function normalizePermissions(values: readonly unknown[]): Permission[] {
  const granted = new Set(values.filter(isPermission));
  return PERMISSIONS.filter((permission) => granted.has(permission));
}
