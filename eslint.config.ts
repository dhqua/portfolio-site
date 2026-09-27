import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores([
    '**/node_modules/',
    '**/dist/',
    '**/out/',
    '**/.next/',
    '**/cdk.out/',
    '**/coverage/',
    '**/next-env.d.ts',
  ]),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-syntax': [
        'error',
        { selector: 'ExportDefaultDeclaration', message: 'Use named exports.' },
        {
          selector: "ExportSpecifier[exported.name='default']",
          message: 'Use named exports.',
        },
      ],
    },
  },
  {
    // Tooling configs and Next.js route files must use default exports.
    files: ['**/*.config.ts', 'apps/web/src/app/**/{page,layout,not-found}.tsx'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  prettier,
);
