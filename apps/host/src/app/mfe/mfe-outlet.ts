import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  untracked,
  viewChild,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import type { MfeElement } from '@mfe-platform/shared-contracts';
import { APP_TITLE } from '../app.constants';
import type { LoadableMfeEntry } from './loadable-entry';
import { MfeHostContextService } from './mfe-host-context.service';
import { IDLE_LOAD_STATE, MfeLoaderService } from './mfe-loader.service';
import { MfeManifestService } from './mfe-manifest.service';

/**
 * 依路由參數載入並掛載 MFE。
 *
 * 從 /customers 切到 /calendar 時，Angular 會重用這個元件、只更新 mfeRoute，
 * 所以掛載邏輯寫在 effect 裡，每次模組改變都先卸載舊的元素再掛新的。
 */
@Component({
  selector: 'app-mfe-outlet',
  templateUrl: './mfe-outlet.html',
  styleUrl: './mfe-outlet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MfeOutlet {
  /** 路由參數 :mfeRoute，由 withComponentInputBinding 帶入 */
  readonly mfeRoute = input.required<string>();

  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly manifest = inject(MfeManifestService);
  private readonly loader = inject(MfeLoaderService);
  private readonly hostContext = inject(MfeHostContextService);
  private readonly mountPoint =
    viewChild.required<ElementRef<HTMLElement>>('mountPoint');

  protected readonly entry = computed(() =>
    this.manifest.findByRoute(this.mfeRoute()),
  );
  protected readonly loadState = computed(() => {
    const entry = this.entry();
    return entry ? this.loader.stateFor(entry.name) : IDLE_LOAD_STATE;
  });

  private mountedElement: MfeElement | null = null;
  /** 每次切換模組就遞增；非同步載入結束時用來判斷結果是否已經過期 */
  private mountGeneration = 0;

  constructor() {
    effect(() => {
      const entry = this.entry();
      untracked(() => void this.mount(entry));
    });

    // context 改變（例如選了別的客戶）時，換一個新物件設定給 MFE
    effect(() => {
      const context = this.hostContext.context();
      if (this.mountedElement) {
        this.mountedElement.context = context;
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.mountGeneration++;
      this.unmount();
    });
  }

  protected retry(): void {
    void this.mount(this.entry());
  }

  private async mount(entry: LoadableMfeEntry | undefined): Promise<void> {
    const generation = ++this.mountGeneration;
    this.unmount();
    if (!entry) {
      return;
    }
    this.title.setTitle(`${entry.title}｜${APP_TITLE}`);

    try {
      await this.loader.load(entry);
    } catch {
      // 失敗原因已記錄在 loader 的狀態，畫面依 loadState 顯示
      return;
    }

    if (generation !== this.mountGeneration) {
      // 載入期間使用者已切換到其他模組或離開頁面
      return;
    }

    const element = this.document.createElement(entry.tagName) as MfeElement;
    // 在加入 DOM 之前先設定 property，MFE 第一次渲染就拿得到 context
    element.context = this.hostContext.context();
    this.mountPoint().nativeElement.appendChild(element);
    this.mountedElement = element;
  }

  private unmount(): void {
    // 元素移出 DOM 後，Angular Elements 約 10 ms 後會銷毀 MFE 內的元件；
    // MFE 已註冊的元素定義與載入過的 JS 會保留，下次進入不必重新下載
    this.mountedElement?.remove();
    this.mountedElement = null;
  }
}
