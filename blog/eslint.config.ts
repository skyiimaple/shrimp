import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import unicorn from 'eslint-plugin-unicorn'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
export default defineConfigWithVueTs(
  { files: ['**/*.{ts,vue}'] },
  globalIgnores(['dist/**', 'coverage/**']),
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      'vue/component-name-in-template-casing': [
        'error',
        'kebab-case',
        { registeredComponentsOnly: false },
      ],
      'vue/multi-word-component-names': 'off',
      'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
    },
  },
  {
    files: ['src/**/*.{ts,vue}'],
    ignores: ['src/components/ui/**'],
    plugins: { unicorn },
    rules: { 'unicorn/filename-case': ['error', { case: 'kebabCase' }] },
  },
  {
    files: ['src/components/ui/**'],
    rules: { 'vue/component-name-in-template-casing': 'off', 'vue/require-default-prop': 'off' },
  },
  skipFormatting,
)
