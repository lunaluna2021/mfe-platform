import { CUSTOMER_LIMITS } from '../../const/app.const';
import type { CustomerDraft } from '../../interfaces/app.interface';
import { isCustomerLevel } from '../app.util';

/**
 * 前端先檢查，讓使用者立即看到錯誤；後端仍會再驗證一次。
 *
 * @param draft 已整理過的表單資料
 * @returns 第一個錯誤訊息，沒有錯誤時回傳 null
 */
export function validateCustomerDraft(draft: CustomerDraft): string | null {
  if (!draft.name) {
    return '請輸入公司名稱';
  }
  if (draft.name.length > CUSTOMER_LIMITS.NAME) {
    return `公司名稱最多 ${CUSTOMER_LIMITS.NAME} 個字`;
  }
  if (draft.industry.length > CUSTOMER_LIMITS.INDUSTRY) {
    return `產業最多 ${CUSTOMER_LIMITS.INDUSTRY} 個字`;
  }
  if (draft.contact.length > CUSTOMER_LIMITS.CONTACT) {
    return `聯絡人最多 ${CUSTOMER_LIMITS.CONTACT} 個字`;
  }
  if (draft.phone.length > CUSTOMER_LIMITS.PHONE) {
    return `電話最多 ${CUSTOMER_LIMITS.PHONE} 個字`;
  }
  if (!isCustomerLevel(draft.level)) {
    return '請選擇客戶等級';
  }
  return null;
}
