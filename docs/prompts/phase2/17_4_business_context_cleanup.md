---
# Metadata
title: "17 4 Business Context Cleanup"
created: "2025-06-13T21:31:07Z"
updated: "2025-06-13T22:15:00Z"
---

# 🔧 IMPLEMENT: Business Context System Cleanup & Integration

**Status:** ⏳ **PENDING**  
**Phase:** 2 - Infrastructure Components  
**Estimated Time:** 4-6 hours  
**Dependencies:** Business Context-Driven Schema System (Prompt 17.3)  

---

## CONTEXT

Complete the Business Context-Driven Schema System implementation by cleaning up remaining Universal type references, updating service integrations to use business context, and ensuring full TypeScript compatibility. This prompt addresses the "gunk cleanup" mentioned in the original request.

## CURRENT STATE ANALYSIS

**✅ Successfully Implemented (17.3):**
- `BusinessContextProcessor.ts` - Core business description → domain model engine
- `BusinessModelFactory.ts` - ETL integration with business context
- `BusinessServiceDiscovery.ts` - Service discovery and mapping
- `BusinessContextManager.ts` - Configuration lifecycle management
- `BusinessContextCommands.ts` - CLI interface for business context
- Updated `Core.ts` with BusinessTypeRegistry

**❌ Remaining Issues to Address:**
- Universal type imports still exist throughout codebase
- Service integrations (Stripe, etc.) still reference Universal types
- CompatibilityLayer.ts contains hardcoded Universal schemas
- Test files reference Universal types that no longer exist
- Service adapters need business context integration

## PROBLEM ANALYSIS

**Current Universal Type References Found:**
```typescript
// In Stripe.ts
import type { UniversalContact, UniversalPayment, UniversalSubscription } from './Universal';

// In StripeService.ts  
import type { UniversalContact, UniversalPayment, UniversalSubscription } from '../../schemas/CompatibilityLayer.js';

// In StripeCustomerAdapter.ts
import { ServiceAdapter, ServiceNamespaces, TypeRegistry, UniversalCustomer } from '../../../types/Core.js';

// In test files
const { UniversalCustomerSchema } = await import('../../schemas/CompatibilityLayer.js');
```

**Integration Points Needing Updates:**
- Service providers (Stripe, etc.) mapping to business context
- ETL translation using business models instead of Universal types
- Command generation using business terminology
- Test suites validating business context functionality

---

## DELIVERABLES

### 1. **Universal Type Reference Cleanup**
Remove all remaining Universal type imports and replace with business context types.

### 2. **Service Integration Updates**
Update Stripe and other service integrations to use BusinessTypeRegistry instead of hardcoded Universal types.

### 3. **CompatibilityLayer Modernization**
Transform CompatibilityLayer to support business context while maintaining backward compatibility.

### 4. **Test Suite Updates**
Update test files to use business context system instead of Universal types.

### 5. **TypeScript Compatibility Fixes**
Ensure all type references are correct and compilation passes without errors.

### 6. **Integration Validation**
Create end-to-end test demonstrating business context → service integration workflow.

## IMPLEMENTATION REQUIREMENTS

### 1. **Service Integration Updates**

**Update Stripe Integration:**
```typescript
// src/services/stripe/StripeService.ts
// BEFORE: Hardcoded Universal types
import type { UniversalContact, UniversalPayment } from '../../schemas/CompatibilityLayer.js';

// AFTER: Business context types
import { BusinessTypeRegistry } from '../../context/BusinessTypeRegistry.js';
import type { BusinessDomainModel } from '../../context/BusinessContextProcessor.js';

export class StripeService {
    private businessContext?: BusinessDomainModel;
    
    /**
     * Initialize with business context
     */
    async initializeWithBusinessContext(context: BusinessDomainModel): Promise<void> {
        this.businessContext = context;
        // Register business-specific Stripe mappings
        await this.registerBusinessMappings(context);
    }
    
    /**
     * Create customer using business context
     */
    async createCustomer(businessCustomer: any): Promise<any> {
        // Map business customer to Stripe format
        const stripeCustomer = await this.mapBusinessToStripe('customer', businessCustomer);
        const result = await this.stripe.customers.create(stripeCustomer);
        
        // Map Stripe result back to business format
        return this.mapStripeToBusinessContext('customer', result);
    }
    
    private async mapBusinessToStripe(entityType: string, businessData: any): Promise<any> {
        if (!this.businessContext) {
            throw new Error('Business context not initialized');
        }
        
        // Use BusinessModelFactory for translation
        return BusinessModelFactory.translateToService(
            this.businessContext,
            'stripe',
            entityType,
            businessData
        );
    }
}
```

