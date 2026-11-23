import type { Environment } from './environment.model';

/** SIT 測試環境 */
export const environment: Environment = {
  envName: 'SIT',
  production: true,
  runtimeConfigFile: 'runtime-config.sit.json',
};
