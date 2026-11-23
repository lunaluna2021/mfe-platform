import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { LoadStatus } from '@mfe-platform/shared-data-api';
import { createMfeEventBus } from '@mfe-platform/shared-event-bus';
import { MfeContextStore } from '@mfe-platform/shared-mfe-element';
import { hasPermission } from '@mfe-platform/shared-permission';
import { MFE_NAME, ACTIVITY_MONTHS } from '../../core/const/app.const';
import { AppStore } from '../../core/services/app.store';
import { downloadTextFile, toActivityCsv } from '../../core/utils/csv.util';
import { sumActivity, toBarWidth } from '../../core/utils/app.util';
import { StatTile } from '../../shared/components/stat-tile/stat-tile';

/**
 * 報表頁：近幾個月的新客戶與拜訪次數、各產業客戶數，可匯出 CSV。
 *
 * 需要 report:read 才會讀取；Host 會先擋下沒有權限的使用者，
 * 這裡再檢查一次，是為了獨立執行時也能顯示清楚的說明，而不是 403 錯誤。
 */
@Component({
  selector: 'report-dashboard',
  imports: [StatTile],
  templateUrl: './report-dashboard.html',
  styleUrl: './report-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportDashboard {
  private readonly _contextStore = inject(MfeContextStore);
  private readonly _store = inject(AppStore);
  private readonly _bus = createMfeEventBus(MFE_NAME);

  protected readonly loadStatus = LoadStatus;
  protected readonly months = ACTIVITY_MONTHS;
  protected readonly status = this._store.status;
  protected readonly loadError = this._store.errorMessage;
  protected readonly activity = this._store.activity;
  protected readonly industries = this._store.industries;

  protected readonly canRead = computed(() =>
    hasPermission(
      this._contextStore.context()?.permissions ?? [],
      'report:read',
    ),
  );
  protected readonly canExport = computed(() =>
    hasPermission(
      this._contextStore.context()?.permissions ?? [],
      'report:export',
    ),
  );
  protected readonly totals = computed(() => sumActivity(this.activity()));
  protected readonly customerTotal = computed(() =>
    this.industries().reduce((total, item) => total + item.customerCount, 0),
  );
  private readonly _maxVisits = computed(() =>
    Math.max(0, ...this.activity().map((row) => row.visits)),
  );
  private readonly _maxIndustryCount = computed(() =>
    Math.max(0, ...this.industries().map((item) => item.customerCount)),
  );

  constructor() {
    // 換人登入或權限改變時重讀；token 更新時兩者都不變，不會重讀
    effect(() => {
      const userId = this._contextStore.userId();
      const canRead = this.canRead();
      untracked(() => {
        if (userId && canRead) {
          void this._store.load(userId);
        } else {
          this._store.clear();
        }
      });
    });
  }

  /**
   * @param visits 拜訪次數
   * @returns 長條寬度
   */
  protected visitsBarWidth(visits: number): string {
    return toBarWidth(visits, this._maxVisits());
  }

  /**
   * @param count 客戶數
   * @returns 長條寬度
   */
  protected industryBarWidth(count: number): string {
    return toBarWidth(count, this._maxIndustryCount());
  }

  /** 重新讀取 */
  protected onReload(): void {
    const userId = this._contextStore.userId();
    if (userId && this.canRead()) {
      void this._store.load(userId);
    }
  }

  /** 匯出每月活動 CSV（需要 report:export） */
  protected onExportCsv(): void {
    const rows = this.activity();
    if (!this.canExport() || rows.length === 0) {
      return;
    }
    downloadTextFile(
      `activity-report-${rows[rows.length - 1].month}.csv`,
      toActivityCsv(rows),
      'text/csv;charset=utf-8',
    );
    this._bus.emit('notify', {
      level: 'success',
      message: '已匯出活動報表 CSV',
    });
  }
}
