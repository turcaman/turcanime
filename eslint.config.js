/* eslint-disable no-undef */
// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // React Hooks - ensure dependencies are correct
      'react-hooks/exhaustive-deps': 'warn',

      // No duplicate imports
      'no-duplicate-imports': 'error',

      // No var
      'no-var': 'error',

      // Max depth - warn for deeply nested code
      'max-depth': ['warn', 5],

      // Max lines per function - increased limit for existing code
      'max-lines-per-function': ['warn', {
        max: 150,
        skipBlankLines: true,
        skipComments: true,
      }],

      // Strict TypeScript rules
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/no-confusing-void-expression': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
    },
  },
]);
