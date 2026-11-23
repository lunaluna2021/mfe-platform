import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** 報表上方的數字卡片 */
@Component({
  selector: 'report-stat-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="label">{{ label() }}</span>
    <span class="value">{{ value() }}</span>
  `,
  styles: `
    :host {
      display: grid;
      gap: 4px;
      padding: 14px 16px;
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 10px;
      background: var(--color-surface, #fff);
    }
    .label {
      color: var(--color-muted, #6b7280);
      font-size: 13px;
    }
    .value {
      font-size: 22px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class StatTile {
  /** 說明文字 */
  readonly label = input.required<string>();
  /** 數值 */
  readonly value = input.required<number>();
}
