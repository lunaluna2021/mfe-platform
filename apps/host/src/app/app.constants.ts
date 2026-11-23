import type { Role } from '@mfe-platform/shared-contracts';

export const APP_TITLE = '小型企業管理平台';

/** Host 自己使用的路由；manifest 的 route 不可與這些名稱相同 */
export const HOST_ROUTES = {
  login: 'login',
  forbidden: 'forbidden',
  notFound: 'not-found',
} as const;

export const RESERVED_ROUTES: readonly string[] = Object.values(HOST_ROUTES);

export const ROLE_LABELS: Readonly<Record<Role, string>> = {
  admin: '系統管理員',
  manager: '業務主管',
  sales: '業務人員',
  viewer: '唯讀人員',
};
