# 🏢 Business Context System

**Recipe-Driven CLI Generation with Domain-Specific Commands**

## Overview

The Business Context System transforms generic API specifications into **domain-specific CLI tools** that speak your business language. Instead of generic REST endpoints, generate commands that match your business workflows.

## 🎯 Core Concepts

### Business Context vs. Generic APIs

**❌ Generic API Approach:**
```bash
# Technical operations, not business language
api-client POST /v1/customers --data '{"name":"John","email":"john@co.com"}'
api-client GET /v1/subscriptions?customer_id=cus_123
api-client PATCH /v1/charges/ch_456 --data '{"refunded":true}'
```

**✅ Business Context Approach:**
```bash
# Business workflows with domain language
my-payments-cli customer:onboard --name "John" --email "john@co.com" --plan "starter"
my-payments-cli subscription:upgrade --customer cus_123 --plan "pro" --trial-days 14
my-payments-cli revenue:refund --transaction ch_456 --reason "duplicate" --notify-customer
```

### Business Context Schema System

**Currently Implementing (Phase 2 - Prompt 17.3):**

The Business Context Schema System maps OpenAPI/GraphQL specifications to business domains:

```typescript
// Business Context Schema (In Development)
interface BusinessContext {
  domain: string;           // e.g., "payment-processing", "content-management"
  entities: EntityMapping[];
  workflows: WorkflowDefinition[];
  commands: BusinessCommand[];
  relationships: EntityRelationship[];
}

// Entity Mapping Example
interface EntityMapping {
  apiType: string;          // "stripe_customer"
  businessType: string;     // "Customer"
  businessOperations: BusinessOperation[];
}

// Business Operations
interface BusinessOperation {
  name: string;             // "onboard", "upgrade", "churn"
  apiEndpoint: string;      // "/v1/customers"
  method: string;           // "POST"
  businessContext: string; // Human-readable description
}
```

## 🔧 Business Context Recipes

### Available Business Contexts

**Payment Processing Context:**
```yaml
domain: payment-processing
description: "Customer lifecycle and revenue operations"
entities:
  - customer: "Customer onboarding, management, and lifecycle"
  - subscription: "Recurring billing and plan management"
  - payment: "Transaction processing and financial operations"
  - dispute: "Chargeback and dispute resolution"
commands:
  - customer:onboard: "Complete customer onboarding with validation"
  - subscription:upgrade: "Upgrade customer to higher plan"
  - revenue:analyze: "Generate revenue reports and analytics"
  - dispute:resolve: "Handle chargeback and dispute workflows"
```

**Content Management Context:**
```yaml
domain: content-management
description: "Document workflows and knowledge management"
entities:
  - document: "Content creation and management"
  - workspace: "Team collaboration and organization"
  - template: "Content templates and automation"
  - workflow: "Editorial and approval processes"
commands:
  - document:publish: "Publish content with approval workflow"
  - workspace:organize: "Structure team workspaces"
  - template:create: "Design reusable content templates"
  - workflow:automate: "Set up editorial automation"
```

**Developer Operations Context:**
```yaml
domain: developer-operations
description: "Code lifecycle and team collaboration"
entities:
  - repository: "Code management and version control"
  - issue: "Bug tracking and feature requests"
  - deployment: "Release management and CI/CD"
  - team: "Developer collaboration and reviews"
commands:
  - code:review: "Manage pull request workflows"
  - release:deploy: "Handle deployment and rollback"
  - team:coordinate: "Synchronize team activities"
  - issue:triage: "Prioritize and assign issues"
```

## 🚀 Quick Start Guide

### 1. Generate CLI with Business Context

```bash
# Generate payment processing CLI
imajin generate stripe \
  --spec https://api.stripe.com/openapi.json \
  --business-context payment-processing \
  --output-name my-payments-cli

# Generate content management CLI  
imajin generate notion \
  --spec https://api.notion.com/openapi.json \
  --business-context content-management \
  --output-name my-content-cli
```

### 2. Business Context Configuration

