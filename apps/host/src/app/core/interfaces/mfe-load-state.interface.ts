import type { MfeLoadStatus } from '../enums/mfe-load-status.enum';

/** 單一 MFE 的載入狀態，畫面依它顯示載入中、重試中或錯誤 */
export interface MfeLoadState {
  readonly status: MfeLoadStatus;
  /** 目前或最後一次是第幾次嘗試（從 1 開始） */
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly errorMessage: string | null;
}
