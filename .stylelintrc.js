module.exports = {
  extends: ['stylelint-config-standard'],
  ignoreFiles: [
    'node_modules/**',
    'dist/**',
    'build/**',
    'coverage/**',
    '*.min.css',
  ],
  rules: {
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: ['config', 'source', 'theme', 'utility', 'variant'],
      },
    ],
  },
};
