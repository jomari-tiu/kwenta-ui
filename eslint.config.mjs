import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'eslint.config.mjs',
      'vite.config.ts',
      // One-shot node porting tools, outside the app tsconfig projects.
      'scripts/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  // v7 keeps the legacy shape at configs['recommended-latest']; the flat
  // config lives under configs.flat.
  reactHooks.configs.flat['recommended-latest'],
  reactRefresh.configs.vite,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // Rule group 1 — axios containment.
  // All HTTP goes through apiGet / useGet / useMutate so there is exactly one
  // place that knows about auth headers, base URL, and 401 handling.
  // ---------------------------------------------------------------------------
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/api.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'axios',
              message:
                'Import axios only inside lib/api.ts. Use apiGet / useGet / useMutate.',
            },
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // Rule group 2 — the timezone footgun. Highest-value rule in the project.
  //
  // `new Date("2026-08-22")` parses as UTC midnight, and
  // `.toISOString().slice(0,10)` converts to UTC before slicing. Both are off by
  // one day depending on the viewer's offset, and both LOOK CORRECT in the
  // timezone you wrote them in. This turns that runtime mystery into a
  // pre-commit error.
  // ---------------------------------------------------------------------------
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/date.ts', 'src/lib/date.test.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[property.name='toISOString']",
          message:
            'Off-by-one-day risk. Use toPlainDate() / todayPlainDate() from lib/date.',
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=1]",
          message:
            'Never parse a date string with new Date(). Use parsePlainDate() from lib/date.',
        },
        {
          selector: "MemberExpression[property.name='toLocaleDateString']",
          message: 'Use formatDisplayDate() from lib/date.',
        },
      ],
    },
  },


  // components/ui is vendored shadcn output. We keep it lint-clean-ish but do
  // not hand-maintain its internals, and the react-refresh boundary rule does
  // not apply to primitives that also export variant helpers.
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // ui/calendar renders its own captions; it is not app date logic.
      'no-restricted-syntax': 'off',
    },
  },


  // lib/format.ts formats *At INSTANTS, where new Date() is correct. Plain
  // dates still go through lib/date.ts, which the rule below enforces
  // everywhere else.
  {
    files: ['src/lib/format.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },

  // Tests may reach for whatever they need.
  {
    files: ['src/**/*.test.{ts,tsx}', 'vitest.setup.ts'],
    rules: {
      'no-restricted-syntax': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },

  prettierRecommended,
  { rules: { 'prettier/prettier': ['error', { endOfLine: 'auto' }] } },
);
