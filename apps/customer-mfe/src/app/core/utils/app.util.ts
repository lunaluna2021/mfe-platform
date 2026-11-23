import { CUSTOMER_LEVELS } from '../const/app.const';
import type { CustomerReq } from '../bff/api.interface';
import type {
  Customer,
  CustomerDraft,
  CustomerLevel,
} from '../interfaces/app.interface';

/**
 * @param value 任意值
 * @returns 是否為合法的客戶等級
 */
export function isCustomerLevel(value: unknown): value is CustomerLevel {
  return (
    typeof value === 'string' &&
    (CUSTOMER_LEVELS as readonly string[]).includes(value)
  );
}

/**
 * 檢查 API 回傳的資料並轉成畫面使用的格式。
 * 格式不符代表前後端契約不一致，直接拋錯而不是略過。
 *
 * @param value API 回傳的單筆資料
 * @returns 客戶
 * @throws Error 格式不符
 */
export function toCustomer(value: unknown): Customer {
  const row =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const { ID, NAME, INDUSTRY, CONTACT, PHONE, LEVEL } = row;
  if (
    typeof ID !== 'string' ||
    typeof NAME !== 'string' ||
    typeof INDUSTRY !== 'string' ||
    typeof CONTACT !== 'string' ||
    typeof PHONE !== 'string' ||
    !isCustomerLevel(LEVEL)
  ) {
    throw new Error('客戶資料格式不符');
  }
  return {
    id: ID,
    name: NAME,
    industry: INDUSTRY,
    contact: CONTACT,
    phone: PHONE,
    level: LEVEL,
  };
}

/**
 * @param value API 回傳的清單
 * @returns 客戶清單
 * @throws Error 格式不符
 */
export function toCustomers(value: unknown): Customer[] {
  if (!Array.isArray(value)) {
    throw new Error('客戶資料格式不符');
  }
  return value.map(toCustomer);
}

/**
 * @param draft 已整理過的表單資料
 * @returns API request
 */
export function toCustomerReq(draft: CustomerDraft): CustomerReq {
  return {
    NAME: draft.name,
    INDUSTRY: draft.industry,
    CONTACT: draft.contact,
    PHONE: draft.phone,
    LEVEL: draft.level,
  };
}

/**
 * @param customer 客戶
 * @returns 編輯用的表單資料
 */
export function toCustomerDraft(customer: Customer): CustomerDraft {
  const { name, industry, contact, phone, level } = customer;
  return { name, industry, contact, phone, level };
}

/**
 * 去除前後空白。產業未填時由後端套用預設值「未分類」。
 *
 * @param draft 表單資料
 * @returns 整理後的資料
 */
export function normalizeCustomerDraft(draft: CustomerDraft): CustomerDraft {
  return {
    name: draft.name.trim(),
    industry: draft.industry.trim(),
    contact: draft.contact.trim(),
    phone: draft.phone.trim(),
    level: draft.level,
  };
}

/**
 * @param customers 客戶清單
 * @returns 依名稱排序後的新陣列
 */
export function sortCustomers(customers: readonly Customer[]): Customer[] {
  return [...customers].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
}

/**
 * 依關鍵字篩選（不分大小寫，比對名稱、產業、聯絡人、電話）。
 *
 * @param customers 客戶清單
 * @param keyword 關鍵字
 * @returns 符合的客戶
 */
export function filterCustomers(
  customers: readonly Customer[],
  keyword: string,
): readonly Customer[] {
  const term = keyword.trim().toLowerCase();
  if (!term) {
    return customers;
  }
  return customers.filter((customer) =>
    [customer.name, customer.industry, customer.contact, customer.phone].some(
      (field) => field.toLowerCase().includes(term),
    ),
  );
}
