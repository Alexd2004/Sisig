module.exports = {
  extends: ['expo'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  env: {
    es2021: true,
  },
  rules: {
    'import/no-unresolved': 'off', // workspace packages resolve to unbuilt dist/ in CI; tsc covers resolution
    'no-console': 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      extends: ['expo', 'plugin:@typescript-eslint/recommended'],
      rules: {
        'import/no-unresolved': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      },
    },
  ],
};
