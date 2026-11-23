import { Injectable, inject, signal } from '@angular/core';
import { LoadStatus, describeApiError } from '@mfe-platform/shared-data-api';
import { firstValueFrom } from 'rxjs';
import type {
  CalendarEvent,
  CustomerOption,
  DateRange,
  EventDraft,
} from '../interfaces/app.interface';
import {
  toCalendarEvent,
  toCalendarEventReq,
  toCalendarEvents,
  toCustomerOptions,
} from '../utils/event.util';
import { ApiService } from './api.service';

/**
 * 行程與客戶選單的狀態。
 *
 * providedIn: 'root' 指的是這個 MFE 自己的根 injector（由 createApplication 建立），
 * 不是 Host 的。新增、修改、刪除後重讀目前期間，行程可能移到別的日期或月份。
 */
@Injectable({ providedIn: 'root' })
export class AppStore {
  private readonly _api = inject(ApiService);
  private readonly _events = signal<readonly CalendarEvent[]>([]);
  private readonly _status = signal<LoadStatus>(LoadStatus.IDLE);
  private readonly _errorMessage = signal<string | null>(null);
  private readonly _customerOptions = signal<readonly CustomerOption[]>([]);
  private readonly _optionsStatus = signal<LoadStatus>(LoadStatus.IDLE);
  private readonly _optionsError = signal<string | null>(null);
  /** 資料屬於哪個使用者；換人登入時先清空，避免看到上一位的資料 */
  private _ownerId: string | null = null;
  /** 最近一次查詢的期間，重讀時使用 */
  private _range: DateRange | null = null;
  /** 每次讀取遞增；較早送出但較晚回來的結果直接丟棄（例如快速切換月份） */
  private _loadGeneration = 0;
  private _optionsGeneration = 0;

  readonly events = this._events.asReadonly();
  readonly status = this._status.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();
  readonly customerOptions = this._customerOptions.asReadonly();
  readonly optionsStatus = this._optionsStatus.asReadonly();
  readonly optionsError = this._optionsError.asReadonly();

  /**
   * @param userId 目前登入者；與上次不同時先清空資料
   * @param range 查詢期間
   */
  async load(userId: string, range: DateRange): Promise<void> {
    if (this._ownerId !== userId) {
      this._ownerId = userId;
      this._events.set([]);
      this._customerOptions.set([]);
      this._optionsStatus.set(LoadStatus.IDLE);
    }
    this._range = range;
    const generation = ++this._loadGeneration;
    this._status.set(LoadStatus.LOADING);
    this._errorMessage.set(null);
    try {
      const events = toCalendarEvents(
        await firstValueFrom(this._api.getEvents(range)),
      );
      if (generation === this._loadGeneration) {
        this._events.set(events);
        this._status.set(LoadStatus.READY);
      }
    } catch (error) {
      if (generation === this._loadGeneration) {
        this._status.set(LoadStatus.ERROR);
        this._errorMessage.set(describeApiError(error));
      }
    }
  }

  /** 以最近一次的使用者與期間重讀 */
  async reload(): Promise<void> {
    if (this._ownerId && this._range) {
      await this.load(this._ownerId, this._range);
    }
  }

  /**
   * 表單的客戶選單；每次開啟表單都重讀，才看得到剛在客戶管理新增的客戶。
   * 失敗時不拋錯，以 optionsError 顯示。
   */
  async loadCustomerOptions(): Promise<void> {
    const generation = ++this._optionsGeneration;
    this._optionsStatus.set(LoadStatus.LOADING);
    this._optionsError.set(null);
    try {
      const options = toCustomerOptions(
        await firstValueFrom(this._api.getCustomerOptions()),
      );
      if (generation === this._optionsGeneration) {
        this._customerOptions.set(options);
        this._optionsStatus.set(LoadStatus.READY);
      }
    } catch (error) {
      if (generation === this._optionsGeneration) {
        this._optionsStatus.set(LoadStatus.ERROR);
        this._optionsError.set(describeApiError(error));
      }
    }
  }

  /**
   * 失敗時拋出錯誤，由呼叫端決定如何顯示。
   *
   * @param draft 已驗證的表單資料
   * @returns 新行程
   */
  async create(draft: EventDraft): Promise<CalendarEvent> {
    const event = toCalendarEvent(
      await firstValueFrom(this._api.createEvent(toCalendarEventReq(draft))),
    );
    await this.reload();
    return event;
  }

  /**
   * @param id 行程識別碼
   * @param draft 已驗證的表單資料
   * @returns 更新後的行程
   */
  async update(id: string, draft: EventDraft): Promise<CalendarEvent> {
    const event = toCalendarEvent(
      await firstValueFrom(
        this._api.updateEvent(id, toCalendarEventReq(draft)),
      ),
    );
    await this.reload();
    return event;
  }

  /**
   * @param id 行程識別碼
   */
  async remove(id: string): Promise<void> {
    await firstValueFrom(this._api.deleteEvent(id), {
      defaultValue: undefined,
    });
    await this.reload();
  }
}
