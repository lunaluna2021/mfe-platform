import { HttpResponse } from 'msw';

/** 後端錯誤回應的格式 */
export interface MockErrorBody {
  readonly CODE: string;
  readonly MESSAGE: string;
}

/**
 * 產生與後端相同格式的錯誤回應，前端的錯誤處理（describeApiError）因此不必區分是否為模擬。
 *
 * @param status HTTP 狀態碼
 * @param code 錯誤代碼，與後端相同，例如 DUPLICATE_CUSTOMER_NAME
 * @param message 錯誤訊息
 * @returns MSW 回應
 */
export function mockErrorRes(
  status: number,
  code: string,
  message: string,
): HttpResponse<MockErrorBody> {
  return HttpResponse.json({ CODE: code, MESSAGE: message }, { status });
}
