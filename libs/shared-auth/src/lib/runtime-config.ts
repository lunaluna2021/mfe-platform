import { requestJson } from './http';

/**
 * 執行時設定（config/runtime-config*.json）。部署時放在網站上、執行時才讀取，
 * 換後端網址不必重新建置程式。要讀哪一個檔案由各應用程式的 environment 決定。
 */
export interface PlatformRuntimeConfig {
  readonly api: {
    /** Java 後端的網址 */
    readonly baseUrl: string;
  };
}

/**
 * @param url 設定檔的完整網址
 * @returns 檢查過的設定
 * @throws Error 讀取失敗或格式不符
 */
export async function loadRuntimeConfig(
  url: string,
): Promise<PlatformRuntimeConfig> {
  // no-cache：每次都向伺服器確認，設定一更新就生效
  const response = await requestJson(url, { cache: 'no-cache' });
  if (response.status !== 200) {
    throw new Error(
      response.status === 0 ? '無法連線' : `HTTP ${response.status}`,
    );
  }
  return parseRuntimeConfig(response.body);
}

/**
 * 後端網址只接受 https；本機開發可用 http://localhost。
 *
 * @param value 設定檔內容
 * @returns 檢查過的設定
 * @throws Error 格式不符
 */
export function parseRuntimeConfig(value: unknown): PlatformRuntimeConfig {
  const api =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)['api']
      : undefined;
  const baseUrl =
    typeof api === 'object' && api !== null
      ? (api as Record<string, unknown>)['baseUrl']
      : undefined;
  if (typeof baseUrl !== 'string' || !isAllowedApiUrl(baseUrl)) {
    throw new Error(
      'runtime-config 的 api.baseUrl 必須是 https 網址（本機可用 http://localhost）',
    );
  }
  return { api: { baseUrl: baseUrl.replace(/\/+$/, '') } };
}

function isAllowedApiUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' ||
      (url.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(url.hostname))
    );
  } catch {
    return false;
  }
}
