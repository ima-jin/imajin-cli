---
# Metadata
title: "18.1 Console.log Migration"
created: "2025-11-04T09:00:00Z"
updated: "2025-11-04T18:30:00Z"
---

# 🔊 IMPLEMENT: Console.log to Logger Migration

**Status:** 🔄 **IN PROGRESS** - Systematic Batch Migration (Option B)
**Phase:** 2 - Cleanup (Critical Priority #2)
**Estimated Time:** 20-24 hours (revised from analysis)
**Dependencies:** ESLint configuration (18_2)
**Priority:** 🔴 **BLOCKER** - Pre-Launch Rule #1 Violation

**Execution Strategy:** Option B - Systematic Batch Migration (Slower, Safer)
**Progress:** Initial analysis complete, migration patterns established

---

## 📋 **CONTEXT**

**Current State (VERIFIED 2025-11-04):** 1,462 `console.log/error/warn` statements across 77 production files (excluding tests)
**Target State:** 0 console statements, 100% Winston logger usage (except src/index.ts fatal errors)
**Pre-Launch Rule Violated:**
> ❌ **No console.log/error/warn anywhere** - Use `logger` utility exclusively (from Winston logging system)

**Infrastructure Status:**
✅ **Winston Logger implemented** - `src/logging/Logger.ts` with debug/info/warn/error methods
✅ **Container registration verified** - Logger available via `container.resolve<Logger>('logger')`
✅ **Migration helper created** - `migrate-console-logs.js` for automated setup

**Impact of Current State:**
- Cannot control log levels in production
- No structured logging for monitoring/alerting
- Cannot redirect logs to external services
- Breaks Winston logging system integration
- Performance impact from uncontrolled console output

---

## 🎯 **ARCHITECTURAL VISION**

Migrate to **structured logging** with Winston for:

1. **Log Level Control** - Debug/info/warn/error levels configurable at runtime
2. **Structured Data** - JSON metadata for monitoring and analysis
3. **Multiple Transports** - Console, file, external services (DataDog, CloudWatch, etc.)
4. **Performance** - Conditional logging based on level
5. **Professional CLI** - User-friendly formatted output vs. debug logs

**Logging Philosophy:**
- **User messages:** Chalk-formatted, friendly, actionable
- **Debug logs:** Structured, machine-readable, comprehensive
- **Error logs:** Include context for debugging and alerting
- **Audit logs:** Track important operations for compliance

---

## 📊 **MIGRATION BREAKDOWN**

### Violation Distribution:
| Category | Files | Occurrences | Priority |
|----------|-------|-------------|----------|
| Commands | 18 | 590 | 🔴 **HIGH** |
| Services | 8 | 323 | 🔴 **HIGH** |
| Core | 9 | 133 | 🟡 Medium |
| Providers | 5 | 49 | 🟢 Low |
| **TOTAL** | **77** | **1,095** | |

### Top 10 Worst Offenders:
1. `src/services/contentful/commands/ContentfulCommands.ts` - 205 violations
2. `src/commands/generated/BusinessContextCommands.ts` - 107 violations
3. `src/commands/TaskManagementCommands.ts` - 59 violations
4. `src/commands/schema/SchemaCommands.ts` - 54 violations
5. `src/commands/TaskMigrationCommand.ts` - 49 violations
6. `src/providers/ServiceLayerProvider.ts` - 37 violations
7. `src/commands/ContextCommands.ts` - 48 violations
8. `src/services/stripe/commands/CustomerCommands.ts` - 28 violations
9. `src/services/stripe/commands/PaymentCommands.ts` - 26 violations
10. `src/services/stripe/commands/SubscriptionCommands.ts` - 24 violations

---

## 🔧 **IMPLEMENTATION STRATEGY - OPTION B (APPROVED)**

**Decision Date:** 2025-11-04
**Approach:** Systematic Batch Migration (Slower, Safer)
**Rationale:** Preserve user experience, ensure quality, minimize regression risk

---

### ⚠️ **CRITICAL: Understanding Console vs Logger in CLI Context**

**This is NOT a simple find/replace migration!** The distinction between user-facing output and system logging is critical:

**Two Types of Console Statements:**

1. **User-Facing CLI Output (KEEP IT!):**
   ```typescript
   // ✅ KEEP - Users see this when running commands
   console.log(chalk.green('✅ Customer created successfully'));
   console.log(chalk.cyan(`  ID: ${customer.id}`));
   console.log(chalk.gray(`  Email: ${customer.email}`));
   console.error(chalk.red('❌ Failed to create customer'));
   ```
   - Uses chalk formatting (colors, emojis)
   - Part of the CLI interface users expect
   - Makes up ~70% of Command layer console statements
   - **MUST be preserved** for CLI UX

2. **Debug/Internal Logging (REPLACE with logger):**
   ```typescript
   // ❌ REMOVE - Internal debugging
   console.log('Debug: processing items:', items);
   console.log('API response:', response);
   console.error('Error details:', error);
   ```
   - Plain text, no chalk formatting
   - Internal debugging information
   - Should use structured logger instead
   - **SHOULD be replaced** with logger

**Winston Logger Purpose:**
- System/debug logging with structured metadata
- Log levels (debug/info/warn/error)
- JSON structured output for monitoring
- NOT a replacement for user-facing CLI output
- Has its own colorization (incompatible with chalk)

**Migration Strategy:**
- **Services:** Replace ALL console (no user-facing output)
- **Commands:** KEEP chalk console + ADD parallel logger
- **Core:** Mixed (depends on purpose)

**Example - Correct Command Migration:**
```typescript
// BEFORE (only console)
try {
  const customer = await service.createCustomer(data);
  console.log(chalk.green('✅ Customer created'));
  console.log(chalk.cyan(`  ID: ${customer.id}`));
} catch (error) {
  console.error(chalk.red('❌ Failed:'), error.message);
}

// AFTER (dual logging - console + logger)
try {
  this.logger.debug('Creating customer', { email: data.email }); // ADD
  const customer = await service.createCustomer(data);

  // User sees this (KEEP)
  console.log(chalk.green('✅ Customer created'));
  console.log(chalk.cyan(`  ID: ${customer.id}`));

  // System logs this (ADD)
  this.logger.info('Customer created', {
    customerId: customer.id,
    email: customer.email
  });
} catch (error) {
  // User sees this (KEEP)
  console.error(chalk.red('❌ Failed:'), error.message);

  // System logs this (ADD)
  this.logger.error('Customer creation failed', error, {
    input: data
  });
}
```

**Revised Violation Estimates:**
- **Services (323):** ~100% need replacement (no user output)
- **Commands (590):** ~30% need replacement, ~70% need parallel logger added
- **Core (133):** ~50% need replacement, ~50% mixed
- **Providers (49):** ~100% need replacement (no user output)

**Actual Console Statements to REMOVE: ~500-600 (not 1,462)**
**Console Statements to KEEP with logger ADDED: ~800-900**

---

### Execution Plan Overview

**Batch 1: Services Layer (PRIORITY 1) - 6-8 hours**
- 8 files, 323 occurrences
- Pure internal logic, NO user-facing output
- Safe for aggressive find/replace with verification
- Test after each file

**Batch 2: Commands Layer (PRIORITY 1) - 10-12 hours**
- 18 files, 590 occurrences
- User-facing output MUST be preserved with chalk
- Add parallel structured logging
- Manual/semi-automated approach
- Test CLI UX after each batch of 3-5 files

**Batch 3: Core Components (PRIORITY 2) - 3-5 hours**
- 9 files, 133 occurrences
- Mixed approach based on component purpose
- Application.ts requires careful handling (startup messages)
- Test after each file

**Batch 4: Providers (PRIORITY 3) - 1-2 hours**
- 5 files, 49 occurrences
- Registration and initialization logging
- Straightforward migration

**Batch 5: Context/Discovery/Other (PRIORITY 3) - 2-3 hours**
- Remaining files
- Various patterns

**Total Estimated Time:** 22-30 hours over 5-7 days

---

## 📊 **DETAILED BATCH BREAKDOWN**

### BATCH 1: Services Layer (START HERE)
**Priority:** 🔴 **CRITICAL** - Pure business logic, should NEVER console.log
**Estimated Time:** 6-8 hours
**Testing Required:** Unit tests + build verification after each file

#### Files in Order:
1. ✅ `src/services/contentful/commands/ContentfulCommands.ts` (205) - **PARTIAL** (1/205 complete)
2. ⏳ `src/services/stripe/commands/CustomerCommands.ts` (28)
3. ⏳ `src/services/stripe/commands/PaymentCommands.ts` (26)
4. ⏳ `src/services/stripe/commands/SubscriptionCommands.ts` (24)
5. ⏳ `src/services/stripe/commands/CatalogCommands.ts` (19)
6. ⏳ `src/services/stripe/StripeServiceProvider.ts` (9)
7. ⏳ `src/services/cloudinary/CloudinaryServiceProvider.ts` (9)
8. ⏳ `src/services/localfile/LocalFileServiceProvider.ts` (3)

**Migration Pattern for Services (STRICT):**
```typescript
// ❌ REMOVE ALL console statements entirely
console.log('Creating customer:', data);

// ✅ REPLACE with structured logging
this.logger.debug('Creating Stripe customer', {
  email: data.email,
  metadata: data.metadata
});

// ✅ Log results with metadata
this.logger.info('Stripe customer created', {
  customerId: customer.id,
  email: customer.email,
  created: customer.created
});

// ✅ Error logging with full context
this.logger.error('Failed to create Stripe customer', {
  error: error.message,
  code: error.code,
  type: error.type,
  input: data
});
```

**Services MUST:**
- Inject logger: `this.logger = container.resolve<Logger>('logger');`
- NEVER output to console directly
- Use structured metadata for all logs
- Log at appropriate levels (debug/info/warn/error)
- Include operation context (service, operation, entity IDs)

---

### BATCH 2: Commands Layer (AFTER Batch 1)
**Priority:** 🔴 **CRITICAL** - User-facing, preserve UX
**Estimated Time:** 10-12 hours
**Testing Required:** CLI smoke tests + UX verification after each sub-batch

#### Sub-Batch 2A: Business Context Commands (3-4 hours)
1. ⏳ `src/commands/generated/BusinessContextCommands.ts` (107)
2. ⏳ `src/commands/schema/SchemaCommands.ts` (54)
3. ⏳ `src/commands/ContextCommands.ts` (48)

#### Sub-Batch 2B: Task Management Commands (3-4 hours)
4. ⏳ `src/commands/TaskManagementCommands.ts` (59)
5. ⏳ `src/commands/TaskMigrationCommand.ts` (49)
6. ⏳ `src/commands/StatusCommand.ts` (24)

#### Sub-Batch 2C: Service Commands (2-3 hours)
7. ⏳ `src/commands/media/MediaCommand.ts` (30)
8. ⏳ `src/commands/media/MediaUploadCommand.ts` (18)
9. ⏳ `src/commands/stripe/CreateCustomerCommand.ts` (13)
10. ⏳ `src/commands/stripe/CreatePaymentCommand.ts` (15)

#### Sub-Batch 2D: Remaining Commands (2-3 hours)
11. ⏳ `src/commands/auth/AuthCommands.ts` (51)
12. ⏳ `src/commands/system/CommandLimiterCommands.ts` (34)
13. ⏳ `src/commands/webhook/WebhookListCommand.ts` (16)
14. ⏳ `src/commands/webhook/WebhookTestCommand.ts` (15)
15. ⏳ `src/commands/etl/ETLCommand.ts` (18)
16. ⏳ `src/commands/etl/GraphCommand.ts` (13)
17. ⏳ `src/commands/MarkdownCommand.ts` (17)
18. ⏳ `src/commands/generated/RecipeCommands.ts` (9)

**Migration Pattern for Commands:**
```typescript
// ❌ BEFORE - Direct console output
console.log('✅ Customer created successfully');
console.error('❌ Failed to create customer:', error);

// ✅ AFTER - User output + structured logging
import chalk from 'chalk';

// User-friendly output (still goes to console for CLI)
console.log(chalk.green('✅ Customer created successfully'));

// Structured debug logging
this.logger.info('Customer created', {
  customerId: customer.id,
  email: customer.email,
  command: 'stripe:customer:create'
});

// Error logging with context
this.logger.error('Failed to create customer', {
  error: error.message,
  stack: error.stack,
  command: 'stripe:customer:create',
  input: options
});
```

**Special Case: Interactive Commands**
Commands with progress bars, spinners, prompts should keep console output for UX but add background logging:

```typescript
import ora from 'ora';

// ✅ User-facing spinner
const spinner = ora('Creating customer...').start();

// ✅ Structured logging in parallel
this.logger.debug('Starting customer creation', { options });

try {
  const customer = await this.service.createCustomer(options);
  spinner.succeed('Customer created!');
  this.logger.info('Customer created successfully', { customerId: customer.id });
} catch (error) {
  spinner.fail('Failed to create customer');
  this.logger.error('Customer creation failed', { error: error.message });
  throw error;
}
```

---

### Phase 2: Services (Priority 1 - 6-8 hours)
**Files:** 8 service files, 323 occurrences

**Why Second:**
- Core business logic
- Should never output to console directly
- Only structured logging

**Migration Pattern for Services:**
```typescript
// ❌ BEFORE - Console in service layer
export class StripeService {
  async createCustomer(data: any) {
    console.log('Creating Stripe customer:', data);
    const customer = await this.stripe.customers.create(data);
    console.log('Customer created:', customer.id);
    return customer;
  }
}

// ✅ AFTER - Pure structured logging
export class StripeService {
  constructor(
    private container: Container,
    private config: StripeConfig,
    private eventEmitter: EventEmitter
  ) {
    this.logger = container.resolve<Logger>('logger');
  }

  async createCustomer(data: CustomerCreateData): Promise<StripeCustomer> {
    this.logger.debug('Creating Stripe customer', {
      email: data.email,
      metadata: data.metadata
    });

    try {
      const customer = await this.stripe.customers.create(data);

      this.logger.info('Stripe customer created', {
        customerId: customer.id,
        email: customer.email,
        created: customer.created
      });

      // Emit event for coordination
      this.eventEmitter.emit('customer-created', {
        customer,
        service: 'stripe'
      });

      return customer;
    } catch (error) {
      this.logger.error('Failed to create Stripe customer', {
        error: error.message,
        code: error.code,
        type: error.type,
        input: data
      });
      throw error;
    }
  }
}
```

**Services Should NEVER:**
- Output to console directly
- Use chalk for formatting
- Show spinners or progress bars

**Services Should ALWAYS:**
- Use structured logging with metadata
- Log at appropriate levels (debug/info/warn/error)
- Include operation context in logs
- Emit events for coordination

---

### Phase 3: Core (Priority 2 - 3-5 hours)
**Files:** 9 core files, 133 occurrences

**Migration Pattern for Core Components:**
```typescript
// ❌ BEFORE - Application.ts
console.log('🚀 Starting Imajin CLI...');
console.log('Debug mode:', this.config.debug);

// ✅ AFTER - Startup info goes to logger
this.logger.info('Starting Imajin CLI', {
  version: this.version,
  debug: this.config.debug,
  logLevel: this.config.logLevel,
  nodeVersion: process.version
});

// User-visible startup (only in debug mode)
if (this.config.debug) {
  console.log(chalk.cyan('🚀 Imajin CLI starting in debug mode'));
}
```

**Exception: Entry Point (src/index.ts)**
The main entry point may keep minimal console output for critical startup errors:

```typescript
// ✅ ALLOWED in index.ts for unrecoverable errors
try {
  await app.run();
} catch (error) {
  console.error(chalk.red('💥 Fatal error:'), error.message);
  process.exit(1);
}
```

---

### Phase 4: Providers (Priority 3 - 1-2 hours)
**Files:** 5 provider files, 49 occurrences

**Migration Pattern for Service Providers:**
```typescript
// ❌ BEFORE
console.log('Registering Stripe service provider...');

// ✅ AFTER
this.logger.debug('Registering Stripe service provider', {
  provider: 'stripe',
  version: this.getVersion()
});
```

---

## 📦 **DELIVERABLES**

### Per File:
1. ✅ All console.log → logger.debug/info
2. ✅ All console.error → logger.error with metadata
3. ✅ All console.warn → logger.warn with metadata
4. ✅ User-facing output uses chalk for formatting
5. ✅ Structured metadata included in all logs

### Overall:
6. ✅ **Zero console statements** in production code (excluding index.ts entry point)
7. ✅ ESLint rule enforces no-console (with entry point exception)
8. ✅ All services inject logger from container
9. ✅ Consistent logging levels across codebase
10. ✅ Log metadata schema documented

---

## 🔄 **MIGRATION WORKFLOW**

### Step-by-Step for Each File:

**1. Audit current console usage:**
```bash
grep -n "console\." src/commands/TaskMigrationCommand.ts
```

**2. Identify patterns:**
- User-facing output (keep as console with chalk)
- Debug information (→ logger.debug)
- Operational info (→ logger.info)
- Warnings (→ logger.warn)
- Errors (→ logger.error)

**3. Ensure logger available:**
```typescript
export class MyCommand {
  private logger: Logger;

  constructor(/* ... */) {
    this.logger = container.resolve<Logger>('logger');
  }
}
```

**4. Replace console statements:**
```typescript
// Pattern 1: Info logging
- console.log('Operation completed');
+ this.logger.info('Operation completed', { operation: 'my-operation' });

// Pattern 2: Error logging
- console.error('Operation failed:', error);
+ this.logger.error('Operation failed', {
+   error: error.message,
+   stack: error.stack,
+   operation: 'my-operation'
+ });

// Pattern 3: Debug logging
- console.log('Debug info:', data);
+ this.logger.debug('Debug info', { data });

// Pattern 4: User output (KEEP in commands)
- console.log('✅ Success!');
+ console.log(chalk.green('✅ Success!'));
+ this.logger.info('Operation successful', { operation: 'my-operation' });
```

**5. Test the changes:**
```bash
npm run build
npm run cli -- your-command --help
DEBUG=true npm run cli -- your-command
```

**6. Verify no console statements:**
```bash
grep -n "console\." src/commands/TaskMigrationCommand.ts
```

---

## 🎨 **LOGGING PATTERNS**

### Pattern 1: Command Execution
```typescript
async execute(options: Options): Promise<void> {
  // User sees progress
  const spinner = ora('Processing...').start();

  // System logs context
  this.logger.debug('Command started', {
    command: 'my:command',
    options,
    user: process.env.USER
  });

  try {
    const result = await this.service.doWork(options);

    spinner.succeed('Done!');
    console.log(chalk.green('✅ Success!'));

    this.logger.info('Command completed successfully', {
      command: 'my:command',
      duration: Date.now() - startTime,
      resultId: result.id
    });
  } catch (error) {
    spinner.fail('Failed!');
    console.error(chalk.red('❌ Error:'), error.message);

    this.logger.error('Command failed', {
      command: 'my:command',
      error: error.message,
      stack: error.stack,
      options
    });

    process.exit(1);
  }
}
```

### Pattern 2: Service Operations
```typescript
async doWork(data: Input): Promise<Output> {
  this.logger.debug('Service operation started', {
    service: 'my-service',
    operation: 'doWork',
    input: data
  });

  const result = await this.externalApi.call(data);

  this.logger.info('Service operation completed', {
    service: 'my-service',
    operation: 'doWork',
    outputId: result.id
  });

  return result;
}
```

### Pattern 3: Error Handling
```typescript
catch (error: unknown) {
  const errorContext = {
    service: 'my-service',
    operation: 'doWork',
    input: data,
    errorType: error.constructor.name
  };

  if (error instanceof ApiError) {
    this.logger.error('API error occurred', {
      ...errorContext,
      statusCode: error.statusCode,
      apiMessage: error.message,
      requestId: error.requestId
    });
  } else {
    this.logger.error('Unexpected error occurred', {
      ...errorContext,
      error: error.message,
      stack: error.stack
    });
  }

  throw error;
}
```

### Pattern 4: Provider Registration
```typescript
async register(): Promise<void> {
  this.logger.debug('Provider registering', {
    provider: this.getName(),
    services: this.getServices()
  });

  // Registration logic...

  this.logger.info('Provider registered successfully', {
    provider: this.getName(),
    servicesCount: this.getServices().length
  });
}
```

---

## ✅ **SUCCESS CRITERIA**

### Per File Completion:
- [ ] Zero `console.log/error/warn` statements (verified with grep)
- [ ] Logger injected and available
- [ ] User-facing output still works (chalk formatting)
- [ ] Appropriate log levels used (debug/info/warn/error)
- [ ] Structured metadata included
- [ ] File tested and working

### Overall Completion:
- [ ] All 77 files migrated
- [ ] ESLint no-console rule enforced
- [ ] `npm run build` succeeds
- [ ] CLI commands still work correctly
- [ ] Debug mode shows structured logs
- [ ] Log output formatted correctly

### Validation Commands:
```bash
# Should return 0 results (except index.ts)
grep -r "console\." src/ --include="*.ts" | grep -v "src/index.ts" | grep -v "test\."

# ESLint should pass
npm run lint

# Build should succeed
npm run build

# Commands should work
npm run cli -- stripe customer list --help
DEBUG=true npm run cli -- stripe customer list
```

---

## 🧪 **TESTING STRATEGY**

### Per File Testing:
```bash
# 1. Build and check for errors
npm run build

# 2. Test command functionality
npm run cli -- [command] --help

# 3. Test with debug mode
DEBUG=true npm run cli -- [command] [args]

# 4. Check log output quality
# Look for structured JSON in debug mode
# Look for user-friendly output in normal mode
```

### Integration Testing:
```bash
# Test log levels
LOG_LEVEL=error npm run cli -- stripe customer list
LOG_LEVEL=debug npm run cli -- stripe customer list

# Test log format
npm run cli -- stripe customer create --email test@example.com

# Test error logging
npm run cli -- stripe customer create --invalid-option
```

---

## 📋 **MIGRATION CHECKLIST**

### Commands (18 files, 590 occurrences):
- [ ] `src/commands/TaskMigrationCommand.ts` (49)
- [ ] `src/commands/TaskManagementCommands.ts` (59)
- [ ] `src/commands/ContextCommands.ts` (48)
- [ ] `src/commands/StatusCommand.ts` (24)
- [ ] `src/commands/schema/SchemaCommands.ts` (54)
- [ ] `src/commands/generated/BusinessContextCommands.ts` (107)
- [ ] `src/commands/generated/RecipeCommands.ts` (9)
- [ ] `src/commands/media/MediaCommand.ts` (30)
- [ ] `src/commands/media/MediaUploadCommand.ts` (18)
- [ ] `src/commands/stripe/CreateCustomerCommand.ts` (13)
- [ ] `src/commands/stripe/CreatePaymentCommand.ts` (15)
- [ ] `src/commands/auth/AuthCommands.ts` (51)
- [ ] `src/commands/webhook/WebhookListCommand.ts` (16)
- [ ] `src/commands/webhook/WebhookTestCommand.ts` (15)
- [ ] `src/commands/system/CommandLimiterCommands.ts` (34)
- [ ] `src/commands/etl/ETLCommand.ts` (18)
- [ ] `src/commands/etl/GraphCommand.ts` (13)
- [ ] `src/commands/MarkdownCommand.ts` (17)

### Services (8 files, 323 occurrences):
- [ ] `src/services/contentful/commands/ContentfulCommands.ts` (205)
- [ ] `src/services/stripe/commands/CustomerCommands.ts` (28)
- [ ] `src/services/stripe/commands/PaymentCommands.ts` (26)
- [ ] `src/services/stripe/commands/SubscriptionCommands.ts` (24)
- [ ] `src/services/stripe/commands/CatalogCommands.ts` (19)
- [ ] `src/services/stripe/StripeServiceProvider.ts` (9)
- [ ] `src/services/cloudinary/CloudinaryServiceProvider.ts` (9)
- [ ] `src/services/localfile/LocalFileServiceProvider.ts` (3)

### Core (9 files, 133 occurrences):
- [ ] `src/core/Application.ts` (60)
- [ ] `src/core/ErrorHandler.ts` (20)
- [ ] `src/core/ErrorRecovery.ts` (9)
- [ ] `src/core/commands/BaseCommand.ts` (3)
- [ ] `src/core/commands/CommandManager.ts` (1)
- [ ] `src/core/events/EventServiceProvider.ts` (13)
- [ ] `src/core/events/EventManager.ts` (2)
- [ ] `src/core/events/EventEmitter.ts` (2)
- [ ] `src/core/events/examples/EventSystemExample.ts` (23) *[Example - lower priority]*

### Providers (5 files, 49 occurrences):
- [ ] `src/providers/ServiceLayerProvider.ts` (37)
- [ ] `src/providers/PluginGeneratorServiceProvider.ts` (6)
- [ ] `src/providers/RateLimitingServiceProvider.ts` (4)
- [ ] `src/providers/MediaServiceProvider.ts` (1)
- [ ] `src/providers/MonitoringServiceProvider.ts` (1)

### Context/Discovery/Other:
- [ ] `src/context/BusinessContextManager.ts` (16)
- [ ] `src/context/RecipeManager.ts` (2)
- [ ] `src/context/BusinessContextProcessor.ts` (38)
- [ ] `src/context/BusinessTypeRegistry.ts` (10)
- [ ] `src/discovery/BusinessServiceDiscovery.ts` (18)
- [ ] Additional files as needed...

---

## 🔗 **INTEGRATION POINTS**

### Dependencies:
- **ESLint Configuration** (18_2) - Enforces no-console rule
- **Winston Logger** - Already implemented in Phase 2
- **Chalk** - For user-friendly CLI output

### Impacts:
- **Testing** - Tests may need logger mock updates
- **Documentation** - Update logging examples
- **CI/CD** - Log aggregation configuration
- **Monitoring** - Structured logs ready for external services

---

## 📝 **IMPLEMENTATION NOTES**

### Logger Levels:
- `logger.debug()` - Detailed info for debugging (verbose)
- `logger.info()` - General operational information
- `logger.warn()` - Warning conditions (recoverable)
- `logger.error()` - Error conditions (may be recoverable)

### Metadata Best Practices:
```typescript
// ✅ Good metadata
this.logger.info('Customer created', {
  customerId: customer.id,
  email: customer.email,
  service: 'stripe',
  operation: 'create',
  timestamp: Date.now()
});

// ❌ Bad metadata (too much/sensitive data)
this.logger.info('Customer created', {
  fullCustomerObject: customer,  // Too large
  apiKey: process.env.API_KEY,   // Sensitive!
  password: user.password        // Never log credentials
});
```

### Performance Considerations:
- Conditional logging: `if (this.logger.isDebugEnabled()) { ... }`
- Avoid expensive operations in log statements
- Use lazy evaluation for complex metadata

---

## 🚀 **NEXT STEPS**

After completion:
1. **Update ESLint** - Ensure no-console rule catches new violations
2. **Update CI/CD** - Configure log aggregation
3. **Test Suite Fixes** (18_3) - Some test failures may be logging-related
4. **Documentation** - Update examples with correct logging patterns

---

## 🔍 **DR. CLEAN ANALYSIS & RECOMMENDATIONS (2025-11-04)**

### Analysis Summary

**Actual Scope (Verified):**
- Total: 1,462 console statements (33% higher than estimated 1,095)
- 77 production files affected (excluding tests)
- Top 5 files contain 474 statements (32% of total)
- Complexity: Mixed user-facing CLI output + internal logging

**Infrastructure Assessment:**
✅ Winston Logger fully implemented and tested
✅ Container registration working correctly
✅ Logger supports all required methods (debug/info/warn/error)
✅ Structured metadata pattern established
✅ Migration helper script created

**Risk Assessment:**
🔴 **HIGH RISK** if done hastily:
- User-facing CLI output must be preserved exactly
- Commands require DUAL logging (console for users + logger for system)
- Services need PURE logger (no console at all)
- Incorrect migration breaks CLI UX

🟢 **LOW RISK** with systematic approach:
- Services can be aggressively migrated (no user output)
- Test after each file catches issues immediately
- Batch approach allows quality gates

### Decision: Option B - Systematic Batch Migration (APPROVED)

**Rationale:**
1. **Quality over speed** - Pre-launch phase, correctness is critical
2. **User experience** - CLI output quality cannot be compromised
3. **Testing rigor** - Test after each batch catches issues early
4. **Maintainability** - Clean patterns established for future development
5. **Risk mitigation** - Systematic approach prevents mass breakage

**Timeline:**
- Week 1: Services Layer (8 files, 323 statements) - 6-8 hours
- Week 1-2: Commands Layer (18 files, 590 statements) - 10-12 hours
- Week 2: Core + Providers (14 files, 182 statements) - 4-6 hours
- Week 2: Context/Discovery (remaining files) - 2-3 hours
- Week 2: Final verification - 2-3 hours

**Total: 24-32 hours over 7-10 days**

### Progress Tracking

**Completed:**
- [x] Codebase analysis and violation count
- [x] Logger infrastructure verification
- [x] Migration patterns documented
- [x] Helper script created (`migrate-console-logs.js`)
- [x] Proof-of-concept: 1 command in ContentfulCommands.ts

**In Progress:**
- [ ] Batch 1: Services Layer (0/8 files complete)

**Not Started:**
- [ ] Batch 2: Commands Layer (0/18 files complete)
- [ ] Batch 3: Core Components (0/9 files complete)
- [ ] Batch 4: Providers (0/5 files complete)
- [ ] Batch 5: Context/Discovery/Other
- [ ] Final verification and quality report

### Quality Gates (Must Pass Before Phase Sign-Off)

**Per-Batch Gates:**
1. ✅ All console statements eliminated from batch files
2. ✅ `npm run build` succeeds without errors
3. ✅ `npm run lint` passes (once no-console rule added)
4. ✅ Affected tests pass
5. ✅ CLI commands still work correctly (for Commands batches)

**Final Gates:**
1. ✅ Zero console statements: `grep -r "console\." src/ --exclude="*.test.ts" | grep -v "src/index.ts" = 0 results`
2. ✅ ESLint no-console rule enforced
3. ✅ All tests passing
4. ✅ Full build succeeds
5. ✅ CLI smoke tests pass
6. ✅ Structured logging verified in debug mode

### Key Learnings & Patterns

**For Services (Critical Pattern):**
- NEVER console.log in services - use logger exclusively
- Always inject: `this.logger = container.resolve<Logger>('logger');`
- Use structured metadata: `{ operation, entityId, context }`
- Log levels: debug (verbose), info (operations), warn (issues), error (failures)

**For Commands (Dual Pattern - CRITICAL):**
- **KEEP** console.log with chalk for user-facing output (DO NOT REMOVE!)
- **ADD** parallel logger calls for system logging
- User sees: `console.log(chalk.green('✅ Success!'))` ← **KEEP THIS**
- System logs: `logger.info('Operation complete', { resultId, duration })` ← **ADD THIS**

**⚠️ IMPORTANT - Chalk Console Output:**
- Logger is for system/debug logging, NOT user-facing CLI output
- Winston logger has its own colorization (NOT compatible with chalk)
- Commands need BOTH: console.log(chalk...) for users + logger for system
- The 590 console statements in Commands are mostly user-facing output - **KEEP THEM**
- Only REMOVE plain console.log() for debugging (non-chalk, non-user-facing)

**For Error Handling (Both User + System):**
```typescript
catch (error) {
  // User-friendly error message
  console.error(chalk.red('❌ Failed:'), error.message);

  // System error logging with full context
  this.logger.error('Operation failed', error, {
    operation: 'create-customer',
    input: sanitizedInput,
    errorCode: error.code
  });

  process.exit(1);
}
```

### Helper Script Usage

**Location:** `migrate-console-logs.js` (project root)

**Purpose:** Automates logger infrastructure injection

**Usage:**
```bash
# Analyze console usage
node migrate-console-logs.js

# The script adds:
# - Logger imports
# - Logger injection in constructors
# - Identifies console statement locations
```

**Manual Migration Still Required:**
The script sets up infrastructure but manual migration of each console statement is required to:
- Determine appropriate log level (debug/info/warn/error)
- Add structured metadata
- Preserve user-facing output in commands
- Ensure proper error handling

---

**Status:** 🔄 **IN PROGRESS** - Systematic Batch Migration
**Next Action:** Begin Batch 1 (Services Layer)
**Priority:** 🔴 **BLOCKER** - Pre-Launch Rule #1 Compliance
**Estimated Completion:** 7-10 days (with systematic quality gates)

---

*Part of Phase 2 Cleanup (Prompt 18)*
*Pre-Launch Rule #1 Compliance*
*Updated: 2025-11-04 by Dr. Clean*
