---
# Metadata
title: "17 3 Business Context Schema System"
created: "2025-06-13T21:31:07Z"
---

# 🔧 IMPLEMENT: Business Context-Driven Schema System

**Status:** ⏳ **PENDING**  
**Phase:** 2 - Infrastructure Components  
**Estimated Time:** 8-10 hours  
**Dependencies:** ETL Pipeline System (Prompt 07), Plugin Generator (Prompt 05)  

---

## CONTEXT

Replace the hardcoded "Universal" schema approach from 17.2 with a business-context-driven system that dynamically generates domain models from user business descriptions. Leverage the existing ETL graph translation architecture to create a user-centric CLI generation system.

## PROBLEM WITH CURRENT APPROACH (17.2)

**❌ What We Built Wrong:**
```typescript
// Rigid, vendor-imposed universal types
interface UniversalCustomer {
    id: string;
    email: string;
    name?: string;
    // ... OUR idea of what a customer should be
}

// Forces everyone into OUR structure
stripe.customer → UniversalCustomer  // ❌ Forced fit
notion.person → UniversalCustomer    // ❌ Doesn't match business reality
```

**❌ Problems:**
- Hardcoded business entities that don't match user reality
- Platform-imposed structure contradicts user-centric vision
- Complex compatibility layers that fight against user intent
- Universal types spread throughout codebase
- Migration complexity for schema changes we define

## ARCHITECTURAL VISION: BUSINESS-CONTEXT-DRIVEN

**✅ User-Centric Business-First Approach:**

```bash
# User describes their business reality
imajin init

CLI: "Tell me about your business"
User: "I run a restaurant chain. I track customer dietary restrictions, 
       favorite tables, order history, loyalty points. I use Stripe for 
       payments, Toast for POS, Mailchimp for marketing."

# CLI generates THEIR domain model
# customer = { dietaryRestrictions, favoriteTable, orders[], loyaltyPoints }
# order = { table, items[], specialInstructions, status }
# table = { number, section, capacity, server }
```

**✅ Three-Layer Architecture:**
```
┌─────────────────────────────────────────┐
│ BUSINESS LAYER: User's Domain Objects   │
│ restaurant.customer, restaurant.order   │ ← User's mental model
└─────────────────────────────────────────┘
            ↑ translation ↓ (configurable)
┌─────────────────────────────────────────┐
│ TRANSLATION LAYER: Service → Business   │
│ stripe.customer → restaurant.customer   │ ← ETL handles this
│ toast.order → restaurant.order          │
└─────────────────────────────────────────┘
            ↑ discovery ↓ (dynamic)
┌─────────────────────────────────────────┐
│ SERVICE LAYER: Native API Schemas       │
│ Stripe, Toast, Mailchimp APIs           │ ← Generated from OpenAPI
└─────────────────────────────────────────┘
```

## LEVERAGE EXISTING ETL ARCHITECTURE

**✅ What's Already Perfect:**
- Graph-to-graph translation engine
- Dynamic model registration system
- Efficiency scoring and smart routing
- Service discovery and schema caching
- Translation confidence and error handling

**✅ What Needs Enhancement:**
- Business context → graph model generation
- Dynamic model registration from user descriptions
- Porcelain command generation from business context
- User-editable translation mappings

---

## DELIVERABLES

### 1. **Business Context Processing Engine**
Convert natural business descriptions into dynamic domain models using the existing ETL graph system.

### 2. **Dynamic Domain Model Generation**
Generate user-specific business schemas that replace hardcoded universal types completely.

### 3. **Service Discovery & Translation**
Automatically map discovered services to user's business domain using existing ETL translation engine.

### 4. **Porcelain/Plumbing Command Architecture**
Generate business-focused commands (porcelain) and direct API access (plumbing) from business context.

### 5. **Configuration System**
User-inspectable and editable business context configuration with translation mappings.

### 6. **Hardcoded Type Removal**
Complete elimination of Universal types and replacement with dynamic business models.

## IMPLEMENTATION REQUIREMENTS

### 1. **BusinessContextProcessor**

