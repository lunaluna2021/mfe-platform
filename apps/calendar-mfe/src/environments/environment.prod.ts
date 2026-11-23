import type { Environment } from './environment.model';

/** 正式環境（PROD） */
export const environment: Environment = {
  envName: 'PROD',
  production: true,
  runtimeConfigFile: 'runtime-config.prod.json',
  isMock: false,
};