**Update Service Provider Registration:**
```typescript
// src/services/stripe/StripeServiceProvider.ts
export class StripeServiceProvider implements ServiceProvider {
    async register(container: DependencyContainer): Promise<void> {
        // Register with business context support
        container.register<StripeService>('StripeService', {
            useFactory: (c) => {
                const service = new StripeService(c.resolve('StripeConfig'));
                
                // Auto-initialize with business context if available
                const businessContext = c.resolve('BusinessContext', { optional: true });
                if (businessContext) {
                    service.initializeWithBusinessContext(businessContext);
                }
                
                return service;
            }
        });
    }
}
```

### 2. **BusinessTypeRegistry Implementation**

**Create Missing BusinessTypeRegistry:**
```typescript
// src/context/BusinessTypeRegistry.ts
import { z } from 'zod';
import type { BusinessDomainModel } from './BusinessContextProcessor.js';

/**
 * Dynamic type registry that generates Zod schemas from business context
 * Replaces hardcoded Universal types with user-defined business models
 */
export class BusinessTypeRegistry {
    private static businessContext: BusinessDomainModel | null = null;
    private static generatedSchemas: Map<string, z.ZodType<any>> = new Map();
    
    /**
     * Initialize registry with business context
     */
    static initialize(context: BusinessDomainModel): void {
        this.businessContext = context;
        this.generateSchemasFromContext(context);
    }
    
    /**
     * Get schema for business entity
     */
    static getSchema(entityName: string): z.ZodType<any> {
        const schema = this.generatedSchemas.get(entityName);
        if (!schema) {
            throw new Error(`No schema found for business entity: ${entityName}`);
        }
        return schema;
    }
    
    /**
     * Get all available business entity types
     */
    static getEntityTypes(): string[] {
        return Array.from(this.generatedSchemas.keys());
    }
    
    /**
     * Generate Zod schemas from business context
     */
    private static generateSchemasFromContext(context: BusinessDomainModel): void {
        for (const [entityName, entityDef] of Object.entries(context.entities)) {
            const schema = this.createZodSchemaFromEntity(entityDef);
            this.generatedSchemas.set(entityName, schema);
        }
    }
    
    /**
     * Create Zod schema from business entity definition
     */
    private static createZodSchemaFromEntity(entityDef: any): z.ZodType<any> {
        const schemaFields: Record<string, z.ZodType<any>> = {};
        
        for (const field of entityDef.fields) {
            schemaFields[field.name] = this.createZodFieldType(field);
        }
        
        return z.object(schemaFields);
    }
    
    /**
     * Create Zod field type from field definition
     */
    private static createZodFieldType(field: any): z.ZodType<any> {
        let zodType: z.ZodType<any>;
        
        switch (field.type) {
            case 'string':
                zodType = z.string();
                break;
            case 'number':
                zodType = z.number();
                break;
            case 'boolean':
                zodType = z.boolean();
                break;
            case 'date':
                zodType = z.date();
                break;
            case 'array':
                zodType = z.array(z.string()); // Simplified for now
                break;
            case 'enum':
                zodType = z.enum(field.values as [string, ...string[]]);
                break;
            default:
                zodType = z.any();
        }
        
        // Apply validation rules
        if (field.validation) {
            if (field.validation.min !== undefined) {
                zodType = (zodType as any).min(field.validation.min);
            }
            if (field.validation.max !== undefined) {
                zodType = (zodType as any).max(field.validation.max);
            }
            if (field.validation.pattern) {
                zodType = (zodType as any).regex(new RegExp(field.validation.pattern));
            }
        }
        
        // Handle optional/required
        if (!field.required || field.optional) {
            zodType = zodType.optional();
        }
        
        // Handle default values
        if (field.default !== undefined) {
            zodType = zodType.default(field.default);
        }
        
        return zodType;
    }
}
```

