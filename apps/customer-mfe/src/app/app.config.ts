import type { EnvironmentProviders, Provider } from '@angular/core';
import { provideMfeApi } from '@mfe-platform/shared-mfe-element';

/**
 * 這個 MFE 的應用程式 providers：HttpClient＋共用 API interceptor。
 * 模擬模式由 MSW 在瀏覽器網路層攔截（見 bootstrap.ts），這裡不需要另外設定。
 */
export const appProviders: Array<Provider | EnvironmentProviders> =
  provideMfeApi();
