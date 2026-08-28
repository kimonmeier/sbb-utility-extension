import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

const noParentImports = {
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          group: ['../*'],
          message: 'Use a path alias ($lib/*, $background/*, @/*) instead of a relative parent import.'
        }
      ]
    }
  ]
};

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'src/paraglide/**']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions
      }
    }
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser
      }
    }
  },
  {
    files: ['**/*.{ts,js,svelte}'],
    rules: noParentImports
  },
  prettier
);
