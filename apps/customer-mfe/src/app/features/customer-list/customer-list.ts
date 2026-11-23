import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import type { Permission } from '@mfe-platform/shared-contracts';
import { LoadStatus, describeApiError } from '@mfe-platform/shared-data-api';
import { createMfeEventBus } from '@mfe-platform/shared-event-bus';
import { MfeContextStore } from '@mfe-platform/shared-mfe-element';
import { hasPermission } from '@mfe-platform/shared-permission';
import { ConfirmDialog } from '@mfe-platform/shared-ui';
import { MFE_NAME, EMPTY_CUSTOMER_DRAFT } from '../../core/const/app.const';
import type {
  Customer,
  CustomerDraft,
} from '../../core/interfaces/app.interface';
import { AppStore } from '../../core/services/app.store';
import { filterCustomers, toCustomerDraft } from '../../core/utils/app.util';
import { CustomerForm } from '../../shared/components/customer-form/customer-form';

/**
 * 客戶清單頁：查詢、選取、新增、編輯、刪除。
 * 權限只決定顯示哪些按鈕；後端仍會檢查，沒有權限的請求會被拒絕。
 */
@Component({
  selector: 'customer-list',
  imports: [CustomerForm, ConfirmDialog],
  templateUrl: './customer-list.html',
  styleUrl: './customer-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerList {
  private readonly _contextStore = inject(MfeContextStore);
  private readonly _store = inject(AppStore);
  private readonly _bus = createMfeEventBus(MFE_NAME);

  protected readonly loadStatus = LoadStatus;
  protected readonly status = this._store.status;
  protected readonly loadError = this._store.errorMessage;
  protected readonly keyword = signal('');
  protected readonly visibleCustomers = computed(() =>
    filterCustomers(this._store.customers(), this.keyword()),
  );
  protected readonly selectedId = computed(
    () => this._contextStore.context()?.selectedCustomer?.id ?? null,
  );
  protected readonly canWrite = computed(() => this._can('customer:write'));
  protected readonly canOpenCalendar = computed(() =>
    this._can('calendar:read'),
  );

  /** 表單：editingCustomer 為 null 表示新增 */
  protected readonly isFormOpen = signal(false);
  protected readonly editingCustomer = signal<Customer | null>(null);
  protected readonly formDraft = computed(() => {
    const customer = this.editingCustomer();
    return customer ? toCustomerDraft(customer) : EMPTY_CUSTOMER_DRAFT;
  });
  protected readonly isSaving = signal(false);
  protected readonly formError = signal<string | null>(null);

  /** 等待確認刪除的客戶 */
  protected readonly pendingDelete = signal<Customer | null>(null);
  protected readonly isDeleting = signal(false);

  constructor() {
    // 依使用者讀取：換人登入時重讀；token 更新時使用者不變，不會重讀
    effect(() => {
      const userId = this._contextStore.userId();
      untracked(() => {
        if (userId) {
          void this._store.load(userId);
        }
      });
    });

    // 換人登入或失去寫入權限時，關閉還開著的表單與刪除確認
    effect(() => {
      this._contextStore.userId();
      this.canWrite();
      untracked(() => {
        this.onCloseForm();
        this.pendingDelete.set(null);
      });
    });
  }

  /**
   * @param event 搜尋框的 input 事件
   */
  protected onKeywordInput(event: Event): void {
    this.keyword.set((event.target as HTMLInputElement).value);
  }

  /** 重新讀取清單 */
  protected onReload(): void {
    const userId = this._contextStore.userId();
    if (userId) {
      void this._store.load(userId);
    }
  }

  /** 開啟新增表單 */
  protected onCreate(): void {
    this.editingCustomer.set(null);
    this.formError.set(null);
    this.isFormOpen.set(true);
  }

  /**
   * @param customer 要編輯的客戶
   */
  protected onEdit(customer: Customer): void {
    this.editingCustomer.set(customer);
    this.formError.set(null);
    this.isFormOpen.set(true);
  }

  /** 關閉表單 */
  protected onCloseForm(): void {
    this.isFormOpen.set(false);
    this.editingCustomer.set(null);
    this.formError.set(null);
  }

  /**
   * @param draft 表單通過驗證的資料
   */
  protected async onSave(draft: CustomerDraft): Promise<void> {
    if (!this.canWrite() || this.isSaving()) {
      return;
    }
    const editing = this.editingCustomer();
    this.isSaving.set(true);
    this.formError.set(null);
    try {
      const saved = editing
        ? await this._store.update(editing.id, draft)
        : await this._store.create(draft);
      if (editing && editing.id === this.selectedId()) {
        // 名稱可能改了，讓 Host 與其他模組顯示新名稱
        this.onSelect(saved);
      }
      this._bus.emit('notify', {
        level: 'success',
        message: `已${editing ? '更新' : '新增'}客戶：${saved.name}`,
      });
      this.onCloseForm();
    } catch (error) {
      this.formError.set(describeApiError(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * 選取客戶，Host 會分享給其他模組。
   *
   * @param customer 客戶
   */
  protected onSelect(customer: Customer): void {
    this._bus.emit('customer:selected', {
      customer: { id: customer.id, name: customer.name },
    });
  }

  /**
   * 選取客戶後請 Host 切到行事曆；行事曆會從 context 讀到這位客戶。
   *
   * @param customer 客戶
   */
  protected onScheduleVisit(customer: Customer): void {
    this.onSelect(customer);
    this._bus.emit('navigate', { mfe: 'calendar' });
  }

  /**
   * 開啟刪除確認對話框。
   *
   * @param customer 要刪除的客戶
   */
  protected onRequestDelete(customer: Customer): void {
    this.pendingDelete.set(customer);
  }

  /** 取消刪除 */
  protected onCancelDelete(): void {
    this.pendingDelete.set(null);
  }

  /** 確認刪除。客戶還有行程時，後端回 409 並說明行程數 */
  protected async onConfirmDelete(): Promise<void> {
    const customer = this.pendingDelete();
    if (!customer || !this.canWrite() || this.isDeleting()) {
      return;
    }
    this.isDeleting.set(true);
    try {
      await this._store.remove(customer.id);
      if (customer.id === this.selectedId()) {
        this._bus.emit('customer:selected', { customer: null });
      }
      if (customer.id === this.editingCustomer()?.id) {
        this.onCloseForm();
      }
      this._bus.emit('notify', {
        level: 'success',
        message: `已刪除客戶：${customer.name}`,
      });
    } catch (error) {
      this._bus.emit('notify', {
        level: 'warning',
        message: describeApiError(error),
      });
    } finally {
      this.isDeleting.set(false);
      this.pendingDelete.set(null);
    }
  }

  private _can(permission: Permission): boolean {
    return hasPermission(
      this._contextStore.context()?.permissions ?? [],
      permission,
    );
  }
}