**New Component:**
```typescript
// src/context/BusinessContextProcessor.ts
export class BusinessContextProcessor {
    /**
     * Convert business description to domain model
     */
    async processBusinessDescription(description: string): Promise<BusinessDomainModel> {
        // AI-driven analysis of business description
        // Extract entities, relationships, workflows
        // Generate domain-specific schema
    }
    
    /**
     * Generate CLI commands from business context
     */
    async generateBusinessCommands(domain: BusinessDomainModel): Promise<CommandDefinition[]> {
        // Generate porcelain commands that match user's business language
        // restaurant.customer.create --dietary vegan --table 12
        // vs generic: customer.create --metadata dietary:vegan
    }
}
```

**Business Context Configuration:**
```yaml
# ~/.imajin/business-context.yaml
business:
  type: "restaurant"
  description: "Multi-location restaurant chain with loyalty program"
  
entities:
  customer:
    fields:
      - name: { type: string, required: true }
      - dietaryRestrictions: { type: array, items: string }
      - favoriteTable: { type: number, optional: true }
      - loyaltyPoints: { type: number, default: 0 }
      - visits: { type: array, items: visit }
    businessRules:
      - "Customers with allergies require dietary restriction tracking"
      - "VIP customers get preferred table assignments"
      
  order:
    fields:
      - table: { type: number, required: true }
      - items: { type: array, items: menuItem }
      - specialInstructions: { type: string, optional: true }
      - status: { type: enum, values: [ordered, preparing, ready, served, paid] }
      - server: { type: string, required: true }
    workflows:
      - "Order placement → Kitchen → Service → Payment"
      
translations:
  services:
    stripe:
      customer: 
        mapping: "business.customer"
        fields:
          email: "email"
          metadata.dietary: "dietaryRestrictions"
          metadata.table: "favoriteTable"
          
porcelain_commands:
  customer:
    - create: "Create new customer with dietary preferences"
    - seat: "Assign customer to preferred table"
    - loyalty: "Award or redeem loyalty points"
  
  order:
    - place: "Create new order for table"
    - update: "Update order status in kitchen workflow"
    - serve: "Mark order as served and ready for payment"
```

### 2. **Dynamic Model Registration System**

**Enhanced ModelFactory:**
```typescript
// src/etl/graphs/BusinessModelFactory.ts
export class BusinessModelFactory extends ModelFactory {
    /**
     * Register business domain model from context
     */
    static registerBusinessDomain(context: BusinessDomainModel): void {
        const graphModel: GraphModel = {
            modelType: context.businessType,
            version: '1.0.0',
            schema: this.generateGraphSchema(context),
            compatibilityMap: this.generateCompatibilityMap(context),
            metadata: {
                businessDescription: context.description,
                generatedFrom: 'business-context',
                entities: Object.keys(context.entities)
            }
        };
        
        this.registerModel(graphModel);
    }
    
    /**
     * Generate service translation mappings
     */
    static generateServiceMappings(
        context: BusinessDomainModel,
        serviceSchema: ServiceSchema
    ): TranslationMapping {
        // Automatically map service fields to business domain
        // Using AI/heuristics to suggest mappings
        // User can override in business-context.yaml
    }
}
```

### 3. **Service Discovery Enhancement**

**Business-Aware Service Discovery:**
```typescript
// src/discovery/BusinessServiceDiscovery.ts
export class BusinessServiceDiscovery {
    /**
     * Discover services and map to business context
     */
    async discoverAndMapServices(
        businessContext: BusinessDomainModel
    ): Promise<ServiceMapping[]> {
        // 1. Discover available services (Stripe, etc.)
        // 2. Analyze their schemas
        // 3. Generate translation mappings to business domain
        // 4. Create porcelain commands for business workflows
    }
    
    /**
     * Generate suggested business workflows
     */
    async suggestWorkflows(
        businessContext: BusinessDomainModel,
        availableServices: ServiceSchema[]
    ): Promise<WorkflowSuggestion[]> {
        // Suggest business workflows based on available services
        // "You have Stripe + Toast, here are suggested restaurant workflows"
    }
}
```

### 4. **Porcelain Command Generation**

