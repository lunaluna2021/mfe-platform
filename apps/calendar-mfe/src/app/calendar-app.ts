import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  signal,
} from '@angular/core';
import type { MfeHostContext } from '@mfe-platform/shared-contracts';
import { createMfeEventBus } from '@mfe-platform/shared-event-bus';
import {
  addMonths,
  buildDemoEvents,
  buildMonthGrid,
  toDateKey,
  type MonthCursor,
} from './calendar.data';

export const CALENDAR_MFE_NAME = 'calendar';
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const;

/**
 * 行事曆 MFE 的根元件，註冊為 <mfe-calendar>。
 * 目前選取的客戶來自 Host 的 context（由客戶管理 MFE 選取），兩個 MFE 不直接溝通。
 */
@Component({
  selector: 'calendar-root',
  templateUrl: './calendar-app.html',
  styleUrl: './calendar-app.scss',
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarApp {
  readonly context = input<MfeHostContext | null>(null);

  private readonly bus = createMfeEventBus(CALENDAR_MFE_NAME);
  private readonly today = new Date();
  private readonly todayKey = toDateKey(
    this.today.getFullYear(),
    this.today.getMonth(),
    this.today.getDate(),
  );

  protected readonly weekdays = WEEKDAYS;
  protected readonly cursor = signal<MonthCursor>({
    year: this.today.getFullYear(),
    month: this.today.getMonth(),
  });
  protected readonly onlySelected = signal(false);

  protected readonly selectedCustomer = computed(
    () => this.context()?.selectedCustomer ?? null,
  );
  protected readonly monthTitle = computed(
    () => `${this.cursor().year} 年 ${this.cursor().month + 1} 月`,
  );

  private readonly monthEvents = computed(() => buildDemoEvents(this.cursor()));

  protected readonly selectedEventCount = computed(() => {
    const customer = this.selectedCustomer();
    return customer
      ? this.monthEvents().filter((event) => event.customerId === customer.id)
          .length
      : 0;
  });

  protected readonly weeks = computed(() => {
    const customer = this.selectedCustomer();
    const events =
      customer && this.onlySelected()
        ? this.monthEvents().filter((event) => event.customerId === customer.id)
        : this.monthEvents();
    return buildMonthGrid(this.cursor(), events, this.todayKey);
  });

  protected moveMonth(delta: number): void {
    this.cursor.update((cursor) => addMonths(cursor, delta));
  }

  protected goToday(): void {
    this.cursor.set({
      year: this.today.getFullYear(),
      month: this.today.getMonth(),
    });
  }

  protected toggleOnlySelected(event: Event): void {
    this.onlySelected.set((event.target as HTMLInputElement).checked);
  }

  /** 清除是平台層級的狀態，請 Host 處理，Host 再透過 context 通知所有 MFE */
  protected clearSelection(): void {
    this.onlySelected.set(false);
    this.bus.emit('customer:selected', { customer: null });
  }
}
