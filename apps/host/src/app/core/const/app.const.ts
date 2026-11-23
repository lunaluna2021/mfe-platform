import type { Role } from '@mfe-platform/shared-contracts';

/** 平台名稱，顯示在頂列與頁籤標題 */
export const APP_TITLE = '小型企業管理平台';

/** Host 自己使用的路由；manifest 的 route 不可與這些名稱相同 */
export const HOST_ROUTES = {
  LOGIN: 'login',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not-found',
} as const;

/** manifest 不能使用的 route */
export const RESERVED_ROUTES: readonly string[] = Object.values(HOST_ROUTES);

/** 角色的中文名稱 */
export const ROLE_LABELS: Readonly<Record<Role, string>> = {
  admin: '系統管理員',
  manager: '業務主管',
  sales: '業務人員',
  viewer: '唯讀人員',
};

/** 提示訊息同時最多顯示幾則 */
export const TOAST_MAX_VISIBLE = 4;

/** 提示訊息顯示多久（毫秒） */
export const TOAST_DISPLAY_MS = 4_000;

/** MFE 送來的提示訊息最多保留幾個字 */
export const NOTIFY_MAX_LENGTH = 200;
