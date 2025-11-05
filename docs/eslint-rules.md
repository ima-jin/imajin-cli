# ESLint Configuration

**Version:** ESLint v9 (Flat Config)
**Last Updated:** 2025-11-05
**Config File:** `eslint.config.js`

---

## Overview

imajin-cli uses ESLint v9 with TypeScript support to enforce code quality and prevent common issues. The configuration is specifically tailored for CLI applications where console output is part of the user interface.

---

## Enabled Rules

### Critical Rules

#### no-console (Context-Aware)
**Default:** OFF globally
**Enforced:** ERROR in service layer only

**Rationale:** For CLI applications, console.log is the user interface in commands. Only internal services/providers should be console-free.

**Allowed Locations:**
- ✅ `src/commands/**` - User-facing CLI output with chalk
- ✅ `src/index.ts` - Fatal startup errors
- ✅ Tests, examples, scripts

**Prohibited Locations:**
- ❌ `src/services/**/*.ts` (excluding `**/commands/**`)
- ❌ `src/providers/**`
- ❌ `src/middleware/**`
- ❌ `src/etl/**`
- ❌ `src/jobs/**`
- ❌ `src/schemas/**`
- ❌ `src/repositories/**`

---

### TypeScript Rules

#### @typescript-eslint/no-explicit-any
**Level:** WARN
**Why:** We have many existing `any` instances. Gradually fixing.

#### @typescript-eslint/no-unused-vars
**Level:** ERROR
**Exception:** Variables/args starting with `_` are allowed

#### @typescript-eslint/no-floating-promises
**Level:** ERROR
**Critical for async correctness**

#### @typescript-eslint/await-thenable
**Level:** ERROR
**Prevents awaiting non-promises**

#### @typescript-eslint/no-misused-promises
**Level:** ERROR
**Prevents promise misuse in conditions**

#### @typescript-eslint/require-await
**Level:** WARN
**Flags async functions with no await**

---

### Import Rules

#### import/no-cycle
**Level:** ERROR
**Prevents circular dependencies**

#### import/extensions
**Level:** ERROR
**Requirements:**
- TypeScript files: No extensions (`.ts` → imports as `.js` after build)
- JavaScript imports: Always include `.js` extension (ES modules)

#### import/order
**Level:** ERROR
**Enforces alphabetical import ordering by category:**
1. Built-in modules (`fs`, `path`)
2. External modules (`commander`, `chalk`)
3. Internal modules (`@/...`)
4. Parent imports (`../`)
5. Sibling imports (`./`)
6. Index imports (`./index.js`)

---

### Code Quality Rules

- `no-var`: ERROR - Use `const`/`let` instead
- `prefer-const`: ERROR - Use const when variable isn't reassigned
- `eqeqeq`: ERROR - Always use `===` and `!==`
- `curly`: ERROR - Always use braces with control statements
- `brace-style`: ERROR - Enforce 1tbs brace style
- `no-throw-literal`: ERROR - Only throw Error instances

---

### CLI-Specific Rules

- `no-process-exit`: OFF - CLI apps need `process.exit()`

---

## File-Specific Configurations

### JavaScript Files
**Pattern:** `**/*.js`, `**/*.mjs`, `**/*.cjs`
**Rules:** Basic linting only, no TypeScript type-checking
**no-console:** OFF (build scripts, config files)

### TypeScript Files
**Pattern:** `**/*.ts`, `**/*.tsx`
**Rules:** Full TypeScript + import + quality rules
**no-console:** OFF by default, enforced in service layer

### Test Files
**Pattern:** `**/*.test.ts`, `**/*.spec.ts`, `**/test/**`, `**/__tests__/**`
**Special Rules:**
- `no-console`: OFF
- `@typescript-eslint/no-explicit-any`: OFF (tests can be lenient)
- `@typescript-eslint/no-non-null-assertion`: OFF

### Example Files
**Pattern:** `**/examples/**/*.ts`, `**/*.example.ts`
**Special Rules:**
- `no-console`: OFF (demonstrations need output)
- `@typescript-eslint/no-explicit-any`: OFF (clarity over strictness)

### Scripts
**Pattern:** `scripts/**/*.ts`
**Special Rules:**
- `no-console`: OFF (tooling output)

---

## Auto-Fixable Rules

These rules can be automatically fixed with `npm run lint:fix`:

- Import ordering (`import/order`)
- Brace style (`brace-style`)
- `const` vs `let` (`prefer-const`)
- Arrow function formatting (`prefer-arrow-callback`)
- Import extensions (`import/extensions`)

---

## Usage

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix

# Strict mode (CI/CD - fail on warnings)
npm run lint:check

# TypeScript type checking
npm run type-check

# Full quality check (lint + types + tests)
npm run quality
```

---

## Common Issues and Solutions

### Issue: "Resolve error: typescript with invalid interface"
**Cause:** Import plugin configuration issue
**Solution:** Usually harmless, imports still work. Can ignore.

### Issue: Import order violations
**Fix:** Run `npm run lint:fix` - auto-fixed

### Issue: "Unsafe assignment of any value"
**Fix:** Add proper types instead of `any`
```typescript
// Bad
const data: any = await service.fetch();

// Good
interface ResponseData { id: string; name: string; }
const data: ResponseData = await service.fetch();
```

### Issue: "No console statements" in service files
**Why:** Services should use logger, not console
**Fix:**
```typescript
// Bad (in service)
console.log('Processing item:', item);

// Good (in service)
this.logger.debug('Processing item', { itemId: item.id });
```

---

## Ignored Files

The following are automatically ignored:
- `dist/**` - Build output
- `node_modules/**` - Dependencies
- `coverage/**` - Test coverage reports
- `*.config.js` - Config files (use CommonJS)
- `jest.config.*.js` - Jest configs
- `scripts/**` - Except TypeScript scripts
- `__generated__/**` - Generated code

---

## Philosophy

1. **CLI-Appropriate:** Console.log is the UI in commands - don't ban it everywhere
2. **Type Safety:** Strict TypeScript rules catch issues early
3. **Maintainability:** Prevent circular dependencies and enforce consistency
4. **Auto-Fixable:** Prefer rules that can fix themselves
5. **Pragmatic:** Warn on `any` instead of error (gradual improvement)

---

## Adding Custom Rules

To add a new rule:

1. Edit `eslint.config.js`
2. Add rule to appropriate section
3. Test with `npm run lint`
4. Document in this file
5. Update team

---

## CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Lint
  run: npm run lint:check

- name: Type Check
  run: npm run type-check
```

---

**References:**
- ESLint v9 Docs: https://eslint.org/docs/latest/
- TypeScript ESLint: https://typescript-eslint.io/
- Migration Guide: https://eslint.org/docs/latest/use/configure/migration-guide
