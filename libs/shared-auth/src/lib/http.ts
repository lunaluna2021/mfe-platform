/** 請求結果；網路錯誤或逾時時 status 為 0 */
export interface JsonResponse {
  readonly status: number;
  readonly body: unknown;
}

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * 不依賴 Angular 的 JSON 請求，給登入流程與設定讀取使用。
 * 不會拋出例外：網路錯誤、逾時與非 JSON 回應都以 status／body 表示，由呼叫端判斷。
 *
 * @param url 完整網址
 * @param init fetch 的設定
 * @returns 狀態碼與解析後的 JSON（無法解析時為 null）
 */
export async function requestJson(
  url: string,
  init: RequestInit = {},
): Promise<JsonResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    let body: unknown = null;
    try {
      body =
        response.status === 204 ? null : ((await response.json()) as unknown);
    } catch {
      body = null;
    }
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param url 完整網址
 * @param payload 會轉成 JSON 的 request body
 * @returns 請求結果
 */
export function postJson(url: string, payload: unknown): Promise<JsonResponse> {
  return requestJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * @param body 後端回應
 * @returns 後端錯誤格式中的 MESSAGE；沒有時為 null
 */
export function readErrorMessage(body: unknown): string | null {
  if (typeof body === 'object' && body !== null) {
    const message = (body as Record<string, unknown>)['MESSAGE'];
    if (typeof message === 'string') {
      return message;
    }
  }
  return null;
}

/**
 * @param body 後端回應
 * @returns 後端錯誤格式中的 CODE；沒有時為 null
 */
export function readErrorCode(body: unknown): string | null {
  if (typeof body === 'object' && body !== null) {
    const code = (body as Record<string, unknown>)['CODE'];
    if (typeof code === 'string') {
      return code;
    }
  }
  return null;
}
