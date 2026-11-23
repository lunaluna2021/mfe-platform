import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { parseMfeManifest } from '@mfe-platform/shared-contracts';
import { fetchJson } from '@mfe-platform/shared-data-api';
import { MANIFEST_TIMEOUT_MS } from '../const/mfe-loader.const';
import { ManifestStatus } from '../enums/manifest-status.enum';
import type { LoadableMfeEntry } from '../interfaces/loadable-mfe-entry.interface';
import { toLoadableEntries } from '../utils/loadable-entry.util';

/**
 * 讀取並保存 manifest.json。
 *
 * manifest 不打包進 Host，而是部署時放在網站上、執行時才讀取，
 * 所以調整 MFE 版本或下架某個模組時，不必重新建置 Host。
 */
@Injectable({ providedIn: 'root' })
export class MfeManifestService {
  private readonly _document = inject(DOCUMENT);
  private readonly _status = signal<ManifestStatus>(ManifestStatus.IDLE);
  private readonly _entries = signal<readonly LoadableMfeEntry[]>([]);
  private readonly _errorMessage = signal<string | null>(null);
  private _pending: Promise<readonly LoadableMfeEntry[]> | null = null;

  readonly status = this._status.asReadonly();
  readonly entries = this._entries.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();

  /** 以 <base href> 為基準，網站放在子路徑（例如 GitHub Pages）時也能找到 */
  readonly manifestUrl = new URL('manifest.json', this._document.baseURI).href;

  /**
   * 已讀取成功就直接回傳；讀取中則共用同一個 Promise；失敗後可再次呼叫重試。
   *
   * @returns 可以載入的 MFE
   */
  load(): Promise<readonly LoadableMfeEntry[]> {
    if (this._status() === ManifestStatus.READY) {
      return Promise.resolve(this._entries());
    }
    this._pending ??= this._fetchManifest().finally(() => {
      this._pending = null;
    });
    return this._pending;
  }

  /**
   * @param route 路由參數
   * @returns 對應的 MFE
   */
  findByRoute(route: string): LoadableMfeEntry | undefined {
    return this._entries().find((entry) => entry.route === route);
  }

  /**
   * @param name manifest 的 name
   * @returns 對應的 MFE
   */
  findByName(name: string): LoadableMfeEntry | undefined {
    return this._entries().find((entry) => entry.name === name);
  }

  private async _fetchManifest(): Promise<readonly LoadableMfeEntry[]> {
    this._status.set(ManifestStatus.LOADING);
    this._errorMessage.set(null);
    try {
      const json = await fetchJson(this.manifestUrl, MANIFEST_TIMEOUT_MS);
      const parsed = parseMfeManifest(json);
      const origin = new URL(this.manifestUrl).origin;
      const loadable = toLoadableEntries(
        parsed.entries,
        this.manifestUrl,
        origin,
      );
      for (const issue of [...parsed.issues, ...loadable.issues]) {
        console.warn(`[manifest] ${issue}`);
      }
      this._entries.set(loadable.entries);
      this._status.set(ManifestStatus.READY);
      return loadable.entries;
    } catch (error) {
      this._status.set(ManifestStatus.ERROR);
      this._errorMessage.set(
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }
}
