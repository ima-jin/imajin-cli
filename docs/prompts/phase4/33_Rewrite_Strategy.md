---
# Metadata
title: "33 Rewrite Strategy - Greenfield vs Incremental"
created: "2025-11-24T00:30:00Z"
updated: "2025-11-24T00:30:00Z"
---

# 🔄 REWRITE vs REFACTOR: Strategic Decision

**Status:** 🎯 **RECOMMENDED: Greenfield Rewrite**
**Context:** Pre-release (0.1.0), Solo developer, No production users
**Timeline:** 3-4 weeks full rewrite vs 8-10 weeks incremental
**Risk:** LOW (no users to break)

---

## EXECUTIVE SUMMARY

Given the project status:
- ✅ **Pre-release (0.1.0)** - No production users
- ✅ **Solo developer** - No coordination overhead
- ✅ **Novel features isolated** - Can extract and preserve
- ✅ **83k LOC** - Large enough that incremental is painful
- ✅ **Clear architecture vision** - Know exactly what to build

**Recommendation: Do a clean rewrite.** It will be faster, cleaner, and less painful than incremental migration.

---

## THE MATH: REWRITE vs REFACTOR

### Option A: Incremental Refactor (Redux Plan)

```
Week 1-2: DI Container → tsyringe
├── Modify Container.ts to use tsyringe internally
├── Update all 50+ service classes with @injectable()
├── Fix circular dependencies discovered during migration
├── Update 200+ test files
├── Debug subtle DI issues
└── Ensure nothing breaks

Week 3-4: EventManager → Temporal
├── Install Temporal, set up dev environment
├── Map existing events → Temporal workflows
├── Create EventManager → Temporal bridge
├── Migrate 30+ event listeners
├── Test all workflows
├── Fix timing/durability issues
└── Keep old EventManager for compatibility

Week 5-6: Generators → openapi-generator
├── Learn openapi-generator configuration
├── Extract OpenAPI specs from existing code
├── Generate code for each service
├── Build business context wrapper
├── Reconcile differences
├── Update all command classes
└── Fix type mismatches

Week 7-8: ETL → Adapters
Week 9-10: Service Providers → Modules
Week 11-12: Testing, documentation, cleanup

Total: 10-12 weeks
Pain Level: 🔥🔥🔥🔥 (constant context switching, bridge code)
```

**Problems with Incremental:**
1. **Bridge Code Everywhere** - Maintain old + new systems simultaneously
2. **Testing Nightmare** - Every change requires testing both paths
3. **Context Switching** - Constantly jumping between old and new patterns
4. **Partial State** - 6 weeks of "neither here nor there"
5. **Rollback Complexity** - Hard to undo if something goes wrong
6. **Death by 1000 Cuts** - Small decisions compound into messy architecture

---

### Option B: Greenfield Rewrite

```
Week 1: Project Setup + Core Infrastructure
├── Create imajin-cli-v2/ directory
├── Install: tsyringe, Temporal SDK, openapi-generator
├── Set up project structure
├── Configure TypeScript, Jest, ESLint
└── Basic application bootstrap

Week 2: Service Generation + MCP
├── Extract OpenAPI specs for Stripe, Contentful, Cloudinary
├── Generate service code with openapi-generator
├── Build thin business context wrapper
├── Set up MCP server (copy from v1)
└── Basic command execution working

Week 3: Novel Features Migration
├── Extract SelfExtensionManager (~3k LOC) → Clean it up
├── Extract BusinessContextProcessor (~5k LOC) → Simplify
├── Update to use new infrastructure (tsyringe, Temporal)
├── Port plugin generation logic
└── Connect to openapi-generator

Week 4: Commands + Testing
├── Generate core commands from v1 patterns
├── Port critical tests
├── Integration testing
├── Documentation
└── Migration guide from v1

Total: 3-4 weeks
Pain Level: 🔥 (fresh start, clear direction)
```

**Benefits of Rewrite:**
1. **Clean Slate** - No technical debt
2. **Modern Tooling** - Use best practices from day 1
3. **Fast Velocity** - No bridge code slowing you down
4. **Easier Testing** - Test new system independently
5. **Simple Rollback** - Keep v1 running until v2 is ready
6. **Better Architecture** - Make decisions with full context

---

## DETAILED COMPARISON