### 3. **Complete Universal Type Removal**

**Remove CompatibilityLayer.ts entirely and replace with clean business context system:**
```typescript
// DELETE: src/schemas/CompatibilityLayer.ts (remove entire file)

// REPLACE WITH: src/context/BusinessSchemaRegistry.ts
/**
 * BusinessSchemaRegistry - Clean business context schema management
 * 
 * No legacy support - pure business context driven system
 */

import { z } from 'zod';
import { BusinessTypeRegistry } from './BusinessTypeRegistry.js';
import type { BusinessDomainModel } from './BusinessContextProcessor.js';

/**
 * Initialize business schema registry
 */
export async function initializeBusinessSchemas(businessContext: BusinessDomainModel): Promise<void> {
    BusinessTypeRegistry.initialize(businessContext);
    console.log(`✅ Business schemas initialized for ${businessContext.businessType}`);
}

/**
 * Get business entity schema
 */
export function getBusinessEntitySchema(entityName: string): z.ZodType<any> {
    return BusinessTypeRegistry.getSchema(entityName);
}

/**
 * Get all available business entity types
 */
export function getAvailableEntityTypes(): string[] {
    return BusinessTypeRegistry.getEntityTypes();
}

/**
 * Validate data against business entity schema
 */
export function validateBusinessEntity(entityName: string, data: unknown): { valid: boolean; errors?: string[] } {
    try {
        const schema = getBusinessEntitySchema(entityName);
        schema.parse(data);
        return { valid: true };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { 
                valid: false, 
                errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
            };
        }
        return { valid: false, errors: [String(error)] };
    }
}
```

### 4. **Service Adapter Updates**

**Update Stripe Customer Adapter:**
```typescript
// src/services/stripe/adapters/StripeCustomerAdapter.ts
/**
 * StripeCustomerAdapter - Business context-aware Stripe customer adapter
 */

import { ServiceAdapter } from '../../../types/Core.js';
import { BusinessTypeRegistry } from '../../../context/BusinessTypeRegistry.js';
import type { BusinessDomainModel } from '../../../context/BusinessContextProcessor.js';

export interface StripeCustomer {
    id: string;
    email: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, string>;
    created: number;
}

/**
 * Adapter for converting between Stripe Customer and Business Context Customer
 */
export class StripeCustomerAdapter implements ServiceAdapter<StripeCustomer, any> {
    constructor(private businessContext: BusinessDomainModel) {}
    
    /**
     * Convert Stripe Customer to Business Context Customer format
     */
    toBusinessContext(stripeCustomer: StripeCustomer): any {
        const customerSchema = BusinessTypeRegistry.getSchema('customer');
        const businessCustomer: any = {
            id: stripeCustomer.id,
            email: stripeCustomer.email,
            name: stripeCustomer.name,
            phone: stripeCustomer.phone,
            createdAt: new Date(stripeCustomer.created * 1000),
            updatedAt: new Date(),
            sourceService: 'stripe',
        };
        
        // Map Stripe metadata to business context fields
        if (stripeCustomer.metadata) {
            this.mapMetadataToBusinessFields(stripeCustomer.metadata, businessCustomer);
        }
        
        // Validate against business schema
        return customerSchema.parse(businessCustomer);
    }
    
    /**
     * Convert Business Context Customer to Stripe Customer format
     */
    fromBusinessContext(businessCustomer: any): StripeCustomer {
        const stripeCustomer: StripeCustomer = {
            id: businessCustomer.id,
            email: businessCustomer.email,
            name: businessCustomer.name,
            phone: businessCustomer.phone,
            created: Math.floor(businessCustomer.createdAt?.getTime() / 1000) || Date.now() / 1000,
            metadata: {}
        };
        
        // Map business context fields to Stripe metadata
        this.mapBusinessFieldsToMetadata(businessCustomer, stripeCustomer.metadata!);
        
        return stripeCustomer;
    }
    
    // Legacy compatibility methods
    /** @deprecated Use toBusinessContext instead */
    toUniversal(stripeCustomer: StripeCustomer): any {
        return this.toBusinessContext(stripeCustomer);
    }
    
    /** @deprecated Use fromBusinessContext instead */
    fromUniversal(universalCustomer: any): StripeCustomer {
        return this.fromBusinessContext(universalCustomer);
    }
    
    private mapMetadataToBusinessFields(metadata: Record<string, string>, businessCustomer: any): void {
        // Map known Stripe metadata fields to business context
        const customerEntity = this.businessContext.entities.customer;
        if (!customerEntity) return;
        
        for (const field of customerEntity.fields) {
            if (metadata[field.name]) {
                businessCustomer[field.name] = this.parseMetadataValue(metadata[field.name], field.type);
            }
        }
    }
    
    private mapBusinessFieldsToMetadata(businessCustomer: any, metadata: Record<string, string>): void {
        // Map business context fields to Stripe metadata
        const customerEntity = this.businessContext.entities.customer;
        if (!customerEntity) return;
        
        for (const field of customerEntity.fields) {
            if (businessCustomer[field.name] !== undefined) {
                metadata[field.name] = String(businessCustomer[field.name]);
            }
        }
    }
    
    private parseMetadataValue(value: string, type: string): any {
        switch (type) {
            case 'number':
                return Number(value);
            case 'boolean':
                return value === 'true';
            case 'array':
                return value.split(',');
            default:
                return value;
        }
    }
}
```

