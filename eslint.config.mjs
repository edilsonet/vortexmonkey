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
          depConstraints: [
            {
              // Aplicacoes orquestram as libs compartilhadas; nunca outras apps.
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'type:core',
                'type:shell',
                'type:ui',
                'type:contracts',
                'type:util',
              ],
            },
            {
              // Shell: quadro visual compartilhado sobre o nucleo e o DS.
              sourceTag: 'type:shell',
              onlyDependOnLibsWithTags: [
                'type:core',
                'type:ui',
                'type:contracts',
                'type:util',
              ],
            },
            {
              // Nucleo de acesso/estado do frontend: sem visual.
              sourceTag: 'type:core',
              onlyDependOnLibsWithTags: ['type:core', 'type:contracts', 'type:util'],
            },
            {
              // Design System: puramente visual, sobre contratos.
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:ui', 'type:contracts', 'type:util'],
            },
            {
              // Comportamento puro: sem I/O, sem UI.
              sourceTag: 'type:util',
              onlyDependOnLibsWithTags: ['type:util', 'type:contracts'],
            },
            {
              // Contratos sao a folha: nao dependem de nenhuma outra camada.
              sourceTag: 'type:contracts',
              onlyDependOnLibsWithTags: ['type:contracts'],
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
