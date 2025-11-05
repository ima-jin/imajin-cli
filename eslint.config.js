// eslint.config.js - ESLint v9 Flat Config for imajin-cli
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
  // Base recommended config (applies to all files)
  eslint.configs.recommended,

  // Global ignore patterns
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '*.config.js',
      '*.config.cjs',
      '*.config.mjs',
      'jest.config.*.js',
      'scripts/**',
      '__generated__/**',
      '.eslintignore',
      '*.js', // Ignore all root-level .js files
      '!eslint.config.js', // But don't ignore our eslint config
    ],
  },

  // Configuration for JavaScript files (minimal linting, no type checking)
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    rules: {
      'no-console': 'off',
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },

  // Main configuration for TypeScript files with type checking
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
    ],

    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        // Node.js globals
        NodeJS: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },

    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'import': importPlugin,
    },

    rules: {
      // ============================================
      // CONSOLE RULE - CLI-APPROPRIATE
      // ============================================
      // For CLI applications, console.log with chalk formatting is the UI
      // We only warn about console in non-command files where logger should be used
      'no-console': 'off', // Disabled globally, enforced selectively below

      // ============================================
      // TypeScript Rules
      // ============================================
      '@typescript-eslint/explicit-function-return-type': ['warn', {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
      }],
      '@typescript-eslint/no-explicit-any': 'warn', // Warn, not error (we have many instances)
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/require-await': 'warn',

      // ============================================
      // Import Rules
      // ============================================
      'import/no-cycle': 'error', // Prevent circular dependencies
      'import/no-unresolved': 'off', // TypeScript handles this
      'import/extensions': ['error', 'ignorePackages', {
        'ts': 'never',
        'tsx': 'never',
        'js': 'always', // ES modules require .js extension
      }],
      'import/order': ['error', {
        'groups': [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'never',
        'alphabetize': {
          'order': 'asc',
          'caseInsensitive': true,
        },
      }],

      // ============================================
      // Code Quality Rules
      // ============================================
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'warn',
      'no-throw-literal': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'brace-style': ['error', '1tbs'],

      // ============================================
      // CLI-Specific Rules
      // ============================================
      'no-process-exit': 'off', // CLI apps need process.exit
    },

    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
    },
  },

  // Strict no-console for service layer (should only use logger)
  {
    files: [
      'src/services/**/*.ts',
      'src/providers/**/*.ts',
      'src/middleware/**/*.ts',
      'src/schemas/**/*.ts',
      'src/jobs/**/*.ts',
      'src/media/**/*.ts',
      'src/etl/**/*.ts',
      'src/repositories/**/*.ts',
      'src/logging/**/*.ts',
    ],
    ignores: [
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/commands/**/*.ts', // Service command files are CLI outputs
      '**/examples/**/*.ts',
    ],
    rules: {
      'no-console': 'error', // Strict: Services should never console.log
    },
  },

  // Special config for entry point (allow console for fatal errors)
  {
    files: ['src/index.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  // Special config for test files
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/test/**/*.ts', '**/__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
    },
  },

  // Special config for examples (demonstration code)
  {
    files: ['**/examples/**/*.ts', '**/*.example.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Special config for scripts (build/tooling)
  {
    files: ['scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-var-requires': 'off',
    },
  }
);
