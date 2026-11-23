import { isRole, type MfeUser } from '@mfe-platform/shared-contracts';

/**
 * 登入狀態。
 *
 * 這是練習用的模擬登入：沒有密碼、沒有 token，也沒有後端驗證。
 * 正式系統應由身分提供者（例如 OIDC）簽發 token，並由後端驗證每一個請求。
 */
export interface AuthSession {
  readonly user: MfeUser;
  readonly issuedAt: number;
  readonly expiresAt: number;
}

export interface DemoAccount extends MfeUser {
  readonly description: string;
}

/** 示範帳號，用來觀察不同權限看到的選單與按鈕 */
export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    id: 'u-admin',
    displayName: '林雅婷',
    roles: ['admin'],
    description: '系統管理員：所有模組與功能',
  },
  {
    id: 'u-manager',
    displayName: '陳志明',
    roles: ['manager'],
    description: '業務主管：客戶唯讀、行事曆、報表與匯出',
  },
  {
    id: 'u-sales',
    displayName: '王小華',
    roles: ['sales'],
    description: '業務人員：維護客戶、行事曆，看不到報表',
  },
  {
    id: 'u-viewer',
    displayName: '張美玲',
    roles: ['viewer'],
    description: '唯讀人員：只能查看客戶與行事曆',
  },
];

export const DEFAULT_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export function createDemoSession(
  user: MfeUser,
  now: number,
  ttlMs: number = DEFAULT_SESSION_TTL_MS,
): AuthSession {
  return {
    user: {
      id: user.id,
      displayName: user.displayName,
      roles: [...user.roles],
    },
    issuedAt: now,
    expiresAt: now + ttlMs,
  };
}

export function isSessionActive(session: AuthSession, now: number): boolean {
  return now >= session.issuedAt && now < session.expiresAt;
}

/**
 * 檢查從 sessionStorage 讀回的資料。儲存區可能被手動修改或來自舊版程式，
 * 格式不符時回傳 null，視為未登入。
 */
export function parseStoredSession(value: unknown): AuthSession | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const user = record['user'];
  const issuedAt = record['issuedAt'];
  const expiresAt = record['expiresAt'];
  if (
    typeof user !== 'object' ||
    user === null ||
    typeof issuedAt !== 'number' ||
    typeof expiresAt !== 'number'
  ) {
    return null;
  }
  const userRecord = user as Record<string, unknown>;
  const id = userRecord['id'];
  const displayName = userRecord['displayName'];
  const roles = userRecord['roles'];
  if (
    typeof id !== 'string' ||
    typeof displayName !== 'string' ||
    !Array.isArray(roles) ||
    !roles.every(isRole)
  ) {
    return null;
  }
  return { user: { id, displayName, roles }, issuedAt, expiresAt };
}
