# Console.log Migration - Execution Guide

**Task:** 18.1 Console.log to Logger Migration
**Strategy:** Option B - Systematic Batch Migration (Approved)
**Status:** Ready to Execute
**Updated:** 2025-11-04

---

## Quick Start

### Pre-Execution Checklist
- [ ] Read `18_1_console_log_migration.md` for full context
- [ ] Verify logger infrastructure: `grep -r "class Logger" src/logging/`
- [ ] Ensure tests pass: `npm test` (baseline)
- [ ] Ensure build works: `npm run build` (baseline)

### Current State
- **Total violations:** 1,462 console statements across 77 files
- **Logger status:** ✅ Fully implemented and container-registered
- **Helper script:** `migrate-console-logs.js` available for infrastructure setup
- **Proof-of-concept:** 1 command migrated in ContentfulCommands.ts

---

## Batch 1: Services Layer (START HERE)

**Priority:** 🔴 CRITICAL
**Files:** 8 files, 323 console statements
**Estimated Time:** 6-8 hours
**Pattern:** Pure logger replacement (NO console.log allowed)

### Files in Order

1. **ContentfulCommands.ts** (205 statements) - 2.5 hours
   - Status: PARTIAL (1/205 complete, logger infrastructure added)
   - Action: Complete remaining 204 statements
   - Location: `src/services/contentful/commands/ContentfulCommands.ts`

2. **CustomerCommands.ts** (28 statements) - 30 mins
   - Location: `src/services/stripe/commands/CustomerCommands.ts`

3. **PaymentCommands.ts** (26 statements) - 30 mins
   - Location: `src/services/stripe/commands/PaymentCommands.ts`

4. **SubscriptionCommands.ts** (24 statements) - 30 mins
   - Location: `src/services/stripe/commands/SubscriptionCommands.ts`

5. **CatalogCommands.ts** (19 statements) - 20 mins
   - Location: `src/services/stripe/commands/CatalogCommands.ts`

6. **StripeServiceProvider.ts** (9 statements) - 15 mins
   - Location: `src/services/stripe/StripeServiceProvider.ts`

7. **CloudinaryServiceProvider.ts** (9 statements) - 15 mins
   - Location: `src/services/cloudinary/CloudinaryServiceProvider.ts`

8. **LocalFileServiceProvider.ts** (3 statements) - 10 mins
   - Location: `src/services/localfile/LocalFileServiceProvider.ts`

### Migration Pattern for Services

**CRITICAL RULE:** Services MUST NEVER console.log - use logger exclusively

```typescript
// Step 1: Add logger import (if not present)
import type { Logger } from '../../../logging/Logger.js';

// Step 2: Inject logger in constructor/function
// For classes:
export class MyService {
  private logger: Logger;

  constructor(container: Container) {
    this.logger = container.resolve<Logger>('logger');
  }
}

// For functions (like ContentfulCommands):
export function createContentfulCommands(): Command {
  // Get logger from container
  let logger: Logger | null = null;
  try {
    const container = globalThis.imajinApp?.container || new Container();
    logger = container.resolve<Logger>('logger');
  } catch (error) {
    // Logger not available yet, commands will handle gracefully
  }

  // Use logger?.method() throughout (safe navigation)
}

// Step 3: Replace ALL console statements
// ❌ REMOVE
console.log('Creating customer:', data);

// ✅ REPLACE with structured logging
logger?.debug('Creating Stripe customer', {
  email: data.email,
  metadata: data.metadata
});

// ✅ Log results
logger?.info('Stripe customer created', {
  customerId: customer.id,
  email: customer.email,
  created: customer.created
});

// ✅ Error logging with full context
catch (error) {
  logger?.error('Failed to create Stripe customer', error instanceof Error ? error : undefined, {
    error: error.message,
    code: error.code,
    type: error.type,
    input: data
  });
  throw error; // Re-throw for command layer to handle
}
```

### Per-File Workflow

For each file:

