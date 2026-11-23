/** 環境名稱 */
export type EnvName = 'default' | 'SIT' | 'UAT' | 'PROD';

/** 建置時決定的環境設定；每個環境一份，由建置設定（fileReplacements）替換 */
export interface Environment {
  readonly envName: EnvName;
  readonly production: boolean;
  /**
   * 執行時設定檔（相對於網站根目錄）。後端網址寫在這個檔案裡，
   * 換後端網址只要改檔案，不必重新建置。
   */
  readonly runtimeConfigFile: string;
}
