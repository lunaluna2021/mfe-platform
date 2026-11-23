import type { MfeManifestEntry } from '@mfe-platform/shared-contracts';
import { RESERVED_ROUTES } from '../app.constants';

/** 已通過 Host 檢查、可以載入的 manifest 項目 */
export interface LoadableMfeEntry extends MfeManifestEntry {
  /** 依 manifest.json 位置解析後的入口 JS 絕對網址 */
  readonly entryUrl: string;
}

export interface LoadableEntriesResult {
  readonly entries: readonly LoadableMfeEntry[];
  readonly issues: readonly string[];
}

/**
 * 套用 Host 自己的規則：
 * - 入口路徑以 manifest.json 為基準解析，所以網站放在 `/` 或 `/mfe-platform/` 都能使用。
 * - 只允許與 Host 同源的 JS。manifest 等於「要執行哪些程式」的清單，
 *   若被竄改成外部網址，就會執行任意程式碼。
 * - route 不可佔用 Host 自己的路由。
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