```bash
# 1. Check current violation count
grep -c "console\." src/path/to/file.ts

# 2. Read the file
# Understand the structure, identify console patterns

# 3. Add logger infrastructure if missing
# Import Logger type, inject from container

# 4. Replace console statements
# Use patterns above, ensure structured metadata

# 5. Verify zero console statements
grep -c "console\." src/path/to/file.ts  # Should be 0

# 6. Build and test
npm run build
npm test

# 7. Mark complete in 18_1_console_log_migration.md
# Change [ ] to [x] for the completed file
```

### Quality Gate (After Batch 1)

```bash
# Verify Services layer has zero console statements
grep -r "console\." src/services/ --include="*.ts" | wc -l
# Expected: 0

# Build must succeed
npm run build
# Expected: No errors

# Tests must pass (or fail for unrelated reasons)
npm test
# Check that Services tests still pass

# Git commit batch
git add src/services/
git commit -m "feat: Migrate Services layer to Winston logger (Batch 1)

- Migrate 8 service files (323 console statements eliminated)
- All services now use structured logging with metadata
- Services no longer output to console directly
- Logger injected via container pattern

Part of Phase 2 Cleanup: Pre-Launch Rule #1 Compliance
Task: 18.1 Console.log Migration - Batch 1 Complete"
```

---

## Batch 2: Commands Layer (AFTER Batch 1)

**Priority:** 🔴 CRITICAL
**Files:** 18 files, 590 console statements
**Estimated Time:** 10-12 hours
**Pattern:** Dual logging (console for users + logger for system)

### Migration Pattern for Commands

**CRITICAL RULE:** Commands KEEP user-facing console output with chalk, ADD parallel logger

**⚠️ IMPORTANT: DO NOT REMOVE CHALK CONSOLE OUTPUT!**
The logger is for **system/debug logging**, not user-facing CLI output.
Commands need BOTH console (for users) AND logger (for debugging/monitoring).

```typescript
// ✅ CORRECT PATTERN - Dual logging (KEEP console.log with chalk!)
async execute(options: Options): Promise<void> {
  const spinner = ora('Processing...').start();

  // System logging (structured) - ADD THIS
  this.logger.debug('Command started', {
    command: 'my:command',
    options,
    user: process.env.USER
  });

  try {
    const result = await this.service.doWork(options);

    // User sees this (CLI output) - KEEP THIS!
    spinner.succeed('Done!');
    console.log(chalk.green('✅ Success!'));
    console.log(chalk.cyan(`  Result ID: ${result.id}`));
    console.log(chalk.gray(`  Duration: ${duration}ms`));

    // System logs this (structured logging) - ADD THIS
    this.logger.info('Command completed successfully', {
      command: 'my:command',
      duration: Date.now() - startTime,
      resultId: result.id
    });
  } catch (error) {
    // User sees this (CLI output) - KEEP THIS!
    spinner.fail('Failed!');
    console.error(chalk.red('❌ Error:'), error.message);

    // System logs this (structured logging) - ADD THIS
    this.logger.error('Command failed', error, {
      command: 'my:command',
      error: error.message,
      stack: error.stack,
      options
    });

    process.exit(1);
  }
}
```

**What to KEEP in Commands:**
- ✅ `console.log(chalk.green(...))` - User-facing success messages
- ✅ `console.log(chalk.cyan(...))` - User-facing info display
- ✅ `console.log(chalk.gray(...))` - User-facing details
- ✅ `console.error(chalk.red(...))` - User-facing error messages
- ✅ `console.log(chalk.yellow(...))` - User-facing warnings
- ✅ Any formatted output users see

**What to REMOVE/REPLACE in Commands:**
- ❌ `console.log('Debug:', data)` → `this.logger.debug('...', { data })`
- ❌ `console.log('Processing...')` → `this.logger.info('...', { ... })`
- ❌ Plain console.log without chalk → logger equivalent

