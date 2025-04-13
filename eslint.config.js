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
      '@/interface-name-prefix': 'off',
      '@/explicit-function-return-type': 'off',
      '@/explicit-module-boundary-types': 'off',
      '@/no-explicit-any': 'off',
      '@/no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
    ignores: ['eslint.config.js', 'dist/*'],
  },
];
