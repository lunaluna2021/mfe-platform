/**
 * 讀取執行時設定檔（manifest.json、runtime-config.json）。
 *
 * - no-cache：每次都向伺服器確認，設定一更新就生效。
 * - 逾時會中止請求，避免設定檔讀不到時畫面一直停在讀取中。
 */
export async function fetchJson(
  url: string,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      cache: 'no-cache',
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as unknown;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`讀取逾時（${timeoutMs} ms）`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
