import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { parseMfeManifest } from '@mfe-platform/shared-contracts';
import { toLoadableEntries, type LoadableMfeEntry } from './loadable-entry';

export type ManifestStatus = 'idle' | 'loading' | 'ready' | 'error';

const MANIFEST_TIMEOUT_MS = 8_000;

/**
 * 讀取並保存 manifest.json。
 *
 * manifest 不打包進 Host，而是部署時放在網站上、執行時才讀取，
 * 所以調整 MFE 版本或關閉某個模組時，不必重新建置 Host。
 */
@Injectable({ providedIn: 'root' })
export class MfeManifestService {
  private readonly document = inject(DOCUMENT);

  private readonly statusState = signal<ManifestStatus>('idle');
  private readonly entriesState = signal<readonly LoadableMfeEntry[]>([]);
  private readonly errorState = signal<string | null>(null);
  private pending: Promise<readonly LoadableMfeEntry[]> | null = null;

  readonly status = this.statusState.asReadonly();
  readonly entries = this.entriesState.asReadonly();
  readonly error = this.errorState.asReadonly();

  /** 以 <base href> 為基準，網站放在子路徑（例如 GitHub Pages）時也能找到 */
  readonly manifestUrl = new URL('manifest.json', this.document.baseURI).href;

  /** 已讀取成功就直接回傳；讀取中則共用同一個 Promise；失敗後可再次呼叫重試 */
  load(): Promise<readonly LoadableMfeEntry[]> {
    if (this.statusState() === 'ready') {
      return Promise.resolve(this.entriesState());
    }
    this.pending ??= this.fetchManifest().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  findByRoute(route: string): LoadableMfeEntry | undefined {
    return this.entriesState().find((entry) => entry.route === route);
  }

  findByName(name: string): LoadableMfeEntry | undefined {
    return this.entriesState().find((entry) => entry.name === name);
  }

  private async fetchManifest(): Promise<readonly LoadableMfeEntry[]> {
    this.statusState.set('loading');
    this.errorState.set(null);

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

      this.entriesState.set(loadable.entries);
      this.statusState.set('ready');
      return loadable.entries;
    } catch (error) {
      this.statusState.set('error');
      this.errorState.set(
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }
}

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // no-cache：每次都向伺服器確認，manifest 一更新就生效
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
