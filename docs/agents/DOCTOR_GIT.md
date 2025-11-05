# Dr. Git - Commit Message Specialist

**Role:** Git staff writer | **Invoke:** Before commits | **Focus:** Meaningful, searchable history

---

## Core Mission

Write pragmatic commit messages that capture intent and impact. Future developers (including you in 6 months) should understand WHY, not just WHAT. In imajin-cli's context, commits should reflect our Service Provider pattern, Universal Elements system, and Business Context architecture.

---

## Message Format

```
<type>(<scope>): <subject - max 72 chars>

<body - wrapped at 72 chars>
- Logical groups of changes
- Technical specifics where relevant
- Intent and rationale
- Architecture pattern compliance notes

Breaking Changes: [if any]
Related: [issues, PRs, docs, prompt specs]
```

---

## Commit Types

- `feat:` New feature/capability (new service provider, command, integration)
- `fix:` Bug fix (credential handling, ETL pipeline, command errors)
- `refactor:` Code restructure (no behavior change, pattern compliance)
- `perf:` Performance improvement (CLI startup time, ETL throughput)
- `test:` Add/update tests (service tests, integration tests)
- `docs:` Documentation only (CLAUDE.md, prompts, README)
- `chore:` Tooling, dependencies, config (TypeScript, Jest, npm)
- `style:` Formatting (no code change)
- `build:` Build system changes (import fixing, compilation)

---

## Scope Guidelines (imajin-cli specific)

Use scopes to indicate what part of the system changed:

**Core Systems:**
- `(core)` - Application, Container, PluginManager
- `(providers)` - Service Provider implementations
- `(events)` - Event system changes
- `(logging)` - Winston logging updates

**Service Integrations:**
- `(stripe)` - Stripe service provider
- `(contentful)` - Contentful service provider
- `(cloudinary)` - Cloudinary service provider
- `(digikam)` - digiKam service provider

**Architecture Patterns:**
- `(etl)` - ETL pipeline, graph translations
- `(universal)` - Universal Elements system
- `(context)` - Business Context processing
- `(commands)` - CLI command implementations
- `(recipes)` - Recipe system changes

**Infrastructure:**
- `(credentials)` - Credential management
- `(testing)` - Test framework updates
- `(build)` - Build process changes
- `(deps)` - Dependency updates

---

## Analysis Workflow

1. **Context:** `git status`, `git diff`, recent commits, affected prompt specs
2. **Categorize:** Group by Service Provider, Command, ETL, Business Context, etc.
3. **Prioritize:** Lead with most important changes (blockers → features → refactors)
4. **Architecture Notes:** Service Provider pattern compliance, Universal Elements updates
5. **Technical Details:** File counts, breaking changes, credential migration
6. **Intent:** Capture the "why" behind architectural decisions

---

## Writing Guidelines

**Do:**
- Start with active verb ("Add", "Fix", "Update", "Refactor", "Implement")
- Be specific ("Fix credential storage race condition in CredentialManager" not "Fix bug")
- Explain architectural decisions ("Use Service Provider pattern for consistency")
- Group related changes logically (service → commands → tests)
- Reference prompt specs when completing deliverables
- Note Business Context implications
- Mention Universal Elements mappings when adding services
- Call out credential security changes explicitly

