import {
  isPermission,
  isRole,
  type MfeUser,
  type Permission,
  type Role,
} from '@mfe-platform/shared-contracts';

/**
 * 登入狀態存在瀏覽器的 key。Host 與每個獨立執行的模組都用同一個 key：
 * 同一個網域下共用同一份登入狀態，任何一處登入、更新 token 或登出，其他地方都會同步（SSO）。
 */
export const SESSION_STORAGE_KEY = 'mfe-platform.session';

/** 存在瀏覽器中的登入狀態 */
export interface StoredSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  /** access token 到期的時間（epoch 毫秒） */
  readonly expiresAt: number;
  readonly user: MfeUser;
  readonly email: string;
  readonly role: Role;
  readonly permissions: readonly Permission[];
}

/**
 * 讀取登入狀態。儲存區可能被手動修改、來自舊版程式或無法使用，格式不符時視為未登入。
 *
 * @returns 登入狀態；沒有時為 null
 */
export function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? parseStoredSession(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/**
 * @param session 要保存的登入狀態；null 表示清除
 */
export function writeStoredSession(session: StoredSession | null): void {
  try {
    if (session) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // 無痕模式或儲存區被停用時，只保留在記憶體中，其他分頁無法共用
  }
}

/**
 * @param value 從儲存區讀出的資料
 * @returns 檢查過的登入狀態，或 null
 */
export function parseStoredSession(value: unknown): StoredSession | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const user = record['user'] as Record<string, unknown> | null | undefined;
  const permissions = record['permissions'];
  if (
    typeof record['accessToken'] !== 'string' ||
    typeof record['refreshToken'] !== 'string' ||
    typeof record['expiresAt'] !== 'number' ||
    typeof record['email'] !== 'string' ||
    !isRole(record['role']) ||
    !Array.isArray(permissions) ||
    !permissions.every(isPermission) ||
    typeof user !== 'object' ||
    user === null ||
    typeof user['id'] !== 'string' ||
    typeof user['displayName'] !== 'string'
  ) {
    return null;
  }
  return value as StoredSession;
}
