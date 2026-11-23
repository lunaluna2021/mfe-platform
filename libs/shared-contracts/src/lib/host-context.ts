import type { MfeUser, Permission } from './identity';

/** 目前在平台上選取的客戶；由客戶管理 MFE 發出事件，Host 保存後再分享給所有 MFE */
export interface MfeSelectedCustomer {
  readonly id: string;
  readonly name: string;
}

/**
 * MFE 呼叫後端 API 需要的資訊。
 *
 * 登入、更新 token 都由 Host（或獨立執行時的登入外框）負責；
 * MFE 只拿目前有效的 accessToken 呼叫 API。token 更新時會收到新的 context。
 */
export interface MfeApiAccess {
  /** Java 後端的網址，例如 https://mfe-platform-api.onrender.com */
  readonly baseUrl: string;
  /** 登入者的 access token；後端依它判斷是誰、有哪些權限 */
  readonly accessToken: string;
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
  /** 依角色取得的權限；MFE 用來決定畫面顯示，真正的授權由後端執行 */
  readonly permissions: readonly Permission[];
  readonly selectedCustomer: MfeSelectedCustomer | null;
  readonly locale: string;
  readonly api: MfeApiAccess;
}

/** Host 掛載 MFE 時操作的元素型別 */
export type MfeElement = HTMLElement & {
  context?: MfeHostContext | null;
};