**Business-First Command Structure:**
```typescript
// Generated commands based on business context
export class RestaurantCustomerCommands {
    @Command('customer:create')
    async createCustomer(
        @Option('name') name: string,
        @Option('dietary') dietary?: string[],
        @Option('phone') phone?: string,
        @Option('table-preference') tablePreference?: number
    ) {
        // Business-focused parameters, not technical API fields
        const businessCustomer = {
            name,
            dietaryRestrictions: dietary || [],
            favoriteTable: tablePreference,
            loyaltyPoints: 0
        };
        
        // ETL handles translation to service(s)
        return this.businessService.createCustomer(businessCustomer);
    }
    
    @Command('customer:seat')
    async seatCustomer(
        @Arg('customerId') customerId: string,
        @Option('table') table: number,
        @Option('party-size') partySize?: number
    ) {
        // Business workflow command
        return this.businessService.seatCustomer(customerId, table, partySize);
    }
}

// Plumbing layer - direct API access
export class StripeDirectCommands {
    @Command('stripe:customer:create')
    async createStripeCustomer(
        @Option('email') email: string,
        @Option('metadata') metadata?: Record<string, string>
    ) {
        // Direct Stripe API access for power users
        return this.stripeService.createCustomer({ email, metadata });
    }
}
```

### 5. **Configuration Inspection & Editing**

**User Control Over Business Context:**
```bash
# Inspect business configuration
imajin config show                    # Show current business context
imajin config edit                    # Open business-context.yaml in editor
imajin config validate                # Validate business context configuration

# Inspect service mappings
imajin inspect mapping stripe.customer    # Show how Stripe maps to business
imajin inspect workflow order.payment     # Show payment workflow mapping

# Edit translation mappings
imajin mapping edit stripe.customer       # Edit specific service mapping
imajin mapping auto-generate toast        # Auto-generate Toast mappings
```

### 6. **Remove Hardcoded Universal Types**

**Files to Modify/Remove:**
```bash
# Remove hardcoded universal types
src/types/Core.ts                    # Remove UniversalCustomer, etc.
src/schemas/CompatibilityLayer.ts    # Remove or simplify significantly
schemas/universal/core.yaml          # Remove hardcoded schema

# Replace with dynamic business context
src/context/BusinessContext.ts       # New business context system
src/context/DomainModel.ts           # User-defined domain models
~/.imajin/business-context.yaml      # User's business configuration
```

**Service Integration Updates:**
```typescript
// Before: Hardcoded universal types
import { UniversalCustomer } from '../../types/Core.js';

// After: Business context types
import { BusinessCustomer } from '../../context/BusinessContext.js';
// Where BusinessCustomer is generated from user's business description
```

## CLI USER EXPERIENCE

### **Initialization Flow:**
```bash
imajin init

🎯 Welcome to imajin-cli! Let's build tools for YOUR business.

What kind of business are you building tools for?
> I run a restaurant chain with multiple locations. We track customer 
  dietary restrictions, preferred seating, order history, and loyalty 
  points. We use Stripe for payments, Toast for our POS system, and 
  Mailchimp for marketing campaigns.

✨ Generated business domain: "restaurant"
✨ Detected entities: customer, order, table, location
✨ Discovered services: Stripe, Toast, Mailchimp
✨ Created business-context.yaml

Available commands:
  customer:create     - Add new customer with preferences
  customer:seat       - Assign customer to table
  order:place         - Create new order for table
  order:serve         - Complete order and process payment
  loyalty:award       - Add loyalty points to customer

Advanced commands:
  stripe:customer:create  - Direct Stripe API access
  toast:order:create      - Direct Toast POS access

Configuration:
  imajin config edit     - Customize your business model
  imajin inspect mapping - See how services map to your business
```

### **Business-Focused Commands:**
```bash
# Porcelain - Business language
imajin customer:create --name "John Doe" --dietary "vegan,gluten-free" --phone "+1234567890"
imajin customer:seat --customer cust_123 --table 12 --party-size 4
imajin order:place --table 12 --items "burger,fries,coke" --special "no onions"
imajin loyalty:award --customer cust_123 --points 50 --reason "birthday"

# Plumbing - Direct API access
imajin stripe:customer:create --email john@example.com --metadata dietary:vegan,table:12
imajin toast:order:create --table_id 12 --items '[{"id":"burger","qty":1}]'

# Inspection & Configuration
imajin config show                           # Current business context
imajin inspect workflow order.payment        # How orders become payments
imajin mapping edit stripe.customer          # Customize Stripe mapping
```

