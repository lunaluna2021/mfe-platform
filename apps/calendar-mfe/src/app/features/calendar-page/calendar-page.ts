import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { LoadStatus, describeApiError } from '@mfe-platform/shared-data-api';
import { createMfeEventBus } from '@mfe-platform/shared-event-bus';
import { MfeContextStore } from '@mfe-platform/shared-mfe-element';
import { hasPermission } from '@mfe-platform/shared-permission';
import { ConfirmDialog } from '@mfe-platform/shared-ui';
import { MFE_NAME } from '../../core/const/app.const';
import type {
  CalendarEvent,
  EventDraft,
  MonthCursor,
} from '../../core/interfaces/app.interface';
import { AppStore } from '../../core/services/app.store';
import {
  createEmptyEventDraft,
  toEventDraft,
} from '../../core/utils/event.util';
import {
  addMonths,
  buildMonthGrid,
  dateKeyOf,
  defaultDateFor,
  gridDateRange,
  monthOf,
} from '../../core/utils/grid.util';
import { EventForm } from '../../shared/components/event-form/event-form';
import { MonthGrid } from '../../shared/components/month-grid/month-grid';

/**
 * 行事曆頁：月曆、目前選取的客戶、新增／編輯／刪除行程。
 *
 * 目前選取的客戶來自 context（由客戶管理模組選取、經 Host 轉送），兩個模組不直接溝通。
 * 權限只決定顯示哪些按鈕；後端仍會檢查。
 */
