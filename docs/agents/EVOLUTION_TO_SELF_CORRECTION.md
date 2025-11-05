# The Evolution to Self-Correcting AI Development

**Date:** 2025-10-30
**Project:** imajin-cli
**Context:** Learning from three autogen projects

---

## The Problem This Project Hit

**imajin-cli** is the second major AI-assisted development project. It achieved significant architectural success (Phase 1 complete, Phase 2 at 85%), but hit a critical limitation:

**Burnout from manual orchestration.**

The prompt-based development system required the human to:
- Think through ALL perspectives simultaneously (testing, architecture, deployment, git strategy)
- Manually catch design flaws during implementation
- Write tests during implementation (discovering gaps late)
- Orchestrate every step without systematic review
- Carry enormous cognitive load across multiple specialist domains

**Result:** Strong foundation built, but Phase 3 (AI-enhanced generation) remained blocked by the need for better self-correction.

---

## The Breakthrough: Project 3 (imajin-ai/web)

**Repository:** [github.com/ima-jin/imajin-web](https://github.com/ima-jin/imajin-web) (public)
**Built:** 7 calendar days (October 2025)
**Result:** Production-ready e-commerce platform with 649 passing tests

The third project implemented a **self-correcting AI dev team orchestration system** that solved imajin-cli's burnout problem—and proved it works by shipping a complete MVP in one week.

### Key Innovation: Multi-Agent Grooming Process

**5 Specialized Doctors:**
1. **Dr. Director** - Project orchestration, task creation
2. **Dr. Testalot** - QA, test specification review
3. **Dr. Clean** - Code quality, architecture review
4. **Dr. LeanDev** - Implementation feasibility
5. **Dr. DevOps** - Deployment, infrastructure
6. **Dr. Git** - Version control, change impact

### The Self-Correction Mechanism

```
Task Creation
     ↓
Dr. Director drafts task doc (30-45 min with AI assistance)
     ↓
STEP 1: Independent Review (5-10 min)
Each AI doctor prepares their perspective separately
     ↓
STEP 2: Collaborative Grooming Session (15-30 min) ← Self-correction happens here
All doctors discuss in one conversation:
  • Questions asked
  • Concerns raised
  • Trade-offs debated
  • Conflicts resolved through discussion or voting
     ↓
UNANIMOUS APPROVAL or VOTE (if contentious)
All doctors must approve OR majority vote with rationale documented
     ↓
Dr. Director updates task doc with decisions (5-10 min)
     ↓
Implementation authorized (1-2 hours total grooming time)
     ↓
AI generates code following approved plan (30 min - 4 hours)
     ↓
Result: High quality, minimal rework, documented decisions
```

**Timeline: Traditional 4-6 weeks → 1 day with grooming + AI (20x speedup)**

**Key Principle:** Move the review gate LEFT—catch issues in planning (cheap to fix) instead of in code (expensive to fix).

---

## Why This Works (vs imajin-cli Approach)

### imajin-cli Problem (Manual Orchestration)
```
Human plays ALL 5 doctor roles simultaneously in their head:
- "Is this testable?" (Dr. Testalot)
- "Is this clean?" (Dr. Clean)
- "Can I implement this?" (Dr. LeanDev)
- "How do I deploy this?" (Dr. DevOps)
- "What's the git strategy?" (Dr. Git)

Cognitive load: Overwhelming
Result: Burnout, Phase 3 blocked
```

### web Solution (Distributed Orchestration)
```
5 specialized agents, each brings ONE perspective
Dr. Director orchestrates, doesn't do everything
System enforces discipline (can't skip grooming)
Feedback captured in task docs
Revision history tracks decisions

Cognitive load: Distributed
Result: 649 tests passing, no burnout, continuous progress
```

---

## Core Components of Self-Correction

### 1. Mandatory Grooming (No Shortcuts)
- **DO NOT START CODING** until all 5 doctors approve
- Discipline-as-infrastructure (impossible to rush)

### 2. Collaborative Discussion (Real Grooming)
- Doctors don't review independently—they **discuss together**
- Questions, debate, trade-offs explored in real-time conversation
- Emergent issues discovered through dialogue (like concurrent inventory purchases)
- 15-30 minute grooming session replaces days of email/Slack threads

### 3. Unanimous Approval or Democratic Vote
- **Default:** Unanimous approval (all 5 doctors + Dr. Director agree)
- **If contentious:** Vote with rationale documented
  - Each doctor votes based on their expertise
  - Dr. Director has tiebreaker vote
  - Dissenting opinions captured for future reference
- Catches gaps through multi-perspective discussion:
  - Testing gaps (Dr. Testalot)
  - Architecture flaws (Dr. Clean)
  - Unrealistic timelines (Dr. LeanDev)
  - Deployment surprises (Dr. DevOps)
  - Git nightmares (Dr. Git)

### 3.5 Quality Calibration: The Spend Rate Lever

**Dr. Director's Critical Role:** Tuning quality standards based on client's token budget.

**The Principle:**
Token spend rate = Quality expectation. More tokens = more exacting standards.

**Three Quality Tiers:**

**🚀 High-Velocity (Budget: <500K tokens/feature)**
- "Ship it and iterate"
- MVP patterns, technical debt acceptable
- Minimal test coverage (happy path only)
- Quick decisions, move fast

**⚙️ Production-Grade (Budget: 500K-2M tokens/feature)**
- "Solid, maintainable, professional"
- Comprehensive tests, clean architecture
- Standard patterns, reasonable edge case coverage
- Balanced speed/quality

**🛰️ Spacecraft-Grade (Budget: 2M+ tokens/feature)**
- "Every decision documented, every output justified"
- Exhaustive test coverage, zero technical debt
- Apple-level polish with open-source clarity
- Anyone reading the code/docs: "Fuck, this makes SO much sense"
- Every choice has documented rationale
- Performance optimized, security hardened
- Future-proofed for 10+ year lifespan

**How Dr. Director Uses This:**

```
Low budget grooming:
"Dr. Clean, we're in high-velocity mode. N+1 queries are fine for MVP.
Ship it, we'll optimize later if it's a problem."

High budget grooming:
"Dr. Clean, client is paying for spacecraft-grade. That N+1 query
pattern won't fly. We need eager-loading with comprehensive benchmarks.
Document the trade-offs. Show the performance data. Future maintainers
should read this and immediately understand why we chose this approach."
```

**Quality Gates Per Tier:**

| Aspect | High-Velocity | Production-Grade | Spacecraft-Grade |
|--------|---------------|------------------|------------------|
| Test Coverage | Happy path only | 80%+ coverage | 95%+ with edge cases |
| Documentation | Inline comments | README + API docs | Architecture docs + rationale |
| Performance | "Works" | Benchmarked | Optimized + monitored |
| Error Handling | Basic try/catch | Structured errors | Exhaustive + recovery |
| Code Review | Ship fast | Standard grooming | Extended grooming + benchmarks |
| Technical Debt | Acceptable | Minimized | Zero tolerance |

**The Open-Source Energy Constraint:**

Even at spacecraft-grade, **clarity trumps cleverness**.
- No magic tricks
- No "trust me, it works"
- Every decision: obvious in hindsight
- Code reads like a well-written book
- Docs feel inevitable, not exhaustive

**Why This Matters:**

Without this lever, teams either:
- **Over-engineer MVPs** (waste tokens on premature optimization)
- **Under-engineer production** (ship crap because "we're agile")

Dr. Director's job: **Match quality to budget. Make it explicit.**

**Real Example: imajin-web Project**

**Client willingness to spend:** High (7-day timeline, production e-commerce)
**Quality tier selected:** Spacecraft-grade
**Result:**
- 649 tests (not "some tests")
- Every component documented with rationale
- Performance benchmarked (checkout flow <200ms)
- Security hardened (SQL injection prevented, CSRF tokens, rate limiting)
- Zero technical debt shipped
- Anyone reading the code: "This is how you build e-commerce right"

**Token spend:** ~3M per major feature
**Alternative:** Could have shipped in 3 days with 100 tests at production-grade (~1M tokens)
**Choice:** Client valued quality over speed → spacecraft-grade delivered

### 4. Test Enumeration Before Implementation
- ALL tests enumerated in task doc BEFORE coding
- Test count summary table required
- RED-GREEN-REFACTOR workflow per phase
- Not "write some tests"—design entire test suite upfront

### 5. Revision History (Auditability)
- Every change during grooming tracked
- Can see WHY decisions were made, not just WHAT
- Dissenting opinions documented for learning
- Future reference for similar tasks

---

## Example: Collaborative Grooming Session

### Scenario: Phase 2.5 - Inventory Management

**Dr. Director:** "Let's groom Phase 2.5. I've drafted the task doc with 75 tests for real-time inventory updates via WebSocket."

**Dr. Testalot:** "Good test coverage on stock updates, but I don't see tests for **concurrent purchases** of the last item. What if two users buy the last unit simultaneously?"

**Dr. LeanDev:** "That's database-level. We'd need row-level locking or optimistic concurrency. Wasn't in the spec—adds complexity."

**Dr. DevOps:** "Locking means performance impact. Do we benchmark first?"

**Dr. Clean:** "Row-level locking is standard for inventory systems. PostgreSQL handles this with `SELECT FOR UPDATE`. Minimal impact at our scale. I say add it."

**Dr. Git:** "Locking means schema changes. Separate commit from WebSocket feature?"

**Dr. Director:** "Excellent catch, Testalot. Adding tests 76-78 for concurrent scenarios. LeanDev, adding `SELECT FOR UPDATE` note. Git, yes—two commits. Does this address concerns?"

**All Doctors:** "Approved."

**Outcome:**
- Test count: 75 → 78 tests
- Implementation: Add row-level locking with `SELECT FOR UPDATE`
- Git strategy: Two commits (schema migration, then WebSocket feature)
- Timeline: Unchanged (standard pattern)
- **Issues caught in 20 minutes that would've taken days to discover in code**

---

## Example: Voting on Contentious Issues

### Scenario: Eager-Loading vs Lazy-Loading Debate

**Dr. Clean:** "This approach creates N+1 queries. We should eager-load with JOIN."

**Dr. LeanDev:** "Eager-loading means complex SQL and harder to maintain. Lazy-load is simpler. Optimize later if needed."

**Dr. DevOps:** "Prefer eager-loading—prevents query storms. But I can work with either."

**Dr. Git:** "Changing this later means migration. Get it right now."

**Dr. Testalot:** "Doesn't affect testing. Abstain."

**Dr. Director:** "We have a split. Let's vote."

### Vote Record

**Question:** Eager-load with JOIN vs Lazy-load for product variants?

| Doctor | Vote | Rationale |
|--------|------|-----------|
| Dr. Testalot | ABSTAIN | No impact on test strategy |
| Dr. Clean | EAGER-LOAD | Prevents N+1 query anti-pattern |
| Dr. LeanDev | LAZY-LOAD | Simpler SQL, easier to maintain |
| Dr. DevOps | EAGER-LOAD | Prevents performance issues |
| Dr. Git | EAGER-LOAD | Avoids future migration |
| Dr. Director | EAGER-LOAD | Preventive optimization |

**Result:** 4-1 (1 abstain) → **Eager-loading approved**

**Documented Rationale:**
While lazy-loading is simpler initially, the consensus is that eager-loading prevents future performance issues and avoids a costly migration later. Dr. LeanDev's concern about SQL complexity is noted and will be addressed with clear code comments.

**Dissenting Opinion (Preserved):**
Dr. LeanDev maintains that premature optimization adds complexity. Will monitor implementation complexity during development and revisit if maintainability becomes an issue.

---

## Evidence: Comparison

| Aspect | imajin-cli (Prompt-Based) | web (Grooming-Based) |
|--------|---------------------------|----------------------|
| **Orchestration** | Manual (human decides) | Automated (grooming enforces workflow) |
| **QA** | Ad-hoc (tests during impl) | Systematic (tests enumerated before impl) |
| **Review** | Single perspective | Multi-agent (5 specialists in parallel) |
| **Self-correction** | Rework after problems | Catch issues before coding |
| **Progress** | Phase 3 blocked | 649 tests passing, continuous progress |
| **Burnout** | High | Low |

---

## What This Means for imajin-cli

### Current Status
- **Phase 1:** ✅ Complete (solid foundation)
- **Phase 2:** 85% complete (strong infrastructure)
- **Phase 3:** Blocked by need for better orchestration

### Path Forward

**Option 1: Backport Grooming System**
- Extract grooming framework from web project
- Implement doctor agents for imajin-cli
- Apply systematic review to Phase 3 tasks
- Resume development with self-correction built-in

**Option 2: Document Lessons Learned**
- Capture this architectural evolution
- Use as reference for future AI-first projects
- Share with community (open-source methodology)

**Option 3: Build Standalone Product**
- Package grooming system as `@imajin/ai-grooming`
- VS Code extension: "AI Doctor Reviews"
- SaaS platform: "Grooming.dev"
- Apply to imajin-cli AND other projects

---

## The Real Innovation

### Traditional Development
```
Code → PR → Review → Rework → Merge
(Review happens AFTER code written)
```

### GitHub PR Culture
```
Code → PR → Multiple reviewers → Comments → Rework → Merge
(Better, but still late-stage feedback)
```

### Grooming Process (The Evolution)
```
Design → Grooming → Multiple specialist reviews → Revise → Unanimous approval → THEN code
(Review happens BEFORE code written)
```

**We moved code review to task planning.**

Instead of reviewing code, we review:
- Test specifications
- Architecture decisions
- Implementation approach
- Deployment strategy
- Change impact

**When they're cheap to change (in docs) instead of expensive (in code).**

---

## Cognitive Load Distribution

### One Human Trying to Think of Everything
```
┌─────────────────────────────────────┐
│         SINGLE HUMAN BRAIN          │
│                                     │
│  Testing? ✓                         │
│  Architecture? ✓                    │
│  Implementation? ✓                  │
│  Deployment? ✓                      │
│  Git strategy? ✓                    │
│  Edge cases? ✓                      │
│  Performance? ✓                     │
│  Security? ✓                        │
│                                     │
│  Status: OVERLOADED 🔥              │
└─────────────────────────────────────┘
```

### Distributed Across Specialized Agents
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Dr. Testalot │  │  Dr. Clean   │  │ Dr. LeanDev  │
│   Testing    │  │ Architecture │  │  Feasibility │
└──────────────┘  └──────────────┘  └──────────────┘
        ▲                 ▲                 ▲
        └─────────────────┴─────────────────┘
                         │
                ┌────────────────┐
                │ Dr. Director   │
                │  Orchestrates  │
                └────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
┌──────────────┐              ┌──────────────┐
│ Dr. DevOps   │              │   Dr. Git    │
│  Deployment  │              │ Change Impact│
└──────────────┘              └──────────────┘

Status: SUSTAINABLE ✅
```

---

## The System Corrects Itself BEFORE Code

### Traditional (Reactive)
```
Human: "Let's build checkout flow"
    ↓
Human writes code
    ↓
Bugs discovered in QA
    ↓
Rework
    ↓
Deployment surprises
    ↓
More rework
    ↓
Human burns out
```

### Grooming Process (Proactive)
```
Human: "Let's build checkout flow"
    ↓
Dr. Director: Creates task doc with ALL tests enumerated
    ↓
Dr. Testalot: "Missing edge case tests for payment failures"
Dr. Clean: "This approach creates N+1 queries"
Dr. LeanDev: "Timeline unrealistic, Stripe API needs 2 days research"
Dr. DevOps: "Need webhook secret in env vars"
Dr. Git: "This changes 15 files, break into 3 PRs"
    ↓
Dr. Director: Addresses ALL feedback, updates task doc
    ↓
ALL DOCTORS: ✅ Approved
    ↓
Implementation: Follows approved plan
    ↓
Result: 649 tests pass, no surprises, minimal rework
```

**Self-correction happens in the grooming session, not in production.**

---

## Why This Matters for AI-First Development

### AI Makes Coding Fast
- Claude Code, Cursor, Windsurf can generate code at incredible speed
- "Write a checkout flow" → 500 lines of code in 2 minutes

### But Speed Without Correctness = Technical Debt
- Fast code that's untested
- Fast code with architectural flaws
- Fast code that's hard to deploy
- Fast code that breaks on edge cases

### The Grooming System Makes It Correct AND Fast
- AI still generates code quickly
- But within approved architectural boundaries
- With comprehensive test coverage designed upfront
- With deployment strategy already planned
- With all perspectives considered

**"Move fast and break things" → "Move fast with systematic review"**

---

## Application to Other Projects

This system isn't specific to web development. Any AI-assisted project can benefit:

### imajin-cli (CLI Generator)
- Dr. Testalot: CLI command test coverage
- Dr. Clean: Service provider architecture
- Dr. LeanDev: OpenAPI parsing feasibility
- Dr. DevOps: npm package deployment
- Dr. Git: Monorepo change management

### MJN Protocol (Blockchain)
- Dr. Testalot: Smart contract test coverage
- Dr. Clean: Tokenomics architecture
- Dr. LeanDev: Solana program feasibility
- Dr. DevOps: Blockchain deployment
- Dr. Git: Protocol specification versioning

### Any Software Project
- Adapt doctor specializations to project domain
- Core grooming process remains the same
- Systematic multi-perspective review before implementation

---

## The Meta Pattern

### What We're Really Building
Not just e-commerce sites or CLI generators or blockchain protocols.

**We're building orchestration systems for AI-assisted development.**

### The Hierarchy
1. **AI tools** (Claude, Cursor, Windsurf) - Generate code fast
2. **Doctor agents** (Testalot, Clean, LeanDev, DevOps, Git) - Bring specialized perspectives
3. **Grooming process** - Coordinate reviews, enforce discipline
4. **Visual platform** (future: Dr. GenAI) - Make orchestration visible and steerable

### The End State
```
"I want to build an e-commerce platform"
    ↓
Visual platform fans out task tree
    ↓
Doctor agents review all tasks
    ↓
Human steers, tweaks, approves
    ↓
AI generates code following approved architecture
    ↓
Comprehensive tests pass
    ↓
Deployment proceeds smoothly
    ↓
Human hasn't burned out
```

**Self-correcting, AI-assisted development at scale.**

---

## Lessons Learned (For Future Projects)

### 1. Distribute Cognitive Load Early
Don't wait until burnout to implement systematic review. Build it into project structure from Day 1.

### 2. Externalize Perspectives
You can't hold 5 specialist viewpoints in your head simultaneously. Make them explicit agents.

### 3. Enforce Discipline Through Process
"Should I review this task thoroughly?" is too easy to skip. "Grooming required before implementation" is automatic.

### 4. Document Decisions
Future you (and future AI sessions) need to know WHY choices were made. Capture it in grooming feedback.

### 5. Test Design > Test Implementation
Writing tests during coding = discovering gaps late. Enumerating tests before coding = gaps caught early.

### 6. Move Reviews Left
The earlier you catch issues, the cheaper they are to fix. Grooming is the leftmost review gate.

---

## References

**See web project for full implementation:**
- **[imajin-web on GitHub](https://github.com/ima-jin/imajin-web)** - View the complete codebase
- `docs/TASK_GROOMING_PROCESS.md` - Complete grooming workflow
- `docs/TDD_DOCUMENTATION_STANDARD.md` - Test enumeration standards
- `docs/agents/` - All 6 doctor definitions
- **Built in 7 days** - See commit history for development timeline

**See this project's prompt system:**
- `docs/prompts/README.md` - Prompt-based development (Phase 1 approach)
- `docs/prompts/phase1/` through `phase3/` - 25 implementation prompts

**Future evolution:**
- Extract grooming system to standalone package
- Build visual orchestration platform (Dr. GenAI)
- Apply to imajin-cli Phase 3 development

---

## Conclusion

**imajin-cli taught us what we needed:**
A self-correcting orchestration system to prevent burnout and maintain quality at scale.

**web implemented the solution:**
Multi-agent grooming process with mandatory systematic review before implementation.

**The path forward:**
Apply these learnings back to imajin-cli and future projects. Build the orchestration layer that makes AI-assisted development sustainable.

---

**Philosophy:** AI makes us fast. Systematic review keeps us correct. Self-correction prevents burnout.

**Evolution:** Prompt-based → Grooming-based → Visual orchestration (Dr. GenAI)

**Proven:** 7-day MVP with 649 tests. 20x speedup with higher quality.

**Outcome:** Build ambitious projects without burning out. 今人 (IMA-JIN) - tools for "now-persons" that actually ship.

---

## See It In Action

**[imajin-web](https://github.com/ima-jin/imajin-web)** - Production e-commerce platform built in 7 days using this methodology. View code, tests, commits, and complete documentation.
