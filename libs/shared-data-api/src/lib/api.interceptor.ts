import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, timeout } from 'rxjs';
import { API_ACCESS } from './api-access';
import { ApiError, toApiError } from './api-error';

/** 以 api/ 開頭的相對路徑才會被這個 interceptor 處理，例如 api/customers */
export const API_PATH_PREFIX = 'api/';

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * 呼叫後端 API 的共用處理：
 * 1. 把 api/... 相對路徑接上後端網址；
 * 2. 加上 Authorization: Bearer <access token>；
 * 3. 逾時中止；
 * 4. 錯誤統一轉成 ApiError，service 不必各自解析錯誤格式。
 */
export const apiInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(API_PATH_PREFIX)) {
    return next(request);
  }

  const access = inject(API_ACCESS)();
  if (!access) {
    return throwError(
      () => new ApiError(401, 'UNAUTHORIZED', '尚未登入，請先登入'),
    );
  }

  const authorized = request.clone({
    url: `${access.baseUrl.replace(/\/+$/, '')}/${request.url}`,
    setHeaders: { Authorization: `Bearer ${access.accessToken}` },
  });
  return next(authorized).pipe(
    timeout(REQUEST_TIMEOUT_MS),
    catchError((error: unknown) => throwError(() => toApiError(error))),
  );
};
