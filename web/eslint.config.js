import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  { settings: { react: { version: '19.1' } } },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  reactRefresh.configs.vite,
  prettier,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react/prop-types': 'off',
      'react/self-closing-comp': 'error',
      'react/jsx-no-useless-fragment': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['src/features/**/*-provider.tsx'],
    rules: {
      'react-refresh/only-export-components': [
        'error',
        {
          allowConstantExport: true,
          allowExportNames: ['useTheme', 'useFavorites', 'useCatalog'],
        },
      ],
    },
  },
);
