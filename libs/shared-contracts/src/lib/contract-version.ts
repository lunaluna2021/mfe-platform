/**
 * Host 與 MFE 之間的契約版本（context 屬性、事件名稱與 payload 結構）。
 *
 * 只有不相容的變更才遞增，例如欄位改名、移除，或新增 MFE 必須依賴的欄位。
 * manifest 的 contractVersion 必須等於這個值，Host 才會載入該 MFE；
 * 事件也會帶著版本號，收到不同版本的事件時忽略。
 *
 * 版本紀錄：
 * - 1：使用者、權限、目前選取的客戶。
 * - 2：新增 dataApi（直接連 Supabase），已停用。
 * - 3：改為 api（Java 後端網址與 access token），MFE 必須有它才能讀寫資料。
 */
export const MFE_CONTRACT_VERSION = 3;

/**
 * @param contractVersion manifest 或事件帶的契約版本
 * @returns 是否與目前的 Host／MFE 相容
 */
export function isContractCompatible(contractVersion: number): boolean {
  return contractVersion === MFE_CONTRACT_VERSION;
}
