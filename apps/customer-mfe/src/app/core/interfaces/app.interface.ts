import type { CUSTOMER_LEVELS } from '../const/app.const';

/** 客戶等級 A／B／C */
export type CustomerLevel = (typeof CUSTOMER_LEVELS)[number];

/** 畫面使用的客戶資料 */
export interface Customer {
  readonly id: string;
  readonly name: string;
  readonly industry: string;
  readonly contact: string;
  readonly phone: string;
  readonly level: CustomerLevel;
}

/** 新增與編輯共用的表單資料 */
export interface CustomerDraft {
  readonly name: string;
  readonly industry: string;
  readonly contact: string;
  readonly phone: string;
  readonly level: CustomerLevel;
}
