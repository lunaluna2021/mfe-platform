import type { Environment } from './environment.model';

/** 本機開發（default） */
export const environment: Environment = {
  envName: 'default',
  production: false,
  runtimeConfigFile: 'runtime-config.json',
  isMock: false,
};
