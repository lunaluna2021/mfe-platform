import {
  type HttpInterceptorFn,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  type EnvironmentProviders,
  type Provider,
  inject,
} from '@angular/core';
import { API_ACCESS, apiInterceptor } from '@mfe-platform/shared-data-api';
import { MfeContextStore } from './mfe-context.store';

/** provideMfeApi 的選項 */
export interface MfeApiOptions {
  /**
   * 放在共用 apiInterceptor 之前的 interceptor，例如顯示讀取中的 loading interceptor。
   * 模擬 API 不在這裡處理，而是由 MSW 在瀏覽器網路層攔截（見各 MFE 的 bootstrap.ts）。
   */
  readonly interceptors?: readonly HttpInterceptorFn[];
}

/**
 * MFE 呼叫後端 API 需要的 providers：HttpClient、共用 interceptor，
 * 以及從 MfeContextStore 取得網址與 token 的 API_ACCESS。
 *
 * @param options 額外的 interceptor
 * @returns providers，交給 bootstrapMfeElement
 */
export function provideMfeApi(
  options: MfeApiOptions = {},
): Array<Provider | EnvironmentProviders> {
  return [
    provideHttpClient(
      withInterceptors([...(options.interceptors ?? []), apiInterceptor]),
    ),
    {
      provide: API_ACCESS,
      useFactory: () => {
        const store = inject(MfeContextStore);
        return () => store.apiAccess();
      },
    },
  ];
}
