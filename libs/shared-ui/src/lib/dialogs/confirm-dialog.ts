import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';

let nextDialogId = 0;

/**
 * 共用的確認對話框（例如刪除前確認）。畫面由呼叫端控制開關：
 * isOpen 為 true 時顯示，按確定送出 confirmed、按取消或 Esc 送出 cancelled。
 * 放在 Shadow DOM 內也能正常顯示，不依賴瀏覽器原生的 confirm()。
 */
@Component({
  selector: 'lib-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'handleEscape()' },
  template: `
    @if (isOpen()) {
      <!-- alertdialog 需要使用者明確回應，點背景不關閉 -->
      <div class="backdrop"></div>
      <div
        class="dialog"
        role="alertdialog"
        aria-modal="true"
        [attr.aria-labelledby]="titleId"
        [attr.aria-describedby]="messageId"
      >
        <h2 [id]="titleId">{{ title() }}</h2>
        <p [id]="messageId">{{ message() }}</p>
        <div class="actions">
          <button
            #cancelButton
            type="button"
            [disabled]="isBusy()"
            (click)="onCancel()"
          >
            {{ cancelText() }}
          </button>
          <button
            type="button"
            class="confirm"
            [class.danger]="isDanger()"
            [disabled]="isBusy()"
            (click)="onConfirm()"
          >
            {{ isBusy() ? '處理中…' : confirmText() }}
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgb(15 23 42 / 40%);
      z-index: 50;
    }
    .dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: min(420px, calc(100vw - 32px));
      padding: 20px;
      border-radius: 12px;
      background: var(--color-surface, #fff);
      color: var(--color-text, #1f2937);
      box-shadow: 0 12px 32px rgb(0 0 0 / 20%);
      font-family: var(--font-sans, system-ui, sans-serif);
      z-index: 51;
    }
    h2 {
      margin: 0 0 8px;
      font-size: 17px;
    }
    p {
      margin: 0 0 20px;
      line-height: 1.6;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    button {
      padding: 6px 14px;
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 6px;
      background: var(--color-surface, #fff);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    button.confirm {
      border-color: var(--color-primary, #2563eb);
      background: var(--color-primary, #2563eb);
      color: #fff;
    }
    button.confirm.danger {
      border-color: var(--color-danger, #dc2626);
      background: var(--color-danger, #dc2626);
    }
    button:disabled {
      opacity: 0.6;
      cursor: progress;
    }
  `,
})
export class ConfirmDialog {
  /** 是否顯示 */
  readonly isOpen = input(false);
  readonly title = input('請確認');
  readonly message = input('');
  readonly confirmText = input('確定');
  readonly cancelText = input('取消');
  /** 刪除等無法復原的操作，確定按鈕改用警示色 */
  readonly isDanger = input(false);
  /** 呼叫端處理中時停用按鈕 */
  readonly isBusy = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected readonly titleId = `confirm-dialog-title-${nextDialogId}`;
  protected readonly messageId = `confirm-dialog-message-${nextDialogId++}`;

  private readonly _cancelButtonRef =
    viewChild<ElementRef<HTMLButtonElement>>('cancelButton');

  constructor() {
    // 開啟時把焦點放在「取消」，避免誤按 Enter 直接執行
    effect(() => {
      this._cancelButtonRef()?.nativeElement.focus();
    });
  }

  /** 按下確定 */
  protected onConfirm(): void {
    if (!this.isBusy()) {
      this.confirmed.emit();
    }
  }

  /** 按下取消 */
  protected onCancel(): void {
    if (!this.isBusy()) {
      this.cancelled.emit();
    }
  }

  /** 開啟時按 Esc 等同取消 */
  protected handleEscape(): void {
    if (this.isOpen()) {
      this.onCancel();
    }
  }
}
