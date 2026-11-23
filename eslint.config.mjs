import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          // 微前端的依賴方向：Host 與 MFE 只能依賴共用 lib，彼此不能互相引用。
          // Nx 本來就禁止 import 應用程式，這裡再限制 lib 的種類。
          depConstraints: [
            {
              sourceTag: 'type:host',
              onlyDependOnLibsWithTags: ['type:shared'],
            },
            {
              sourceTag: 'type:mfe',
              onlyDependOnLibsWithTags: ['type:shared', 'type:mfe-runtime'],
            },
            {
              sourceTag: 'type:mfe-runtime',
              onlyDependOnLibsWithTags: ['type:shared'],
            },
            {
              sourceTag: 'type:shared',
              onlyDependOnLibsWithTags: ['type:shared'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