### **Cross-Service Workflows:**
```bash
# Business workflow that spans multiple services
imajin workflow:complete-order --table 12
# 1. Gets order from Toast POS
# 2. Creates payment in Stripe
# 3. Awards loyalty points
# 4. Sends receipt via Mailchimp
# All mapped through user's business context
```

## INTEGRATION WITH EXISTING SYSTEMS

### **ETL Pipeline Integration:**
- Use existing GraphTranslationEngine for service → business translation
- Leverage ModelFactory for dynamic business domain registration
- Business context drives ETL configuration instead of hardcoded schemas

### **Command System Integration:**
- Generate porcelain commands from business context
- Maintain plumbing commands for direct service access
- Use existing CommandManager for registration and execution

### **Event System Integration:**
- Business workflow events (order.placed, customer.seated)
- Service integration events (stripe.payment.succeeded)
- Translation progress and error events

## SUCCESS CRITERIA

### **🎯 Business Context Integration**
- [ ] Natural business descriptions generate working domain models
- [ ] User's business language drives CLI command structure
- [ ] Cross-service workflows respect business context
- [ ] Configuration is inspectable and editable

### **🎯 Service Translation**
- [ ] Automatic service → business domain mapping
- [ ] ETL translation engine handles cross-service workflows
- [ ] Efficient translation with confidence scoring
- [ ] User can override automatic mappings

### **🎯 Command Generation**
- [ ] Porcelain commands use business terminology
- [ ] Plumbing commands provide direct API access
- [ ] Progressive disclosure (simple → advanced)
- [ ] Context-aware help and auto-completion

### **🎯 No Hardcoded Types**
- [ ] Complete removal of UniversalCustomer, UniversalPayment, etc.
- [ ] Dynamic business models generated from user context
- [ ] Service adapters work with user-defined domains
- [ ] No platform-imposed business structure

## TESTING REQUIREMENTS

### **Business Context Processing**
```typescript
describe('BusinessContextProcessor', () => {
    it('should generate restaurant domain from business description');
    it('should create appropriate entity relationships');
    it('should suggest relevant service mappings');
    it('should generate business-appropriate commands');
});
```

### **Dynamic Model Registration**
```typescript
describe('BusinessModelFactory', () => {
    it('should register business domain as graph model');
    it('should generate translation mappings to services');
    it('should handle business rule validation');
    it('should support domain model evolution');
});
```

### **Command Generation**
```typescript
describe('Command Generation', () => {
    it('should generate porcelain commands from business context');
    it('should maintain plumbing commands for direct access');
    it('should handle business workflow orchestration');
    it('should provide progressive command disclosure');
});
```

### **ETL Integration**
```typescript
describe('ETL Business Integration', () => {
    it('should translate Stripe data to business domain');
    it('should handle cross-service business workflows');
    it('should maintain translation confidence scoring');  
    it('should support user mapping overrides');
});
```

---

## MIGRATION STRATEGY

### **Phase 1: Business Context Foundation**
1. Create BusinessContextProcessor
2. Enhance ModelFactory for dynamic registration
3. Create business context configuration system

### **Phase 2: Command Generation**
1. Generate porcelain commands from business context
2. Maintain plumbing commands for direct access
3. Implement progressive disclosure

### **Phase 3: Hardcoded Type Removal**
1. Remove UniversalCustomer, UniversalPayment, etc.
2. Replace with dynamic business models
3. Update all service integrations

### **Phase 4: ETL Integration**
1. Configure ETL to use business context
2. Generate service translation mappings
3. Implement cross-service business workflows

---

## NEXT STEP
After completion, this establishes the user-centric foundation for imajin-cli where business context drives tool generation rather than platform-imposed universal schemas.

---

## 🔗 **RELATED FILES**
- `src/etl/graphs/GraphTranslationEngine.ts` - Leverage existing translation
- `src/etl/graphs/models.ts` - Enhance for business context
- `src/context/BusinessContextProcessor.ts` - New business processor
- `~/.imajin/business-context.yaml` - User business configuration
- `src/commands/generated/` - Business-specific command generation 