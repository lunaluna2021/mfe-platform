/** MFE 的載入狀態 */
export enum MfeLoadStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  RETRYING = 'retrying',
  LOADED = 'loaded',
  FAILED = 'failed',
  /** manifest 的契約版本與 Host 不相容，不載入也不重試 */
  INCOMPATIBLE = 'incompatible',
}

/** MFE 載入失敗的原因 */
export enum MfeLoadFailureReason {
  INCOMPATIBLE = 'incompatible',
  NETWORK = 'network',
  TIMEOUT = 'timeout',
}