### 5. **Test Suite Updates**

**Update Test Files:**
```typescript
// src/test/context/BusinessContextProcessor.test.ts
import { BusinessContextProcessor } from '../../context/BusinessContextProcessor.js';
import { BusinessTypeRegistry } from '../../context/BusinessTypeRegistry.js';

describe('BusinessContextProcessor', () => {
    let processor: BusinessContextProcessor;
    
    beforeEach(() => {
        processor = new BusinessContextProcessor();
    });
    
    describe('processBusinessDescription', () => {
        it('should generate restaurant domain from business description', async () => {
            const description = `I run a restaurant chain with multiple locations. 
                We track customer dietary restrictions, preferred seating, order history, 
                and loyalty points. We use Stripe for payments and Toast for POS.`;
            
            const domain = await processor.processBusinessDescription(description);
            
            expect(domain.businessType).toBe('restaurant');
            expect(domain.entities).toHaveProperty('customer');
            expect(domain.entities).toHaveProperty('order');
            expect(domain.entities.customer.fields).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ name: 'dietaryRestrictions' }),
                    expect.objectContaining({ name: 'favoriteTable' }),
                    expect.objectContaining({ name: 'loyaltyPoints' })
                ])
            );
        });
        
        it('should generate ecommerce domain from business description', async () => {
            const description = `I run an online store selling handmade jewelry. 
                I track customer purchase history, wishlist items, and shipping preferences. 
                I use Shopify for my store and Mailchimp for marketing.`;
            
            const domain = await processor.processBusinessDescription(description);
            
            expect(domain.businessType).toBe('ecommerce');
            expect(domain.entities).toHaveProperty('customer');
            expect(domain.entities).toHaveProperty('product');
            expect(domain.entities).toHaveProperty('order');
        });
    });
    
    describe('generateBusinessCommands', () => {
        it('should generate restaurant-specific commands', async () => {
            const domain = {
                businessType: 'restaurant',
                description: 'Restaurant business',
                entities: {
                    customer: {
                        fields: [
                            { name: 'name', type: 'string', required: true },
                            { name: 'dietaryRestrictions', type: 'array', required: false },
                            { name: 'favoriteTable', type: 'number', required: false }
                        ]
                    }
                }
            };
            
            const commands = await processor.generateBusinessCommands(domain);
            
            expect(commands).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        name: 'customer:create',
                        category: 'porcelain'
                    }),
                    expect.objectContaining({
                        name: 'customer:seat',
                        category: 'porcelain'
                    })
                ])
            );
        });
    });
});

// src/test/context/BusinessTypeRegistry.test.ts
describe('BusinessTypeRegistry', () => {
    const mockBusinessContext = {
        businessType: 'restaurant',
        description: 'Test restaurant',
        entities: {
            customer: {
                fields: [
                    { name: 'name', type: 'string', required: true },
                    { name: 'email', type: 'string', required: true },
                    { name: 'dietaryRestrictions', type: 'array', required: false },
                    { name: 'loyaltyPoints', type: 'number', required: false, default: 0 }
                ]
            }
        }
    };
    
    beforeEach(() => {
        BusinessTypeRegistry.initialize(mockBusinessContext);
    });
    
    it('should generate schema from business context', () => {
        const customerSchema = BusinessTypeRegistry.getSchema('customer');
        
        expect(customerSchema).toBeDefined();
        
        // Test valid customer
        const validCustomer = {
            name: 'John Doe',
            email: 'john@example.com',
            dietaryRestrictions: ['vegan'],
            loyaltyPoints: 100
        };
        
        expect(() => customerSchema.parse(validCustomer)).not.toThrow();
    });
    
    it('should validate required fields', () => {
        const customerSchema = BusinessTypeRegistry.getSchema('customer');
        
        const invalidCustomer = {
            name: 'John Doe'
            // Missing required email
        };
        
        expect(() => customerSchema.parse(invalidCustomer)).toThrow();
    });
    
    it('should apply default values', () => {
        const customerSchema = BusinessTypeRegistry.getSchema('customer');
        
        const customer = {
            name: 'John Doe',
            email: 'john@example.com'
        };
        
        const parsed = customerSchema.parse(customer);
        expect(parsed.loyaltyPoints).toBe(0);
    });
});
```