```bash
# Initialize business context
my-payments-cli context:init \
  --business-type "saas" \
  --industry "software" \
  --currency "usd" \
  --timezone "America/New_York"

# Configure business rules
my-payments-cli context:rules \
  --trial-period 14 \
  --payment-terms "net-30" \
  --refund-policy "30-days"
```

### 3. Domain-Specific Operations

```bash
# Customer lifecycle operations
my-payments-cli customer:onboard \
  --name "Acme Corp" \
  --email "billing@acme.com" \
  --plan "enterprise" \  
  --trial-days 30 \
  --setup-billing

# Revenue operations
my-payments-cli revenue:report \
  --period "last-quarter" \
  --breakdown-by "plan" \
  --format "csv" \
  --email-to "finance@company.com"

# Subscription management
my-payments-cli subscription:lifecycle \
  --customer cus_123 \
  --action "upgrade" \
  --new-plan "pro-annual" \
  --prorate true \
  --notify-customer
```

## 🔄 Business Context Mapping

### Stripe → Payment Processing Context

**Generic Stripe API:**
```bash
stripe customers create --name "John" --email "john@co.com"
stripe subscriptions create --customer cus_123 --price price_456
stripe charges retrieve ch_789
```

**Business Context Commands:**
```bash
my-payments-cli customer:onboard --name "John" --email "john@co.com" --welcome-sequence
my-payments-cli subscription:start --customer cus_123 --plan "pro-monthly" --trial 14
my-payments-cli revenue:analyze --transaction ch_789 --include-metrics
```

### Notion → Content Management Context

**Generic Notion API:**
```bash
notion pages create --parent database_id --properties '{...}'
notion databases query --database_id db_123 --filter '{...}'
notion blocks append --block_id block_456 --children '[...]'
```

**Business Context Commands:**
```bash
my-content-cli document:create --title "Project Plan" --template "project" --assign-to "team"
my-content-cli workspace:search --query "in-progress projects" --format "summary"
my-content-cli workflow:trigger --document doc_456 --action "request-review"
```

### GitHub → Developer Operations Context

**Generic GitHub API:**
```bash
github issues create --title "Bug" --body "Description" --labels "bug"
github pulls merge --pull-number 42 --merge-method "squash"
github releases create --tag v1.0.0 --name "Release v1.0.0"
```

**Business Context Commands:**
```bash
my-dev-cli issue:triage --title "Critical Bug" --priority "high" --assign-to "on-call"
my-dev-cli code:ship --pull-request 42 --strategy "squash" --deploy-to "staging"
my-dev-cli release:deliver --version v1.0.0 --changelog "auto" --notify-stakeholders
```

## 🎯 Business Context Benefits

### 1. **Domain-Specific Language**
- Commands use business terminology, not technical jargon
- Operations match business workflows, not API endpoints
- Context-aware help and documentation

### 2. **Workflow Integration**
- Multi-step business processes in single commands
- Cross-service workflow coordination
- Business rule enforcement

### 3. **Business Intelligence**
- Domain-specific reporting and analytics
- Business metrics and KPI tracking
- Workflow optimization insights

### 4. **Team Alignment**
- Non-technical stakeholders understand commands
- Business logic embedded in CLI operations
- Consistent business terminology across tools

## 🔧 Implementation Architecture

### Business Context Schema System (In Development)

```typescript
// Business Context Registry
export class BusinessContextRegistry {
  private contexts: Map<string, BusinessContext> = new Map();
  
  register(context: BusinessContext): void {
    this.contexts.set(context.domain, context);
  }
  
  getContext(domain: string): BusinessContext | null {
    return this.contexts.get(domain) || null;
  }
  
  mapApiToBusinessCommand(
    apiSpec: OpenAPISpec, 
    businessContext: BusinessContext
  ): BusinessCommand[] {
    // Map API operations to business commands
    return this.entityMapper.mapOperations(apiSpec, businessContext);
  }
}

// Entity Mapping Engine
export class EntityMapper {
  mapOperations(
    apiSpec: OpenAPISpec, 
    context: BusinessContext
  ): BusinessCommand[] {
    const commands: BusinessCommand[] = [];
    
    for (const path of apiSpec.paths) {
      for (const operation of path.operations) {
        const businessOp = this.mapToBusiness(operation, context);
        if (businessOp) {
          commands.push(businessOp);
        }
      }
    }
    
    return commands;
  }
}
```

