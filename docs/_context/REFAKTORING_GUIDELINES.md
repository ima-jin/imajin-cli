# RefakTS Integration Guidelines for imajin-cli

## Context Window Optimization Principles

When working with imajin-cli codebase, follow these RefakTS principles to maintain AI-agent compatibility and reduce complexity:

### 1. File Size Constraints
- **Target**: Keep TypeScript files under 300 lines
- **Maximum**: Never exceed 500 lines per file
- **Rationale**: Ensures files fit entirely in AI context windows for precise refactoring

### 2. Focused Responsibility Pattern
```typescript
// GOOD: Single, clear responsibility
export class StripeCustomerManager {
    async createCustomer(data: CustomerData): Promise<Customer> { }
}

// BAD: Multiple responsibilities
export class StripeManager {
    async createCustomer() { }
    async processPayment() { }
    async handleWebhooks() { }
    async manageCatalog() { }
}
```

### 3. Universal Elements Optimization
- **Commands**: Break large command files into operation-specific files
- **Services**: Split service implementations by functional domain
- **Interfaces**: Create focused, single-purpose interfaces

### 4. Cognitive Load Reduction
- **Import Statements**: Maximum 10 imports per file
- **Method Length**: Maximum 20 lines per method
- **Class Complexity**: Maximum 7 public methods per class

## Current imajin-cli Refactoring Priorities

### Phase 1: High-Impact Files (Immediate)
```
Priority 1 - Commands (Currently 600+ lines each):
- src/commands/generated/BusinessContextCommands.ts
- src/commands/generated/RecipeCommands.ts
- src/services/stripe/commands/

Priority 2 - Core Services:
- src/services/stripe/StripeService.ts
- src/context/BusinessContextManager.ts
- src/etl/core/ETLPipeline.ts
```

### Phase 2: Pattern Standardization
```
- Standardize BaseService implementations
- Consolidate provider patterns
- Optimize command registration patterns
```

### Phase 3: Template Generation
```
- Update PluginGenerator templates to follow RefakTS principles
- Create refactoring-friendly command templates
- Implement automated complexity checks
```

## Refactoring Strategies

### 1. Command Decomposition
Break large command files using this pattern:
```typescript
// Before: src/commands/stripe/StripeCommands.ts (800 lines)
// After: Split into focused files:
src/commands/stripe/
├── CustomerCommands.ts      (< 200 lines)
├── PaymentCommands.ts       (< 200 lines)
├── SubscriptionCommands.ts  (< 200 lines)
└── CatalogCommands.ts       (< 200 lines)
```

### 2. Service Layer Decomposition
```typescript
// Before: MonolithicService (500+ lines)
// After: Focused services:
export class StripeCustomerService extends BaseService {
    // Only customer-related operations
}

export class StripePaymentService extends BaseService {
    // Only payment-related operations
}
```

### 3. Context-Aware Architecture
Design for AI agent workflows:
- **Surgical Changes**: Small, focused modules allow precise edits
- **Dependency Clarity**: Clear imports show exact relationships
- **Pattern Consistency**: Uniform patterns reduce cognitive load

## Quality Gates

### Automated Checks
Add to package.json scripts:
```json
{
  "scripts": {
    "refakt:check": "refakts check --max-lines=300 --max-complexity=7",
    "refakt:complexity": "refakts analyze --cognitive-load src/",
    "refakt:size": "find src -name '*.ts' -exec wc -l {} + | sort -nr"
  }
}
```

### Pre-commit Hooks
Prevent complexity drift:
```typescript
// .refakts.config.js
module.exports = {
  rules: {
    'max-file-lines': 300,
    'max-method-lines': 20,
    'max-imports': 10,
    'focused-responsibility': true
  }
}
```

## Implementation Workflow

### Step 1: Identify Refactoring Targets
```bash
# Find files over 300 lines
find ../imajin-cli/src -name "*.ts" -exec wc -l {} + | awk '$1 > 300' | sort -nr

# Analyze import complexity
grep -r "^import" ../imajin-cli/src --include="*.ts" | cut -d: -f1 | uniq -c | sort -nr
```

### Step 2: Apply RefakTS Patterns
- Extract focused classes
- Split large methods
- Reduce import dependencies
- Standardize interfaces

### Step 3: Validate Context Window Fit
- Ensure refactored files < 300 lines
- Verify AI agents can process entire files
- Test surgical edit capabilities

## Benefits for imajin-cli

1. **Faster AI Generation**: Smaller modules fit entirely in context
2. **Precise Edits**: RefakTS-style surgical changes instead of full rewrites
3. **Reduced Cognitive Load**: Developers focus on logic, not parsing complex files
4. **Better Maintenance**: Clear patterns prevent architectural drift
5. **Scalable Growth**: Project scales without hitting complexity walls

## Integration with Existing Architecture

### Service Provider Pattern
```typescript
// RefakTS-optimized service provider
export class FocusedStripeProvider extends ServiceProvider {
    register(): void {
        // Single responsibility: only Stripe customer management
        this.container.bind('stripe.customer', StripeCustomerService);
    }
}
```

### Command Registration Pattern
```typescript
// Focused command registration
export class CustomerCommandProvider extends ServiceProvider {
    register(): void {
        this.registerCommand('stripe:customer:create', CreateCustomerCommand);
        this.registerCommand('stripe:customer:update', UpdateCustomerCommand);
        // Maximum 5 commands per provider
    }
}
```

### Testing Strategy
```typescript
// Context-optimized test files
describe('StripeCustomerService', () => {
    // Tests fit in single context window with implementation
    // Maximum 150 lines per test file
});
```

---

This approach transforms imajin-cli into a RefakTS-optimized codebase where AI agents can work efficiently, developers can understand code quickly, and the project scales without hitting complexity walls.
