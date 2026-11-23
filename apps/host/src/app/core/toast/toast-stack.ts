import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-stack',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack" aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [class]="'toast-' + toast.level" role="status">
          <span class="message">{{ toast.message }}</span>
          <span class="source">{{ toast.source }}</span>
          <button
            type="button"
            class="close"
            (click)="toastService.dismiss(toast.id)"
            aria-label="關閉"
          >
            ×
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .stack {
      position: fixed;
      right: 16px;
      bottom: 16px;
      display: grid;
      gap: 8px;
      width: min(360px, calc(100vw - 32px));
      z-index: 100;
    }
    .toast {
      display: grid;
      grid-template-columns: 1fr auto auto;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 8px;
      border-left: 4px solid var(--color-primary);
      background: var(--color-surface);
      box-shadow: 0 4px 16px rgb(0 0 0 / 12%);
      font-size: 14px;
    }
    .toast-success {
      border-left-color: var(--color-success);
    }
    .toast-warning {
      border-left-color: var(--color-warning);
    }
    .toast-error {
      border-left-color: var(--color-danger);
    }
    .source {
      color: var(--color-muted);
      font-size: 12px;
    }
    .close {
      border: 0;
      background: none;
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      color: var(--color-muted);
    }
  `,
})
export class ToastStack {
  protected readonly toastService = inject(ToastService);
}