**What to ADD in Commands:**
- ✅ `logger.debug()` for command start/options
- ✅ `logger.info()` for successful operations with metadata
- ✅ `logger.error()` for errors with full context
```

### Sub-Batches

Break Commands into 4 sub-batches, test UX after each:

**2A: Business Context Commands** (3-4 hours)
- BusinessContextCommands.ts (107)
- SchemaCommands.ts (54)
- ContextCommands.ts (48)

**2B: Task Management Commands** (3-4 hours)
- TaskManagementCommands.ts (59)
- TaskMigrationCommand.ts (49)
- StatusCommand.ts (24)

**2C: Service Commands** (2-3 hours)
- MediaCommand.ts (30)
- MediaUploadCommand.ts (18)
- CreateCustomerCommand.ts (13)
- CreatePaymentCommand.ts (15)

**2D: Remaining Commands** (2-3 hours)
- AuthCommands.ts (51)
- CommandLimiterCommands.ts (34)
- WebhookListCommand.ts (16)
- WebhookTestCommand.ts (15)
- ETLCommand.ts (18)
- GraphCommand.ts (13)
- MarkdownCommand.ts (17)
- RecipeCommands.ts (9)

---

## Batch 3: Core Components

**Priority:** 🟡 MEDIUM
**Files:** 9 files, 133 console statements
**Estimated Time:** 3-5 hours
**Pattern:** Mixed (depends on component)

**Special Attention:**
- `Application.ts` (60) - Startup messages, keep some user-facing
- `ErrorHandler.ts` (20) - Error output, careful with UX

---

## Batch 4: Providers

**Priority:** 🟢 LOW
**Files:** 5 files, 49 console statements
**Estimated Time:** 1-2 hours
**Pattern:** Pure logger (registration/boot logging)

---

## Batch 5: Context/Discovery/Other

**Priority:** 🟢 LOW
**Remaining files**
**Estimated Time:** 2-3 hours

---

## Final Verification

After ALL batches complete:

```bash
# 1. Zero console statements (except index.ts)
grep -r "console\." src/ --include="*.ts" | grep -v "src/index.ts" | grep -v "test\."
# Expected: No results

# 2. Build succeeds
npm run build

# 3. Type check passes
npm run type-check

# 4. All tests pass (or known failures documented)
npm test

# 5. CLI smoke tests
npm run cli -- --help
npm run cli -- stripe customer list --help
DEBUG=true npm run cli -- stripe customer list

# 6. Verify structured logging works
DEBUG=true LOG_LEVEL=debug npm run cli -- [command]
# Should see JSON-structured logs in debug mode

# 7. Update ESLint (18_2) to enforce no-console
# Add rule to .eslintrc
```

---

## Troubleshooting

### Build Errors After Migration

**Issue:** TypeScript errors about logger type
**Fix:** Ensure Logger import: `import type { Logger } from '...';`

**Issue:** Container resolution errors
**Fix:** Use safe navigation: `logger?.info()` or check if logger exists

### Tests Failing After Migration

**Issue:** Tests expect console output
**Fix:** Mock logger in tests or update test expectations

### CLI Output Broken

**Issue:** User-facing messages missing
**Fix:** Commands MUST keep console.log for user output, only ADD logger

---

## Tips for Success

1. **Work in small batches** - One file at a time, test each
2. **Commit frequently** - Each file or small group, easy to revert
3. **Test thoroughly** - Run CLI commands to verify UX preserved
4. **Use structured metadata** - Include operation, IDs, context
5. **Follow the patterns** - Services = pure logger, Commands = dual logging
6. **Read the migration spec** - 18_1_console_log_migration.md has examples

---

## Progress Tracking

Update `18_1_console_log_migration.md` checklists as you complete files:
- Change `⏳` to `✅` for completed files
- Update "Status" at top of document
- Document any issues encountered
- Note time taken for estimates accuracy

---

**Remember:** Quality over speed. This is Pre-Launch Rule #1 compliance. Take time to do it right.

**Questions?** Review Dr. Clean analysis in 18_1_console_log_migration.md or ask for clarification.
