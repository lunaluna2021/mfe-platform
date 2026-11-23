import { InjectionToken } from '@angular/core';
import type { MfeApiAccess } from '@mfe-platform/shared-contracts';

/**
 * 提供「目前的 API 網址與 access token」的函式。
 *
 * 由使用的應用程式提供（MFE 從 context 取得）；interceptor 每次送出請求時呼叫，
 * 所以 token 更新後下一個請求就會使用新的 token。沒有登入時回傳 null。
 */
export const API_ACCESS = new InjectionToken<() => MfeApiAccess | null>(
  'API_ACCESS',
);
