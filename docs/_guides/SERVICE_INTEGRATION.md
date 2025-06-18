# 🔌 Service Integration Guide

**Adding New Services to imajin-cli**

## Overview

This guide shows how to integrate new services into imajin-cli using the Service Provider pattern. We'll use the existing Stripe integration as a reference implementation and template for new services.

## Current Service Integrations

### ✅ **Stripe** (Reference Implementation)
- **Business Context**: Payment processing
- **Status**: Complete with business commands
- **Features**: Credentials, rate limiting, webhooks, monitoring
- **Location**: `src/services/stripe/`

### 🔄 **Planned Integrations**
- **GitHub**: Developer operations context
- **Notion**: Content management context  
- **Shopify**: E-commerce context
- **Slack**: Team communication context

## Service Integration Architecture

### Service Provider Pattern

Every service integration follows the modular Service Provider pattern:

```typescript
// src/services/[service]/[Service]ServiceProvider.ts
export class ServiceProvider extends ServiceProvider {
  public register(): void {
    // Register service classes with container
  }
  
  public boot(): void {
    // Initialize services after registration
  }
  
  public registerCommands(program: Command): void {
    // Register business-focused CLI commands
  }
}
```

### Business Context Integration

Services map to business contexts through the Universal Elements system:

```typescript
// Business context mapping
const BUSINESS_MAPPINGS = {
  'stripe_customer': 'Customer',
  'stripe_subscription': 'Subscription',
  'stripe_payment': 'Transaction'
};
```

## Stripe Integration Example

### Directory Structure

```
src/services/stripe/
├── StripeServiceProvider.ts      # Main service provider
├── StripeService.ts              # Core service implementation
├── StripeClient.ts               # API client wrapper
├── commands/                     # Business commands
│   ├── CustomerCommands.ts       # Customer operations
│   ├── SubscriptionCommands.ts   # Billing operations
│   └── RevenueCommands.ts        # Analytics operations
├── models/                       # Data models
│   ├── Customer.ts               # Customer entity
│   ├── Subscription.ts           # Subscription entity
│   └── Payment.ts                # Payment entity
└── types/                        # TypeScript interfaces
    ├── StripeTypes.ts            # API response types
    └── BusinessTypes.ts          # Business domain types
```

### Service Provider Implementation

```typescript
// src/services/stripe/StripeServiceProvider.ts
export class StripeServiceProvider extends ServiceProvider {
  public register(): void {
    // Register core services
    this.container.register('StripeService', StripeService);
    this.container.register('StripeClient', StripeClient);
    
    // Register business command handlers
    this.container.register('CustomerCommands', CustomerCommands);
    this.container.register('SubscriptionCommands', SubscriptionCommands);
    this.container.register('RevenueCommands', RevenueCommands);
  }
  
  public boot(): void {
    // Initialize Stripe client with credentials
    const stripeClient = this.container.resolve('StripeClient');
    stripeClient.initialize();
    
    // Set up monitoring and logging
    const service = this.container.resolve('StripeService');
    service.enableMonitoring();
  }
  
  public registerCommands(program: Command): void {
    const stripeCmd = program
      .command('stripe')
      .description('Stripe payment processing operations');
    
    this.registerCustomerCommands(stripeCmd);
    this.registerSubscriptionCommands(stripeCmd);
    this.registerRevenueCommands(stripeCmd);
  }
  
  private registerCustomerCommands(parent: Command): void {
    const customerCmd = parent
      .command('customer')
      .description('Customer lifecycle operations');
    
    customerCmd
      .command('onboard')
      .description('Complete customer onboarding workflow')
      .option('--name <name>', 'Customer name')
      .option('--email <email>', 'Customer email')
      .option('--plan <plan>', 'Subscription plan')
      .option('--trial-days <days>', 'Trial period in days')
      .option('--welcome-sequence', 'Send welcome email sequence')
      .action(async (options) => {
        const commands = this.container.resolve('CustomerCommands');
        const result = await commands.onboardCustomer(options);
        console.log(JSON.stringify(result, null, 2));
      });
  }
}
```

### Business Command Implementation

