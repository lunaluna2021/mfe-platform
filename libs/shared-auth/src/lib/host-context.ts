import {
  MFE_CONTRACT_VERSION,
  type MfeHostContext,
  type MfeSelectedCustomer,
} from '@mfe-platform/shared-contracts';
import { AuthStatus, type AuthSnapshot } from './platform-auth';
import type { PlatformRuntimeConfig } from './runtime-config';

/**
 * 依登入狀態組出傳給 MFE 的 context；尚未登入完成時回傳 null。
 * Host 與獨立執行的模組都用這個函式，確保兩種情況下 MFE 拿到相同結構的資料。
 *
 * @param snapshot 登入狀態
 * @param config 執行時設定
 * @param selectedCustomer 目前選取的客戶
 * @param locale 語系
 * @returns context，或 null
 */
export function buildHostContext(
  snapshot: AuthSnapshot,
  config: PlatformRuntimeConfig | null,
  selectedCustomer: MfeSelectedCustomer | null,
  locale = 'zh-TW',
): MfeHostContext | null {
  if (
    snapshot.status !== AuthStatus.SIGNED_IN ||
    !snapshot.user ||
    !snapshot.accessToken ||
    !config
  ) {
    return null;
  }
  return {
    contractVersion: MFE_CONTRACT_VERSION,
    user: snapshot.user,
    permissions: snapshot.permissions,
    selectedCustomer,
    locale,
    api: { baseUrl: config.api.baseUrl, accessToken: snapshot.accessToken },
  };
}