### 6. **Integration Validation**

**End-to-End Integration Test:**
```typescript
// src/test/integration/BusinessContextIntegration.test.ts
import { BusinessContextProcessor } from '../../context/BusinessContextProcessor.js';
import { BusinessContextManager } from '../../context/BusinessContextManager.js';
import { BusinessModelFactory } from '../../etl/graphs/BusinessModelFactory.js';
import { StripeService } from '../../services/stripe/StripeService.js';

describe('Business Context Integration', () => {
    let processor: BusinessContextProcessor;
    let manager: BusinessContextManager;
    
    beforeEach(async () => {
        processor = new BusinessContextProcessor();
        manager = new BusinessContextManager();
    });
    
    it('should complete full business context workflow', async () => {
        // 1. Process business description
        const description = `I run a restaurant with customer loyalty program. 
            I track dietary restrictions and favorite tables. I use Stripe for payments.`;
        
        const domain = await processor.processBusinessDescription(description);
        
        // 2. Initialize business context
        await manager.initializeBusinessContext(domain);
        
        // 3. Register with ETL system
        BusinessModelFactory.registerBusinessDomain(domain);
        
        // 4. Generate service mappings
        const mappings = await processor.generateServiceMappings(domain, ['stripe']);
        expect(mappings).toHaveProperty('stripe');
        
        // 5. Generate commands
        const commands = await processor.generateBusinessCommands(domain);
        expect(commands.length).toBeGreaterThan(0);
        
        // 6. Validate Stripe integration
        const stripeMapping = mappings.stripe;
        expect(stripeMapping.entityMappings).toHaveProperty('customer');
        
        console.log('✅ Full business context workflow completed successfully');
    });
    
    it('should handle service integration with business context', async () => {
        // Mock Stripe service with business context
        const mockStripeService = new StripeService({} as any);
        
        const businessContext = {
            businessType: 'restaurant',
            description: 'Test restaurant',
            entities: {
                customer: {
                    fields: [
                        { name: 'name', type: 'string', required: true },
                        { name: 'email', type: 'string', required: true },
                        { name: 'dietaryRestrictions', type: 'array', required: false }
                    ]
                }
            }
        };
        
        await mockStripeService.initializeWithBusinessContext(businessContext);
        
        // Test business context customer creation
        const businessCustomer = {
            name: 'John Doe',
            email: 'john@restaurant.com',
            dietaryRestrictions: ['vegan', 'gluten-free']
        };
        
        // This should work without throwing errors
        expect(async () => {
            await mockStripeService.createCustomer(businessCustomer);
        }).not.toThrow();
    });
});
```

## FILE UPDATES REQUIRED

