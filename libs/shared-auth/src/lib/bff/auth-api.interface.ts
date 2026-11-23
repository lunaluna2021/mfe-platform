import { isRole, type Role } from '@mfe-platform/shared-contracts';

/** POST api/auth/login 的 request */
export interface LoginReq {
  readonly EMAIL: string;
  readonly PASSWORD: string;
}

/** POST api/auth/refresh、api/auth/logout 的 request */
export interface RefreshTokenReq {
  readonly REFRESH_TOKEN: string;
}

/** 登入者資料 */
export interface UserRes {
  readonly ID: string;
  readonly EMAIL: string;
  readonly DISPLAY_NAME: string;
  readonly ROLE: Role;
  readonly PERMISSIONS: readonly string[];
}

/** 登入、更新 token 的 response */
export interface TokenRes {
  readonly ACCESS_TOKEN: string;
  readonly REFRESH_TOKEN: string;
  /** access token 的有效秒數 */
  readonly EXPIRES_IN: number;
  readonly USER: UserRes;
}

/**
 * 檢查後端回應的格式；不符時回傳 null，視為登入失敗，不把格式錯誤的資料當成已登入。
 *
 * @param value 後端回應的 JSON
 * @returns 檢查過的資料，或 null
 */
export function parseTokenRes(value: unknown): TokenRes | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const user = record['USER'];
  if (
    typeof record['ACCESS_TOKEN'] !== 'string' ||
    typeof record['REFRESH_TOKEN'] !== 'string' ||
    typeof record['EXPIRES_IN'] !== 'number' ||
    typeof user !== 'object' ||
    user === null
  ) {
    return null;
  }
  const userRecord = user as Record<string, unknown>;
  const permissions = userRecord['PERMISSIONS'];
  if (
    typeof userRecord['ID'] !== 'string' ||
    typeof userRecord['EMAIL'] !== 'string' ||
    typeof userRecord['DISPLAY_NAME'] !== 'string' ||
    !isRole(userRecord['ROLE']) ||
    !Array.isArray(permissions) ||
    !permissions.every((item) => typeof item === 'string')
  ) {
    return null;
  }
  return value as TokenRes;
}
