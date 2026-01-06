module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
    es2022: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/', 'node_modules/', '**/*.test.ts', '**/*.spec.ts', 'coverage/'],
  rules: {
    // Basic ESLint rules
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-case-declarations': 'off', // Will be replaced with better switch handling
    'no-control-regex': 'warn',
    'no-undef': 'off', // TypeScript handles this
    'no-unused-vars': 'off', // Use TypeScript version
    'eqeqeq': ['error', 'always', { null: 'ignore' }],
    'no-duplicate-imports': 'error',
    'no-template-curly-in-string': 'warn',
    'prefer-template': 'warn',
    'no-return-await': 'error',
    'require-await': 'off', // TypeScript version is better
    
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    }],
    '@typescript-eslint/no-var-requires': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    
    // Code quality
    'complexity': ['warn', 15],
    'max-depth': ['warn', 4],
    'max-lines-per-function': ['warn', { max: 150, skipBlankLines: true, skipComments: true }],
    'max-params': ['warn', 5],
  },
};
