import type { MfeNotifyLevel } from '@mfe-platform/shared-contracts';

/** 一則提示訊息 */
export interface Toast {
  readonly id: number;
  readonly level: MfeNotifyLevel;
  readonly message: string;
  /** 發出者，例如 host、customer */
  readonly source: string;
}
