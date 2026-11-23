import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import type { MfeHostContext } from '@mfe-platform/shared-contracts';
import { createMfeEventBus } from '@mfe-platform/shared-event-bus';
import { hasPermission } from '@mfe-platform/shared-permission';
import { filterCustomers, type Customer } from './customer.data';
import { CustomerStore } from './customer.store';

export const CUSTOMER_MFE_NAME = 'customer';
const NAME_MAX_LENGTH = 40;
const INDUSTRY_MAX_LENGTH = 20;

/**
 * 客戶管理 MFE 的根元件，註冊為 <mfe-customer>。
 * Shadow DOM 讓這裡的樣式不影響 Host，Host 的樣式也進不來。
 */
@Component({
  selector: 'customer-root',
  templateUrl: './customer-app.html',
  styleUrl: './customer-app.scss',
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerApp {
  /** Host 以 element property 設定 */
  readonly context = input<MfeHostContext | null>(null);

  private readonly store = inject(CustomerStore);
  private readonly bus = createMfeEventBus(CUSTOMER_MFE_NAME);

  protected readonly nameMaxLength = NAME_MAX_LENGTH;
  protected readonly industryMaxLength = INDUSTRY_MAX_LENGTH;
  protected readonly keyword = signal('');
  protected readonly draftName = signal('');
  protected readonly draftIndustry = signal('');
  protected readonly formError = signal<string | null>(null);

  protected readonly visibleCustomers = computed(() =>
    filterCustomers(this.store.customers(), this.keyword()),
  );
  protected readonly selectedId = computed(
    () => this.context()?.selectedCustomer?.id ?? null,
  );
  protected readonly canWrite = computed(() => this.can('customer:write'));
  protected readonly canOpenCalendar = computed(() =>
    this.can('calendar:read'),
  );

  protected readValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected select(customer: Customer): void {
    this.bus.emit('customer:selected', {
      customer: { id: customer.id, name: customer.name },
    });
  }

  /** 選取客戶後請 Host 切到行事曆；行事曆會從 context 讀到這位客戶 */
  protected scheduleVisit(customer: Customer): void {
    this.select(customer);
    this.bus.emit('navigate', { mfe: 'calendar' });
  }

  protected addCustomer(event: Event): void {
    event.preventDefault();
    if (!this.canWrite()) {
      return;
    }

    const name = this.draftName().trim();
    const industry = this.draftIndustry().trim() || '未分類';
    if (!name) {
      this.formError.set('請輸入公司名稱');
      return;
    }
    if (this.store.hasName(name)) {
      this.formError.set('已有相同名稱的客戶');
      return;
    }

    const customer = this.store.add({ name, industry });
    this.draftName.set('');
    this.draftIndustry.set('');
    this.formError.set(null);
    this.bus.emit('notify', {
      level: 'success',
      message: `已新增客戶：${customer.name}`,
    });
  }

  private can(permission: 'customer:write' | 'calendar:read'): boolean {
    return hasPermission(this.context()?.permissions ?? [], permission);
  }
}
