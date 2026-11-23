/** 這個 MFE 在事件中的名稱，與 manifest 的 name 相同 */
export const MFE_NAME = 'report';

/** 註冊的 Custom Element 名稱，必須與 manifest 的 tagName 相同 */
export const TAG_NAME = 'mfe-report';

/** 每月活動統計的月數（含本月）；後端允許 1～24 */
export const ACTIVITY_MONTHS = 6;

/** 匯出 CSV 的表頭 */
export const ACTIVITY_CSV_HEADER = ['月份', '新客戶數', '拜訪次數'] as const;
