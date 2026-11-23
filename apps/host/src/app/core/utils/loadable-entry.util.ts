import type { MfeManifestEntry } from '@mfe-platform/shared-contracts';
import { RESERVED_ROUTES } from '../const/app.const';
import type {
  LoadableEntriesResult,
  LoadableMfeEntry,
} from '../interfaces/loadable-mfe-entry.interface';

/**
 * 套用 Host 自己的規則：
 * - 入口路徑以 manifest.json 為基準解析，網站放在 `/` 或 `/mfe-platform/` 都能使用。
 * - 只允許與 Host 同源的 JS。manifest 等於「要執行哪些程式」的清單，
 *   若被竄改成外部網址，就會執行任意程式碼。
 * - route 不可佔用 Host 自己的路由。
 *
 * @param entries 通過格式檢查的 manifest 項目
 * @param manifestUrl manifest.json 的絕對網址
 * @param allowedOrigin 允許載入 JS 的來源（Host 的 origin）
 * @returns 可以載入的項目與被略過的原因
 */
export function toLoadableEntries(
  entries: readonly MfeManifestEntry[],
  manifestUrl: string,
  allowedOrigin: string,
): LoadableEntriesResult {
  const loadable: LoadableMfeEntry[] = [];
  const issues: string[] = [];

  for (const entry of entries) {
    if (RESERVED_ROUTES.includes(entry.route)) {
      issues.push(
        `${entry.name} 已略過：route「${entry.route}」是 Host 保留的路由`,
      );
      continue;
    }

    let url: URL;
    try {
      url = new URL(entry.entry, manifestUrl);
    } catch {
      issues.push(
        `${entry.name} 已略過：entry 不是有效的網址「${entry.entry}」`,
      );
      continue;
    }
    if (url.origin !== allowedOrigin) {
      issues.push(
        `${entry.name} 已略過：只允許載入與 Host 同源的 JS（${url.origin}）`,
      );
      continue;
    }

    loadable.push({ ...entry, entryUrl: url.href });
  }

  return { entries: loadable, issues };
}
