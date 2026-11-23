import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
} from '@angular/core';
import type { MfeHostContext } from '@mfe-platform/shared-contracts';
import { createMfeEventBus } from '@mfe-platform/shared-event-bus';
import { hasPermission } from '@mfe-platform/shared-permission';
import { buildSalesReport, sumSales, toSalesCsv } from './report.data';

export const REPORT_MFE_NAME = 'report';

const currency = new Intl.NumberFormat('zh-TW', {
  style: 'currency',
  currency: 'TWD',
  maximumFractionDigits: 0,
});

/** 報表管理 MFE 的根元件，註冊為 <mfe-report> */
@Component({
  selector: 'report-root',
  templateUrl: './report-app.html',
  styleUrl: './report-app.scss',
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportApp {
  readonly context = input<MfeHostContext | null>(null);

  private readonly bus = createMfeEventBus(REPORT_MFE_NAME);

  protected readonly rows = buildSalesReport(new Date());
  protected readonly totals = sumSales(this.rows);
  private readonly maxRevenue = Math.max(
    ...this.rows.map((row) => row.revenue),
  );

  protected readonly canExport = computed(() =>
    hasPermission(this.context()?.permissions ?? [], 'report:export'),
  );

  protected formatCurrency(value: number): string {
    return currency.format(value);
  }

  protected barWidth(revenue: number): string {
    return `${Math.round((revenue / this.maxRevenue) * 100)}%`;
  }

  protected exportCsv(): void {
    if (!this.canExport()) {
      return;
    }
    const blob = new Blob([toSalesCsv(this.rows)], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales-report-${this.rows[this.rows.length - 1].month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.bus.emit('notify', {
      level: 'success',
      message: '已匯出業績報表 CSV',
    });
  }
}
