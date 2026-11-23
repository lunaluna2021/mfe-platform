import type { MfeManifestEntry } from '@mfe-platform/shared-contracts';

/** 已通過 Host 檢查、可以載入的 manifest 項目 */
export interface LoadableMfeEntry extends MfeManifestEntry {
  /** 依 manifest.json 位置解析後的入口 JS 絕對網址 */
  readonly entryUrl: string;
}

/** toLoadableEntries 的結果 */
export interface LoadableEntriesResult {
  readonly entries: readonly LoadableMfeEntry[];
  /** 被略過的項目與原因 */
  readonly issues: readonly string[];
}
