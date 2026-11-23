import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import type { MfeHostContext } from '@mfe-platform/shared-contracts';
import { MfeContextStore } from '@mfe-platform/shared-mfe-element';
import { MfeStandaloneSession } from '@mfe-platform/shared-mfe-element/standalone';
import { environment } from '../environments/environment';
import { CalendarPage } from './features/calendar-page/calendar-page';

/**
 * 行事曆 MFE 的根元件，註冊為 <mfe-calendar>。
 *
 * - 被 Host 載入：Host 以 property 設定 context（使用者、權限、選取的客戶、API 網址與 token）。
 * - 獨立執行（元素加上 is-standalone 屬性）：用 @defer 載入共用的登入外框，自己取得 context。
 *
 * 目前的 context 寫入 MfeContextStore，頁面與 API interceptor 都從那裡讀取。
 */
@Component({
  selector: 'calendar-root',
  imports: [MfeStandaloneSession, CalendarPage],
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isStandalone() && !context()) {
      <!-- 只有獨立執行時才下載登入外框 -->
      @defer (on immediate) {
        <lib-mfe-standalone-session
          appTitle="行事曆"
          [configUrl]="runtimeConfigFile"
          (contextChange)="standaloneContext.set($event)"
        />
      } @loading {
        <p class="hint">載入登入元件…</p>
      }
    }
    @if (activeContext()) {
      <calendar-page />
    }
  `,
  styles: `
    :host {
      display: block;
      color: var(--color-text, #1f2937);
      font-family: var(--font-sans, system-ui, sans-serif);
      font-size: 14px;
    }
    .hint {
      margin: 0;
      color: var(--color-muted, #6b7280);
    }
  `,
})
export class CalendarApp {
  /** Host 以 element property 設定 */
  readonly context = input<MfeHostContext | null>(null);
  /** 獨立執行頁在元素上加 is-standalone 屬性（Angular Elements 把 isStandalone 對應成 is-standalone） */
  readonly isStandalone = input(false, { transform: booleanAttribute });

  protected readonly runtimeConfigFile = environment.runtimeConfigFile;
  protected readonly standaloneContext = signal<MfeHostContext | null>(null);
  protected readonly activeContext = computed(
    () => this.context() ?? this.standaloneContext(),
  );

  constructor() {
    const contextStore = inject(MfeContextStore);
    effect(() => contextStore.setContext(this.activeContext()));
  }
}
