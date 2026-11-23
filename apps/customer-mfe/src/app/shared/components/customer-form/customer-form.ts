import {
  ChangeDetectionStrategy,
  Component,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import {
  CUSTOMER_LEVELS,
  CUSTOMER_LIMITS,
} from '../../../core/const/app.const';
import type { CustomerDraft } from '../../../core/interfaces/app.interface';
import {
  isCustomerLevel,
  normalizeCustomerDraft,
} from '../../../core/utils/app.util';
import { validateCustomerDraft } from '../../../core/utils/validators/form.validator';

type TextField = Exclude<keyof CustomerDraft, 'level'>;

/**
 * 新增與編輯客戶共用的表單。只負責輸入與前端驗證；
 * 通過驗證後送出 saved，實際儲存由呼叫端處理，結果再以 errorMessage 傳回。
 */
@Component({
  selector: 'customer-form',
  templateUrl: './customer-form.html',
  styleUrl: './customer-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerForm {
  /** 表單初始值；改變時表單重新填入 */
  readonly initialDraft = input.required<CustomerDraft>();
  /** 編輯既有客戶時為 true，影響標題 */
  readonly isEditing = input(false);
  /** 呼叫端儲存中時為 true，按鈕停用 */
  readonly isSaving = input(false);
  /** 呼叫端的儲存結果訊息，例如名稱重複 */
  readonly errorMessage = input<string | null>(null);

  /** 通過驗證的資料（已去除空白） */
  readonly saved = output<CustomerDraft>();
  readonly cancelled = output<void>();

  protected readonly levels = CUSTOMER_LEVELS;
  protected readonly limits = CUSTOMER_LIMITS;
  protected readonly draft = linkedSignal(() => this.initialDraft());
  protected readonly validationError = signal<string | null>(null);

  /**
   * @param field 文字欄位
   * @param event input 事件
   */
  protected onTextInput(field: TextField, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.draft.update((draft) => ({ ...draft, [field]: value }));
  }

  /**
   * @param event change 事件
   */
  protected onLevelChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (isCustomerLevel(value)) {
      this.draft.update((draft) => ({ ...draft, level: value }));
    }
  }

  /**
   * @param event submit 事件
   */
  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (this.isSaving()) {
      return;
    }
    const draft = normalizeCustomerDraft(this.draft());
    const error = validateCustomerDraft(draft);
    this.validationError.set(error);
    if (!error) {
      this.saved.emit(draft);
    }
  }

  /** 取消編輯 */
  protected onCancel(): void {
    this.validationError.set(null);
    this.cancelled.emit();
  }
}
