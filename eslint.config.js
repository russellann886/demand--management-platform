const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const globals = require('globals');

module.exports = tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'client/src/api/gen/**',
      'server/**',
      'shared/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['client/src/main.tsx'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['worker/**/*.ts'],
    languageOptions: {
      globals: globals.worker,
    },
  },
);
