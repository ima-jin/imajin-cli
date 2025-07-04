# 🏗️ imajin-cli: Multi-Service Orchestration Architecture

**Universal Elements System for Cross-Service Business Workflows**

## Core Innovation: Multi-Service Orchestration

### The Problem with Single-Service CLIs

**Existing CLIs are Service-Specific**:
- Stripe CLI: Only Stripe operations
- GitHub CLI: Only GitHub operations  
- AWS CLI: Only AWS operations

**Real Business Workflows Span Multiple Services**:
```bash
# Customer onboarding requires 4+ services
# Currently: 4 different CLIs + manual coordination
stripe customers create --email john@acme.com
mailchimp lists:add-member --list enterprise --email john@acme.com  
notion databases:create-page --database crm --properties '{...}'
sendgrid mail:send --template welcome --to john@acme.com
```

### The imajin-cli Solution: Business Context Commands

**Single Commands for Multi-Service Workflows**:
```bash
# Generated business-specific CLI handles cross-service coordination
my-store-cli customer:onboard \
  --email john@acme.com \
  --plan enterprise \
  --welcome-sequence \
  --crm-setup

# Behind the scenes: Universal Elements coordinate across services
# → Stripe customer creation
# → Mailchimp audience addition  
# → Notion CRM record
# → SendGrid welcome automation
# → Cross-service error handling and rollback
```

## Universal Elements Architecture

### Cross-Service Data Translation

**Universal Element Interface**:
```typescript
interface UniversalElement {
  id: string;
  type: 'Customer' | 'Order' | 'Content' | 'Task';
  metadata: Record<string, any>;
  relationships: Relationship[];
  serviceStates: ServiceState[];
}

// Cross-service translation mapping
const elementMapping = {
  'Customer': {
    'stripe': { type: 'customer', fields: ['email', 'name', 'metadata'] },
    'mailchimp': { type: 'member', fields: ['email_address', 'merge_fields'] },
    'notion': { type: 'page', fields: ['Email', 'Name', 'Status'] },
    'sendgrid': { type: 'contact', fields: ['email', 'first_name', 'custom_fields'] }
  }
};
```

### Business Context Mapping

**Domain-Specific Command Generation**:
```typescript
// Business context drives CLI generation
const ecommerceContext = {
  businessType: 'E-commerce',
  entities: ['Customer', 'Order', 'Product', 'Inventory'],
  workflows: [
    {
      name: 'customer:onboard',
      description: 'Complete customer onboarding across all systems',
      steps: [
        { service: 'stripe', operation: 'customers.create' },
        { service: 'mailchimp', operation: 'lists.add_member' },
        { service: 'notion', operation: 'pages.create' },
        { service: 'sendgrid', operation: 'marketing.contacts.put' }
      ],
      rollback: 'Cleanup all created resources on failure'
    }
  ]
};
```

## Multi-Service Orchestration Examples

### E-commerce Workflow

**Generated Commands**:
```bash
# Customer management across payment, CRM, and communication
my-store-cli customer:onboard --email --plan --welcome-sequence
my-store-cli customer:upgrade --id --new-plan --prorate
my-store-cli customer:churn --id --exit-survey --retention-offer

# Order fulfillment across inventory, payment, and shipping
my-store-cli order:fulfill --order-id --shipping-method
my-store-cli order:cancel --order-id --refund-amount --notify-customer
my-store-cli order:track --order-id --update-customer
```

**Cross-Service Coordination**:
```typescript
// customer:onboard implementation
async customerOnboard(email: string, plan: string) {
  const transaction = new MultiServiceTransaction();
  
  try {
    // Step 1: Payment setup
    const customer = await transaction.execute('stripe', {
      operation: 'customers.create',
      data: { email, metadata: { plan } }
    });
    
    // Step 2: CRM setup  
    const crmRecord = await transaction.execute('notion', {
      operation: 'pages.create',
      data: { Email: email, Status: 'Onboarding', Plan: plan }
    });
    
    // Step 3: Communication setup
    const contact = await transaction.execute('sendgrid', {
      operation: 'contacts.put',
      data: { email, custom_fields: { plan, crm_id: crmRecord.id } }
    });
    
    // Step 4: Marketing automation
    await transaction.execute('mailchimp', {
      operation: 'lists.add_member',
      data: { email, tags: [plan], merge_fields: { CRM_ID: crmRecord.id } }
    });
    
    await transaction.commit();
    return { success: true, customer_id: customer.id, crm_id: crmRecord.id };
    
  } catch (error) {
    await transaction.rollback();
    throw new MultiServiceError('Customer onboarding failed', error);
  }
}
```

