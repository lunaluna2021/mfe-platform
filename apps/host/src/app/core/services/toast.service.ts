import { Injectable, signal } from '@angular/core';
import type { MfeNotifyLevel } from '@mfe-platform/shared-contracts';
import { TOAST_DISPLAY_MS, TOAST_MAX_VISIBLE } from '../const/app.const';
import type { Toast } from '../interfaces/toast.interface';

/** Host 統一顯示提示訊息；MFE 透過 notify 事件請 Host 顯示，不自己做全站提示 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private _nextId = 1;
  private readonly _toasts = signal<readonly Toast[]>([]);

  /** 目前顯示中的提示 */
  readonly toasts = this._toasts.asReadonly();

  /**
   * 顯示提示，一段時間後自動消失；超過上限時移除最舊的。
   *
   * @param level 等級
   * @param message 訊息
   * @param source 發出者
   */
  show(level: MfeNotifyLevel, message: string, source = 'host'): void {
    const toast: Toast = { id: this._nextId++, level, message, source };
    this._toasts.update((toasts) =>
      [...toasts, toast].slice(-TOAST_MAX_VISIBLE),
    );
    setTimeout(() => this.dismiss(toast.id), TOAST_DISPLAY_MS);
  }

  /**
   * @param id 要關閉的提示
   */
  dismiss(id: number): void {
    this._toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }
}
