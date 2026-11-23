import {
  MFE_CONTRACT_VERSION,
  MFE_EVENT_PREFIX,
  type MfeEventEnvelope,
  type MfeEventMap,
  type MfeEventType,
} from '@mfe-platform/shared-contracts';

export type MfeEventHandler<K extends MfeEventType> = (
  event: MfeEventEnvelope<K>,
) => void;

export interface MfeEventBus {
  emit<K extends MfeEventType>(type: K, payload: MfeEventMap[K]): void;
  /** 訂閱事件；回傳取消訂閱的函式，呼叫端負責在元件銷毀時呼叫 */
  on<K extends MfeEventType>(type: K, handler: MfeEventHandler<K>): () => void;
}

/**
 * 建立事件匯流排。
 *
 * Host 與每個 MFE 都各自打包一份這段程式，模組層級的變數在 bundle 之間並不共用。
 * 所以這裡不保存任何訂閱清單，而是把事件以 CustomEvent 派送到同一個 window：
 * 瀏覽器負責轉送，不同 bundle 的副本自然就能互通。
 *
 * @param source 發送者名稱，會寫進每個事件，方便追查是誰發的
 * @param target 預設為 window；測試時可傳入獨立的 EventTarget
 */
export function createMfeEventBus(
  source: string,
  target: EventTarget = window,
): MfeEventBus {
  return {
    emit(type, payload) {
      const envelope: MfeEventEnvelope<typeof type> = {
        type,
        payload,
        source,
        contractVersion: MFE_CONTRACT_VERSION,
        sentAt: new Date().toISOString(),
      };
      target.dispatchEvent(
        new CustomEvent(MFE_EVENT_PREFIX + type, { detail: envelope }),
      );
    },

    on(type, handler) {
      const listener = (event: Event) => {
        const envelope = readEnvelope(event, type);
        if (envelope) {
          handler(envelope);
        }
      };
      target.addEventListener(MFE_EVENT_PREFIX + type, listener);
      return () =>
        target.removeEventListener(MFE_EVENT_PREFIX + type, listener);
    },
  };
}

/**
 * 事件可能來自另一個版本的 bundle，或是任何人在主控台手動派送的，先檢查外層結構與契約版本。
 * MfeEventMap 的 payload 都是物件，所以 payload 不是物件（包含 null）的事件直接忽略，
 * 處理者存取 payload 的屬性時不會拋錯；屬性的值仍由各個處理者依需要檢查。
 */
function readEnvelope<K extends MfeEventType>(
  event: Event,
  type: K,
): MfeEventEnvelope<K> | null {
  if (!(event instanceof CustomEvent)) {
    return null;
  }
  const detail: unknown = event.detail;
  if (typeof detail !== 'object' || detail === null) {
    return null;
  }
  const envelope = detail as Partial<MfeEventEnvelope<K>>;
  if (envelope.type !== type) {
    return null;
  }
  if (typeof envelope.payload !== 'object' || envelope.payload === null) {
    console.warn(
      `[event-bus] 忽略 payload 格式不符的事件 ${type}（來源：${String(envelope.source)}）`,
    );
    return null;
  }
  if (envelope.contractVersion !== MFE_CONTRACT_VERSION) {
    console.warn(
      `[event-bus] 忽略契約版本 ${String(envelope.contractVersion)} 的事件 ${type}（來源：${String(envelope.source)}）`,
    );
    return null;
  }
  return envelope as MfeEventEnvelope<K>;
}
