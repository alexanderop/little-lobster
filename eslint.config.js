import vue from 'eslint-plugin-vue';
import ts from 'typescript-eslint';

export default [
  ...vue.configs['flat/essential'],
  {
    files: ['src/**/*.vue'],
    languageOptions: { parserOptions: { parser: ts.parser } },
    rules: { 'vue/multi-word-component-names': 'off' },
  },
];
