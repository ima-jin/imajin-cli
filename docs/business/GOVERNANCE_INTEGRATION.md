# Governance & Ownership Structure Integration

**Last Updated:** 2026-01-11
**Status:** Active - Cross-Project Context
**Purpose:** Connect imajin-cli development with the broader imajin ecosystem governance model

---

## Overview

The imajin-cli project is part of the **five-project imajin ecosystem** that includes employee ownership and community governance structures. Understanding this context is critical for CLI development because:

1. **Contributor Attribution**: The CLI must track founder/community contributions for equity allocation
2. **Revenue Attribution**: `.fair` manifests link CLI operations to automatic royalty distribution
3. **Governance Coordination**: CLI commands support co-op formation and voting processes
4. **Launch Milestones**: CLI tracks readiness for key governance transitions

---

## Governance Structure (from imajin-os)

### Source Documents

The complete governance model is maintained in the **imajin-os** repository:

- **Primary**: `d:/projects/imajin/imajin-os/docs/governance/OWNERSHIP.md`
- **Financial**: `d:/projects/imajin/imajin-os/docs/governance/FINANCIALS.md`
- **Ecosystem**: `d:/projects/imajin/imajin-os/docs/governance/ECOSYSTEM.md`
- **Strategy**: `d:/projects/imajin/imajin-os/docs/governance/SEED_THINKING.md`

### Dual-Entity Model

**Phase 1 (Year 1-2): Corporation**
- Delaware C-Corp for speed and fundraising
- Standard equity grants to founders/employees/investors
- Founder control during product-market fit phase

**Phase 2 (Year 3+): Co-op + Corporation Hybrid**
- **Imajin Cooperative** (member-owned) holds 100% of common shares
- **Imajin Inc.** (operational entity) can issue preferred shares to investors
- Co-op owns corporation = community control + investor capital

**Key Principle**: "Community-owned company, not founder's exit vehicle"

---

## Founding Team Structure

### Primary Co-Founders (55-60% combined)

**Ryan Veteze: 27.5-30%**
- Technical vision, product design, hardware/firmware architecture
- Fundraising, investor relations, protocol design
- Vesting: 4 years, 1-year cliff

**Debbie Bush: 27.5-30%**
- Operations, supply chain, manufacturing, fulfillment
- Finance, legal, business operations, quality systems
- Vesting: 4 years, 1-year cliff

### Additional Co-Creators (~6 positions, 15-20% total)