### Universal Element Integration

```typescript
// Business Model Factory (Implemented)
export class BusinessModelFactory {
  private static readonly BUSINESS_MAPPINGS = {
    // Payment Processing
    'stripe_customer': 'Customer',
    'stripe_subscription': 'Subscription', 
    'stripe_payment': 'Transaction',
    'stripe_dispute': 'Dispute',
    
    // Content Management
    'notion_page': 'Document',
    'notion_database': 'DataSource',
    'notion_workspace': 'Workspace',
    'notion_user': 'Collaborator',
    
    // Developer Operations
    'github_repository': 'CodeRepository',
    'github_issue': 'Task',
    'github_pull_request': 'ChangeRequest',
    'github_release': 'Deployment'
  };
  
  public static getBusinessType(entityName: string): string {
    return this.BUSINESS_MAPPINGS[entityName] || 'UniversalElement';
  }
}
```

## 🎭 Business Context Examples

### SaaS Payment Processing

**Business Context Setup:**
```bash
my-payments-cli context:init \
  --business-model "saas" \
  --billing-cycle "monthly" \
  --currency "usd" \
  --tax-handling "automatic" \
  --dunning-management "enabled"
```

**Customer Lifecycle Commands:**
```bash
# Onboarding with business context
my-payments-cli customer:onboard \
  --company "Acme Corp" \
  --contact "billing@acme.com" \
  --plan "enterprise" \
  --trial-days 30 \
  --setup-billing \
  --welcome-sequence \
  --assign-success-manager

# Subscription management
my-payments-cli subscription:manage \
  --customer cus_123 \
  --action "upgrade" \
  --new-plan "enterprise-annual" \
  --discount "annual-20" \
  --effective-date "next-cycle"

# Revenue operations
my-payments-cli revenue:optimize \
  --analyze-churn-risk \
  --identify-upgrade-opportunities \
  --generate-expansion-leads \
  --format "executive-dashboard"
```

### Content Team Workflows

**Business Context Setup:**
```bash
my-content-cli context:init \
  --team-type "editorial" \
  --content-types "blog,docs,marketing" \
  --approval-workflow "editor-review" \
  --publishing-schedule "automated"
```

**Editorial Workflow Commands:**
```bash
# Content creation with workflow
my-content-cli document:create \
  --type "blog-post" \
  --title "Product Launch Announcement" \
  --template "product-launch" \
  --assign-to "writer-team" \
  --deadline "2025-07-01" \
  --approval-required

# Publishing workflow
my-content-cli content:publish \
  --document doc_456 \
  --channels "blog,social,newsletter" \
  --schedule "2025-07-01T09:00:00Z" \
  --seo-optimize \
  --track-performance

# Team coordination
my-content-cli workflow:coordinate \
  --content-calendar "Q3-2025" \
  --assign-responsibilities \
  --track-deadlines \
  --generate-status-report
```

## 🚀 Future Enhancements

### AI-Enhanced Business Context (Phase 3)

**Intelligent Context Detection:**
- Analyze API specifications to suggest business contexts
- Learn from usage patterns to optimize business commands
- Generate domain-specific documentation automatically

**Adaptive Workflow Generation:**
- Detect business workflows from API usage patterns
- Suggest optimized command sequences
- Generate business process automation

**Cross-Service Business Intelligence:**
- Combine data from multiple services for business insights
- Generate unified business dashboards
- Provide predictive business analytics

---

**The Business Context System transforms technical API access into business-focused tools that speak your domain language and support your actual workflows - making professional CLI generation truly valuable for business teams, not just developers.** 