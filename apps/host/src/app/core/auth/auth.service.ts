import { Injectable, computed, signal } from '@angular/core';
import {
  createDemoSession,
  isSessionActive,
  parseStoredSession,
  type AuthSession,
} from '@mfe-platform/shared-auth';
import type { MfeUser, Permission } from '@mfe-platform/shared-contracts';
import {
  hasPermission,
  resolvePermissions,
} from '@mfe-platform/shared-permission';

const STORAGE_KEY = 'mfe-platform.session';

/**
 * Host 擁有登入狀態，MFE 只透過 context 取得使用者與權限。
 * 這裡是模擬登入，詳見 shared-auth 的說明。
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sessionState = signal<AuthSession | null>(
    readStoredSession(),
  );

  readonly session = this.sessionState.asReadonly();
  readonly permissions = computed<readonly Permission[]>(() =>
    resolvePermissions(this.sessionState()?.user.roles ?? []),
  );

  isAuthenticated(now: number): boolean {
    const session = this.sessionState();
    return session !== null && isSessionActive(session, now);
  }

  can(permission: Permission): boolean {
    return hasPermission(this.permissions(), permission);
  }

  login(user: MfeUser): void {
    const session = createDemoSession(user, Date.now());
    this.sessionState.set(session);
    writeStoredSession(session);
  }

  logout(): void {
    this.sessionState.set(null);
    writeStoredSession(null);
  }
}

function readStoredSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? parseStoredSession(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session: AuthSession | null): void {
  try {
    if (session) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // 無痕模式或儲存區被停用時，只保留在記憶體中，重新整理後需要再登入
  }
}
