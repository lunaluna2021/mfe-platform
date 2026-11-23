import {
  DATE_PATTERN,
  EVENT_LIMITS,
  TIME_PATTERN,
} from '../../const/app.const';
import type { EventDraft } from '../../interfaces/app.interface';

/**
 * 前端先檢查一次，減少無效請求；後端會用相同規則再檢查。
 *
 * @param draft 已去除空白的表單資料
 * @returns 第一個錯誤訊息；沒有錯誤時為 null
 */
export function validateEventDraft(draft: EventDraft): string | null {
  if (!draft.customerId) {
    return '請選擇客戶';
  }
  if (!DATE_PATTERN.test(draft.date)) {
    return '請選擇日期';
  }
  if (!TIME_PATTERN.test(draft.time)) {
    return '請選擇時間';
  }
  if (!draft.title) {
    return '請輸入主題';
  }
  if (draft.title.length > EVENT_LIMITS.TITLE) {
    return `主題最多 ${EVENT_LIMITS.TITLE} 個字`;
  }
  if (draft.note.length > EVENT_LIMITS.NOTE) {
    return `備註最多 ${EVENT_LIMITS.NOTE} 個字`;
  }
  return null;
}
