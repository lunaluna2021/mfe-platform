/** 資料讀取狀態，各模組的清單、報表共用 */
export enum LoadStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  READY = 'ready',
  ERROR = 'error',
}
