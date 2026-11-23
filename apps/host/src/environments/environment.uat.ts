import type { Environment } from './environment.model';

/** UAT 驗收環境 */
export const environment: Environment = {
  envName: 'UAT',
  production: true,
  runtimeConfigFile: 'runtime-config.uat.json',
};
