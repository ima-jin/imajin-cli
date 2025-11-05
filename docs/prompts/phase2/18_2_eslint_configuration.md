---
# Metadata
title: "18.2 ESLint Configuration"
created: "2025-11-04T09:00:00Z"
updated: "2025-11-04T09:00:00Z"
---

# 🔍 IMPLEMENT: ESLint Configuration (v9 Flat Config)

**Status:** ⏳ **PENDING**
**Phase:** 2 - Cleanup (Critical Priority #1)
**Estimated Time:** 2 hours
**Dependencies:** None (blocking console.log migration)
**Priority:** 🔴 **BLOCKER** - Must be first

---

## 📋 **CONTEXT**

**Current State:** ESLint v9.32.0 installed but no configuration file
**Error:** `ESLint couldn't find an eslint.config.(js|mjs|cjs) file`
**Target State:** Working ESLint v9 flat config with TypeScript support

**Why This is Critical:**
- Blocks all other code quality work
- Cannot enforce no-console rule for console.log migration
- Cannot catch TypeScript-specific issues
- No automated code quality checks in CI/CD

---

## 🎯 **ARCHITECTURAL VISION**

Create a **modern ESLint configuration** that:

1. **Enforces Code Quality** - TypeScript best practices, import rules, code style
2. **Blocks Regressions** - no-console rule catches new violations
3. **CLI-Optimized** - Rules appropriate for CLI applications (not web)
4. **Team-Friendly** - Clear error messages, auto-fixable where possible
5. **CI/CD Ready** - Fast, reliable, integrated into build pipeline

**Configuration Philosophy:**
- **Strict TypeScript rules** - Catch type issues ESLint can find
- **Import/export enforcement** - No circular dependencies
- **No console statements** - Except in entry point (src/index.ts)
- **CLI-appropriate** - No React/browser rules, focus on Node.js
- **Auto-fixable** - Prefer rules that can fix themselves

---

## 📦 **DELIVERABLES**

### Core Files:
1. ✅ `eslint.config.js` - Main ESLint v9 flat config
2. ✅ `.eslintignore` - Files/folders to exclude
3. ✅ `package.json` - Updated scripts
4. ✅ `.vscode/settings.json` - VSCode integration (optional)

### Configuration Features:
5. ✅ TypeScript support (@typescript-eslint/parser + plugin)
6. ✅ Import rules (eslint-plugin-import)
7. ✅ No-console enforcement (with exceptions)
8. ✅ CLI-appropriate rules (Node.js, not browser)
9. ✅ Auto-fix on save (optional)

---

## 🔧 **IMPLEMENTATION STEPS**

### Step 1: Install Required Dependencies (5 min)

```bash
npm install --save-dev \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  eslint-plugin-import \
  eslint-plugin-node \
  @types/eslint__js \
  typescript-eslint
```

**Packages Explained:**
- `@typescript-eslint/parser` - Parse TypeScript for ESLint
- `@typescript-eslint/eslint-plugin` - TypeScript-specific rules
- `eslint-plugin-import` - Import/export linting
- `eslint-plugin-node` - Node.js-specific rules
- `typescript-eslint` - TypeScript ESLint utilities

---

### Step 2: Create eslint.config.js (30 min)

```javascript
// eslint.config.js
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
  // Base recommended configs
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  // Global ignore patterns
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '*.config.js',
      '*.config.cjs',
      '*.config.mjs',
      'scripts/**',
    ],
  },

  // Main configuration for TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],

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
      // CRITICAL: No Console Rule
      // ============================================
      'no-console': ['error', {
        allow: ['error', 'warn'], // Allow only in specific cases
      }],

      // ============================================
      // TypeScript Rules
      // ============================================
      '@typescript-eslint/explicit-function-return-type': ['warn', {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
      }],
      '@typescript-eslint/no-explicit-any': 'warn', // Warn, not error (we have 277 instances)
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
      'node/no-process-exit': 'off',
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

  // Special config for entry point (allow console)
  {
    files: ['src/index.ts'],
    rules: {
      'no-console': 'off', // Allow console in entry point
    },
  },

  // Special config for test files
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/test/**/*.ts', '**/__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // More lenient in tests
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off', // Allow console in tests
    },
  },

  // Special config for examples
  {
    files: ['**/examples/**/*.ts', '**/*.example.ts'],
    rules: {
      'no-console': 'off', // Allow console in examples
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Special config for scripts
  {
    files: ['scripts/**/*.ts', 'scripts/**/*.js'],
    rules: {
      'no-console': 'off', // Allow console in scripts
      '@typescript-eslint/no-var-requires': 'off',
    },
  }
);
```

---

### Step 3: Create .eslintignore (5 min)

```bash
# .eslintignore

# Build output
dist/
build/
*.js.map
*.d.ts

# Dependencies
node_modules/

# Test coverage
coverage/
.nyc_output/

# Logs
*.log
npm-debug.log*

# Environment
.env
.env.*

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Generated files
src/generated/
__generated__/

# Config files (they use CommonJS)
*.config.js
*.config.cjs
jest.config.cjs
```

---

### Step 4: Update package.json Scripts (10 min)

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "lint:check": "eslint . --max-warnings 0",
    "type-check": "tsc --noEmit",
    "quality": "npm run lint:check && npm run type-check && npm test",
    "precommit": "npm run lint:fix && npm run type-check"
  }
}
```

**Script Purposes:**
- `lint` - Run ESLint, show all issues
- `lint:fix` - Auto-fix fixable issues
- `lint:check` - CI/CD strict mode (fail on any warnings)
- `type-check` - TypeScript compilation check (no output)
- `quality` - Full quality check (lint + types + tests)
- `precommit` - Pre-commit hook (optional with Husky)

---

### Step 5: VSCode Integration (Optional - 10 min)

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": [
    "javascript",
    "typescript"
  ],
  "eslint.workingDirectories": [
    {
      "mode": "auto"
    }
  ],
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.exclude": {
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules": true,
    "**/dist": true
  }
}
```

