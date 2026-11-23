import type { MfeUser, Permission } from './identity';

/** 目前在平台上選取的客戶；由客戶管理 MFE 發出事件，Host 保存後再分享給所有 MFE */
export interface MfeSelectedCustomer {
  readonly id: string;
  readonly name: string;
}

/**
 * Host 以 element property `context` 傳給每個 MFE 的資料。
 *
 * 用單一物件而不是一堆個別屬性：新增欄位不必改動 Host 的掛載程式，
 * 契約也集中在這一個型別。內容變更時 Host 會換一個新物件重新設定。
 */
export interface MfeHostContext {
  readonly contractVersion: number;
  readonly user: MfeUser;
  /** 已依角色展開的權限；MFE 只用來決定畫面顯示，真正的授權在後端 */
  readonly permissions: readonly Permission[];
  readonly selectedCustomer: MfeSelectedCustomer | null;
  readonly locale: string;
}

/** Host 掛載 MFE 時操作的元素型別 */
export type MfeElement = HTMLElement & {
  context?: MfeHostContext | null;
};