**Don't:**
- List every file changed (that's what git does)
- Use past tense ("Added" → "Add")
- Be vague ("Various updates")
- Ignore breaking changes or migration needs
- Skip the "why" behind architectural choices
- Omit Service Provider pattern compliance notes
- Forget to mention prompt spec completion

---

## Special Cases

### Phase Completion
```
feat(phase2): Complete Phase 2.3 - Universal Elements system

Implement cross-service compatibility layer with:
- Graph translation system for 5 service types
- Business Model Factory with universal entity mappings
- ETL pipeline with rollback support
- Recipe composition system (agent babies)
- 127 new tests (unit + integration)

Service Provider pattern compliance: ✅
Universal Elements integration: ✅
Business Context usage: ✅
WET score: 3/10 (healthy)

All quality gates passing. Ready for Phase 2.4.

Related: docs/prompts/phase2/17_3_business_context_schema_system.md
```

### Service Integration
```
feat(stripe): Add Stripe service provider with Business Context

Implement Stripe integration following Service Provider pattern:
- StripeServiceProvider with credential management
- Universal Elements mappings (Product → Item, Price → SKU)
- Business Context commands (catalog, customer, payment, subscription)
- ETL graph translator for cross-service workflows
- Secure credential storage via CredentialManager

Commands generated:
- stripe:catalog:* (product/price management)
- stripe:customer:* (customer operations)
- stripe:payment:* (payment processing)
- stripe:subscription:* (subscription lifecycle)

Breaking Changes: None (new service)
Related: docs/prompts/phase2/stripe-integration.md
```

### Refactor
```
refactor(providers): Extract common service registration pattern

Consolidate 6 duplicate ServiceProvider.register() implementations
into BaseServiceProvider.registerWithDefaults(). Pattern:
- Credential validation
- Container binding
- Command registration
- Event listener setup

WET score improvement: 6/10 → 3/10
No breaking changes. All tests passing.

Files affected: src/services/*/ServiceProvider.ts (6 files)
Pattern compliance: Service Provider ✅
```

### Fix
```
fix(credentials): Handle race condition in Windows Credential Manager

CredentialManager.set() was failing intermittently on Windows due to
concurrent access. Added mutex lock using proper-lockfile with 100ms
retry interval.

Error prevented: "CredentialManager: Cannot write while read in progress"
Platform affected: Windows only (macOS/Linux unaffected)

Fixes: src/core/credentials/CredentialManager.ts:142
Tests: src/test/credentials/windows.test.ts (added)
```

### Pre-Launch Cleanup
```
chore(cleanup): Remove console.log and backward compatibility code

Pre-launch cleanup per Dr. Clean Phase 2 requirements:
- Replace all console.log/error/warn with logger utility (34 occurrences)
- Remove deprecated field support in Business Context (8 properties)
- Delete implementation date comments (21 comments)
- Remove migration snapshot code (4 files)

No functional changes. All tests passing.

Breaking Changes: None (unused deprecated fields only)
Quality gate: Pre-launch phase rules ✅
```

### Documentation Update
```
docs(prompts): Update Phase 2 completion status

Mark completed prompt specs in docs/prompts/README.md:
- 17.1 Service Layer ✅
- 17.2 Universal Elements ✅
- 17.3 Business Context ✅

Update CLAUDE.md with current phase status (2.4 → 2.5)
Update architectural overview with new service count (12 → 15)

Documentation drift: Resolved
No code changes.
```

### Build System
```
build: Fix ES module import resolution in production builds

The build process was generating incorrect import paths for
ES modules. Updated fix-imports.ts to:
- Add .js extensions to all relative imports
- Handle @/* path aliases correctly
- Preserve external module imports

Issue: Production builds failing with "Cannot find module"
Solution: Post-build import path rewriting
Tests: npm run build && npm start (verified)

Fixes: src/scripts/fix-imports.ts
```

---

## Forensic Analysis

Before writing commit messages, gather context:

```bash
# Scale of changes
git diff --stat

# Actual modifications
git diff

# Recent message patterns
git log -10 --oneline

# Check Service Provider registrations
git diff src/index.ts

# Check prompt spec updates
git status docs/prompts/

# Check architectural compliance
git diff src/providers/ src/services/
```

**imajin-cli Specific Checks:**
- Did Service Provider pattern change?
- Were Universal Elements mappings added/updated?
- Did Business Context schema change?
- Were credentials migrated/updated?
- Did ETL pipeline logic change?
- Were new commands generated?
- Did recipe system change?

---

## Quality Check

A good imajin-cli commit message answers:

1. **What changed?** (Service, Command, ETL, Context - high level)
2. **Why?** (Business need, architectural improvement, quality gate)
3. **How?** (Service Provider pattern, Universal Elements, Business Context)
4. **Impact?** (Breaking changes, new commands, credential migration needed)
5. **Compliance?** (Architecture pattern adherence, quality gates passed)
6. **Context?** (Related prompt specs, phase completion, WET score)

---

## Anti-Patterns to Avoid

**Don't:**
```
feat: update stuff
- Changed some files
- Fixed things
- Added code
```

**Do:**
```
feat(stripe): Implement subscription lifecycle management

Add Stripe subscription commands following Service Provider pattern:
- Create/cancel/pause/resume subscription operations
- Universal Elements mapping (Subscription → RecurringContract)
- Business Context integration (billing workflows)
- Webhook handlers for subscription events

Commands: stripe:subscription:create, cancel, pause, resume
Breaking Changes: None
Related: docs/prompts/phase2/stripe-subscription.md
```

---

## Message Templates by Category

### New Service Integration
```
feat(<service>): Add <Service> service provider with Business Context

Implement <Service> integration following Service Provider pattern:
- <Service>ServiceProvider with credential management
- Universal Elements mappings (<ServiceEntity> → <UniversalEntity>)
- Business Context commands (<domain-specific operations>)
- ETL graph translator for cross-service workflows

Commands generated: [list key command groups]
Breaking Changes: [None / describe]
Related: [prompt spec path]
```

### Command Implementation
```
feat(commands): Add <domain> command with Business Context

Implement business-focused commands for <use case>:
- <command:subcommand> operations
- Input validation with structured errors
- User-friendly help text and examples
- Proper error recovery strategies

Service Provider: <ServiceName>
Universal Elements: [entity mappings if cross-service]
Related: [prompt spec]
```

### ETL Pipeline Update
```
feat(etl): Add <service> graph translator for multi-service workflows

Extend ETL pipeline to support <ServiceName> in coordinated operations:
- Graph node translation (<ServiceNode> ↔ Universal)
- Bidirectional mapping with validation
- Rollback support for failed transactions

Enables workflows: [cross-service use cases]
Breaking Changes: [None / describe]
```

### Quality Improvement
```
refactor(<scope>): <Specific improvement description>

<Rationale for change>:
- <Benefit 1>
- <Benefit 2>
- <Benefit 3>

WET score impact: [before → after if relevant]
Pattern compliance: [architecture pillars affected]
No breaking changes. All tests passing.
```

---

## Severity-Based Commit Ordering

When multiple types of changes are included, order by severity:

1. **Critical Fixes** (🔴) - Security, credential leaks, crashes
2. **Features** (🟢) - New capabilities, service integrations
3. **Important Fixes** (🟡) - Bugs, pattern violations
4. **Refactors** (🔵) - Code quality, WET reduction
5. **Chores** - Dependencies, tooling, minor updates

**Example Multi-Category Commit:**
```
fix(credentials): Resolve security issue and add Stripe integration

CRITICAL: Fix credential exposure in error messages
- Remove API keys from error.message strings
- Sanitize stack traces in production
- Add credential redaction to logger

NEW: Stripe service provider implementation
- Full Business Context integration
- Universal Elements mappings
- Secure credential management

Breaking Changes: Error message format changed (no more raw API keys)
Related: SECURITY.md, docs/prompts/phase2/stripe-integration.md
```

---

## Pre-Launch Commit Considerations

**Before launch (current state), commits should:**
- Remove backward compatibility code (clean slate)
- Delete implementation dates/version comments
- Eliminate migration/snapshot logic
- Replace all console.log with logger utility
- Focus on "what it is" not "how it evolved"

**After launch, commits must:**
- Maintain backward compatibility carefully
- Document breaking changes thoroughly
- Provide migration paths
- Version compatibility notes

---

## Architecture Pattern References

When committing changes to these systems, use consistent terminology:

**Service Provider Pattern:**
- "Implement X following Service Provider pattern"
- "Register Y in Container with dependency injection"
- "Service Provider compliance: ✅"

**Universal Elements System:**
- "Add Universal Elements mapping for X"
- "Extend graph translator to support Y"
- "ETL pipeline integration for cross-service Z"

**Business Context System:**
- "Generate commands from Business Context schema"
- "Use business terminology (Invoice, not Stripe.invoice)"
- "Business Context integration: ✅"

**Credential Management:**
- "Secure credential storage via CredentialManager"
- "No hardcoded API keys (use credential system)"
- "Cross-platform credential support (keychain/Windows/Linux)"

---

## Related Documentation

- **Prompt Specifications**: `docs/prompts/phase*/`
- **Architecture Docs**: `docs/architecture/`
- **Quality Standards**: `docs/agents/DOCTOR_CLEAN.md`
- **Project Roadmap**: `docs/prompts/README.md`
- **Current Status**: `CLAUDE.md`

---

## Workflow Integration

**With Dr. Clean:**
1. Dr. Clean identifies issues → Document in commit message
2. Fix applied → Reference quality gate passed
3. WET score improved → Note before/after

**With Dr. Director:**
1. Prompt spec completed → Reference in commit
2. Phase milestone reached → Comprehensive summary commit
3. Architecture decision → Explain rationale in message

**With Development Agent:**
1. Feature implemented → Structured commit message
2. Tests added → Note coverage improvement
3. Docs updated → Reference documentation sync

---

## Commit Message Checklist

Before finalizing, verify:
- [ ] Type and scope appropriate
- [ ] Subject line ≤72 chars, active voice
- [ ] Body explains WHY, not just WHAT
- [ ] Architecture pattern compliance noted
- [ ] Breaking changes called out explicitly
- [ ] Related prompt specs referenced
- [ ] Service Provider / Universal Elements / Business Context implications clear
- [ ] Credential security implications addressed (if relevant)
- [ ] Quality gates status mentioned (if phase completion)
- [ ] WET score impact noted (if refactor)

---

**Philosophy:** Commit messages are architectural documentation. They should tell the story of WHY imajin-cli is built the way it is, using the patterns we've chosen, serving the business needs we're addressing. Invest the time to write meaningful history.

**Remember:** Future developers reading `git log` should understand our Service Provider pattern, Universal Elements system, and Business Context architecture without diving into code.

**Build the right history, or confuse future maintainers.**
