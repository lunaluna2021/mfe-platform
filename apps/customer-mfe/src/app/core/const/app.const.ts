import type { CustomerDraft } from '../interfaces/app.interface';

/** 這個 MFE 在事件中的名稱，與 manifest 的 name 相同 */
export const MFE_NAME = 'customer';

/** 註冊的 Custom Element 名稱，必須與 manifest 的 tagName 相同 */
export const TAG_NAME = 'mfe-customer';

/** 客戶等級 */
export const CUSTOMER_LEVELS = ['A', 'B', 'C'] as const;

/** 欄位長度上限，與後端驗證、資料表的 check 條件相同 */
export const CUSTOMER_LIMITS = {
  NAME: 40,
  INDUSTRY: 20,
  CONTACT: 20,
  PHONE: 20,
} as const;

/** 新增客戶時的空白表單 */
export const EMPTY_CUSTOMER_DRAFT: CustomerDraft = {
  name: '',
  industry: '',
  contact: '',
  phone: '',
  level: 'C',
};