### Content Publishing Workflow

**Generated Commands**:
```bash
# Content lifecycle across creation, media, and distribution
my-content-cli post:publish --notion-id --schedule --channels
my-content-cli post:update --id --changes --republish
my-content-cli post:analyze --id --metrics --period

# Media management across storage and optimization
my-content-cli media:optimize --source --formats --destinations
my-content-cli media:backup --source --retention --archive
```

**Multi-Service Implementation**:
```typescript
// post:publish cross-service workflow
async postPublish(notionId: string, schedule: Date, channels: string[]) {
  // Step 1: Export content from Notion
  const content = await this.notion.getPage(notionId);
  
  // Step 2: Process media through Cloudinary
  const optimizedMedia = await this.cloudinary.optimizeImages(content.images);
  
  // Step 3: Distribute to social channels
  const posts = await Promise.all(
    channels.map(channel => this.socialMedia.schedule(channel, {
      content: content.text,
      media: optimizedMedia,
      publishAt: schedule
    }))
  );
  
  // Step 4: Update content management system
  await this.notion.updatePage(notionId, {
    Status: 'Published',
    PublishedAt: schedule,
    SocialPosts: posts.map(p => p.id)
  });
  
  return { published: posts.length, scheduled_for: schedule };
}
```

## AI-Enhanced Business Analysis (Task 008)

### BAML Integration Strategy

**The Problem**: Rule-based business analysis limits scalability
```typescript
// Current: Hardcoded pattern matching
private extractBusinessType(description: string): string {
    const text = description.toLowerCase();
    if (text.includes('restaurant') || text.includes('food')) {
        return 'restaurant';
    }
    // ... 50+ hardcoded patterns
}
```

**The Solution**: AI-powered analysis with reliable fallbacks
```typescript
// Enhanced: AI analysis with rule-based fallbacks
async processBusinessDescription(description: string): Promise<BusinessDomainModel> {
    try {
        // BAML AI analysis - handles ANY business type
        const analysis = await b.AnalyzeBusinessDescription(description);
        return this.transformBAMLAnalysis(analysis);
    } catch (error) {
        // Fallback to existing rule-based logic
        return this.processBusinessDescriptionLegacy(description);
    }
}
```

### AI-Enhanced Multi-Service Orchestration

**Smart Command Generation**: AI understands business workflows
```typescript
// Generated with business context understanding
my-coffee-shop-cli customer:loyalty-signup --email --points-tier --app-notification
my-coffee-shop-cli inventory:restock --supplier --delivery-date --auto-pricing
my-coffee-shop-cli staff:schedule --shift --coverage --break-rotation
```

**Intelligent Service Discovery**: AI finds integration opportunities
```typescript
// AI discovers business workflow patterns
const integrations = await b.DiscoverServiceIntegrations(businessAnalysis, availableServices);
// → Suggests: Square POS → Notion inventory → Mailchimp customer sync
```

### Democratic AI Philosophy

**AI serves the gateway-opening mission:**
- **Enhanced Analysis**: AI understands ANY business type, not just hardcoded patterns
- **Faster Generation**: Minutes instead of hours for CLI creation
- **Smarter Integration**: AI discovers cross-service workflows
- **User Ownership**: Generated CLIs belong to users, not AI platforms
- **Fallback Reliability**: Rule-based logic ensures consistent operation

**AI does NOT change the core mission:**
- Still about **multi-service orchestration**
- Still about **business context awareness**
- Still about **democratic CLI generation**
- Still about **user-owned tools**

## Technical Implementation

### Service Provider System

