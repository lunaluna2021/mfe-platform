import {
  ChangeDetectionStrategy,
  Component,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { EVENT_LIMITS } from '../../../core/const/app.const';
import type {
  CustomerOption,
  EventDraft,
} from '../../../core/interfaces/app.interface';
import { normalizeEventDraft } from '../../../core/utils/event.util';
import { validateEventDraft } from '../../../core/utils/validators/event.validator';

/**
 * 新增與編輯行程共用的表單。只負責輸入與前端驗證；
 * 儲存與刪除由呼叫端處理，結果再以 errorMessage 傳回。
 */
@Component({
  selector: 'calendar-event-form',
  templateUrl: './event-form.html',
  styleUrl: './event-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventForm {
  /** 表單初始值；改變時表單重新填入 */
  readonly initialDraft = input.required<EventDraft>();
  /** 編輯既有行程時為 true，顯示刪除按鈕 */
  readonly isEditing = input(false);
  /** 呼叫端儲存或刪除中時為 true，按鈕停用 */
  readonly isSaving = input(false);
  /** 呼叫端的儲存結果訊息 */
  readonly errorMessage = input<string | null>(null);
  /** 客戶選單 */
  readonly customerOptions = input<readonly CustomerOption[]>([]);
  readonly isOptionsLoading = input(false);
  /** 讀取客戶選單失敗的訊息 */
  readonly optionsError = input<string | null>(null);

  /** 通過驗證的資料（已去除空白） */
  readonly saved = output<EventDraft>();
  /** 使用者按下刪除；由呼叫端確認後刪除 */
  readonly deleteRequested = output<void>();
  readonly cancelled = output<void>();

  protected readonly limits = EVENT_LIMITS;
  protected readonly draft = linkedSignal(() => this.initialDraft());
  protected readonly validationError = signal<string | null>(null);

  /**
   * @param field 欄位
   * @param event input 或 change 事件
   */
  protected onFieldInput(field: keyof EventDraft, event: Event): void {
    const value = (
      event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    ).value;
    this.draft.update((draft) => ({ ...draft, [field]: value }));
  }

  /**
   * @param event submit 事件
   */
  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (this.isSaving()) {
      return;
    }
    const draft = normalizeEventDraft(this.draft());
    const error = validateEventDraft(draft);
    this.validationError.set(error);
    if (!error) {
      this.saved.emit(draft);
    }
  }

  /** 請呼叫端確認刪除 */
  protected onDelete(): void {
    this.deleteRequested.emit();
  }

  /** 取消編輯 */
  protected onCancel(): void {
    this.validationError.set(null);
    this.cancelled.emit();
  }
}
