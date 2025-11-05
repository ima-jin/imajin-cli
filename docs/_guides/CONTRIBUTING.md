# 🤝 Contributing to imajin-cli

**Community-Driven Development with Fair Attribution**

## Welcome Contributors!

imajin-cli is built by the community, for the community. We operate under the [.fair licensing framework](https://fairlicense.org) - ensuring **transparent attribution**, **sustainable development**, and **community ownership**.

## 🎯 Our Values

### 🆓 **Open Development**
- **Community-driven** - Decisions made by contributor community
- **Open foundation** - Core framework open source with attribution
- **User ownership** - Generated tools belong to users
- **Transparent process** - All development tracked publicly

### ⚖️ **Fair Attribution**
- **Credit where due** - All contributions tracked and credited
- **Transparent history** - Clear record of who built what
- **Sustainable growth** - Contributors benefit from project success
- **Recognition-first** - Community reputation over corporate profit

### 🚀 **Professional Standards**
- **Enterprise quality** - Production-ready patterns and practices
- **Type safety** - Comprehensive TypeScript throughout
- **Test coverage** - Reliable, well-tested codebase
- **Documentation first** - Every feature properly documented

## 🏗️ Development Approach

### Prompt-Based Implementation

We use a **structured prompt-based development system** that makes contributing clear and systematic:

```bash
# Check current progress
cat docs/prompts/README.md

# Current Status:
# ✅ Phase 1: Foundation Architecture (100% complete)
# 🔄 Phase 2: Infrastructure Components (85% complete - 17/19)
# ⏳ Phase 3: AI-Enhanced Generation (planned after Phase 2 hardening)
```

### Implementation Workflow

1. **Check Progress**: Review current task status in `docs/prompts/README.md`
2. **Select Prompt**: Choose next active prompt (marked as 🔄 **CURRENT**)
3. **Follow Guidelines**: Implement according to detailed prompt specifications
4. **Update Progress**: Mark task complete and move to next
5. **Get Recognition**: Attribution automatically tracked

### Current Active Work

**🔄 Currently Implementing**: Business Context Schema System (Prompt 17.3)
- Location: `docs/prompts/phase2/17_3_business_context_schema_system.md`
- Focus: Business-context-driven command generation
- Status: Active development, ready for contributors

## 🚀 Quick Start for Contributors

### 1. Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/imajin-cli
cd imajin-cli

# Install dependencies
npm install

# Build and test
npm run build
npm test

# Verify development setup
./bin/imajin --version
./bin/imajin diagnose
```

### 2. Choose Your Contribution Type

**🏗️ Core Architecture** (Phase 1 & 2)
- Implementing foundation patterns from prompts
- Service provider system enhancements
- Universal elements and graph translation
- Enterprise pattern integration

**🔌 Service Connectors** (Phase 2 & 3)
- New service provider implementations
- Business context mappings
- API specification parsers
- Integration templates

**📖 Documentation** (All Phases)
- User guides and tutorials
- API documentation
- Code examples and samples
- Business context recipes

**🧪 Testing & Quality** (All Phases)
- Unit and integration tests
- Performance benchmarks
- Security audits
- Cross-platform compatibility

### 3. Follow Implementation Prompt

```bash
# Open current active prompt
code docs/prompts/phase2/17_3_business_context_schema_system.md

# The prompt includes:
# - Context: Background and dependencies
# - Architectural Vision: High-level goals
# - Deliverables: Specific files to create
# - Implementation Requirements: Step-by-step guidance
# - Integration Points: How it connects
# - Success Criteria: Measurable completion
```

## 📋 Contribution Guidelines

### Code Standards

**TypeScript Requirements:**
```typescript
/**
 * [ClassName] - [Brief Description]
 * 
 * @package     @imajin/cli
 * @subpackage  [subdirectory]
 * @author      [Your Name/GitHub]
 * @copyright   imajin community
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       [YYYY-MM-DD]
 * @updated     [YYYY-MM-DD]
 *
 * @see        docs/architecture.md
 * 
 * Integration Points:
 * - [List key integration points]
 * - [How this connects to other components]
 */

// Use strict TypeScript settings
export interface YourInterface {
  // Clear, descriptive property names
  readonly id: string;
  readonly metadata: Record<string, any>;
  // Document complex properties
  businessContext?: BusinessContext;
}

export class YourClass implements YourInterface {
  // Public API first, private implementation last
  public readonly id: string;
  private readonly logger: Logger;
  
  constructor(
    id: string,
    private readonly container: Container
  ) {
    this.id = id;
    this.logger = container.resolve('Logger');
  }
  
  // Clear method names that describe business intent
  public async processBusinessWorkflow(): Promise<WorkflowResult> {
    // Implementation with proper error handling
    try {
      const result = await this.executeWorkflow();
      return { success: true, data: result };
    } catch (error) {
      this.logger.error('Workflow processing failed', { error });
      throw new WorkflowError('Business workflow processing failed', {
        cause: error,
        context: { id: this.id }
      });
    }
  }
}
```

**Commit Message Format:**
```bash
# Format: type(scope): description
# 
# Examples:
feat(providers): add business context schema system
fix(credentials): resolve cross-platform storage issue
docs(architecture): update service provider documentation
test(etl): add graph translation integration tests
```

### Testing Requirements

**Unit Tests:**
```typescript
// tests/unit/providers/BusinessContextProvider.test.ts
import { BusinessContextProvider } from '../../../src/providers/BusinessContextProvider';
import { Container } from '../../../src/container/Container';

describe('BusinessContextProvider', () => {
  let provider: BusinessContextProvider;
  let container: Container;
  
  beforeEach(() => {
    container = new Container();
    provider = new BusinessContextProvider(container, program);
  });
  
  describe('register', () => {
    it('should register business context services', async () => {
      await provider.register();
      
      expect(container.isRegistered('BusinessContextRegistry')).toBe(true);
      expect(container.isRegistered('EntityMapper')).toBe(true);
    });
  });
  
  describe('mapApiToBusinessCommand', () => {
    it('should map Stripe API to payment processing commands', () => {
      const apiSpec = createMockStripeSpec();
      const context = createPaymentProcessingContext();
      
      const commands = provider.mapApiToBusinessCommand(apiSpec, context);
      
      expect(commands).toContainEqual(
        expect.objectContaining({
          name: 'customer:onboard',
          businessContext: 'Complete customer onboarding with validation'
        })
      );
    });
  });
});
```

**Integration Tests:**
```typescript
// tests/integration/workflows/CustomerOnboarding.test.ts
describe('Customer Onboarding Workflow', () => {
  it('should complete end-to-end customer onboarding', async () => {
    // Test full business workflow
    const result = await executeCommand([
      'customer:onboard',
      '--name', 'Test Corp',
      '--email', 'test@corp.com',
      '--plan', 'professional',
      '--json'
    ]);
    
    expect(result.success).toBe(true);
    expect(result.data.customer.id).toMatch(/^cus_/);
    expect(result.metadata.duration).toBeLessThan(5000);
  });
});
```

### Documentation Standards

**README Updates:**
- Update implementation status when features are complete
- Add new examples for business contexts you implement
- Keep architecture diagrams current with changes

**Code Documentation:**
- JSDoc comments for all public APIs
- Clear examples in function documentation
- Integration points explicitly documented

**User Guides:**
- Step-by-step tutorials with working examples
- Business context explanations with real workflows
- Troubleshooting sections with common issues

## 🔌 Adding New Service Providers

### Service Provider Template

```typescript
// src/services/[service]/[Service]ServiceProvider.ts
import { ServiceProvider } from '../../providers/ServiceProvider.js';
import { Container } from '../../container/Container.js';
import { Command } from 'commander';

export class NewServiceProvider extends ServiceProvider {
  constructor(container: Container, program: Command) {
    super(container, program);
  }
  
  public register(): void {
    // Register your service classes
    this.container.register('NewService', NewService);
    this.container.register('NewServiceClient', NewServiceClient);
  }
  
  public boot(): void {
    // Initialize services after all providers registered
    const service = this.container.resolve('NewService');
    service.initialize();
  }
  
  public getName(): string {
    return 'NewServiceProvider';
  }
  
  public registerCommands(program: Command): void {
    // Register business-focused commands
    const serviceCommand = program
      .command('new-service')
      .description('New service business operations');
      
    serviceCommand
      .command('entity:create')
      .description('Create new business entity')
      .option('--name <name>', 'Entity name')
      .action(async (options) => {
        const service = this.container.resolve('NewService');
        const result = await service.createEntity(options);
        console.log(JSON.stringify(result, null, 2));
      });
  }
}
```

### Business Context Mapping

```typescript
// src/etl/contexts/NewServiceContext.ts
export const NewServiceBusinessContext: BusinessContext = {
  domain: 'new-service-domain',
  description: 'Business operations for new service',
  entities: [
    {
      apiType: 'new_service_entity',
      businessType: 'BusinessEntity',
      businessOperations: [
        {
          name: 'create',
          apiEndpoint: '/v1/entities',
          method: 'POST',
          businessContext: 'Create new business entity with validation'
        },
        {
          name: 'lifecycle-manage',
          apiEndpoint: '/v1/entities/{id}',
          method: 'PATCH',
          businessContext: 'Manage entity lifecycle and state transitions'
        }
      ]
    }
  ],
  workflows: [
    {
      name: 'entity-onboarding',
      description: 'Complete entity onboarding workflow',
      steps: ['validate', 'create', 'configure', 'activate']
    }
  ]
};
```

### Integration with Universal Elements

```typescript
// Update src/etl/graphs/BusinessModelFactory.ts
private static readonly BUSINESS_MAPPINGS = {
  // Existing mappings...
  
  // New service mappings
  'new_service_entity': 'BusinessEntity',
  'new_service_workflow': 'BusinessWorkflow',
  'new_service_user': 'Actor'
};
```

## 🧪 Testing Your Contributions

### Local Testing

```bash
# Run full test suite
npm test

# Run tests for specific area
npm test -- --testPathPattern=providers
npm test -- --testPathPattern=etl
npm test -- --testPathPattern=services

# Run integration tests
npm run test:integration

# Test CLI generation end-to-end
npm run test:e2e
```

### Manual Testing

```bash
# Build and test your changes
npm run build

# Test CLI functionality
./bin/imajin --help
./bin/imajin diagnose
./bin/imajin health:check

# Test service provider registration
./bin/imajin providers:list
./bin/imajin providers:info YourNewProvider

# Test business context
./bin/imajin context:list
./bin/imajin context:info your-new-context
```

## 📊 Fair Attribution System

### How Attribution Works

**Automatic Tracking:**
- Git commit history tracks all contributions
- File headers document original authors
- Contribution metrics publicly available
- Community recognition system

**Attribution Levels:**
- **Core Contributors**: Major architectural contributions (5+ prompts)
- **Service Contributors**: New service providers and integrations
- **Community Contributors**: Documentation, testing, bug fixes
- **Maintainers**: Ongoing project stewardship and coordination

### Recognition & Benefits

**Community Recognition:**
- Contributor profiles in project documentation
- Attribution in generated CLI tools
- Community badges and achievement system
- Speaking opportunities at conferences

**Professional Benefits:**
- Portfolio projects demonstrating enterprise patterns
- Open source contribution history
- Network with professional development community
- References and recommendations from maintainers

**Economic Participation:**
- Fair share in any future commercial opportunities
- Community-driven decision making on project direction
- Transparent governance model
- Sustainable development model benefits

## 🎯 Contribution Opportunities

### 🔥 High-Priority (Current Focus)

**Business Context Schema System** (Active)
- Implement business context registry and mapping system
- Create entity mapping engine for API → business command translation
- Add support for workflow definition and multi-step operations
- Build business context validation and testing framework

**AI-Enhanced Generation** (Phase 3 Prep)
- Context analysis engine for intelligent business domain detection
- Smart command generation based on usage patterns
- Adaptive CLI optimization with learning capabilities
- Cross-service workflow detection and automation

### 📈 Growth Areas

**Service Ecosystem Expansion:**
- GitHub service provider with developer operations context
- Notion service provider with content management context
- Shopify service provider with e-commerce context
- Slack service provider with team communication context
- HubSpot service provider with CRM management context

**Enterprise Pattern Enhancement:**
- Advanced monitoring and alerting systems
- Comprehensive audit logging with compliance features
- Multi-tenant credential management
- Advanced webhook processing and event handling

**Community Tools:**
- Business context recipe marketplace
- Service provider template generator
- CLI usage analytics and optimization recommendations
- Community contribution dashboard and recognition system

### 🌟 Innovation Opportunities

**Cross-Service Intelligence:**
- Unified business dashboards across multiple service CLIs
- Predictive analytics for business workflow optimization
- Automated business process discovery and suggestion
- AI-powered business context recommendations

**Developer Experience:**
- Visual CLI builder for non-technical users
- Real-time collaboration on CLI generation
- Advanced debugging and troubleshooting tools
- Performance optimization and benchmarking suite

## 📞 Getting Help

### Community Support

**Discord Community**: [Join our Discord](https://discord.gg/imajin-cli)
- `#contributors` - Contributor coordination and support
- `#architecture` - Technical architecture discussions
- `#service-providers` - Service integration help
- `#documentation` - Documentation collaboration

**GitHub Discussions**: [Project Discussions](https://github.com/imajin/imajin-cli/discussions)
- Architecture decisions and proposals
- Feature requests and roadmap planning
- Community project coordination
- Success stories and showcases

### Development Support

**Office Hours**: Weekly contributor office hours
- Wednesdays 2:00 PM UTC
- Architecture reviews and guidance
- Contribution planning and coordination
- Technical mentorship for new contributors

**Code Reviews**: Professional code review process
- All contributions reviewed by core contributors
- Constructive feedback and improvement suggestions
- Mentorship for quality improvements
- Knowledge sharing and best practices

## 🎉 Recognition & Success Stories

### Hall of Fame Contributors

*[This section will be populated as the community grows]*

**Core Architecture Contributors:**
- Contributors who implemented major foundation prompts
- Service provider system designers and implementers
- Universal elements architecture contributors

**Service Integration Champions:**
- First implementations of major service providers
- Business context mapping pioneers
- Cross-service workflow innovators

**Community Leaders:**
- Documentation and tutorial creators
- Community support and mentorship providers
- Ecosystem growth and adoption drivers

---

## 🚀 Ready to Contribute?

1. **Join the Community**: [Discord](https://discord.gg/imajin-cli) | [GitHub Discussions](https://github.com/imajin/imajin-cli/discussions)
2. **Check Current Work**: Review `docs/prompts/README.md` for active tasks
3. **Set Up Development**: Clone, install, build, and test
4. **Pick Your Focus**: Choose architecture, services, docs, or testing
5. **Follow Prompt Guidelines**: Implement according to detailed specifications
6. **Get Recognition**: Your contributions will be properly attributed

**Join the open-source API integration project!**
**Build professional tools with community-driven development.**

---

*Built by the open-source community.*
*Licensed under [.fair](docs/.fair-license.md) - Fair attribution for all contributors.* 