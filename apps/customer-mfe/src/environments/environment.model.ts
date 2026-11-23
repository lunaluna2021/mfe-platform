/** 環境名稱 */
export type EnvName = 'default' | 'SIT' | 'UAT' | 'PROD';

/** 建置時決定的環境設定；每個環境一份，由建置設定（fileReplacements）替換 */
export interface Environment {
  readonly envName: EnvName;
  readonly production: boolean;
  /** 獨立執行時讀取的執行時設定檔（後端網址），相對於模組的目錄 */
  readonly runtimeConfigFile: string;
  /**
   * 是否以 MSW 模擬 API（mocks/）。isMock 為 true、envName 為 SIT，
   * 而且在獨立執行頁時才會啟動，見 bootstrap.ts。
   */
  readonly isMock: boolean;
}