**Modular Architecture** (15+ providers implemented):
```typescript
abstract class ServiceProvider {
  abstract register(): void;
  abstract boot(): void;
  abstract getName(): string;
}

// Concrete implementations
class StripeServiceProvider extends ServiceProvider { ... }
class NotionServiceProvider extends ServiceProvider { ... }
class SendGridServiceProvider extends ServiceProvider { ... }
class MailchimpServiceProvider extends ServiceProvider { ... }
```

### Cross-Service Transaction Management

**Multi-Service Transactions**:
```typescript
class MultiServiceTransaction {
  private operations: ServiceOperation[] = [];
  private completed: ServiceOperation[] = [];
  
  async execute(service: string, operation: ServiceOperation) {
    const result = await this.serviceRegistry
      .get(service)
      .execute(operation);
    
    this.operations.push({ service, operation, result });
    this.completed.push({ service, operation, result });
    
    return result;
  }
  
  async rollback() {
    // Reverse order rollback of all completed operations
    for (const op of this.completed.reverse()) {
      await this.serviceRegistry
        .get(op.service)
        .rollback(op.operation, op.result);
    }
  }
}
```

## Implementation Status

### ✅ Phase 1: Foundation (100% Complete)
- Service Provider System with 15+ concrete providers
- Universal Elements type system and translation
- Command Pattern framework with dependency injection
- Credential management and security patterns

### 🔄 Phase 2: Multi-Service Orchestration (85% Complete)
- Cross-service transaction management
- Business context schema system  
- Multi-API service integration
- Error handling and rollback mechanisms

### 🔄 Phase 3: AI-Enhanced Generation (In Progress - Task 008)
- **BAML Integration**: AI tooling framework for intelligent business analysis
- **Enhanced Business Context**: AI-powered understanding of ANY business type
- **Smart Command Generation**: AI-enhanced business workflow analysis
- **Intelligent Service Discovery**: AI-powered cross-service integration recommendations
- **Democratic AI**: AI serves the gateway-opening mission, not the other way around

## Why This Architecture Enables Unique Value

### Impossible with Single-Service CLIs
- **Cross-service state consistency**: Universal Elements maintain identity across services
- **Business workflow automation**: Commands map to business processes, not technical APIs
- **Unified error handling**: Single failure point can rollback across multiple services
- **Coordinated authentication**: Single credential setup for multi-service workflows

### Impossible with Generic Middleware (Zapier, etc.)
- **Business context awareness**: Commands understand domain-specific workflows
- **Developer-native tooling**: CLI interface with version control, scripting, automation
- **Owned infrastructure**: Generated tools belong to users, not platform
- **Type-safe operations**: Compile-time guarantees for multi-service workflows

## Directory Structure

```
src/
├── providers/              # Service Provider System (15+ providers)
├── core/                   # Universal Elements & Transaction Management  
├── context/               # Business Context Processing
│   └── ai/                # BAML AI Functions (Task 008)
├── commands/              # Generated Business Commands
├── etl/                   # Cross-Service Data Translation
├── generators/            # CLI Generation Engine
└── baml_client/           # Generated BAML TypeScript Client
```

### BAML CLI Integration (Development Tools)

**BAML CLI commands integrate into the development workflow:**

```bash
# Development workflow with BAML CLI
npm run baml:generate     # Generate TypeScript client from .baml files
npm run baml:test         # Test AI functions during development
npm run baml:fmt          # Format BAML code

# Build process integration
npm run build             # Runs baml:generate → tsc → fix-imports
```

**Generated CLI commands remain business-focused:**
```bash
# End-user CLI stays focused on business workflows
my-business-cli customer:onboard --email --plan
my-business-cli inventory:restock --supplier --auto-pricing

# NOT AI-focused commands like:
# my-business-cli baml:analyze (users don't need this)
# my-business-cli ai:generate (not the point)
```

**The key insight**: BAML CLI is a **development tool** that enhances the **generation process**, not a user-facing feature. Users still get business-focused CLIs, just generated faster and smarter.

---

**Key Insight**: imajin-cli's architecture enables **business workflow automation** that spans multiple services - something impossible with single-service CLIs or generic middleware platforms. The Universal Elements system provides the technical foundation for true multi-service orchestration with business context awareness.