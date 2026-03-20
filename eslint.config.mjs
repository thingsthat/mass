import eslintJs from '@eslint/js';
import pluginTypescriptEslint from '@typescript-eslint/eslint-plugin';
import parserTs from '@typescript-eslint/parser';
import pluginImport from 'eslint-plugin-import';
import pluginNoOnlyTests from 'eslint-plugin-no-only-tests';
import prettier from 'eslint-plugin-prettier';
import pluginSonarjs from 'eslint-plugin-sonarjs';
import pluginUnicorn from 'eslint-plugin-unicorn';
import pluginVue from 'eslint-plugin-vue';
import pluginVueScopedCSS from 'eslint-plugin-vue-scoped-css';
import parserVue from 'vue-eslint-parser';

export default [
  {
    ignores: ['**/config/', '**/dist/', '**/node_modules/', '**/.output/', '**/data/'],
  },
  eslintJs.configs.recommended,
  {
    files: ['**/*.{js,ts,mjs,vue}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: parserVue,
      parserOptions: {
        parser: parserTs,
        extraFileExtensions: ['.vue'],
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
      noInlineConfig: false,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: ['tsconfig.json'],
          alwaysTryTypes: true,
        },
        node: {
          paths: ['src'],
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue'],
        },
      },
      'import/internal-regex': '^(src/|~/|@/)',
    },
    plugins: {
      '@typescript-eslint': pluginTypescriptEslint,
      import: pluginImport,
      sonarjs: pluginSonarjs,
      unicorn: pluginUnicorn,
      vue: pluginVue,
      'no-only-tests': pluginNoOnlyTests,
      prettier,
      'vue-scoped-css': pluginVueScopedCSS,
    },
    rules: {
      // TypeScript
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-use-before-define': ['error', { functions: false }],
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'as', objectLiteralTypeAssertions: 'allow-as-parameter' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          // Special case for defineEmits and defineProps in Vue
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-shadow': 'error',

      // Vue
      'vue/no-unused-components': 'error',
      'vue/no-v-html': 'off',
      'vue/require-component-is': 'error',
      'vue/require-default-prop': 'off',
      'vue/no-lone-template': 'error',
      'vue/one-component-per-file': 'off',
      'vue/v-on-style': 'error',
      'vue/attributes-order': 'error',
      'vue/attribute-hyphenation': ['error', 'always'],
      'vue/order-in-components': 'error',
      'vue/multi-word-component-names': 'off',
      'vue/no-ref-as-operand': 'error',
      'vue/v-slot-style': 'error',
      'vue/no-deprecated-slot-attribute': 'error',
      'vue/no-deprecated-filter': 'error',
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      'vue/match-component-file-name': [
        'error',
        {
          extensions: ['vue'],
          shouldMatchCase: true,
        },
      ],
      'vue/padding-line-between-blocks': ['error', 'always'],
      'vue/valid-define-props': 'error',
      'vue/valid-define-emits': 'error',
      'vue/valid-next-tick': 'error',

      // Import
      'import/no-duplicates': 'error',
      // Instead of completely banning relative imports, we'll prefer absolute imports
      'import/no-useless-path-segments': [
        'error',
        {
          noUselessIndex: true,
          commonjs: true,
        },
      ], // Prevent unnecessary path segments
      // Use a custom rule to only flag actual relative parent imports starting with ../
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*'],
              message:
                'Please use absolute imports (src/) instead of relative parent imports (../).',
            },
          ],
        },
      ],
      'import/order': [
        'error',
        {
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
          },
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          pathGroups: [
            {
              pattern: '#imports',
              group: 'internal',
              position: 'before',
            },
            {
              pattern: '~/**',
              group: 'internal',
              position: 'before',
            },
            {
              pattern: '@/**',
              group: 'internal',
              position: 'before',
            },
            {
              pattern: 'src/**',
              group: 'internal',
              position: 'before',
            },
          ],
        },
      ],

      // General
      'array-callback-return': 'warn',
      curly: ['error', 'all'],
      'no-console': 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
      'no-param-reassign': [
        'error',
        {
          props: true,
          ignorePropertyModificationsFor: ['state'],
          ignorePropertyModificationsForRegex: ['Ref$'],
        },
      ],
      'prettier/prettier': ['error', {}, { usePrettierrc: true }],
      'sonarjs/no-duplicate-string': 'off',
      'no-undef': 'off', // TypeScript handles this
      'no-unused-vars': 'off', // @typescript-eslint/no-unused-vars handles this
      // Prevent dynamic imports in function bodies - imports should be at the top
      // This catches await import(...) patterns but allows lazy loading like () => import(...)
      'no-restricted-syntax': [
        'error',
        {
          selector: 'AwaitExpression > CallExpression[callee.type="Import"]',
          message:
            'Dynamic imports should not be used in function bodies. Use static imports at the top of the file instead. For lazy loading routes/components, use () => import(...) pattern.',
        },
      ],
    },
  },
  // Vue Scoped CSS recommended config
  ...pluginVueScopedCSS.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    rules: {
      // Special rules for Vue files
      '@typescript-eslint/no-unused-vars': 'error', // Turn off for Vue files as it doesn't understand defineProps/defineEmits
      'no-unused-vars': 'off',
      // Override the recommended config which may set this to {}
      'vue-scoped-css/no-unused-selector': 'error',
      'vue-scoped-css/no-parsing-error': 'error',
      'vue-scoped-css/require-selector-used-inside': 'error',
    },
  },
  {
    files: ['*.spec.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-only-tests/no-only-tests': 'error',
    },
  },

  // Environment configurations
  {
    files: ['**/*'],
    languageOptions: {
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        HTMLElement: 'readonly',
        Element: 'readonly',
        NodeList: 'readonly',
        Event: 'readonly',
        // Node.js globals
        process: 'readonly',
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',

        // Vue globals
        ref: 'readonly',
        computed: 'readonly',
        reactive: 'readonly',
        onMounted: 'readonly',
        watch: 'readonly',
        nextTick: 'readonly',
        defineProps: 'readonly',
        defineEmits: 'readonly',
        defineExpose: 'readonly',
        withDefaults: 'readonly',
        // Timer functions
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Console
        console: 'readonly',
      },
    },
  },
];
