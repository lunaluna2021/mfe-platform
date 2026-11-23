import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { WEEKDAYS } from '../../../core/const/app.const';
import type {
  CalendarCell,
  CalendarEvent,
} from '../../../core/interfaces/app.interface';

/**
 * 月曆格子。只負責顯示；可編輯時日期與行程是按鈕，點擊後通知呼叫端。
 */
@Component({
  selector: 'calendar-month-grid',
  templateUrl: './month-grid.html',
  styleUrl: './month-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthGrid {
  /** 以週分組的格子 */
  readonly weeks = input.required<readonly (readonly CalendarCell[])[]>();
  /** 是否可新增與編輯 */
  readonly canWrite = input(false);
  /** 要標示的客戶（目前選取的客戶） */
  readonly highlightCustomerId = input<string | null>(null);

  /** 點日期：要在這天新增行程 */
  readonly dayClicked = output<string>();
  /** 點行程：要編輯這筆行程 */
  readonly eventClicked = output<CalendarEvent>();

  protected readonly weekdays = WEEKDAYS;

  /**
   * @param date YYYY-MM-DD
   */
  protected onDayClick(date: string): void {
    this.dayClicked.emit(date);
  }

  /**
   * @param event 行程
   */
  protected onEventClick(event: CalendarEvent): void {
    this.eventClicked.emit(event);
  }
}
