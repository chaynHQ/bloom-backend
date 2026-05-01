/* eslint-disable */
const eslintJs = require('@eslint/js');
const tsEslint = require('typescript-eslint');
const eslintPrettier = require('eslint-config-prettier');

module.exports = [
  eslintJs.configs.recommended,
  ...tsEslint.configs.recommended,
  eslintPrettier,
  {
    languageOptions: {
      globals: {
        process: true,
        console: true,
        require: true,
        jest: true,
      },
    },
    plugins: { tsEslint },
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
    ignores: ['eslint.config.js', 'dist/*'],
  },
];
