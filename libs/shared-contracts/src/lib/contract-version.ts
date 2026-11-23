/**
 * Host 與 MFE 之間的契約版本（context 屬性、事件名稱與 payload 結構）。
 *
 * 只有不相容的變更才遞增，例如欄位改名或移除。
 * manifest 的 contractVersion 必須等於這個值，Host 才會載入該 MFE；
 * 事件也會帶著版本號，收到不同版本的事件時忽略。
 */
export const MFE_CONTRACT_VERSION = 1;

export function isContractCompatible(contractVersion: number): boolean {
  return contractVersion === MFE_CONTRACT_VERSION;
}
