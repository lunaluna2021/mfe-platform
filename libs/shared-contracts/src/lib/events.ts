import type { MfeSelectedCustomer } from './host-context';

/** 所有平台事件在 window 上的名稱前綴，例如 `mfe:notify` */
export const MFE_EVENT_PREFIX = 'mfe:';

export const MFE_NOTIFY_LEVELS = [
  'info',
  'success',
  'warning',
  'error',
] as const;

export type MfeNotifyLevel = (typeof MFE_NOTIFY_LEVELS)[number];

export function isNotifyLevel(value: unknown): value is MfeNotifyLevel {
  return (
    typeof value === 'string' &&
    (MFE_NOTIFY_LEVELS as readonly string[]).includes(value)
  );
}

/**
 * 事件名稱與 payload 的對照表。新增事件時只改這裡，
 * Host 與 MFE 透過 shared-event-bus 取得型別檢查。
 */
export interface MfeEventMap {
  /** 請 Host 顯示提示訊息 */
  notify: { readonly level: MfeNotifyLevel; readonly message: string };
  /**
   * 請 Host 切換到另一個模組。指定 manifest 的 name 而不是網址，
   * 路由怎麼設計是 Host 的事，MFE 不需要知道。
   */
  navigate: { readonly mfe: string };
  /** 選取或取消選取客戶（null 表示取消） */
  'customer:selected': { readonly customer: MfeSelectedCustomer | null };
}

export type MfeEventType = keyof MfeEventMap;

/** 實際放在 CustomEvent.detail 的內容 */
export interface MfeEventEnvelope<K extends MfeEventType = MfeEventType> {
  readonly type: K;
  readonly payload: MfeEventMap[K];
  /** 發送者名稱，例如 `host`、`customer` */
  readonly source: string;
  readonly contractVersion: number;
  readonly sentAt: string;
}