---

### Step 6: Test Configuration (30 min)

```bash
# 1. Test ESLint runs
npm run lint

# Expected: Many errors (console.log violations, etc.)
# This is GOOD - it means ESLint is working!

# 2. Test auto-fix
npm run lint:fix

# Expected: Some errors auto-fixed (imports, formatting)

# 3. Test specific files
npx eslint src/index.ts
npx eslint src/commands/TaskMigrationCommand.ts

# 4. Test ignore patterns work
npx eslint dist/ # Should skip
npx eslint node_modules/ # Should skip

# 5. Test type-check script
npm run type-check

# Expected: TypeScript errors shown
```

---

### Step 7: Document ESLint Rules (15 min)

Create `docs/eslint-rules.md`:

```markdown
# ESLint Configuration

## Enabled Rules

### Critical Rules
- **no-console**: Error (except in entry point, tests, examples)
  - Enforces logger usage
  - Allows `console.error` and `console.warn` in specific contexts

### TypeScript Rules
- **no-explicit-any**: Warn (we have 277 instances to fix gradually)
- **no-unused-vars**: Error (with _ prefix exception)
- **no-floating-promises**: Error (critical for async correctness)

### Import Rules
- **no-cycle**: Error (prevents circular dependencies)
- **import/extensions**: Require .js for ES modules

## Exceptions

### src/index.ts (Entry Point)
- Console allowed for unrecoverable errors
- Rationale: User needs feedback if app can't start

### Test Files
- More lenient any usage
- Console allowed for debugging
- Non-null assertions allowed

### Example Files
- Console allowed for demonstration
- Any usage allowed for simplicity

## Auto-Fix

These rules can be auto-fixed with `npm run lint:fix`:
- Import ordering
- Brace style
- Const vs let
- Arrow function formatting

## Adding Custom Rules

To add a new rule:
1. Add to `eslint.config.js` rules section
2. Test with `npm run lint`
3. Document in this file
4. Update team
```

---

## ✅ **SUCCESS CRITERIA**

### Configuration Working:
- [ ] `npm run lint` executes without errors (shows violations correctly)
- [ ] `npm run lint:fix` auto-fixes some issues
- [ ] `npm run type-check` runs TypeScript checks
- [ ] ESLint reports console.log violations (except allowed files)
- [ ] ESLint respects .eslintignore patterns

### Integration Working:
- [ ] VSCode shows ESLint errors inline (if configured)
- [ ] Auto-fix on save works (if configured)
- [ ] CI/CD can run linting
- [ ] Build pipeline includes linting

### Documentation Complete:
- [ ] ESLint rules documented
- [ ] Exception patterns documented
- [ ] Team knows how to use linting

---

## 🧪 **TESTING STRATEGY**