| Factor | Incremental Refactor | Greenfield Rewrite |
|--------|----------------------|-------------------|
| **Timeline** | 10-12 weeks | 3-4 weeks |
| **Risk** | High (break existing code) | Low (v1 keeps working) |
| **Complexity** | Very High (bridge code) | Medium (learning new tools) |
| **Code Quality** | Mixed (old + new patterns) | Clean (consistent patterns) |
| **Testing** | Complex (test both paths) | Simpler (test one system) |
| **Rollback** | Hard (partially migrated) | Easy (switch back to v1) |
| **Feature Development** | Blocked during migration | Can continue in v1 |
| **Context Switching** | Constant | Minimal |
| **Final Result** | Compromises + cruft | Clean architecture |
| **Psychological** | Draining (constant battles) | Energizing (building new) |

---

## RISK ANALYSIS

### Rewrite Risks (Classic "Netscape Problem")

**Why Netscape 6 Rewrite Failed:**
1. ❌ Took 3 years (market moved on)
2. ❌ Had millions of users (lost them during gap)
3. ❌ Underestimated scope (didn't know what they had)
4. ❌ Feature-for-feature rewrite (bloat)
5. ❌ No incremental delivery (all-or-nothing)

**Why imajin-cli Rewrite Will Succeed:**
1. ✅ Takes 3-4 weeks (manageable)
2. ✅ Zero users (no one to lose)
3. ✅ Well-understood scope (83k LOC documented)
4. ✅ Simplifying, not feature matching (15k LOC target)
5. ✅ Can run v1 and v2 in parallel (gradual cutover)

### Mitigation Strategies

**Risk 1: Scope Creep**
- **Mitigation:** Strict feature freeze, only port essentials
- **Success Criteria:** Ship v2 with 80% of v1 features

**Risk 2: Unknown Unknowns**
- **Mitigation:** Extract novel features first (week 3), validate they work
- **Success Criteria:** SelfExtensionManager working in v2 by day 15

**Risk 3: Motivation Loss**
- **Mitigation:** Ship something useful by week 2, see progress
- **Success Criteria:** MCP server + 1 service working = dopamine hit

**Risk 4: Technical Blockers**
- **Mitigation:** Proof-of-concept critical integrations in week 1
- **Success Criteria:** Temporal + tsyringe + openapi-generator proven

---

## THE GREENFIELD REWRITE PLAN

### Week 1: Foundation

**Day 1-2: Project Setup**
```bash
mkdir imajin-cli-v2
cd imajin-cli-v2
npm init -y

# Install production-grade tools
npm install tsyringe reflect-metadata
npm install @temporalio/client @temporalio/worker
npm install @openapitools/openapi-generator-cli
npm install @modelcontextprotocol/sdk
npm install commander winston

# Dev dependencies
npm install -D typescript @types/node jest ts-jest
npm install -D @temporal/testing

# Configure
npx tsc --init
```

**Day 3-4: Application Bootstrap**
```typescript
// src/main.ts - Clean, simple entry point
import 'reflect-metadata';
import { container } from 'tsyringe';
import { Application } from './core/Application';

async function main() {
  const app = container.resolve(Application);
  await app.start();
}

main().catch(console.error);
```

```typescript
// src/core/Application.ts - Minimal bootstrap
import { injectable } from 'tsyringe';
import { Command } from 'commander';

@injectable()
export class Application {
  constructor(private program: Command) {}

  async start() {
    // Load modules
    // Start Temporal worker
    // Start MCP server
    // Parse CLI args
  }
}
```

**Day 5: Proof of Concept**
- [ ] tsyringe DI working
- [ ] Temporal workflow executing
- [ ] openapi-generator producing code
- [ ] Basic command runs end-to-end

**Deliverable:** Skeleton app that proves the architecture

---

### Week 2: Service Generation + MCP

**Day 6-7: OpenAPI Specs**
```bash
# Extract specs from existing services (or use official APIs)
curl https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json \
  > specs/stripe.json

# Contentful
curl https://www.contentful.com/developers/docs/references/content-delivery-api/ \
  > specs/contentful.json

# Generate service code
openapi-generator-cli generate \
  -i specs/stripe.json \
  -g typescript-axios \
  -o src/generated/stripe
```

**Day 8-9: Business Context Wrapper**
```typescript
// src/services/stripe/StripeBusinessService.ts
import { injectable } from 'tsyringe';
import { StripeApi } from '../../generated/stripe';
import { BusinessContext } from '../../context/BusinessContext';

@injectable()
export class StripeBusinessService {
  constructor(
    private stripe: StripeApi,
    private context: BusinessContext
  ) {}

  async createCustomerFromBusinessEntity(entity: any) {
    // Map business entity → Stripe customer
    const stripeCustomer = this.context.mapToStripe(entity);
    return await this.stripe.createCustomer(stripeCustomer);
  }
}
```

**Day 10: MCP Server**
```typescript
// Copy from v1, simplify
// src/mcp/server.ts
import { MCPServer } from '@modelcontextprotocol/sdk';

export class ImajinMCPServer {
  // Introspect commands
  // Generate tools
  // Execute via Commander
}
```

**Deliverable:** One full service (Stripe) working via MCP

---

### Week 3: Novel Features Migration

**Critical:** This is where the unique value lives. Handle carefully.

**Day 11-12: Extract Novel Code from v1**
```bash
# Copy these files from v1:
cp ../imajin-cli/src/core/SelfExtensionManager.ts src/core/
cp ../imajin-cli/src/core/CodeGenerationAgent.ts src/core/
cp ../imajin-cli/src/context/BusinessContextProcessor.ts src/context/
cp ../imajin-cli/src/context/BusinessSchemaRegistry.ts src/context/

# Copy tests:
cp -r ../imajin-cli/src/core/__tests__/SelfExtensionManager.test.ts src/core/__tests__/
```

**Day 13-14: Adapt to New Infrastructure**
```typescript
// Before (v1):
export class SelfExtensionManager {
  constructor(
    private pluginManager: PluginManager,
    private credentialManager: CredentialManager,
    private logger: Logger
  ) {}
}

// After (v2):
import { injectable, inject } from 'tsyringe';

@injectable()
export class SelfExtensionManager {
  constructor(
    @inject('PluginManager') private pluginManager: PluginManager,
    @inject('CredentialManager') private credentialManager: CredentialManager,
    @inject('Logger') private logger: Logger
  ) {}

  async generatePlugin(request: GeneratePluginRequest) {
    // SAME LOGIC, but now:
    // - Uses openapi-generator instead of custom templates
    // - Generates npm packages instead of plugins/ directory
    // - Uses Temporal for workflow orchestration
  }
}
```

**Day 15: Integration Testing**
- [ ] SelfExtensionManager generates a plugin
- [ ] Plugin is npm package in node_modules/@imajin-cli/
- [ ] MCP server discovers new plugin
- [ ] Claude can use new plugin

**Deliverable:** Self-extension working end-to-end in v2

---

### Week 4: Commands, Tests, Documentation

**Day 16-17: Command Generation**
```bash
# Generate commands for all services
npm run generate:commands

# Port critical commands from v1:
# - stripe:customer:list
# - contentful:entry:create
# - media:upload
```

**Day 18: Testing**
```typescript
// src/__tests__/integration/full-workflow.test.ts
describe('Full Workflow', () => {
  it('should sync Stripe product to Contentful', async () => {
    const app = container.resolve(Application);
    const result = await app.execute([
      'stripe:product:sync',
      '--product-id', 'prod_123'
    ]);

    expect(result.success).toBe(true);
    // Verify Contentful entry created
  });
});
```

**Day 19: Documentation**
- README.md for v2
- Migration guide from v1
- Architecture decision records (ADRs)

**Day 20: Polish**
- Fix remaining bugs
- Performance testing
- Security audit
- Final cleanup

**Deliverable:** Production-ready v2

---

## MIGRATION PATH: v1 → v2

### Phase 1: Parallel Development (Week 1-4)

```
imajin-cli/          (v1 - keep running)
├── Keep developing features
└── Reference for extracting logic

imajin-cli-v2/       (v2 - build from scratch)
├── New architecture
└── Migrate novel features
```

**Benefits:**
- v1 keeps working
- Can compare implementations
- Easy to cherry-pick logic

---

### Phase 2: Alpha Testing (Week 5)

```bash
# Run v2 alongside v1
alias imajin-v2='node ~/imajin-cli-v2/dist/main.js'

# Test v2 for daily tasks
imajin-v2 stripe:customer:list
imajin-v2 contentful:entry:create

# Fall back to v1 if issues
imajin stripe:customer:list
```

**Goal:** Find bugs, validate architecture

---

### Phase 3: Cut Over (Week 6)

```bash
# Rename repos
mv imajin-cli imajin-cli-v1-archive
mv imajin-cli-v2 imajin-cli

# Update package.json version
"version": "1.0.0"  # v2 becomes v1.0 release

# Publish to npm
npm publish

# Tag release
git tag -a v1.0.0 -m "Rewrite: Modern architecture"
git push origin v1.0.0
```

**Decision Point:** Is v2 feature-complete enough to replace v1?
- ✅ Yes → Ship v1.0.0
- ❌ No → Continue alpha testing

---

## WHAT TO PORT vs WHAT TO SKIP

### ✅ Port These (Core Value)

**Novel Features:**
- SelfExtensionManager (~3k LOC → ~1.5k LOC cleaned up)
- BusinessContextProcessor (~5k LOC → ~3k LOC simplified)
- MCP Server (~2k LOC → ~2k LOC same)

**Essential Services:**
- Stripe integration
- Contentful integration
- Cloudinary integration
- LocalFile operations

**Critical Commands:**
- Customer management
- Payment processing
- Media upload
- Entry management

**Total to Port: ~20k LOC → ~10k LOC in v2**

---

### ❌ Skip These (Reinvented Wheels)

**Infrastructure (Replace with Tools):**
- ❌ Container.ts (~1k LOC) → tsyringe (0 LOC)
- ❌ EventManager (~5k LOC) → Temporal (0 LOC)
- ❌ PluginManager (~1.5k LOC) → npm (0 LOC)
- ❌ Generators (~15k LOC) → openapi-generator (0 LOC)
- ❌ ETL (~8k LOC) → Simple adapters (0.5k LOC)
- ❌ ServiceProvider pattern (~5k LOC) → tsyringe modules (0 LOC)

**Experimental Features:**
- ❌ JobQueue (use Temporal workflows instead)
- ❌ Rate limiting (use Temporal rate limiting)
- ❌ Webhook manager (simplify, rebuild smaller)

**Total Skipped: ~35k LOC replaced with tools**

---

### 🤔 Evaluate These (Case by Case)

**Business Logic:**
- Credential management (keep if well-tested, else simplify)
- Business type registry (evaluate if still needed)
- Recipe system (evaluate usage)

**Utilities:**
- Logging (keep if custom, else use Winston directly)
- Error handling (port exception patterns)
- Schema validation (use Zod instead?)

---

## PRESERVING YOUR INVESTMENT

### Extract the Gems from v1

```typescript
// Create a "lessons learned" document
// docs/v1-retrospective.md

## What Worked Well
- MCP integration architecture
- Self-extension pattern learning
- Business context abstraction
- Command introspection

## What Was Over-Engineered
- Universal Elements (too complex for value)
- Custom DI container (tsyringe is better)
- Event system (Temporal is battle-tested)
- Plugin system (npm is standard)

## Key Insights to Preserve
1. Business context should drive commands, not APIs
2. Self-extension needs pattern libraries
3. MCP + usage analytics = feedback loop
4. Declarative workflows prevent AI errors
```

**Port the insights, not necessarily the code.**

---

## PROOF OF CONCEPT: 1 Day Spike

Before committing to full rewrite, do a 1-day POC:

### POC Checklist

**Morning (4 hours):**
- [ ] Create imajin-cli-v2 repo
- [ ] Install tsyringe, Temporal, openapi-generator
- [ ] Generate Stripe service from OpenAPI
- [ ] Create one command: `stripe:customer:list`
- [ ] Make it executable

**Afternoon (4 hours):**
- [ ] Set up Temporal workflow
- [ ] Create basic MCP server
- [ ] Test command via MCP
- [ ] Measure LOC vs equivalent v1 code

**Decision:**
- If POC is **simpler** and **working** → Full rewrite ✅
- If POC is **harder** or **blocked** → Incremental refactor ⚠️

---

## FINAL RECOMMENDATION

### Do the Rewrite Because:

1. **Pre-release** - No users to break
2. **Solo project** - No team coordination
3. **Clear vision** - Know exactly what to build
4. **10k vs 35k LOC** - Massive simplification
5. **3-4 weeks vs 10-12 weeks** - Faster time to clean architecture
6. **Learning curve** - Better to learn new tools in greenfield
7. **Motivation** - Fresh start is energizing vs grinding refactor
8. **Rollback** - Keep v1 as safety net

### The Kensington Method Still Applies

From Dr. Imajin-CLI (lines 56-77):
```
1. Build working code (v2)
2. Test manually
3. Discover what works/breaks
4. Improve based on feedback
5. REPEAT
```

**Rewrite doesn't mean abandon the method.** It means:
- Start fresh with lessons learned
- Build incrementally (week by week)
- Test constantly
- Ship something useful quickly

---

## TIMELINE SUMMARY

```
Week 1: Foundation + POC          [imajin-cli-v2 created]
Week 2: Services + MCP            [First service working]
Week 3: Novel features migrated   [Self-extension working]
Week 4: Commands + Testing        [Production ready]
Week 5: Alpha testing             [Run v2 in parallel]
Week 6: Cut over decision         [Ship v1.0.0 or iterate]

Total: 4-6 weeks to production-ready v2
```

---

## COMPARISON TO FAMOUS REWRITES

### Successful Rewrites

**Gmail (2004 → 2018 rewrite)**
- Took 4 years BUT users kept using old version
- New version was opt-in
- Eventually everyone migrated
- **Lesson:** Parallel deployment works

**Basecamp (v1 → v2 → v3)**
- Complete rewrites between major versions
- Each was new product
- Old version stayed available
- **Lesson:** Rewrites for major versions are fine

**Discord (WebRTC rewrite 2020)**
- Complete voice infrastructure rewrite
- Took 6 months
- Users didn't notice cutover
- **Lesson:** Transparent migrations succeed

### Failed Rewrites

**Netscape Navigator (v4 → v6)**
- Took 3 years
- Market moved to IE
- Died during rewrite
- **Lesson:** Can't go dark for years

**Digg (v3 → v4 rewrite)**
- Massive rewrite
- Removed key features
- Users fled to Reddit
- **Lesson:** Don't remove what users love

**Lotus Notes → IBM Notes**
- 10 year rewrite
- Never shipped
- Product died
- **Lesson:** Scope creep kills rewrites

### Why imajin-cli Won't Fail

| Risk Factor | Netscape/Digg | imajin-cli |
|-------------|---------------|------------|
| Time to market | 2-3 years | 3-4 weeks |
| User count | Millions | Zero (pre-release) |
| Market pressure | Intense (IE, Reddit) | None (no competition) |
| Feature bloat | Yes (tried to match everything) | No (simplifying) |
| Parallel deployment | No (all or nothing) | Yes (v1 keeps running) |

---

## ACTION PLAN

### Day 0: Decision

- [ ] Review this document
- [ ] Commit to rewrite or refactor
- [ ] Block out 4-6 weeks on calendar

### Day 1: POC

- [ ] 1-day proof of concept
- [ ] Validate: tsyringe + Temporal + openapi-generator
- [ ] One command working end-to-end
- [ ] Go/No-Go decision

### Day 2-20: Build v2

- [ ] Follow week-by-week plan above
- [ ] Test constantly
- [ ] Document as you go
- [ ] Ship weekly updates (even if just to yourself)

### Day 21-28: Alpha Testing

- [ ] Use v2 for daily tasks
- [ ] Compare to v1
- [ ] Fix bugs
- [ ] Polish UX

### Day 29-35: Launch Decision

- [ ] Is v2 better than v1?
- [ ] Are novel features working?
- [ ] Is architecture cleaner?
- [ ] Ship v1.0.0 or iterate?

---

## TL;DR

**Question:** Rewrite or refactor?

**Answer:** **REWRITE**

**Why:**
- Zero users (can't break what doesn't exist)
- Solo developer (no coordination cost)
- 3-4 weeks vs 10-12 weeks
- Cleaner result
- Keep v1 as safety net

**How:**
- Greenfield v2 repo
- Use battle-tested tools
- Migrate novel features week 3
- Ship incrementally
- Cut over when ready

**Risk:** Low (pre-release, parallel deployment)

**Reward:** High (clean architecture, maintainable, extensible)

---

**The hardest decision is often not WHAT to do, but having the courage to do it.** 🚀

Since you're pre-1.0 with no users, you have a rare gift: **permission to start over with everything you've learned.**

Use it.