```typescript
// src/services/stripe/commands/CustomerCommands.ts
export class CustomerCommands {
  constructor(
    private readonly stripeService: StripeService,
    private readonly logger: Logger,
    private readonly eventManager: EventManager
  ) {}
  
  public async onboardCustomer(options: CustomerOnboardOptions): Promise<CommandResult> {
    const startTime = Date.now();
    
    try {
      // Emit business event
      await this.eventManager.emit('customer:onboarding:started', {
        name: options.name,
        email: options.email
      });
      
      // Create customer with business context
      const customer = await this.stripeService.createCustomer({
        name: options.name,
        email: options.email,
        metadata: {
          source: 'cli-onboarding',
          plan: options.plan,
          trial_days: options.trialDays
        }
      });
      
      // Set up subscription if plan specified
      let subscription = null;
      if (options.plan) {
        subscription = await this.stripeService.createSubscription({
          customer: customer.id,
          items: [{ price: this.getPriceId(options.plan) }],
          trial_period_days: options.trialDays || 14
        });
      }
      
      // Send welcome sequence if requested
      if (options.welcomeSequence) {
        await this.triggerWelcomeSequence(customer, subscription);
      }
      
      // Emit completion event
      await this.eventManager.emit('customer:onboarding:completed', {
        customerId: customer.id,
        subscriptionId: subscription?.id
      });
      
      return {
        success: true,
        data: {
          customer,
          subscription
        },
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          command: 'customer:onboard'
        }
      };
      
    } catch (error) {
      this.logger.error('Customer onboarding failed', { error, options });
      
      return {
        success: false,
        error: {
          code: 'CUSTOMER_ONBOARDING_FAILED',
          message: 'Failed to complete customer onboarding',
          context: { options }
        },
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          command: 'customer:onboard'
        }
      };
    }
  }
}
```

## Adding a New Service

### Step 1: Create Service Structure

```bash
# Create service directory structure
mkdir -p src/services/github/{commands,models,types}
touch src/services/github/GitHubServiceProvider.ts
touch src/services/github/GitHubService.ts
touch src/services/github/GitHubClient.ts
```

### Step 2: Implement Service Provider

```typescript
// src/services/github/GitHubServiceProvider.ts
import { ServiceProvider } from '../../providers/ServiceProvider.js';

export class GitHubServiceProvider extends ServiceProvider {
  public register(): void {
    this.container.register('GitHubService', GitHubService);
    this.container.register('GitHubClient', GitHubClient);
    this.container.register('IssueCommands', IssueCommands);
    this.container.register('RepositoryCommands', RepositoryCommands);
  }
  
  public boot(): void {
    const client = this.container.resolve('GitHubClient');
    client.initialize();
  }
  
  public getName(): string {
    return 'GitHubServiceProvider';
  }
  
  public registerCommands(program: Command): void {
    const githubCmd = program
      .command('github')
      .description('Developer operations');
    
    this.registerIssueCommands(githubCmd);
    this.registerRepositoryCommands(githubCmd);
  }
}
```

### Step 3: Add Business Context Mapping

```typescript
// Update src/etl/graphs/BusinessModelFactory.ts
private static readonly BUSINESS_MAPPINGS = {
  // Existing mappings...
  
  // GitHub mappings
  'github_repository': 'CodeRepository',
  'github_issue': 'Task',
  'github_pull_request': 'ChangeRequest',
  'github_release': 'Deployment'
};
```

### Step 4: Register with Application

```typescript
// Update src/index.ts
const { GitHubServiceProvider } = await import('./services/github/GitHubServiceProvider.js');

app.createProvider(GitHubServiceProvider);
```

### Step 5: Create Business Commands

```typescript
// src/services/github/commands/IssueCommands.ts
export class IssueCommands {
  public async triageIssue(options: IssueTriageOptions): Promise<CommandResult> {
    // Business workflow: triage critical issues
    const issue = await this.githubService.getIssue(options.issueNumber);
    
    // Apply business logic
    if (options.severity === 'critical') {
      await this.githubService.addLabels(issue.number, ['critical', 'priority-1']);
      await this.githubService.assignToTeam(issue.number, 'on-call-team');
      await this.notifyStakeholders(issue, options.severity);
    }
    
    return {
      success: true,
      data: { issue },
      metadata: {
        command: 'issue:triage',
        businessContext: 'developer-operations'
      }
    };
  }
}
```

## Business Context Integration

### Define Business Context

```typescript
// src/etl/contexts/DeveloperOperationsContext.ts
export const DeveloperOperationsContext: BusinessContext = {
  domain: 'developer-operations',
  description: 'Code lifecycle and team collaboration',
  entities: [
    {
      apiType: 'github_issue',
      businessType: 'Task',
      businessOperations: [
        {
          name: 'triage',
          apiEndpoint: '/repos/{owner}/{repo}/issues/{issue_number}',
          method: 'PATCH',
          businessContext: 'Prioritize and assign critical issues'
        }
      ]
    }
  ],
  workflows: [
    {
      name: 'issue-resolution',
      description: 'Complete issue resolution workflow',
      steps: ['triage', 'assign', 'develop', 'review', 'deploy']
    }
  ]
};
```