From Ryan's Discord message (2026-01-11), the 11-person founding team includes:
- Debbie Bush (co-founder)
- Jim Matheson (board designer)
- Chris Harrison (shop helper/builder)
- Troy Strum (coder)
- Hermann (South Africa)
- Justin Hawley (3D printer integration)
- Rosso (visual designer, South Africa)
- Fox (community)
- Chris De Castro (art director)
- Gus (Rich & Julie's son, fungeon space contributor)
- Ryan Veteze (founder)

**Equity Allocation Framework**:
- Co-Founder / Hardware Lead: 4-6%
- Co-Founder / Firmware Engineer: 4-6%
- Co-Founder / Protocol Architect: 3-5%
- Co-Founder / Community Lead: 2-4%
- Co-Founder / Creative Director: 2-4%
- Co-Founder / Additional Role: 1-2%

**Earning Equity** (from Ryan's message):
> "establish some level of contribution, and then we can equate that to earned equity in the entity. It's typically a commitment of hours spread over years to earn from 0.5 to 3% as founders."

### Advisors (~6 positions, 1.5-3% total)

- Technical Advisor (AI/Local LLM): 0.5%
- Hardware Manufacturing Advisor: 0.5%
- Crypto/Web3 Advisor: 0.5%
- Gallery/Art World Advisor: 0.25%
- Go-to-Market Advisor: 0.25%
- Legal/Governance Advisor: 0.25%

Vesting: 2 years, quarterly, no cliff

### Other Allocations

- **Employee Pool**: 15% (4-year vesting, 1-year cliff)
- **Community Reserve**: 10% (MJN patronage rewards)
- **Available for Investors**: ~15-20% (diluted over multiple rounds)

---

## Integration with .fair Attribution

### Every Equity Grant = .fair Manifest

Example from OWNERSHIP.md:

```json
{
  "title": "Imajin Inc. Equity Grant - Co-Founder (Firmware)",
  "recipient": {
    "name": "[Name TBD]",
    "role": "Co-Founder, Firmware Engineering",
    "wallet": "sol:[address]"
  },
  "allocation": {
    "equity_percent": 0.04,
    "shares": 440000,
    "vesting": "4 years, 1-year cliff"
  },
  "governance": {
    "board_seat": false,
    "voting_power": "1x (2x after Year 5)",
    "veto_rights": "None"
  },
  "patronage_bonus": {
    "mjn_allocation": 50000000,
    "vesting": "4 years, linear"
  },
  "conditions": {
    "non_compete": "2 years post-departure",
    "ip_assignment": "All work product",
    "co_op_membership": "Automatic upon grant"
  }
}
```

**Why This Matters for CLI**:
- Transparent equity allocation (on-chain record via Solana/Arweave)
- Revenue splits automated (if equity holders contribute to marketplace)
- Provenance tracking (who built what, when)
- Community visibility (no hidden grants)

---

## Governance Evolution Timeline

### Year 1: Founder-Led Corporation
- Focus: Product-market fit, survival, fundraising
- Structure: Delaware C-Corp, standard SAFE/equity
- Board: 2 founders + investor + independent

### Year 2: Employee Participation
- Hire 6-8 people, grant equity
- First employee board seat (elected)
- Begin designing Co-op structure

### Year 3: Token Launch + Community Seats
- MJN token goes live
- First community board seat (top MJN holders elect)
- Begin .fair-based marketplace with community splits

### Year 4: Co-op Formation
- File Imajin Cooperative (legal entity)
- Device owners become members
- Co-op begins buying common shares from corporation

### Year 5: Governance Transition Complete
- Co-op owns 100% of common shares in Imajin Inc.
- Investors retain preferred shares (economic rights)
- Board: 2 founder + 2 employee + 3 community + 2 investor
- Dual-class voting expires (founder 2x → 1x)

### Year 10: Fully Decentralized
- Company operations minimal (protocol self-sustaining)
- DAO governs protocol upgrades
- Community nodes run infrastructure
- "The company folded into the infrastructure itself"

---

## CLI Development Implications

### 1. Contributor Tracking Commands

**Required for Equity Calculation**:
```bash
# Log founder contributions
imajin-cli founder log-hours --name "Troy Strum" --role firmware --hours 40
imajin-cli founder contribution-add --name "Hermann" --type protocol --description "MJN tokenomics design"

# Calculate equity allocation
imajin-cli founder equity-calculate --contributor-id troy --hours-threshold 1000
imajin-cli founder equity-report --format json

# Generate .fair manifests for grants
imajin-cli founder grant-create --name "Jim Matheson" --role hardware --equity 0.05
```

### 2. Milestone Coordination

**Launch Readiness** (from Ryan's message: "After we launch this light"):
```bash
# Check launch milestone status
imajin-cli milestone check --name "luxury-launch"
imajin-cli milestone contributors --milestone launch --show-hours

# Co-op formation tracking
imajin-cli co-op formation-status
imajin-cli co-op member-add --device-owner-id 12345
```

### 3. Revenue Attribution

**Marketplace Integration** (Year 3):
```bash
# Configuration marketplace
imajin-cli marketplace publish --config custom-pattern.json --fair-manifest manifest.json
imajin-cli marketplace revenue-split --config-id 123 --show-contributors

# Automatic royalty calculation
imajin-cli attribution calculate-royalties --sale-id 456
imajin-cli attribution distribute --transaction-id 789
```

### 4. Device Sales + Token Allocation

**Hardware Sales Flow** (from ECOSYSTEM.md):
```bash
# Device sale triggers
imajin-cli device sale-complete --order-id 12345
# → Generates .fair manifest
# → Uploads to Arweave
# → Mints NFT on Solana (via mjn protocol)
# → Creates vesting contract (40M MJN, 24mo)
# → Generates claim code

# MJN allocation tracking
imajin-cli token allocation-create --device-serial MJN-2025-001 --amount 40000000
imajin-cli token vesting-schedule --beneficiary-wallet sol:[address]
```

---

## MJN Token Patronage Mechanism

### Device Ownership → MJN Allocation

From OWNERSHIP.md:

```
Standard Luxury ($2,000): 40M MJN (vested 24 months)
Ultra-Lux Infinity ($4,000): 100M MJN (vested 24 months)
Consumer Edition ($650): 20M MJN (vested 24 months)
DIY Kit ($500): 10M MJN (vested 24 months)
```

**Early Adopter Bonuses**:
- Year 1 buyers: 2x multiplier
- First 100 units: 3x multiplier (Founder Edition)
- DesignTO exhibition period: 2.5x multiplier

### Marketplace Contributions → MJN Rewards

**Configuration Marketplace (Year 3+ launch)**:
- Custom code contributions: 5-50M MJN per accepted submission
- Hardware component designs: 10-100M MJN per design
- Installation wizards: 2-20M MJN per wizard
- Pattern libraries: 1-10M MJN per pattern pack
- Dev tools/handlers: 20-200M MJN per tool

**CLI Commands**:
```bash
imajin-cli marketplace submit --type custom-code --file pattern.js
imajin-cli marketplace reward-calculate --submission-id 123
imajin-cli token claim-reward --reward-id 456
```

---

## Anti-Dilution Protection for Community

From OWNERSHIP.md (lines 352-383):

### 1. Community Reserve = Non-Dilutable
- 10% reserve explicitly protected in charter
- New investors cannot dilute below 10%
- If dilution occurs, company must top up from treasury

### 2. Patronage Multipliers Increase with Dilution
- Base: 40M MJN per Standard Lux
- Post-Series A (20% dilution): 50M MJN per unit
- Post-Series B (35% dilution): 60M MJN per unit

### 3. Board Seats = Governance Rights, Not Just Equity
- Community seats protected regardless of equity %
- Even if VCs own 40%, community still has 3/9 board seats

### 4. Token Launch = Permanent Stakeholder Alignment
- Once MJN launches, community holds independently valuable asset
- Company buys back MJN with revenue → direct value flow
- Even if company gets acquired, protocol continues

---

## Next Steps for CLI Integration

### Immediate (Q1 2026)

1. **Create Contributor Tracking System**
   - Database schema for founder contributions
   - Hours logging with attribution
   - Equity calculation based on thresholds

2. **Design .fair Manifest Generator**
   - Template for equity grants
   - Integration with Solana wallet addresses
   - Arweave upload pipeline

3. **Build Launch Milestone Tracker**
   - Checklist for "launch this light" milestone
   - Contributor hours summary
   - Equity proposal generator

### Short-Term (Month 1-3)

4. **Device Sale Integration**
   - Webhook from imajin-ai/web → CLI
   - Automatic NFT minting
   - MJN vesting contract creation

5. **Token Allocation System**
   - MJN vesting schedules
   - Early adopter multiplier calculation
   - Claim code generation

### Medium-Term (Month 6-12)

6. **Marketplace Infrastructure**
   - Configuration submission pipeline
   - Revenue split calculation
   - Automatic royalty distribution

7. **Co-op Formation Tools**
   - Member registration
   - Voting system
   - Board election infrastructure

---

## Philosophy: Community-Owned from Day One

From Ryan's Discord message:
> "I will work to codify this group as the founders of imajin... This group has been critical in helping it come together and / or being just being inspiring and pushing forward the creativity going on around all of us all of the time."

**Core Principle**: "Patronage-based ownership where everyone who contributes meaningfully earns a stake."

**Long-Term Vision**: "Whole communities owning voting blocks. Network nodes governed by stakeholder collectives. The company eventually folding into the infrastructure itself."

---

## Key Decisions Still Needed

From OWNERSHIP.md (lines 500-535):

1. **Additional Co-Creator Identification**
   - Map the 11-person Discord team to equity framework
   - Determine roles: hardware, firmware, protocol, community, creative
   - Calculate equity % based on contribution hours/impact

2. **Contribution Threshold Formalization**
   - Define: What equals 0.5% vs 1% vs 3%?
   - Time-based (hours over years) or impact-based?
   - Retroactive calculation for past work?

3. **Launch Milestone Definition**
   - What triggers equity formalization?
   - "After we launch this light" = DesignTO? First 100 units? Profitability?

4. **Co-op Jurisdiction**
   - Delaware (flexible, VC-friendly)
   - Vermont (benefit corp-friendly)
   - Ontario (Canadian base, SR&ED credits)
   - Multi-jurisdictional structure?

---

## Related Documents

**In imajin-cli**:
- [docs/.fair-license.md](../.fair-license.md) - Attribution protocol
- [docs/business/comprehensive-business-plan.md](./comprehensive-business-plan.md) - Revenue model
- [docs/business/founder-profile-ryan-veteze.md](./founder-profile-ryan-veteze.md) - Leadership
- [docs/agents/IMAJIN_LIGHTING.md](../agents/IMAJIN_LIGHTING.md) - Hardware ecosystem context

**In imajin-os** (external):
- `d:/projects/imajin/imajin-os/docs/governance/OWNERSHIP.md` - **Primary source**
- `d:/projects/imajin/imajin-os/docs/governance/FINANCIALS.md` - Financial projections
- `d:/projects/imajin/imajin-os/docs/governance/ECOSYSTEM.md` - Five-project stack
- `d:/projects/imajin/imajin-os/docs/governance/SEED_THINKING.md` - Strategic vision

---

**This CLI is not just developer tooling - it's the operational backbone of a community-owned company.**
