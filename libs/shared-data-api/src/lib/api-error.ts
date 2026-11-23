import { HttpErrorResponse } from '@angular/common/http';

/** 後端的錯誤回應格式（欄位全大寫，與 Java 的 ErrorRes 相同） */
export interface ErrorRes {
  readonly CODE: string;
  readonly MESSAGE: string;
}

/** 呼叫後端 API 失敗；code 為後端的錯誤代碼，或前端判斷的網路錯誤代碼 */
export class ApiError extends Error {
  override readonly name = 'ApiError';

  /**
   * @param status HTTP 狀態碼；網路錯誤或逾時為 0
   * @param code 錯誤代碼，例如 DUPLICATE_CUSTOMER_NAME、NETWORK_ERROR
   * @param message 給使用者看的訊息
   */
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * @param value 任意值
 * @returns 是否符合後端的錯誤回應格式
 */
export function isErrorRes(value: unknown): value is ErrorRes {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record['CODE'] === 'string' && typeof record['MESSAGE'] === 'string'
  );
}

/**
 * 把 HttpClient 的錯誤轉成 ApiError。後端有回錯誤格式時直接使用它的訊息，
 * 其他情況（網路中斷、伺服器沒有回應 JSON）給出通用的說明。
 *
 * @param error HttpClient 拋出的錯誤
 * @returns 統一的錯誤物件
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return new ApiError(
        0,
        'NETWORK_ERROR',
        '無法連線到伺服器，請檢查網路後再試',
      );
    }
    if (isErrorRes(error.error)) {
      return new ApiError(error.status, error.error.CODE, error.error.MESSAGE);
    }
    return new ApiError(
      error.status,
      'HTTP_ERROR',
      `伺服器回應錯誤（HTTP ${error.status}）`,
    );
  }
  if (error instanceof Error && error.name === 'TimeoutError') {
    return new ApiError(0, 'TIMEOUT', '伺服器回應逾時，請稍後再試');
  }
  return new ApiError(
    0,
    'UNKNOWN_ERROR',
    error instanceof Error ? error.message : String(error),
  );
}

/**
 * 轉成給使用者看的訊息。
 *
 * @param error 任意錯誤
 * @param overrides 依錯誤代碼覆寫訊息
 * @returns 訊息
 */
export function describeApiError(
  error: unknown,
  overrides: Readonly<Record<string, string>> = {},
): string {
  const apiError = toApiError(error);
  return overrides[apiError.code] ?? apiError.message;
}