### **Files to Update:**

1. **src/types/Stripe.ts** - Remove Universal type imports completely
2. **src/services/stripe/StripeService.ts** - Replace Universal types with business context
3. **src/services/stripe/StripeServiceProvider.ts** - Update registration for business context
4. **src/services/stripe/adapters/StripeCustomerAdapter.ts** - Replace Universal types
5. **src/test/schemas/ExternalSchemaSystem.test.ts** - Update test imports

### **Files to Create:**

1. **src/context/BusinessTypeRegistry.ts** - Dynamic type registry
2. **src/context/BusinessSchemaRegistry.ts** - Clean schema management (replaces CompatibilityLayer)
3. **src/test/context/BusinessContextProcessor.test.ts** - Business context tests
4. **src/test/context/BusinessTypeRegistry.test.ts** - Type registry tests
5. **src/test/integration/BusinessContextIntegration.test.ts** - End-to-end integration test

### **Files to Remove Completely:**

1. **src/schemas/CompatibilityLayer.ts** - Delete entire file (no legacy support needed)
2. **Any remaining Universal.ts files** - Clean removal
3. **All Universal type references** - Replace with business context types

## SUCCESS CRITERIA

### **🎯 Universal Type Cleanup**
- [ ] All Universal type imports removed from service files
- [ ] No compilation errors related to missing Universal types
- [ ] Service adapters use business context instead of Universal types
- [ ] Test files updated to use business context system

### **🎯 Service Integration**
- [ ] Stripe service works with business context customer entities
- [ ] Service adapters translate between business context and service APIs
- [ ] ETL system uses business models for translation
- [ ] Cross-service workflows respect business context

### **🎯 TypeScript Compatibility**
- [ ] All files compile without TypeScript errors
- [ ] Type safety maintained throughout the system
- [ ] Business context types properly validated with Zod
- [ ] Service integrations type-safe with business entities

### **🎯 Integration Validation**
- [ ] End-to-end test demonstrates business description → working CLI
- [ ] Service mappings generated automatically from business context
- [ ] Commands use business terminology instead of technical API terms
- [ ] Configuration system allows user customization of mappings

## TESTING REQUIREMENTS

### **Unit Tests**
```bash
npm test -- --testPathPattern="BusinessContext"
npm test -- --testPathPattern="BusinessTypeRegistry"
```

### **Integration Tests**
```bash
npm test -- --testPathPattern="integration/BusinessContext"
```

### **TypeScript Compilation**
```bash
npx tsc --noEmit
```

### **Service Integration Tests**
```bash
npm test -- --testPathPattern="services/stripe"
```

---

## IMPLEMENTATION APPROACH

### **Clean Removal Strategy**
- Delete Universal type files completely (no backward compatibility needed)
- Replace all Universal imports with business context types
- Update service integrations to use BusinessTypeRegistry directly
- Clean test files to use business context system

### **Service Integration Updates**
- Services initialize with business context on startup
- Direct mapping between service APIs and business entities
- Type-safe translations using generated business schemas
- No fallback to Universal types (clean break)

### **Testing Strategy**
- Unit tests for business context functionality
- Integration tests for service → business context workflows
- End-to-end tests demonstrating full business description → working CLI
- TypeScript compilation validation

---

## NEXT STEPS

After completion, this establishes a fully functional Business Context-Driven Schema System that:

1. **Eliminates vendor-imposed Universal types** completely
2. **Generates user-specific business models** from natural descriptions
3. **Integrates seamlessly with existing ETL system** for service translation
4. **Provides business-focused CLI commands** instead of technical API operations
5. **Maintains backward compatibility** during transition period

The system will be ready for real-world usage where users can describe their business and get working CLI tools that respect their business reality rather than forcing them into predetermined schemas.

---

## 🔗 **RELATED FILES**
- `src/context/BusinessContextProcessor.ts` - Core business processing engine
- `src/context/BusinessContextManager.ts` - Configuration management
- `src/etl/graphs/BusinessModelFactory.ts` - ETL integration
- `src/services/stripe/StripeService.ts` - Service integration example
- `src/test/integration/BusinessContextIntegration.test.ts` - End-to-end validation