@Component({
  selector: 'calendar-page',
  imports: [EventForm, MonthGrid, ConfirmDialog],
  templateUrl: './calendar-page.html',
  styleUrl: './calendar-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPage {
  private readonly _contextStore = inject(MfeContextStore);
  private readonly _store = inject(AppStore);
  private readonly _bus = createMfeEventBus(MFE_NAME);
  private readonly _today = new Date();
  private readonly _todayKey = dateKeyOf(this._today);

  protected readonly loadStatus = LoadStatus;
  protected readonly status = this._store.status;
  protected readonly loadError = this._store.errorMessage;
  protected readonly customerOptions = this._store.customerOptions;
  protected readonly isOptionsLoading = computed(
    () => this._store.optionsStatus() === LoadStatus.LOADING,
  );
  protected readonly optionsError = this._store.optionsError;

  protected readonly cursor = signal<MonthCursor>(monthOf(this._today));
  protected readonly isOnlySelected = signal(false);
  protected readonly canWrite = computed(() =>
    hasPermission(
      this._contextStore.context()?.permissions ?? [],
      'calendar:write',
    ),
  );
  protected readonly selectedCustomer = computed(
    () => this._contextStore.context()?.selectedCustomer ?? null,
  );
  protected readonly monthTitle = computed(
    () => `${this.cursor().year} 年 ${this.cursor().month + 1} 月`,
  );

  /** 目前選取的客戶在本月（不含前後補位日期）的行程數 */
  protected readonly selectedEventCount = computed(() => {
    const customer = this.selectedCustomer();
    const { year, month } = this.cursor();
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return customer
      ? this._store
          .events()
          .filter(
            (event) =>
              event.customerId === customer.id && event.date.startsWith(prefix),
          ).length
      : 0;
  });

  protected readonly weeks = computed(() => {
    const customer = this.selectedCustomer();
    const events =
      customer && this.isOnlySelected()
        ? this._store
            .events()
            .filter((event) => event.customerId === customer.id)
        : this._store.events();
    return buildMonthGrid(this.cursor(), events, this._todayKey);
  });

  /** 表單：editingEvent 為 null 表示新增 */
  protected readonly isFormOpen = signal(false);
  protected readonly editingEvent = signal<CalendarEvent | null>(null);
  protected readonly formDraft = signal<EventDraft>(
    createEmptyEventDraft(this._todayKey, ''),
  );
  protected readonly isSaving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly isConfirmingDelete = signal(false);

  constructor() {
    // 使用者或月份改變時重讀；token 更新時兩者都不變，不會重讀
    effect(() => {
      const userId = this._contextStore.userId();
      const range = gridDateRange(this.cursor());
      untracked(() => {
        if (userId) {
          void this._store.load(userId, range);
        }
      });
    });

    // 換人登入或失去寫入權限時，關閉還開著的表單
    effect(() => {
      this._contextStore.userId();
      this.canWrite();
      untracked(() => this.onCloseForm());
    });
  }

  /** 重新讀取目前月份 */
  protected onReload(): void {
    void this._store.reload();
  }

  /**
   * @param delta 前進（正數）或後退（負數）的月數
   */
  protected onMoveMonth(delta: number): void {
    this.cursor.update((cursor) => addMonths(cursor, delta));
  }

  /** 回到本月 */
  protected onGoToday(): void {
    this.cursor.set(monthOf(this._today));
  }

  /**
   * @param event checkbox 的 change 事件
   */
  protected onOnlySelectedChange(event: Event): void {
    this.isOnlySelected.set((event.target as HTMLInputElement).checked);
  }

  /** 選取狀態屬於平台，請 Host 清除，Host 再透過 context 通知所有模組 */
  protected onClearSelection(): void {
    this.isOnlySelected.set(false);
    this._bus.emit('customer:selected', { customer: null });
  }

  /**
   * @param date 預設日期；沒有時依目前月份決定
   */
  protected onCreate(date?: string): void {
    if (!this.canWrite()) {
      return;
    }
    this.editingEvent.set(null);
    this.formDraft.set(
      createEmptyEventDraft(
        date ?? defaultDateFor(this.cursor(), this._today),
        this.selectedCustomer()?.id ?? '',
      ),
    );
    this._openForm();
  }

  /**
   * @param event 要編輯的行程
   */
  protected onEdit(event: CalendarEvent): void {
    if (!this.canWrite()) {
      return;
    }
    this.editingEvent.set(event);
    this.formDraft.set(toEventDraft(event));
    this._openForm();
  }

  /** 關閉表單 */
  protected onCloseForm(): void {
    this.isFormOpen.set(false);
    this.editingEvent.set(null);
    this.formError.set(null);
    this.isConfirmingDelete.set(false);
  }

  /**
   * @param draft 表單通過驗證的資料
   */
  protected async onSave(draft: EventDraft): Promise<void> {
    if (!this.canWrite() || this.isSaving()) {
      return;
    }
    const editing = this.editingEvent();
    this.isSaving.set(true);
    this.formError.set(null);
    try {
      const saved = editing
        ? await this._store.update(editing.id, draft)
        : await this._store.create(draft);
      this._bus.emit('notify', {
        level: 'success',
        message: `已${editing ? '更新' : '新增'}行程：${saved.date} ${saved.title}`,
      });
      this.onCloseForm();
    } catch (error) {
      this.formError.set(describeApiError(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  /** 表單按下刪除：先確認 */
  protected onRequestDelete(): void {
    if (this.editingEvent()) {
      this.isConfirmingDelete.set(true);
    }
  }

  /** 取消刪除 */
  protected onCancelDelete(): void {
    this.isConfirmingDelete.set(false);
  }

  /** 確認刪除正在編輯的行程 */
  protected async onConfirmDelete(): Promise<void> {
    const event = this.editingEvent();
    if (!event || !this.canWrite() || this.isSaving()) {
      return;
    }
    this.isSaving.set(true);
    this.formError.set(null);
    try {
      await this._store.remove(event.id);
      this._bus.emit('notify', {
        level: 'success',
        message: `已刪除行程：${event.title}`,
      });
      this.onCloseForm();
    } catch (error) {
      this.isConfirmingDelete.set(false);
      this.formError.set(describeApiError(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  /** 刪除確認對話框的訊息 */
  protected deleteMessage(): string {
    const event = this.editingEvent();
    return event
      ? `確定要刪除 ${event.date} 的「${event.title}」嗎？刪除後無法復原。`
      : '';
  }

  private _openForm(): void {
    this.formError.set(null);
    this.isConfirmingDelete.set(false);
    this.isFormOpen.set(true);
    void this._store.loadCustomerOptions();
  }
}
