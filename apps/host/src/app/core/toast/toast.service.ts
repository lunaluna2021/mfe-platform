import { Injectable, signal } from '@angular/core';
import type { MfeNotifyLevel } from '@mfe-platform/shared-contracts';

export interface Toast {
  readonly id: number;
  readonly level: MfeNotifyLevel;
  readonly message: string;
  readonly source: string;
}

const MAX_VISIBLE = 4;
const DISPLAY_MS = 4_000;

/** Host 統一顯示提示訊息；MFE 透過 notify 事件請 Host 顯示，不自己做全站提示 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly toastsState = signal<readonly Toast[]>([]);

  readonly toasts = this.toastsState.asReadonly();

  show(level: MfeNotifyLevel, message: string, source = 'host'): void {
    const toast: Toast = { id: this.nextId++, level, message, source };
    this.toastsState.update((toasts) => [...toasts, toast].slice(-MAX_VISIBLE));
    setTimeout(() => this.dismiss(toast.id), DISPLAY_MS);
  }

  dismiss(id: number): void {
    this.toastsState.update((toasts) =>
      toasts.filter((toast) => toast.id !== id),
    );
  }
}
