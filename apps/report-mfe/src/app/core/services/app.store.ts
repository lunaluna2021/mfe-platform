import { Injectable, inject, signal } from '@angular/core';
import { LoadStatus, describeApiError } from '@mfe-platform/shared-data-api';
import { firstValueFrom } from 'rxjs';
import { ACTIVITY_MONTHS } from '../const/app.const';
import type {
  IndustryCount,
  MonthlyActivity,
} from '../interfaces/app.interface';
import { toIndustryCounts, toMonthlyActivities } from '../utils/app.util';
import { ApiService } from './api.service';

/**
 * 報表資料的狀態。
 *
 * providedIn: 'root' 指的是這個 MFE 自己的根 injector，不是 Host 的。
 * 換人登入時先清空，避免下一位使用者看到上一位有權限看的數字。
 */
@Injectable({ providedIn: 'root' })
export class AppStore {
  private readonly _api = inject(ApiService);
  private readonly _activity = signal<readonly MonthlyActivity[]>([]);
  private readonly _industries = signal<readonly IndustryCount[]>([]);
  private readonly _status = signal<LoadStatus>(LoadStatus.IDLE);
  private readonly _errorMessage = signal<string | null>(null);
  private _ownerId: string | null = null;
  /** 每次讀取遞增；較早送出但較晚回來的結果直接丟棄 */
  private _loadGeneration = 0;

  readonly activity = this._activity.asReadonly();
  readonly industries = this._industries.asReadonly();
  readonly status = this._status.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();

  /**
   * 兩份統計同時讀取，任一失敗就整份顯示錯誤，避免畫面上的數字來自不同時間點。
   *
   * @param userId 目前登入者；與上次不同時先清空
   */
  async load(userId: string): Promise<void> {
    if (this._ownerId !== userId) {
      this.clear();
      this._ownerId = userId;
    }
    const generation = ++this._loadGeneration;
    this._status.set(LoadStatus.LOADING);
    this._errorMessage.set(null);
    try {
      const [activity, industries] = await Promise.all([
        firstValueFrom(this._api.getMonthlyActivity(ACTIVITY_MONTHS)),
        firstValueFrom(this._api.getCustomersByIndustry()),
      ]);
      if (generation === this._loadGeneration) {
        this._activity.set(toMonthlyActivities(activity));
        this._industries.set(toIndustryCounts(industries));
        this._status.set(LoadStatus.READY);
      }
    } catch (error) {
      if (generation === this._loadGeneration) {
        this._status.set(LoadStatus.ERROR);
        this._errorMessage.set(describeApiError(error));
      }
    }
  }

  /** 清空資料並丟棄還在進行中的讀取（登出或沒有權限時） */
  clear(): void {
    this._loadGeneration++;
    this._ownerId = null;
    this._activity.set([]);
    this._industries.set([]);
    this._status.set(LoadStatus.IDLE);
    this._errorMessage.set(null);
  }
}