### Test 1: Verify ESLint Works
```bash
npm run lint 2>&1 | head -50
```
**Expected:** List of errors, many console.log violations

### Test 2: Verify Auto-Fix Works
```bash
# Create a test file with fixable issues
cat > test-file.ts << 'EOF'
let x = 1; // Should be const
const y = 2;
import {z} from './other.js'; // Should have spacing
EOF

npx eslint test-file.ts --fix
cat test-file.ts

# Expected: const x = 1; and import { z } spacing fixed
rm test-file.ts
```

### Test 3: Verify No-Console Rule
```bash
# Create test file with console.log
echo "console.log('test');" > test-console.ts
npx eslint test-console.ts

# Expected: Error about console.log usage
rm test-console.ts
```

### Test 4: Verify Entry Point Exception
```bash
npx eslint src/index.ts | grep -i console

# Expected: No console.log errors in index.ts
```

### Test 5: Verify Ignores Work
```bash
npx eslint dist/ 2>&1 | grep -i "no files"

# Expected: No files linted (ignored correctly)
```

---

## 📋 **CONFIGURATION CHECKLIST**

- [ ] Install dependencies (@typescript-eslint/*, eslint-plugin-*)
- [ ] Create `eslint.config.js` with TypeScript support
- [ ] Create `.eslintignore` with appropriate patterns
- [ ] Update `package.json` with lint scripts
- [ ] Create `.vscode/settings.json` (optional)
- [ ] Test `npm run lint` works
- [ ] Test `npm run lint:fix` works
- [ ] Test `npm run type-check` works
- [ ] Verify no-console rule catches violations
- [ ] Verify entry point exception works
- [ ] Verify test file exceptions work
- [ ] Document ESLint rules
- [ ] Commit configuration files

---

## 🔗 **INTEGRATION POINTS**

### Blocks:
- **Console.log Migration** (18_1) - Need no-console rule to prevent regressions
- **Code Quality Improvements** (18_4) - Need linting for quality enforcement

### Impacts:
- **CI/CD Pipeline** - Add `npm run lint:check` step
- **Pre-commit Hooks** - Optionally add Husky with lint-staged
- **Editor Integration** - VSCode/other editors can use ESLint
- **Team Workflow** - Auto-fix on save improves developer experience

---

## 📝 **IMPLEMENTATION NOTES**

### ESLint v9 Changes (From v8):
- **Flat config** - New `eslint.config.js` format (not .eslintrc.*)
- **Import syntax** - Uses ES modules
- **Plugin syntax** - Different plugin registration
- **Ignores** - Built into config, not separate file

### TypeScript-Specific Considerations:
- **Type-aware linting** - Requires tsconfig.json path
- **Performance** - Type-aware rules slower but more accurate
- **Project references** - May need adjustment for monorepos

### Common Issues and Solutions:

**Issue:** "Parsing error: Cannot find tsconfig.json"
**Solution:** Check `parserOptions.project` path is correct

**Issue:** "Warning: React version not specified"
**Solution:** This is fine, we don't use React

**Issue:** "Module not found: eslint-plugin-import"
**Solution:** Run `npm install --save-dev eslint-plugin-import`

**Issue:** Slow linting on large codebase
**Solution:** Use `eslint.config.js` ignores, consider caching

---

## 🚀 **NEXT STEPS**

After ESLint configuration is complete:
1. **Console.log Migration** (18_1) - Start immediately
2. **Test ESLint in CI/CD** - Add to GitHub Actions / CI pipeline
3. **Team Training** - Ensure team understands rules and exceptions
4. **Pre-commit Hooks** - Optional: Add Husky + lint-staged for auto-fix

### Optional Enhancements:
- **Prettier Integration** - Code formatting alongside linting
- **Husky + lint-staged** - Lint only changed files pre-commit
- **ESLint Cache** - Speed up linting with `--cache` flag
- **Custom Rules** - Project-specific rules as needed

---

## 📚 **REFERENCE**

- ESLint v9 Flat Config: https://eslint.org/docs/latest/use/configure/configuration-files-new
- TypeScript ESLint: https://typescript-eslint.io/
- Migration Guide: https://eslint.org/docs/latest/use/configure/migration-guide

---

**Status:** Ready for implementation
**Priority:** 🔴 Critical - DO THIS FIRST
**Estimated Duration:** 2 hours

---

*Part of Phase 2 Cleanup (Prompt 18)*
*Foundation for all other cleanup tasks*