### Map to Universal Elements

```typescript
// src/services/github/mappers/GitHubElementMapper.ts
export class GitHubElementMapper {
  public mapIssueToUniversal(issue: GitHubIssue): UniversalElement {
    return {
      id: `github_issue_${issue.number}`,
      type: 'Task',
      metadata: {
        title: issue.title,
        description: issue.body,
        status: issue.state,
        priority: this.extractPriority(issue.labels),
        assignee: issue.assignee?.login
      },
      relationships: [
        {
          type: 'belongs_to',
          target: `github_repository_${issue.repository.id}`
        }
      ]
    };
  }
}
```

## Enterprise Pattern Integration

### Credential Management

```typescript
// Integrate with credential system
export class GitHubClient {
  constructor(private readonly credentialManager: CredentialManager) {}
  
  public async initialize(): Promise<void> {
    const token = await this.credentialManager.getCredential('github', 'token');
    this.client = new Octokit({ auth: token });
  }
}
```

### Rate Limiting

```typescript
// Integrate with rate limiting
export class GitHubService {
  constructor(private readonly rateLimiter: RateLimiter) {}
  
  public async createIssue(data: IssueData): Promise<Issue> {
    await this.rateLimiter.wait('github-api');
    return this.client.issues.create(data);
  }
}
```

### Monitoring Integration

```typescript
// Integrate with monitoring
export class GitHubServiceProvider {
  public boot(): void {
    const service = this.container.resolve('GitHubService');
    const monitor = this.container.resolve('MonitoringService');
    
    // Set up health checks
    monitor.registerHealthCheck('github-api', () => service.healthCheck());
    
    // Set up metrics collection
    monitor.registerMetricsCollector('github-operations', 
      () => service.getOperationMetrics()
    );
  }
}
```

## Testing Service Integrations

### Unit Tests

```typescript
// tests/unit/services/github/GitHubServiceProvider.test.ts
describe('GitHubServiceProvider', () => {
  let provider: GitHubServiceProvider;
  let container: Container;
  
  beforeEach(() => {
    container = new Container();
    provider = new GitHubServiceProvider(container, program);
  });
  
  it('should register GitHub services', async () => {
    await provider.register();
    
    expect(container.isRegistered('GitHubService')).toBe(true);
    expect(container.isRegistered('GitHubClient')).toBe(true);
  });
});
```

### Integration Tests

```typescript
// tests/integration/services/github/IssueWorkflow.test.ts
describe('GitHub Issue Workflow', () => {
  it('should complete issue triage workflow', async () => {
    const result = await executeCommand([
      'github', 'issue:triage',
      '--issue-number', '123',
      '--severity', 'critical',
      '--assign-to', 'on-call-team',
      '--json'
    ]);
    
    expect(result.success).toBe(true);
    expect(result.data.issue.labels).toContain('critical');
  });
});
```

## Service Integration Checklist

### ✅ **Core Implementation**
- [ ] Service provider class created
- [ ] Core service and client classes implemented
- [ ] Business command classes created
- [ ] TypeScript interfaces defined
- [ ] Container registration configured

### ✅ **Business Context Integration**
- [ ] Business context mapping defined
- [ ] Universal element mapping implemented
- [ ] Business workflow commands created
- [ ] Domain-specific terminology used
- [ ] Cross-service compatibility enabled

### ✅ **Enterprise Pattern Integration**
- [ ] Credential management integrated
- [ ] Rate limiting configured
- [ ] Error handling implemented
- [ ] Monitoring and health checks added
- [ ] Structured logging enabled

### ✅ **Testing & Quality**
- [ ] Unit tests for service provider
- [ ] Integration tests for workflows
- [ ] Command execution tests
- [ ] Error handling tests
- [ ] Performance benchmarks

### ✅ **Documentation**
- [ ] Service integration documented
- [ ] Business commands documented
- [ ] Configuration examples provided
- [ ] Troubleshooting guide created
- [ ] Migration guide from existing tools

---

**The Service Provider pattern makes adding new integrations straightforward while maintaining professional quality and enterprise-grade patterns throughout.** 