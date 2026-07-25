import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Ohne eslint-plugin-react zählt <Icon /> nicht als Verwendung von `Icon`.
      // Großgeschriebenes ist in dieser Codebasis eine Komponente — als Variable
      // (Import, const-Komponente) wie als Parameter (`{ icon: Icon }`).
      // ignoreRestSiblings deckt das bewusste Weglassen per Rest ab:
      // `({ billingDay, ...rest }) => rest`.
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^[A-Z_]',
        ignoreRestSiblings: true,
      }],
    },
  },
])
