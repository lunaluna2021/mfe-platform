import type { Environment } from './environment.model';

/** SIT 測試環境：獨立執行時以 MSW 模擬 API，不需要後端 */
export const environment: Environment = {
  envName: 'SIT',
  production: true,
  runtimeConfigFile: 'runtime-config.sit.json',
  isMock: true,
};
